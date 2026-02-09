const express = require('express');
const { ethers } = require('ethers');
const db = require('../db');

const router = express.Router();

// Contract config - ViberrEscrow V3
const ESCROW_ADDRESS = '0x66cdf0431896c2c2ac38eaa716284e4d4159c05e';
const RPC_URL = 'https://sepolia.base.org';

// ViberrEscrow V2 ABI (events + functions)
const ESCROW_ABI = [
  // Events
  'event JobCreated(uint256 indexed jobId, address indexed client, address indexed agent, uint256 amount, bytes32 specHash)',
  'event JobFunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event PaymentReleased(uint256 indexed jobId, address indexed agent, uint256 agentAmount, uint256 platformAmount)',
  'event Disputed(uint256 indexed jobId, address indexed client)',
  'event DisputeResolved(uint256 indexed jobId, uint8 resolution, string notes)',
  'event RevisionRequired(uint256 indexed jobId, uint256 deadline, string requirements)',
  'event RevisionCompleted(uint256 indexed jobId)',
  'event Refunded(uint256 indexed jobId, address indexed client, uint256 amount)',
  'event Tipped(uint256 indexed jobId, address indexed tipper, address indexed agent, uint256 amount)',
  // Functions for arbiter
  'function resolveDispute(uint256 jobId, uint8 resolution, string calldata notes) external',
  'function getJob(uint256 jobId) external view returns (address, address, uint256, uint8, bytes32, uint256, string memory)'
];

// Tier thresholds
const TIER_THRESHOLDS = {
  rising: 3,      // 3+ jobs
  verified: 10,   // 10+ jobs
  premium: 25     // 25+ jobs
};

// Initialize webhook tables
db.exec(`
  CREATE TABLE IF NOT EXISTS webhook_sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_block INTEGER DEFAULT 0,
    last_sync_at TEXT,
    events_processed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS processed_events (
    tx_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    chain_job_id TEXT NOT NULL,
    processed_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tx_hash, log_index)
  );

  INSERT OR IGNORE INTO webhook_sync_state (id, last_block, events_processed) VALUES (1, 0, 0);
`);

/**
 * GET /api/webhooks/status - Check sync status
 */
router.get('/status', (req, res) => {
  try {
    const state = db.prepare('SELECT * FROM webhook_sync_state WHERE id = 1').get();
    const recentEvents = db.prepare(`
      SELECT event_type, COUNT(*) as count 
      FROM processed_events 
      GROUP BY event_type
    `).all();

    res.json({
      lastBlock: state.last_block,
      lastSyncAt: state.last_sync_at,
      totalEventsProcessed: state.events_processed,
      eventsByType: Object.fromEntries(recentEvents.map(e => [e.event_type, e.count])),
      contract: ESCROW_ADDRESS,
      rpc: RPC_URL
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get status', details: err.message });
  }
});

/**
 * POST /api/webhooks/sync - Manually trigger sync of recent events
 * Query params:
 *   - fromBlock: start block (optional, defaults to last synced block)
 *   - lookback: number of blocks to look back (optional, default 1000)
 */
router.post('/sync', async (req, res) => {
  const { fromBlock: reqFromBlock, lookback = 1000 } = req.query;

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);

    // Get current block
    const currentBlock = await provider.getBlockNumber();

    // Determine starting block
    const state = db.prepare('SELECT * FROM webhook_sync_state WHERE id = 1').get();
    let fromBlock;
    
    if (reqFromBlock !== undefined) {
      fromBlock = parseInt(reqFromBlock, 10);
    } else if (state.last_block > 0) {
      fromBlock = state.last_block + 1;
    } else {
      // First sync - look back N blocks
      fromBlock = Math.max(0, currentBlock - parseInt(lookback, 10));
    }

    const toBlock = currentBlock;

    if (fromBlock > toBlock) {
      return res.json({
        success: true,
        message: 'Already synced to latest block',
        fromBlock,
        toBlock,
        eventsProcessed: 0
      });
    }

    console.log(`[Webhook Sync] Scanning blocks ${fromBlock} to ${toBlock}`);

    // Fetch all events
    const results = {
      JobCreated: [],
      JobFunded: [],
      PaymentReleased: [],
      Disputed: [],
      Resolved: [],
      Tipped: []
    };

    // Query each event type
    for (const eventName of Object.keys(results)) {
      try {
        const filter = contract.filters[eventName]();
        const events = await contract.queryFilter(filter, fromBlock, toBlock);
        results[eventName] = events;
        console.log(`[Webhook Sync] Found ${events.length} ${eventName} events`);
      } catch (err) {
        console.error(`[Webhook Sync] Error fetching ${eventName}:`, err.message);
      }
    }

    // Process events
    let eventsProcessed = 0;
    const processingResults = [];

    // Process JobFunded events
    for (const event of results.JobFunded) {
      const result = await processJobFunded(event);
      if (result.processed) eventsProcessed++;
      processingResults.push(result);
    }

    // Process PaymentReleased events
    for (const event of results.PaymentReleased) {
      const result = await processPaymentReleased(event);
      if (result.processed) eventsProcessed++;
      processingResults.push(result);
    }

    // Process Disputed events
    for (const event of results.Disputed) {
      const result = await processDisputed(event);
      if (result.processed) eventsProcessed++;
      processingResults.push(result);
    }

    // Process Resolved events
    for (const event of results.Resolved) {
      const result = await processResolved(event);
      if (result.processed) eventsProcessed++;
      processingResults.push(result);
    }

    // Update sync state
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE webhook_sync_state 
      SET last_block = ?, last_sync_at = ?, events_processed = events_processed + ?
      WHERE id = 1
    `).run(toBlock, now, eventsProcessed);

    res.json({
      success: true,
      fromBlock,
      toBlock,
      currentBlock,
      eventsFound: {
        JobCreated: results.JobCreated.length,
        JobFunded: results.JobFunded.length,
        PaymentReleased: results.PaymentReleased.length,
        Disputed: results.Disputed.length,
        Resolved: results.Resolved.length,
        Tipped: results.Tipped.length
      },
      eventsProcessed,
      processingResults: processingResults.filter(r => r.processed)
    });

  } catch (err) {
    console.error('[Webhook Sync] Error:', err);
    res.status(500).json({ error: 'Sync failed', details: err.message });
  }
});

/**
 * POST /api/webhooks/simulate - Simulate event handling (for testing)
 * Useful for MVP testing without waiting for actual on-chain events
 */
router.post('/simulate', (req, res) => {
  const { eventType, jobId, agentWallet, clientWallet, amount } = req.body;

  if (!eventType || !jobId) {
    return res.status(400).json({ error: 'eventType and jobId are required' });
  }

  try {
    let result;

    switch (eventType) {
      case 'JobFunded':
        result = handleJobFunded(jobId.toString());
        break;
      case 'PaymentReleased':
        result = handlePaymentReleased(jobId.toString(), agentWallet);
        break;
      case 'Disputed':
        result = handleDisputed(jobId.toString());
        break;
      case 'Resolved':
        result = handleResolved(jobId.toString(), req.body.toAgent ?? true);
        break;
      default:
        return res.status(400).json({ error: 'Unknown event type' });
    }

    res.json({
      success: true,
      simulated: true,
      eventType,
      result
    });
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed', details: err.message });
  }
});

// Event processors

async function processJobFunded(event) {
  const txHash = event.transactionHash;
  const logIndex = event.index;
  const chainJobId = event.args[0].toString();

  // Check if already processed
  const existing = db.prepare(
    'SELECT 1 FROM processed_events WHERE tx_hash = ? AND log_index = ?'
  ).get(txHash, logIndex);

  if (existing) {
    return { event: 'JobFunded', chainJobId, processed: false, reason: 'already processed' };
  }

  const result = handleJobFunded(chainJobId, txHash);

  // Mark as processed
  db.prepare(`
    INSERT INTO processed_events (tx_hash, log_index, event_type, chain_job_id)
    VALUES (?, ?, 'JobFunded', ?)
  `).run(txHash, logIndex, chainJobId);

  return { event: 'JobFunded', chainJobId, processed: true, result };
}

async function processPaymentReleased(event) {
  const txHash = event.transactionHash;
  const logIndex = event.index;
  const chainJobId = event.args[0].toString();
  const agentAddress = event.args[1];

  const existing = db.prepare(
    'SELECT 1 FROM processed_events WHERE tx_hash = ? AND log_index = ?'
  ).get(txHash, logIndex);

  if (existing) {
    return { event: 'PaymentReleased', chainJobId, processed: false, reason: 'already processed' };
  }

  const result = handlePaymentReleased(chainJobId, agentAddress);

  db.prepare(`
    INSERT INTO processed_events (tx_hash, log_index, event_type, chain_job_id)
    VALUES (?, ?, 'PaymentReleased', ?)
  `).run(txHash, logIndex, chainJobId);

  return { event: 'PaymentReleased', chainJobId, processed: true, result };
}

async function processDisputed(event) {
  const txHash = event.transactionHash;
  const logIndex = event.index;
  const chainJobId = event.args[0].toString();

  const existing = db.prepare(
    'SELECT 1 FROM processed_events WHERE tx_hash = ? AND log_index = ?'
  ).get(txHash, logIndex);

  if (existing) {
    return { event: 'Disputed', chainJobId, processed: false, reason: 'already processed' };
  }

  const result = handleDisputed(chainJobId);

  db.prepare(`
    INSERT INTO processed_events (tx_hash, log_index, event_type, chain_job_id)
    VALUES (?, ?, 'Disputed', ?)
  `).run(txHash, logIndex, chainJobId);

  return { event: 'Disputed', chainJobId, processed: true, result };
}

async function processResolved(event) {
  const txHash = event.transactionHash;
  const logIndex = event.index;
  const chainJobId = event.args[0].toString();
  const toAgent = event.args[1];

  const existing = db.prepare(
    'SELECT 1 FROM processed_events WHERE tx_hash = ? AND log_index = ?'
  ).get(txHash, logIndex);

  if (existing) {
    return { event: 'Resolved', chainJobId, processed: false, reason: 'already processed' };
  }

  const result = handleResolved(chainJobId, toAgent);

  db.prepare(`
    INSERT INTO processed_events (tx_hash, log_index, event_type, chain_job_id)
    VALUES (?, ?, 'Resolved', ?)
  `).run(txHash, logIndex, chainJobId);

  return { event: 'Resolved', chainJobId, toAgent, processed: true, result };
}

// Event handlers - update database state

function handleJobFunded(chainJobId, txHash = null) {
  // Find job by escrow_tx or by matching chain job ID pattern
  // For MVP, we'll match jobs by escrow_tx containing the chain job ID
  // In production, you'd store the on-chain job ID when creating the job
  
  const now = new Date().toISOString();
  
  // Try to find job - for MVP, update the most recent 'created' job
  // In production, you'd have a chain_job_id column
  const job = db.prepare(`
    SELECT * FROM jobs WHERE status = 'created' ORDER BY created_at DESC LIMIT 1
  `).get();

  if (!job) {
    return { updated: false, reason: 'No matching job found in created status' };
  }

  db.prepare(`
    UPDATE jobs SET status = 'funded', escrow_tx = COALESCE(escrow_tx, ?), updated_at = ?
    WHERE id = ?
  `).run(txHash, now, job.id);

  // Log activity
  logActivity(job.id, 'system', 'chain_event', `Job funded on-chain (jobId: ${chainJobId})`);

  return { updated: true, jobId: job.id, newStatus: 'funded' };
}

function handlePaymentReleased(chainJobId, agentAddress) {
  const now = new Date().toISOString();

  // Find matching job
  const job = db.prepare(`
    SELECT j.*, a.id as agent_db_id, a.jobs_completed, a.trust_tier
    FROM jobs j
    JOIN agents a ON j.agent_id = a.id
    WHERE j.status IN ('review', 'in_progress', 'funded')
    AND LOWER(a.wallet_address) = LOWER(?)
    ORDER BY j.updated_at DESC
    LIMIT 1
  `).get(agentAddress);

  if (!job) {
    // Try without agent address match for MVP
    const anyJob = db.prepare(`
      SELECT j.*, a.id as agent_db_id, a.jobs_completed, a.trust_tier
      FROM jobs j
      JOIN agents a ON j.agent_id = a.id  
      WHERE j.status IN ('review', 'in_progress', 'funded')
      ORDER BY j.updated_at DESC
      LIMIT 1
    `).get();

    if (!anyJob) {
      return { updated: false, reason: 'No matching job found' };
    }

    return processPaymentForJob(anyJob, chainJobId, now);
  }

  return processPaymentForJob(job, chainJobId, now);
}

function processPaymentForJob(job, chainJobId, now) {
  // Update job to completed
  db.prepare(`
    UPDATE jobs SET status = 'completed', updated_at = ?
    WHERE id = ?
  `).run(now, job.id);

  // Increment agent's jobs_completed
  const newJobsCompleted = job.jobs_completed + 1;
  db.prepare(`
    UPDATE agents SET jobs_completed = ?, updated_at = ?
    WHERE id = ?
  `).run(newJobsCompleted, now, job.agent_db_id);

  // Check and update tier
  const newTier = calculateTier(newJobsCompleted);
  if (newTier !== job.trust_tier) {
    db.prepare(`
      UPDATE agents SET trust_tier = ?, updated_at = ?
      WHERE id = ?
    `).run(newTier, now, job.agent_db_id);
  }

  // Log activity
  logActivity(job.id, 'system', 'chain_event', `Payment released on-chain (jobId: ${chainJobId})`);

  return {
    updated: true,
    jobId: job.id,
    newStatus: 'completed',
    agentId: job.agent_db_id,
    newJobsCompleted,
    tierUpdated: newTier !== job.trust_tier,
    newTier
  };
}

function handleDisputed(chainJobId) {
  const now = new Date().toISOString();

  // Find matching job
  const job = db.prepare(`
    SELECT * FROM jobs WHERE status IN ('funded', 'in_progress', 'review')
    ORDER BY updated_at DESC LIMIT 1
  `).get();

  if (!job) {
    return { updated: false, reason: 'No matching job found' };
  }

  db.prepare(`
    UPDATE jobs SET status = 'disputed', updated_at = ?
    WHERE id = ?
  `).run(now, job.id);

  logActivity(job.id, 'system', 'chain_event', `Job disputed on-chain (jobId: ${chainJobId})`);

  return { updated: true, jobId: job.id, newStatus: 'disputed' };
}

function handleResolved(chainJobId, toAgent) {
  const now = new Date().toISOString();

  // Find matching disputed job
  const job = db.prepare(`
    SELECT j.*, a.id as agent_db_id, a.jobs_completed, a.trust_tier
    FROM jobs j
    JOIN agents a ON j.agent_id = a.id
    WHERE j.status = 'disputed'
    ORDER BY j.updated_at DESC
    LIMIT 1
  `).get();

  if (!job) {
    return { updated: false, reason: 'No matching disputed job found' };
  }

  const newStatus = toAgent ? 'completed' : 'created'; // refunded back to created

  db.prepare(`
    UPDATE jobs SET status = ?, updated_at = ?
    WHERE id = ?
  `).run(newStatus, now, job.id);

  // If resolved in agent's favor, count as completed
  if (toAgent) {
    const newJobsCompleted = job.jobs_completed + 1;
    db.prepare(`
      UPDATE agents SET jobs_completed = ?, updated_at = ?
      WHERE id = ?
    `).run(newJobsCompleted, now, job.agent_db_id);

    const newTier = calculateTier(newJobsCompleted);
    if (newTier !== job.trust_tier) {
      db.prepare(`
        UPDATE agents SET trust_tier = ?, updated_at = ?
        WHERE id = ?
      `).run(newTier, now, job.agent_db_id);
    }
  }

  logActivity(job.id, 'system', 'chain_event', 
    `Dispute resolved on-chain (jobId: ${chainJobId}, ${toAgent ? 'in favor of agent' : 'refunded to client'})`
  );

  return { updated: true, jobId: job.id, newStatus, resolvedToAgent: toAgent };
}

// Helpers

function calculateTier(jobsCompleted) {
  if (jobsCompleted >= TIER_THRESHOLDS.premium) return 'premium';
  if (jobsCompleted >= TIER_THRESHOLDS.verified) return 'verified';
  if (jobsCompleted >= TIER_THRESHOLDS.rising) return 'rising';
  return 'free';
}

function logActivity(jobId, actorWallet, action, details) {
  const { v4: uuidv4 } = require('uuid');
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO job_activity (id, job_id, actor_wallet, action, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, jobId, actorWallet, action, details, now);
}

module.exports = router;
