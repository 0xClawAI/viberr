const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { walletAuth: requireAuth, optionalWalletAuth } = require('../middleware/auth');
const axios = require('axios');

// Generate short ID
const shortId = () => uuidv4().split('-')[0];

// Initialize interview tables
db.exec(`
  CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    agent_id TEXT,
    service_id TEXT,
    status TEXT DEFAULT 'in_progress',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS interview_messages (
    id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id)
  );

  CREATE TABLE IF NOT EXISTS interview_specs (
    id TEXT PRIMARY KEY,
    interview_id TEXT UNIQUE NOT NULL,
    spec_document TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id)
  );

  CREATE INDEX IF NOT EXISTS idx_interview_wallet ON interviews(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_messages_interview ON interview_messages(interview_id);
`);

// Migrate: add webhook columns to agents table if missing
try {
  db.exec(`ALTER TABLE agents ADD COLUMN webhook_url TEXT`);
} catch (e) { /* column exists */ }
try {
  db.exec(`ALTER TABLE agents ADD COLUMN webhook_secret TEXT`);
} catch (e) { /* column exists */ }

// In-memory SSE connections storage
const sseConnections = new Map(); // interviewId -> Set<res>

// Helper: Get agent profile with webhook info
function getAgent(agentId) {
  return db.prepare(`
    SELECT id, name, bio, avatar_url, trust_tier, webhook_url, webhook_secret
    FROM agents WHERE id = ?
  `).get(agentId);
}

// Helper: Get service details
function getService(serviceId) {
  return db.prepare(`
    SELECT id, title, description, category, price_usdc, delivery_days
    FROM services WHERE id = ?
  `).get(serviceId);
}

// Helper: Get conversation history
function getConversation(interviewId) {
  return db.prepare(`
    SELECT role, content, created_at
    FROM interview_messages
    WHERE interview_id = ?
    ORDER BY created_at ASC
  `).all(interviewId);
}

// Helper: Save message to conversation
function saveMessage(interviewId, role, content) {
  const id = shortId();
  db.prepare(`
    INSERT INTO interview_messages (id, interview_id, role, content)
    VALUES (?, ?, ?, ?)
  `).run(id, interviewId, role, content);
  return id;
}

// Helper: Push message to SSE connections
function pushToSSE(interviewId, data) {
  const connections = sseConnections.get(interviewId);
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

// Helper: Build callback URL
function getCallbackUrl(req, interviewId) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}/api/interview/${interviewId}/agent-response`;
}

// Helper: Send webhook to agent
async function sendWebhook(agent, payload, isDemo = false) {
  // Skip webhooks for demo jobs
  if (isDemo) {
    console.log(`[Interview] Skipping webhook for demo interview`);
    return null;
  }

  if (!agent.webhook_url) {
    console.log(`[Interview] Agent ${agent.id} has no webhook_url configured`);
    return null;
  }

  try {
    console.log(`[Interview] Sending webhook to ${agent.webhook_url}:`, payload.type);
    const response = await axios.post(agent.webhook_url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-Viberr-Signature': agent.webhook_secret || ''
      },
      timeout: 30000 // 30s timeout
    });
    return response.data;
  } catch (error) {
    console.error(`[Interview] Webhook error:`, error.message);
    return null;
  }
}

// ============== ROUTES ==============

/**
 * POST /api/interview/start
 * Begin new interview session - sends webhook to agent
 */
router.post('/start', optionalWalletAuth, async (req, res) => {
  try {
    const { agentId, serviceId, clientDescription } = req.body;
    const walletAddress = (req.walletAddress || 'anonymous').toLowerCase();

    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    // Load agent
    const agent = getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Load service if provided
    const service = serviceId ? getService(serviceId) : null;
    if (serviceId && !service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Create interview record
    const interviewId = shortId();
    db.prepare(`
      INSERT INTO interviews (id, wallet_address, agent_id, service_id, status)
      VALUES (?, ?, ?, ?, 'in_progress')
    `).run(interviewId, walletAddress, agentId, serviceId || null);

    // If client provided initial description, save it
    if (clientDescription) {
      saveMessage(interviewId, 'user', clientDescription);
    }

    // Build callback URL
    const callbackUrl = getCallbackUrl(req, interviewId);

    // Send webhook to agent
    const webhookPayload = {
      type: 'interview_start',
      interviewId,
      clientDescription: clientDescription || null,
      service: service ? {
        id: service.id,
        title: service.title,
        description: service.description,
        category: service.category,
        priceUsdc: service.price_usdc,
        deliveryDays: service.delivery_days
      } : null,
      callbackUrl
    };

    // Send webhook (async, don't wait)
    sendWebhook(agent, webhookPayload);

    res.status(201).json({
      id: interviewId,
      status: 'in_progress',
      agentId: agent.id,
      agentName: agent.name,
      agentAvatar: agent.avatar_url,
      hasWebhook: !!agent.webhook_url,
      streamUrl: `/api/interview/${interviewId}/stream`,
      message: agent.webhook_url 
        ? 'Interview started. Connect to SSE stream for real-time updates.'
        : 'Interview started but agent has no webhook configured.'
    });
  } catch (error) {
    console.error('Error starting interview:', error);
    res.status(500).json({ error: 'Failed to start interview', details: error.message });
  }
});

/**
 * POST /api/interview/:id/agent-response
 * Called BY the agent's webhook handler to post responses
 */
router.post('/:id/agent-response', (req, res) => {
  try {
    const interviewId = req.params.id;
    const { secret, message, isComplete, spec } = req.body;

    // Get interview and agent
    const interview = db.prepare(`
      SELECT i.*, a.webhook_secret
      FROM interviews i
      JOIN agents a ON i.agent_id = a.id
      WHERE i.id = ?
    `).get(interviewId);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Validate webhook secret
    if (interview.webhook_secret && interview.webhook_secret !== secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    if (!message && !spec) {
      return res.status(400).json({ error: 'message or spec is required' });
    }

    // Save agent message
    if (message) {
      saveMessage(interviewId, 'assistant', message);
    }

    // Push to SSE connections
    pushToSSE(interviewId, {
      type: 'agent_message',
      message,
      isComplete: !!isComplete,
      timestamp: new Date().toISOString()
    });

    // If interview is complete, save spec and update status
    if (isComplete && spec) {
      const specId = shortId();
      db.prepare(`
        INSERT OR REPLACE INTO interview_specs (id, interview_id, spec_document)
        VALUES (?, ?, ?)
      `).run(specId, interviewId, JSON.stringify(spec));

      db.prepare(`
        UPDATE interviews SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(interviewId);

      pushToSSE(interviewId, {
        type: 'interview_complete',
        specId,
        spec,
        timestamp: new Date().toISOString()
      });
    } else if (isComplete) {
      db.prepare(`
        UPDATE interviews SET status = 'ready_to_generate', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(interviewId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error processing agent response:', error);
    res.status(500).json({ error: 'Failed to process response', details: error.message });
  }
});

/**
 * GET /api/interview/:id/stream
 * SSE endpoint for real-time updates
 */
router.get('/:id/stream', (req, res) => {
  const interviewId = req.params.id;

  // Verify interview exists
  const interview = db.prepare('SELECT id FROM interviews WHERE id = ?').get(interviewId);
  if (!interview) {
    return res.status(404).json({ error: 'Interview not found' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', interviewId })}\n\n`);

  // Send existing messages so client catches up
  const existingMessages = getConversation(interviewId);
  existingMessages.forEach(msg => {
    res.write(`data: ${JSON.stringify({
      type: msg.role === 'assistant' ? 'agent_message' : 'user_message',
      message: msg.content,
      timestamp: msg.created_at,
      isHistory: true
    })}\n\n`);
  });

  // Add to connections
  if (!sseConnections.has(interviewId)) {
    sseConnections.set(interviewId, new Set());
  }
  sseConnections.get(interviewId).add(res);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 30000);

  // Clean up on close
  req.on('close', () => {
    clearInterval(heartbeat);
    const connections = sseConnections.get(interviewId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        sseConnections.delete(interviewId);
      }
    }
  });
});

/**
 * POST /api/interview/:id/answer
 * User submits answer - sends webhook to agent
 */
router.post('/:id/answer', optionalWalletAuth, async (req, res) => {
  try {
    const interviewId = req.params.id;
    const { message, answer } = req.body;
    const userMessage = message || answer;  // Accept both field names

    if (!userMessage) {
      return res.status(400).json({ error: 'message or answer is required' });
    }

    // Get interview with agent info
    const interview = db.prepare(`
      SELECT i.*, a.id as agent_id, a.name as agent_name, a.webhook_url, a.webhook_secret, i.is_demo
      FROM interviews i
      JOIN agents a ON i.agent_id = a.id
      WHERE i.id = ?
    `).get(interviewId);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({ error: 'Interview already completed' });
    }

    // Save user message
    saveMessage(interviewId, 'user', userMessage);

    // Push to SSE
    pushToSSE(interviewId, {
      type: 'user_message',
      message: userMessage,
      timestamp: new Date().toISOString()
    });

    // Get conversation history
    const conversationHistory = getConversation(interviewId);

    // Build callback URL
    const callbackUrl = getCallbackUrl(req, interviewId);

    // Send webhook to agent
    const webhookPayload = {
      type: 'interview_message',
      interviewId,
      userMessage,
      conversationHistory: conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at
      })),
      callbackUrl
    };

    const agent = {
      id: interview.agent_id,
      webhook_url: interview.webhook_url,
      webhook_secret: interview.webhook_secret
    };

    // Send webhook (async) - skip for demo interviews
    sendWebhook(agent, webhookPayload, interview.is_demo === 1);

    res.json({
      success: true,
      message: 'Answer submitted. Waiting for agent response.',
      hasWebhook: !!interview.webhook_url
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    res.status(500).json({ error: 'Failed to submit answer', details: error.message });
  }
});

/**
 * GET /api/interview/:id
 * Get interview status and conversation
 */
router.get('/:id', optionalWalletAuth, (req, res) => {
  try {
    const interview = db.prepare(`
      SELECT i.*, a.name as agent_name, a.avatar_url as agent_avatar, a.webhook_url
      FROM interviews i
      LEFT JOIN agents a ON i.agent_id = a.id
      WHERE i.id = ?
    `).get(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const conversation = getConversation(interview.id);

    // Get spec if exists
    const spec = db.prepare(`
      SELECT * FROM interview_specs WHERE interview_id = ?
    `).get(interview.id);

    res.json({
      id: interview.id,
      status: interview.status,
      agentId: interview.agent_id,
      agentName: interview.agent_name || 'Viberr Agent',
      agentAvatar: interview.agent_avatar,
      hasWebhook: !!interview.webhook_url,
      conversation: conversation.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at
      })),
      spec: spec ? JSON.parse(spec.spec_document) : null,
      streamUrl: `/api/interview/${interview.id}/stream`,
      createdAt: interview.created_at,
      updatedAt: interview.updated_at
    });
  } catch (error) {
    console.error('Error getting interview:', error);
    res.status(500).json({ error: 'Failed to get interview' });
  }
});

/**
 * GET /api/interview/:id/spec
 * Get generated spec
 */
router.get('/:id/spec', optionalWalletAuth, (req, res) => {
  try {
    const interview = db.prepare(`
      SELECT * FROM interviews WHERE id = ?
    `).get(req.params.id);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    const spec = db.prepare(`
      SELECT * FROM interview_specs WHERE interview_id = ?
    `).get(interview.id);

    if (!spec) {
      return res.status(404).json({ error: 'Spec not yet generated' });
    }

    res.json({
      id: spec.id,
      interviewId: interview.id,
      spec: JSON.parse(spec.spec_document),
      createdAt: spec.created_at
    });
  } catch (error) {
    console.error('Error getting spec:', error);
    res.status(500).json({ error: 'Failed to get spec' });
  }
});

/**
 * POST /api/interview/:id/request-spec
 * Request agent to generate final spec (sends webhook)
 */
router.post('/:id/request-spec', optionalWalletAuth, async (req, res) => {
  try {
    const interviewId = req.params.id;

    // Get interview with agent info
    const interview = db.prepare(`
      SELECT i.*, a.id as agent_id, a.webhook_url, a.webhook_secret, i.is_demo
      FROM interviews i
      JOIN agents a ON i.agent_id = a.id
      WHERE i.id = ?
    `).get(interviewId);

    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    // Get conversation history
    const conversationHistory = getConversation(interviewId);

    if (conversationHistory.length < 2) {
      return res.status(400).json({
        error: 'Not enough conversation to generate spec'
      });
    }

    // Build callback URL
    const callbackUrl = getCallbackUrl(req, interviewId);

    // Send webhook requesting spec generation
    const webhookPayload = {
      type: 'generate_spec',
      interviewId,
      conversationHistory: conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at
      })),
      callbackUrl
    };

    const agent = {
      id: interview.agent_id,
      webhook_url: interview.webhook_url,
      webhook_secret: interview.webhook_secret
    };

    sendWebhook(agent, webhookPayload, interview.is_demo === 1);

    res.json({
      success: true,
      message: 'Spec generation requested. Agent will respond via webhook.',
      hasWebhook: !!interview.webhook_url
    });
  } catch (error) {
    console.error('Error requesting spec:', error);
    res.status(500).json({ error: 'Failed to request spec', details: error.message });
  }
});

/**
 * GET /api/interview/agent/:agentId
 * List all interviews for an agent (for agent's dashboard)
 */
router.get('/agent/:agentId', (req, res) => {
  try {
    const { agentId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT i.*, 
        (SELECT COUNT(*) FROM interview_messages WHERE interview_id = i.id) as message_count
      FROM interviews i
      WHERE i.agent_id = ?
    `;
    const params = [agentId];

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const interviews = db.prepare(query).all(...params);

    res.json({
      agentId,
      interviews: interviews.map(i => ({
        id: i.id,
        status: i.status,
        serviceId: i.service_id,
        messageCount: i.message_count,
        createdAt: i.created_at,
        updatedAt: i.updated_at
      })),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (error) {
    console.error('Error listing agent interviews:', error);
    res.status(500).json({ error: 'Failed to list interviews' });
  }
});

module.exports = router;
