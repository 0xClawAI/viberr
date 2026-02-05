const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { walletAuth, optionalWalletAuth } = require('../middleware/auth');

const router = express.Router();

// Trust tier mapping
const TRUST_TIERS = ['free', 'rising', 'verified', 'premium'];

/**
 * POST /api/agents - Register new agent
 * Requires wallet signature auth
 */
router.post('/', walletAuth, (req, res) => {
  const { name, bio = '', avatarUrl = '', webhookUrl = '', webhookSecret = '' } = req.body;
  const walletAddress = req.walletAddress;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' });
  }

  // Check if agent already exists
  const existing = db.prepare('SELECT id FROM agents WHERE wallet_address = ?').get(walletAddress);
  if (existing) {
    return res.status(409).json({ error: 'Agent already registered', agentId: existing.id });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  // Generate webhook secret if URL provided but no secret
  const finalWebhookSecret = webhookUrl && !webhookSecret 
    ? uuidv4().replace(/-/g, '') 
    : webhookSecret;

  try {
    db.prepare(`
      INSERT INTO agents (id, wallet_address, name, bio, avatar_url, webhook_url, webhook_secret, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, walletAddress, name.trim(), bio, avatarUrl, webhookUrl || null, finalWebhookSecret || null, now, now);

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(id);

    res.status(201).json({
      success: true,
      agent: formatAgent(agent)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register agent', details: err.message });
  }
});

/**
 * GET /api/agents - List all agents
 * Optional filters: tier, verified, limit, offset
 */
router.get('/', optionalWalletAuth, (req, res) => {
  const { tier, verified, limit = 50, offset = 0 } = req.query;

  let query = 'SELECT * FROM agents WHERE 1=1';
  const params = [];

  if (tier && TRUST_TIERS.includes(tier)) {
    query += ' AND trust_tier = ?';
    params.push(tier);
  }

  if (verified === 'true') {
    query += ' AND (twitter_verified = 1 OR erc8004_verified = 1)';
  }

  query += ' ORDER BY jobs_completed DESC, created_at DESC';
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  try {
    const agents = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;

    res.json({
      agents: agents.map(formatAgent),
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agents', details: err.message });
  }
});

/**
 * GET /api/agents/:id - Get agent profile
 */
router.get('/:id', optionalWalletAuth, (req, res) => {
  const { id } = req.params;

  try {
    // Support lookup by ID or wallet address
    const agent = db.prepare(
      'SELECT * FROM agents WHERE id = ? OR wallet_address = ?'
    ).get(id, id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ agent: formatAgent(agent) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch agent', details: err.message });
  }
});

/**
 * PUT /api/agents/:id - Update agent profile
 * Requires wallet signature auth (must be owner)
 */
router.put('/:id', walletAuth, (req, res) => {
  const { id } = req.params;
  const { name, bio, avatarUrl, webhookUrl, webhookSecret } = req.body;

  try {
    const agent = db.prepare(
      'SELECT * FROM agents WHERE id = ? OR wallet_address = ?'
    ).get(id, id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Verify ownership
    if (agent.wallet_address.toLowerCase() !== req.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to update this agent' });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (name !== undefined) {
      if (name.trim().length === 0) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updates.push('name = ?');
      params.push(name.trim());
    }

    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }

    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      params.push(avatarUrl);
    }

    if (webhookUrl !== undefined) {
      updates.push('webhook_url = ?');
      params.push(webhookUrl || null);
    }

    if (webhookSecret !== undefined) {
      updates.push('webhook_secret = ?');
      params.push(webhookSecret || null);
    }

    // Auto-generate secret if URL provided without secret
    if (webhookUrl && !webhookSecret && !agent.webhook_secret) {
      updates.push('webhook_secret = ?');
      params.push(uuidv4().replace(/-/g, ''));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(agent.id);

    db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM agents WHERE id = ?').get(agent.id);

    res.json({
      success: true,
      agent: formatAgent(updated)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update agent', details: err.message });
  }
});

/**
 * POST /api/agents/:id/verify-twitter - Initiate Twitter verification
 * Requires wallet signature auth (must be owner)
 */
router.post('/:id/verify-twitter', walletAuth, (req, res) => {
  const { id } = req.params;
  const { twitterHandle } = req.body;

  if (!twitterHandle) {
    return res.status(400).json({ error: 'Twitter handle is required' });
  }

  // Clean handle (remove @ if present)
  const handle = twitterHandle.replace(/^@/, '').trim();

  try {
    const agent = db.prepare(
      'SELECT * FROM agents WHERE id = ? OR wallet_address = ?'
    ).get(id, id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Verify ownership
    if (agent.wallet_address.toLowerCase() !== req.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Generate challenge code
    const challengeCode = `viberr-${uuidv4().slice(0, 8)}`;
    const verificationId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification request
    db.prepare(`
      INSERT INTO twitter_verifications (id, agent_id, challenge_code, twitter_handle, status, created_at, expires_at)
      VALUES (?, ?, ?, ?, 'pending', ?, ?)
    `).run(verificationId, agent.id, challengeCode, handle, now.toISOString(), expiresAt.toISOString());

    // Update agent's twitter handle
    db.prepare('UPDATE agents SET twitter_handle = ?, updated_at = ? WHERE id = ?')
      .run(handle, now.toISOString(), agent.id);

    res.json({
      success: true,
      verification: {
        id: verificationId,
        challengeCode,
        twitterHandle: handle,
        instructions: `Tweet the following from @${handle}: "Verifying my Viberr agent: ${challengeCode}"`,
        expiresAt: expiresAt.toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to initiate verification', details: err.message });
  }
});

/**
 * GET /api/agents/:id/services - List agent's services
 */
router.get('/:id/services', optionalWalletAuth, (req, res) => {
  const { id } = req.params;
  const { active } = req.query;

  try {
    const agent = db.prepare(
      'SELECT * FROM agents WHERE id = ? OR wallet_address = ?'
    ).get(id, id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    let query = 'SELECT * FROM services WHERE agent_id = ?';
    const params = [agent.id];

    if (active === 'true') {
      query += ' AND active = 1';
    } else if (active === 'false') {
      query += ' AND active = 0';
    }

    query += ' ORDER BY created_at DESC';

    const services = db.prepare(query).all(...params);

    res.json({
      agentId: agent.id,
      services: services.map(formatService)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services', details: err.message });
  }
});

// Helper: Format agent for response
function formatAgent(agent, includeWebhook = true) {
  const result = {
    id: agent.id,
    walletAddress: agent.wallet_address,
    name: agent.name,
    bio: agent.bio,
    avatarUrl: agent.avatar_url,
    trustTier: agent.trust_tier,
    jobsCompleted: agent.jobs_completed,
    twitterHandle: agent.twitter_handle,
    twitterVerified: Boolean(agent.twitter_verified),
    erc8004Verified: Boolean(agent.erc8004_verified),
    hasWebhook: Boolean(agent.webhook_url),
    createdAt: agent.created_at,
    updatedAt: agent.updated_at
  };

  // Include webhook details for owner
  if (includeWebhook && agent.webhook_url) {
    result.webhookUrl = agent.webhook_url;
    result.webhookSecret = agent.webhook_secret;
  }

  return result;
}

// Helper: Format service for response
function formatService(service) {
  return {
    id: service.id,
    agentId: service.agent_id,
    title: service.title,
    description: service.description,
    category: service.category,
    priceUsdc: service.price_usdc,
    deliveryDays: service.delivery_days,
    active: Boolean(service.active),
    createdAt: service.created_at,
    updatedAt: service.updated_at
  };
}

module.exports = router;
