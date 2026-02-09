const express = require('express');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic.default({
  apiKey: process.env.ANTHROPIC_API_KEY
});
const db = require('../db');
const { walletAuth, optionalWalletAuth } = require('../middleware/auth');
const taskEmitter = require('../events/taskEmitter');

const router = express.Router();

// Webhook handler URL (GPT-4o powered)
const WEBHOOK_HANDLER_URL = process.env.WEBHOOK_HANDLER_URL || 'http://localhost:3003';

// Job statuses
const JOB_STATUSES = ['pending', 'interviewing', 'created', 'funded', 'in_progress', 'review', 'revisions', 'final_review', 'hardening', 'completed', 'disputed'];
const TASK_STATUSES = ['pending', 'in_progress', 'ready_for_test', 'testing', 'completed'];

// Initialize jobs tables
db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    client_wallet TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    service_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_usdc REAL NOT NULL,
    escrow_tx TEXT,
    status TEXT DEFAULT 'created',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS job_tasks (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    order_index INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS job_activity (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    actor_wallet TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_wallet);
  CREATE INDEX IF NOT EXISTS idx_jobs_agent ON jobs(agent_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
  CREATE INDEX IF NOT EXISTS idx_job_tasks_job ON job_tasks(job_id);
  CREATE INDEX IF NOT EXISTS idx_job_activity_job ON job_activity(job_id);
`);

// Review messages table
db.exec(`
  CREATE TABLE IF NOT EXISTS review_messages (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );
  CREATE INDEX IF NOT EXISTS idx_review_messages_job ON review_messages(job_id);
`);

// Migrate: add deliverables column if missing
try {
  db.exec(`ALTER TABLE jobs ADD COLUMN deliverables TEXT DEFAULT '[]'`);
} catch (e) { /* column already exists */ }

// Migrate: add revision_round column if missing (tracks which revision loop we're on)
try {
  db.exec(`ALTER TABLE jobs ADD COLUMN revision_round INTEGER DEFAULT 0`);
} catch (e) { /* column already exists */ }

// Migrate: add task_type column (build vs revision)
try {
  db.exec(`ALTER TABLE job_tasks ADD COLUMN task_type TEXT DEFAULT 'build'`);
} catch (e) { /* column already exists */ }

// In-memory SSE connections for review chat
const reviewSSEConnections = new Map(); // jobId -> Set<res>

// Helper: Push to review SSE connections
function pushToReviewSSE(jobId, data) {
  const connections = reviewSSEConnections.get(jobId);
  if (connections) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    connections.forEach(res => {
      try {
        res.write(message);
      } catch (e) {
        // Connection closed
      }
    });
  }
}

/**
 * POST /api/jobs - Create a new job
 * Free jobs (priceUsdc=0) skip wallet auth; paid jobs require wallet signature
 */
router.post('/', (req, res, next) => {
  // Skip wallet auth for free jobs
  if (req.body.priceUsdc === 0 || req.body.priceUsdc === '0') {
    req.walletAddress = req.body.clientWallet || '0x0000000000000000000000000000000000000000';
    return next();
  }
  walletAuth(req, res, next);
}, (req, res) => {
  const { agentId, serviceId, title, description = '', priceUsdc, requirements } = req.body;
  const clientWallet = req.walletAddress;

  if (!agentId) {
    return res.status(400).json({ error: 'agentId is required' });
  }

  // For free jobs, auto-generate title from requirements if missing
  const jobTitle = (title && title.trim().length > 0) ? title.trim() : (requirements ? requirements.substring(0, 100) : 'Free Trial Task');

  if (priceUsdc === undefined || (priceUsdc !== 0 && priceUsdc !== '0' && priceUsdc <= 0)) {
    return res.status(400).json({ error: 'priceUsdc must be 0 (free) or greater than 0' });
  }

  // Verify agent exists
  const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Verify service exists if provided
  if (serviceId) {
    const service = db.prepare('SELECT id FROM services WHERE id = ?').get(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  try {
    // For free jobs, auto-start (skip funding step)
    const initialStatus = (priceUsdc === 0 || priceUsdc === '0') ? 'in_progress' : 'created';
    
    db.prepare(`
      INSERT INTO jobs (id, client_wallet, agent_id, service_id, title, description, price_usdc, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, clientWallet, agentId, serviceId || null, jobTitle, description || requirements || '', priceUsdc, initialStatus, now, now);

    // Log activity
    logActivity(id, clientWallet, 'created', `Job created: ${jobTitle}`);

    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

    res.status(201).json({
      success: true,
      job: formatJob(job)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create job', details: err.message });
  }
});

/**
 * GET /api/jobs - List jobs
 * Filter by role (client or agent based on auth)
 * Query params: status, role (client|agent), limit, offset
 */
router.get('/', optionalWalletAuth, (req, res) => {
  const { status, role, agentId, limit = 50, offset = 0 } = req.query;
  const walletAddress = req.walletAddress;

  let query = 'SELECT * FROM jobs WHERE 1=1';
  const params = [];

  // Filter by role if authenticated
  if (walletAddress) {
    if (role === 'client') {
      query += ' AND client_wallet = ?';
      params.push(walletAddress);
    } else if (role === 'agent') {
      // Find agent by wallet
      const agent = db.prepare('SELECT id FROM agents WHERE wallet_address = ?').get(walletAddress);
      if (agent) {
        query += ' AND agent_id = ?';
        params.push(agent.id);
      } else {
        return res.json({ jobs: [], total: 0, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
      }
    }
  }

  // Filter by specific agent
  if (agentId) {
    query += ' AND agent_id = ?';
    params.push(agentId);
  }

  // Filter by status
  if (status && JOB_STATUSES.includes(status)) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  try {
    const jobs = db.prepare(query).all(...params);
    
    // Count total (without pagination)
    let countQuery = 'SELECT COUNT(*) as count FROM jobs WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit/offset
    const total = db.prepare(countQuery).get().count;

    res.json({
      jobs: jobs.map(formatJob),
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs', details: err.message });
  }
});

/**
 * GET /api/jobs/:id - Get job details
 */
router.get('/:id', optionalWalletAuth, (req, res) => {
  const { id } = req.params;

  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get tasks
    const tasks = db.prepare('SELECT * FROM job_tasks WHERE job_id = ? ORDER BY order_index').all(id);

    // Get agent info
    const agent = db.prepare('SELECT id, name, wallet_address, avatar_url FROM agents WHERE id = ?').get(job.agent_id);

    res.json({
      job: formatJob(job),
      tasks: tasks.map(formatTask),
      agent: agent ? {
        id: agent.id,
        name: agent.name,
        walletAddress: agent.wallet_address,
        avatarUrl: agent.avatar_url
      } : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job', details: err.message });
  }
});

/**
/**
 * PATCH /api/jobs/:id - Update job fields (spec, title, description)
 */
router.patch('/:id', (req, res) => {
  const { id } = req.params;
  const { spec, title, description, status } = req.body;
  
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  const updates = [];
  const values = [];
  if (spec !== undefined) { updates.push('spec = ?'); values.push(spec); }
  if (title !== undefined) { updates.push('title = ?'); values.push(title); }
  if (description !== undefined) { updates.push('description = ?'); values.push(description); }
  if (status !== undefined) { updates.push('status = ?'); values.push(status); }
  
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  
  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);
  
  db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  res.json({ job: updated });
});

/**
 * POST /api/jobs/:id/reset - Reset job to pending (for testing)
 * Clears agent assignment, tasks, and deliverables
 */
router.post('/:id/reset', (req, res) => {
  const { id } = req.params;
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  db.prepare(`UPDATE jobs SET status = 'pending', deliverables = '[]', revision_round = 0, updated_at = ? WHERE id = ?`)
    .run(new Date().toISOString(), id);
  db.prepare(`DELETE FROM job_tasks WHERE job_id = ?`).run(id);
  
  res.json({ success: true, message: 'Job reset to pending' });
});

/**
 * POST /api/jobs/:id/claim - Claim a pending job
 * Agent claims a job that's waiting for an agent
 * Changes status to 'in_progress' and assigns the agent
 */
router.post('/:id/claim', (req, res) => {
  const { id } = req.params;
  const agentToken = req.headers['x-agent-token'];
  let agentId = req.body.agentId; // Allow body for backwards compat

  // Prefer token auth - look up agent by token
  if (agentToken) {
    const agentByToken = db.prepare('SELECT id FROM agents WHERE webhook_secret = ?').get(agentToken);
    if (agentByToken) {
      agentId = agentByToken.id;
    }
  }

  if (!agentId) {
    return res.status(400).json({ error: 'X-Agent-Token header or agentId in body required' });
  }

  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if job is claimable (pending or interviewing with no real agent)
    const claimableStatuses = ['pending', 'interviewing'];
    if (!claimableStatuses.includes(job.status)) {
      return res.status(400).json({ 
        error: 'Job is not available for claiming',
        currentStatus: job.status
      });
    }

    // For pending jobs, allow any agent to claim (marketplace model)
    // Only block if job is already in_progress with a different agent
    if (job.status !== 'pending' && job.agent_id && job.agent_id !== 'demo-agent' && job.agent_id !== agentId) {
      return res.status(409).json({ error: 'Job already claimed by another agent' });
    }

    // Verify agent exists
    const agent = db.prepare('SELECT id, name FROM agents WHERE id = ?').get(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const now = new Date().toISOString();
    
    // Update job with agent and change status to in_progress
    db.prepare(`
      UPDATE jobs 
      SET agent_id = ?, status = 'in_progress', updated_at = ?
      WHERE id = ?
    `).run(agentId, now, id);

    // Log activity
    logActivity(id, agentId, 'claimed', `Job claimed by ${agent.name}`);

    res.json({
      success: true,
      message: `Job claimed by ${agent.name}`,
      job: {
        id: job.id,
        title: job.title,
        status: 'in_progress',
        agentId: agentId,
        agentName: agent.name
      }
    });

  } catch (err) {
    console.error('Claim job error:', err);
    res.status(500).json({ error: 'Failed to claim job', details: err.message });
  }
});

/**
 * PUT /api/jobs/:id/status - Update job status
 * Requires wallet signature auth
 * Client can: fund, complete (approve), dispute
 * Agent can: start work (in_progress), submit for review
 */
router.put('/:id/status', walletAuth, (req, res) => {
  const { id } = req.params;
  const { status, escrowTx, deliverables } = req.body;
  const walletAddress = req.walletAddress;

  if (!status || !JOB_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Invalid status', validStatuses: JOB_STATUSES });
  }

  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check authorization
    const isClient = job.client_wallet.toLowerCase() === walletAddress.toLowerCase();
    const agent = db.prepare('SELECT id FROM agents WHERE id = ? AND wallet_address = ?').get(job.agent_id, walletAddress);
    const isAgent = !!agent;

    if (!isClient && !isAgent) {
      return res.status(403).json({ error: 'Not authorized to update this job' });
    }

    // Validate status transitions
    const validTransitions = getValidTransitions(job.status, isClient, isAgent);
    if (!validTransitions.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status transition',
        currentStatus: job.status,
        validTransitions
      });
    }

    const now = new Date().toISOString();
    let updateQuery = 'UPDATE jobs SET status = ?, updated_at = ?';
    const params = [status, now];

    // Store escrow tx if funding
    if (status === 'funded' && escrowTx) {
      updateQuery += ', escrow_tx = ?';
      params.push(escrowTx);
    }

    // Store deliverables when submitting for review
    if (deliverables && Array.isArray(deliverables)) {
      updateQuery += ', deliverables = ?';
      params.push(JSON.stringify(deliverables));
    }

    updateQuery += ' WHERE id = ?';
    params.push(id);

    db.prepare(updateQuery).run(...params);

    // Log activity
    logActivity(id, walletAddress, 'status_change', `Status changed to: ${status}`);

    // Increment agent's jobs_completed if job completed
    if (status === 'completed') {
      db.prepare('UPDATE agents SET jobs_completed = jobs_completed + 1 WHERE id = ?').run(job.agent_id);
    }

    const updated = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

    res.json({
      success: true,
      job: formatJob(updated)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update job status', details: err.message });
  }
});

/**
 * POST /api/jobs/:id/tasks - Add task(s) to job
 * Accepts single task {title, description, status} or bulk {tasks: [{title, description, status}]}
 * Requires wallet signature auth or agent token
 */
router.post('/:id/tasks', walletAuth, (req, res) => {
  const { id } = req.params;
  const walletAddress = req.walletAddress;

  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Only agent can add tasks
    const agent = db.prepare('SELECT id FROM agents WHERE id = ? AND wallet_address = ?').get(job.agent_id, walletAddress);
    if (!agent) {
      return res.status(403).json({ error: 'Only the assigned agent can add tasks' });
    }

    // Support bulk or single task
    const tasksInput = req.body.tasks || [{ title: req.body.title, description: req.body.description || '', status: req.body.status }];
    
    if (!Array.isArray(tasksInput) || tasksInput.length === 0) {
      return res.status(400).json({ error: 'tasks array or title is required' });
    }

    const maxOrder = db.prepare('SELECT MAX(order_index) as maxOrder FROM job_tasks WHERE job_id = ?').get(id);
    let orderIndex = (maxOrder?.maxOrder ?? -1) + 1;
    const now = new Date().toISOString();
    const created = [];

    for (const t of tasksInput) {
      if (!t.title || String(t.title).trim().length === 0) continue;

      const taskId = uuidv4();
      const status = TASK_STATUSES.includes(t.status) ? t.status : 'pending';

      db.prepare(`
        INSERT INTO job_tasks (id, job_id, title, description, status, order_index, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(taskId, id, String(t.title).trim(), t.description || '', status, orderIndex++, now, now);

      created.push(formatTask(db.prepare('SELECT * FROM job_tasks WHERE id = ?').get(taskId)));
    }

    logActivity(id, walletAddress, 'task_added', `${created.length} task(s) added`);

    res.status(201).json({
      success: true,
      tasks: created
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add tasks', details: err.message });
  }
});

/**
 * PUT /api/jobs/:id/tasks/:taskId - Update task status
 * Requires wallet signature auth (agent only)
 */
router.put('/:id/tasks/:taskId', walletAuth, (req, res) => {
  const { id, taskId } = req.params;
  const { status, title, description } = req.body;
  const walletAddress = req.walletAddress;

  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Only agent can update tasks
    const agent = db.prepare('SELECT id FROM agents WHERE id = ? AND wallet_address = ?').get(job.agent_id, walletAddress);
    if (!agent) {
      return res.status(403).json({ error: 'Only the assigned agent can update tasks' });
    }

    const task = db.prepare('SELECT * FROM job_tasks WHERE id = ? AND job_id = ?').get(taskId, id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      if (!TASK_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid task status', validStatuses: TASK_STATUSES });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (title !== undefined) {
      if (title.trim().length === 0) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      updates.push('title = ?');
      params.push(title.trim());
    }

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(taskId);

    db.prepare(`UPDATE job_tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    // Log activity
    if (status) {
      logActivity(id, walletAddress, 'task_updated', `Task "${task.title}" status: ${status}`);
    }

    const updated = db.prepare('SELECT * FROM job_tasks WHERE id = ?').get(taskId);

    // Broadcast task update via SSE if status changed
    if (status) {
      taskEmitter.emitTaskUpdate(id, {
        taskId,
        status,
        title: updated.title,
        note: null
      });
    }

    res.json({
      success: true,
      task: formatTask(updated)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update task', details: err.message });
  }
});

/**
 * GET /api/jobs/:id/activity - Get activity feed
 */
router.get('/:id/activity', optionalWalletAuth, (req, res) => {
  const { id } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const activity = db.prepare(`
      SELECT * FROM job_activity 
      WHERE job_id = ? 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(id, parseInt(limit, 10), parseInt(offset, 10));

    const total = db.prepare('SELECT COUNT(*) as count FROM job_activity WHERE job_id = ?').get(id).count;

    res.json({
      activity: activity.map(formatActivity),
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity', details: err.message });
  }
});

/**
 * GET /api/jobs/:id/updates - SSE endpoint for live updates (polling fallback)
 * Returns latest activity since timestamp
 */
router.get('/:id/updates', optionalWalletAuth, (req, res) => {
  const { id } = req.params;
  const { since } = req.query;

  try {
    const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    let query = 'SELECT * FROM job_activity WHERE job_id = ?';
    const params = [id];

    if (since) {
      query += ' AND created_at > ?';
      params.push(since);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const updates = db.prepare(query).all(...params);

    // Also get current job status
    const currentJob = db.prepare('SELECT status, updated_at FROM jobs WHERE id = ?').get(id);

    res.json({
      jobStatus: currentJob.status,
      jobUpdatedAt: currentJob.updated_at,
      updates: updates.map(formatActivity),
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch updates', details: err.message });
  }
});

// Helper: Log activity
function logActivity(jobId, actorWallet, action, details) {
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO job_activity (id, job_id, actor_wallet, action, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, jobId, actorWallet, action, details, now);
}

// Helper: Get valid status transitions
function getValidTransitions(currentStatus, isClient, isAgent) {
  const transitions = {
    created: {
      client: ['funded'],
      agent: []
    },
    funded: {
      client: ['disputed'],
      agent: ['in_progress']
    },
    in_progress: {
      client: ['disputed'],
      agent: ['review']
    },
    review: {
      client: ['revisions', 'disputed'],       // customer submits revision requests
      agent: ['in_progress']                     // back to work if needed
    },
    revisions: {
      client: ['disputed'],
      agent: ['final_review']                    // agent completes revisions → final review
    },
    final_review: {
      client: ['revisions', 'hardening', 'disputed'],  // loop back or approve
      agent: []
    },
    hardening: {
      client: ['disputed'],
      agent: ['completed']                       // agent completes hardening
    },
    completed: {
      client: [],
      agent: []
    },
    disputed: {
      client: [],
      agent: []
    }
  };

  const result = [];
  if (isClient && transitions[currentStatus]?.client) {
    result.push(...transitions[currentStatus].client);
  }
  if (isAgent && transitions[currentStatus]?.agent) {
    result.push(...transitions[currentStatus].agent);
  }
  return result;
}

// Helper: Format job for response
function formatJob(job) {
  // Parse deliverables JSON
  let deliverables = [];
  try {
    if (job.deliverables) {
      deliverables = JSON.parse(job.deliverables);
    }
  } catch (e) {
    deliverables = [];
  }

  return {
    id: job.id,
    clientWallet: job.client_wallet,
    agentId: job.agent_id,
    serviceId: job.service_id,
    title: job.title,
    description: job.description,
    priceUsdc: job.price_usdc,
    escrowTx: job.escrow_tx,
    spec: job.spec || null,
    status: job.status,
    deliverables,
    revisionRound: job.revision_round || 0,
    createdAt: job.created_at,
    updatedAt: job.updated_at
  };
}

// Helper: Format task for response
function formatTask(task) {
  return {
    id: task.id,
    jobId: task.job_id,
    title: task.title,
    description: task.description,
    status: task.status,
    orderIndex: task.order_index,
    taskType: task.task_type || 'build',
    createdAt: task.created_at,
    updatedAt: task.updated_at
  };
}

// Helper: Format activity for response
function formatActivity(activity) {
  return {
    id: activity.id,
    jobId: activity.job_id,
    actorWallet: activity.actor_wallet,
    action: activity.action,
    details: activity.details,
    createdAt: activity.created_at
  };
}

// ============== REVIEW CHAT ENDPOINTS ==============

/**
 * GET /api/jobs/:id/review-messages - Get review chat messages
 */
router.get('/:id/review-messages', optionalWalletAuth, (req, res) => {
  const { id } = req.params;

  try {
    const job = db.prepare('SELECT id, status FROM jobs WHERE id = ?').get(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const messages = db.prepare(`
      SELECT id, job_id, role, content, created_at
      FROM review_messages
      WHERE job_id = ?
      ORDER BY created_at ASC
    `).all(id);

    res.json({
      messages: messages.map(m => ({
        id: m.id,
        jobId: m.job_id,
        role: m.role,
        content: m.content,
        createdAt: m.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch review messages', details: err.message });
  }
});

/**
 * POST /api/jobs/:id/review-messages - Send a review chat message
 * Stores the user message, forwards to webhook handler for GPT-4o response
 */
router.post('/:id/review-messages', optionalWalletAuth, async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Save user message
    const msgId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO review_messages (id, job_id, role, content, created_at)
      VALUES (?, ?, 'user', ?, ?)
    `).run(msgId, id, message.trim(), now);

    // Push user message to SSE
    pushToReviewSSE(id, {
      type: 'user_message',
      message: message.trim(),
      messageId: msgId,
      timestamp: now
    });

    // Get conversation history for context
    const history = db.prepare(`
      SELECT role, content FROM review_messages
      WHERE job_id = ? ORDER BY created_at ASC
    `).all(id);

    // Parse deliverables for context
    let deliverables = [];
    try {
      if (job.deliverables) deliverables = JSON.parse(job.deliverables);
    } catch (e) { /* ignore */ }

    // Build deliverables context
    let deliverablesContext = '';
    if (deliverables.length > 0) {
      const delivs = deliverables.map((d, i) => {
        if (typeof d === 'string') return `${i + 1}. ${d}`;
        return `${i + 1}. ${d.label || d.title || 'Deliverable'}: ${d.url || d.link || d.description || ''}`;
      }).join('\n');
      deliverablesContext = `\n\nPROJECT: "${job.title || 'Untitled'}"\nDELIVERABLES:\n${delivs}`;
    }

    // Call Anthropic directly for review response
    try {
      const messages = history.map(m => ({ role: m.role, content: m.content }));

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 500,
        system: `You are a skilled project reviewer on Viberr, a marketplace where AI agents build projects for clients. The client is reviewing a build delivered by an AI agent.

Your role is to be an ACTIVE interviewer during the review — not passive. You should:

1. **Ask probing follow-up questions** about their feedback:
   - "Can you describe what you'd expect to see on the walker's dashboard?"
   - "When you say address-based matching, should it use GPS radius or zip codes?"
   - "Is this a must-have or nice-to-have for this round?"

2. **Dig deeper** on vague feedback — don't just accept "looks good" or "change this":
   - Ask for specifics, examples, or priorities
   - Help them articulate what they actually want

3. **Organize their feedback** into clear categories:
   - What works well (acknowledge it)
   - What needs changing (clarify exactly how)
   - What's missing (understand the gap)

4. **Guide the decision**:
   - When they've given enough detail, summarize the revision list and ask "Does this capture everything?"
   - Then suggest they click **"Submit Revision Requests"** to send it to the agent
   - If they're happy, suggest **"Approve"** to complete the job

Keep responses concise (2-4 sentences max). Be conversational, curious, and helpful — like a product manager doing a review session.${deliverablesContext}`,
        messages
      });

      const reply = response.content[0].text;

      // Save assistant response
      const replyId = uuidv4();
      const replyNow = new Date().toISOString();
      db.prepare(`
        INSERT INTO review_messages (id, job_id, role, content, created_at)
        VALUES (?, ?, 'assistant', ?, ?)
      `).run(replyId, id, reply, replyNow);

      // Push to SSE
      pushToReviewSSE(id, {
        type: 'assistant_message',
        message: reply,
        messageId: replyId,
        timestamp: replyNow
      });
    } catch (aiErr) {
      console.error(`[Review] Anthropic error:`, aiErr.message);
    }

    res.json({
      success: true,
      messageId: msgId,
      message: 'Message sent. Waiting for reviewer response.'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send review message', details: err.message });
  }
});

/**
 * POST /api/jobs/:id/review-response - Callback from webhook handler
 * Stores assistant response and pushes to SSE
 */
router.post('/:id/review-response', (req, res) => {
  const { id } = req.params;
  const { secret, message } = req.body;

  // Basic secret validation
  if (secret !== 'viberr-0xclaw-secret-2026') {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  try {
    // Save assistant message
    const msgId = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO review_messages (id, job_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, ?)
    `).run(msgId, id, message, now);

    // Push to SSE
    pushToReviewSSE(id, {
      type: 'assistant_message',
      message,
      messageId: msgId,
      timestamp: now
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save review response', details: err.message });
  }
});

/**
 * GET /api/jobs/:id/review-stream - SSE endpoint for streaming review responses
 */
router.get('/:id/review-stream', (req, res) => {
  const { id } = req.params;

  // Verify job exists
  const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', jobId: id })}\n\n`);

  // Add to connections
  if (!reviewSSEConnections.has(id)) {
    reviewSSEConnections.set(id, new Set());
  }
  reviewSSEConnections.get(id).add(res);

  // Heartbeat every 30s
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (e) { /* closed */ }
  }, 30000);

  // Clean up on close
  req.on('close', () => {
    clearInterval(heartbeat);
    const connections = reviewSSEConnections.get(id);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        reviewSSEConnections.delete(id);
      }
    }
  });
});

/**
 * POST /api/jobs/:id/submit-feedback - Submit review feedback
 * Handles the full lifecycle:
 *   review -> revisions (type=revisions)
 *   final_review -> revisions (type=revisions, loops back)
 *   final_review -> hardening (type=approved)
 */
router.post('/:id/submit-feedback', optionalWalletAuth, async (req, res) => {
  const { id } = req.params;
  const { feedback } = req.body;

  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!['review', 'final_review'].includes(job.status)) {
      return res.status(400).json({ error: `Job is in "${job.status}" status — feedback can only be submitted during review or final_review` });
    }

    // Get all review messages
    const messages = db.prepare(`
      SELECT role, content FROM review_messages
      WHERE job_id = ? ORDER BY created_at ASC
    `).all(id);

    // Extract user messages as revision requests
    const revisionRequests = messages
      .filter(m => m.role === 'user')
      .map(m => m.content);

    const now = new Date().toISOString();
    let nextStatus;
    let responseMessage;

    if (feedback === 'approved' && job.status === 'final_review') {
      // ===== APPROVED: final_review → hardening =====
      nextStatus = 'hardening';
      responseMessage = 'Build approved! Moving to security hardening phase.';

      db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?').run(nextStatus, now, id);

      logActivity(id, req.walletAddress || 'client', 'build_approved', 'Customer approved the build. Entering hardening phase.');

      // Queue hardening work for the agent
      try {
        await axios.post(`http://localhost:${process.env.PORT || 3001}/api/agent-hooks/queue-work`, {
          jobId: id,
          type: 'hardening',
          secret: 'viberr-internal-2026'
        }, { timeout: 5000 });
      } catch (e) {
        console.log('[submit-feedback] Could not queue hardening work:', e.message);
      }

    } else if (feedback === 'revisions') {
      // ===== REVISIONS: review → revisions OR final_review → revisions (loop) =====
      nextStatus = 'revisions';

      // Increment revision round
      const currentRound = job.revision_round || 0;
      const newRound = currentRound + 1;

      db.prepare('UPDATE jobs SET status = ?, revision_round = ?, updated_at = ? WHERE id = ?')
        .run(nextStatus, newRound, now, id);

      // Create revision tasks from user feedback
      const feedbackSummary = revisionRequests.join('\n\n---\n\n');
      const taskId = require('uuid').v4();
      const maxOrder = db.prepare('SELECT MAX(order_index) as maxOrder FROM job_tasks WHERE job_id = ?').get(id);
      const orderIndex = (maxOrder?.maxOrder ?? -1) + 1;

      db.prepare(`
        INSERT INTO job_tasks (id, job_id, title, description, status, order_index, task_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, 'revision', ?, ?)
      `).run(taskId, id, `Revision round ${newRound}: Implement feedback`, feedbackSummary, orderIndex, now, now);

      // Parse individual revision items via Anthropic (best-effort)
      try {
        const parseResp = await anthropic.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 1000,
          system: `Extract revision tasks from customer feedback. Return ONLY a JSON array of objects with "title" and "description" fields. Each task should be concrete and actionable. Keep titles under 60 chars. No markdown, just valid JSON.`,
          messages: [{ role: 'user', content: `Extract revision tasks:\n\n${revisionRequests.join('\n\n---\n\n')}` }]
        });
        const content = parseResp.content[0].text.trim();
        const parsed = JSON.parse(content.replace(/```json?\n?/g, '').replace(/```/g, ''));
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Replace the single bulk task with parsed individual tasks
          db.prepare('DELETE FROM job_tasks WHERE id = ?').run(taskId);
          for (let i = 0; i < parsed.length; i++) {
            const tid = require('uuid').v4();
            db.prepare(`
              INSERT INTO job_tasks (id, job_id, title, description, status, order_index, task_type, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'pending', ?, 'revision', ?, ?)
            `).run(tid, id, parsed[i].title, parsed[i].description, orderIndex + i, now, now);
          }
          console.log(`[submit-feedback] Parsed ${parsed.length} revision tasks`);
        }
      } catch (e) {
        console.log('[submit-feedback] Could not parse revisions (using single task):', e.message);
      }

      logActivity(id, req.walletAddress || 'client', 'revisions_requested', JSON.stringify({
        round: newRound,
        fromStatus: job.status,
        revisionCount: revisionRequests.length,
        revisions: revisionRequests
      }));

      // Queue revision work for the agent
      try {
        await axios.post(`http://localhost:${process.env.PORT || 3001}/api/agent-hooks/queue-work`, {
          jobId: id,
          type: 'revisions',
          round: newRound,
          feedback: feedbackSummary,
          secret: 'viberr-internal-2026'
        }, { timeout: 5000 });
      } catch (e) {
        console.log('[submit-feedback] Could not queue revision work:', e.message);
      }

      responseMessage = job.status === 'review'
        ? 'Feedback submitted! Agent will work on your revisions.'
        : `Revision round ${newRound} requested. Agent will implement your changes.`;

    } else {
      return res.status(400).json({ error: 'Invalid feedback type. Must be "approved" or "revisions".' });
    }

    // Push SSE notification
    pushToReviewSSE(id, {
      type: 'feedback_submitted',
      nextStatus,
      timestamp: now
    });

    res.json({
      success: true,
      nextStatus,
      message: responseMessage
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit feedback', details: err.message });
  }
});

/**
 * POST /api/jobs/:id/revision-tasks-callback - Callback from webhook for parsed revision tasks
 * Creates individual tasks from GPT-4o parsed revision items
 */
router.post('/:id/revision-tasks-callback', (req, res) => {
  const { id } = req.params;
  const { secret, tasks: parsedTasks } = req.body;

  if (secret !== 'viberr-0xclaw-secret-2026') {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  if (!parsedTasks || !Array.isArray(parsedTasks) || parsedTasks.length === 0) {
    return res.json({ success: true, message: 'No tasks to create' });
  }

  try {
    const now = new Date().toISOString();
    const maxOrder = db.prepare('SELECT MAX(order_index) as maxOrder FROM job_tasks WHERE job_id = ?').get(id);
    let orderIndex = (maxOrder?.maxOrder ?? -1) + 1;

    for (const task of parsedTasks) {
      if (!task.title) continue;
      const taskId = require('uuid').v4();
      db.prepare(`
        INSERT INTO job_tasks (id, job_id, title, description, status, order_index, task_type, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'pending', ?, 'revision', ?, ?)
      `).run(taskId, id, task.title, task.description || '', orderIndex++, now, now);
    }

    console.log(`[revision-tasks-callback] Created ${parsedTasks.length} revision tasks for job ${id}`);
    res.json({ success: true, created: parsedTasks.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create revision tasks', details: err.message });
  }
});

// POST /api/jobs/:id/undo-feedback — Cancel revision submission within 5 min window
router.post('/:id/undo-feedback', optionalWalletAuth, (req, res) => {
  const { id } = req.params;
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  // Only allow undo from "revisions" status
  if (job.status !== 'revisions') {
    return res.status(400).json({ error: 'Can only undo from revisions status' });
  }

  // Check 5-minute window
  const updatedAt = new Date(job.updated_at).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  if (now - updatedAt > fiveMinutes) {
    return res.status(400).json({ error: 'Undo window has expired (5 minutes)' });
  }

  // Revert to review status
  const previousStatus = 'review'; // always revert to review for now
  db.prepare('UPDATE jobs SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(previousStatus, id);

  // Remove revision tasks that were auto-created
  db.prepare("DELETE FROM job_tasks WHERE job_id = ? AND title LIKE '%evision%'").run(id);

  // Log activity
  db.prepare(`
    INSERT INTO job_activity (id, job_id, actor_wallet, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `activity-${Date.now()}`,
    id,
    req.walletAddress || 'client',
    'feedback_undone',
    JSON.stringify({ revertedTo: previousStatus })
  );

  console.log(`[Undo] Job ${id} reverted from revisions to ${previousStatus}`);
  res.json({ success: true, newStatus: previousStatus });
});

/**
 * POST /api/jobs/:id/release - Release payment for completed job
 * Sets a 'released' flag on the job to track payment release intent
 */
router.post('/:id/release', optionalWalletAuth, (req, res) => {
  const { id } = req.params;

  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Only allow release for completed or hardening status
    if (!['completed', 'hardening'].includes(job.status)) {
      return res.status(400).json({ 
        error: 'Payment can only be released for completed or hardening jobs',
        currentStatus: job.status 
      });
    }

    // Add 'released' column if it doesn't exist (migration)
    try {
      db.exec(`ALTER TABLE jobs ADD COLUMN released INTEGER DEFAULT 0`);
    } catch (e) {
      // Column already exists
    }

    const now = new Date().toISOString();
    
    // Mark as released
    db.prepare('UPDATE jobs SET released = 1, updated_at = ? WHERE id = ?').run(now, id);

    // Log activity
    const message = job.price_usdc === 0 
      ? 'Free trial completed - no payment needed'
      : 'Payment release requested';
    
    logActivity(id, req.walletAddress || 'client', 'payment_release', message);

    console.log(`[Release] Job ${id} marked as released (price: ${job.price_usdc})`);

    res.json({
      success: true,
      released: true,
      jobId: id,
      price: job.price_usdc,
      message: job.price_usdc === 0 
        ? 'Free trial completed!' 
        : 'Payment release requested'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to release payment', details: err.message });
  }
});

module.exports = router;
