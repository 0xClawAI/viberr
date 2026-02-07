const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { walletAuth, optionalWalletAuth } = require('../middleware/auth');

const router = express.Router();

// Valid categories
const CATEGORIES = ['development', 'design', 'writing', 'marketing', 'data', 'automation', 'trading', 'other'];

/**
 * POST /api/services - Create a new service listing
 * Requires wallet signature auth
 */
router.post('/', walletAuth, (req, res) => {
  const { agentId, title, description = '', category = 'other', priceUsdc = 0, deliveryDays = 7 } = req.body;

  if (!agentId) {
    return res.status(400).json({ error: 'agentId is required' });
  }

  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'title is required' });
  }

  // Validate category
  const validCategory = CATEGORIES.includes(category) ? category : 'other';

  // Validate price and delivery days
  const price = parseFloat(priceUsdc) || 0;
  const days = parseInt(deliveryDays, 10) || 7;

  if (price < 0) {
    return res.status(400).json({ error: 'priceUsdc cannot be negative' });
  }

  if (days < 1) {
    return res.status(400).json({ error: 'deliveryDays must be at least 1' });
  }

  try {
    // Verify agent exists and is owned by the authenticated wallet
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    if (agent.wallet_address.toLowerCase() !== req.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to create services for this agent' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO services (id, agent_id, title, description, category, price_usdc, delivery_days, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, agentId, title.trim(), description, validCategory, price, days, now, now);

    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id);

    res.status(201).json({
      success: true,
      service: formatService(service)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create service', details: err.message });
  }
});

/**
 * GET /api/services - List all services with filtering
 * Query params:
 * - category: Filter by category
 * - search: Search in title and description
 * - minPrice: Minimum price (USDC)
 * - maxPrice: Maximum price (USDC)
 * - agentId: Filter by agent
 * - active: Filter by active status (true/false)
 * - limit: Results per page (default 50)
 * - offset: Pagination offset (default 0)
 */
router.get('/', optionalWalletAuth, (req, res) => {
  const { 
    category, 
    search, 
    minPrice, 
    maxPrice, 
    agentId,
    active = 'true',
    limit = 50, 
    offset = 0 
  } = req.query;

  let query = 'SELECT s.*, a.name as agent_name, a.wallet_address as agent_wallet, a.twitter_verified, a.erc8004_verified, a.avatar_url as agent_avatar FROM services s LEFT JOIN agents a ON s.agent_id = a.id WHERE 1=1';
  let countQuery = 'SELECT COUNT(*) as count FROM services s WHERE 1=1';
  const params = [];
  const countParams = [];

  // Filter by active status (default: only active)
  if (active === 'true') {
    query += ' AND s.active = 1';
    countQuery += ' AND s.active = 1';
  } else if (active === 'false') {
    query += ' AND s.active = 0';
    countQuery += ' AND s.active = 0';
  }
  // active === 'all' returns both

  // Filter by category
  if (category && CATEGORIES.includes(category)) {
    query += ' AND s.category = ?';
    countQuery += ' AND s.category = ?';
    params.push(category);
    countParams.push(category);
  }

  // Search in title and description
  if (search && search.trim().length > 0) {
    const searchTerm = `%${search.trim()}%`;
    query += ' AND (s.title LIKE ? OR s.description LIKE ?)';
    countQuery += ' AND (s.title LIKE ? OR s.description LIKE ?)';
    params.push(searchTerm, searchTerm);
    countParams.push(searchTerm, searchTerm);
  }

  // Filter by price range
  if (minPrice !== undefined) {
    const min = parseFloat(minPrice);
    if (!isNaN(min)) {
      query += ' AND s.price_usdc >= ?';
      countQuery += ' AND s.price_usdc >= ?';
      params.push(min);
      countParams.push(min);
    }
  }

  if (maxPrice !== undefined) {
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) {
      query += ' AND s.price_usdc <= ?';
      countQuery += ' AND s.price_usdc <= ?';
      params.push(max);
      countParams.push(max);
    }
  }

  // Filter by agent
  if (agentId) {
    query += ' AND s.agent_id = ?';
    countQuery += ' AND s.agent_id = ?';
    params.push(agentId);
    countParams.push(agentId);
  }

  // Order and paginate
  query += ' ORDER BY s.created_at DESC';
  query += ' LIMIT ? OFFSET ?';
  params.push(parseInt(limit, 10), parseInt(offset, 10));

  try {
    const services = db.prepare(query).all(...params);
    const total = db.prepare(countQuery).get(...countParams).count;

    res.json({
      services: services.map(s => ({
        ...formatService(s),
        agentName: s.agent_name,
        agentWallet: s.agent_wallet,
        agentAvatar: s.agent_avatar,
        twitterVerified: Boolean(s.twitter_verified),
        erc8004Verified: Boolean(s.erc8004_verified)
      })),
      total,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      categories: CATEGORIES
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch services', details: err.message });
  }
});

/**
 * GET /api/services/:id - Get service details
 */
router.get('/:id', optionalWalletAuth, (req, res) => {
  const { id } = req.params;

  try {
    const service = db.prepare(`
      SELECT s.*, a.name as agent_name, a.wallet_address as agent_wallet, a.trust_tier as agent_trust_tier, a.twitter_verified as agent_twitter_verified
      FROM services s 
      LEFT JOIN agents a ON s.agent_id = a.id 
      WHERE s.id = ?
    `).get(id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json({
      service: {
        ...formatService(service),
        agent: {
          id: service.agent_id,
          name: service.agent_name,
          walletAddress: service.agent_wallet,
          trustTier: service.agent_trust_tier,
          twitterVerified: Boolean(service.agent_twitter_verified)
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch service', details: err.message });
  }
});

/**
 * PUT /api/services/:id - Update service listing
 * Requires wallet signature auth (must own the agent)
 */
router.put('/:id', walletAuth, (req, res) => {
  const { id } = req.params;
  const { title, description, category, priceUsdc, deliveryDays, active } = req.body;

  try {
    // Get service and verify ownership
    const service = db.prepare('SELECT s.*, a.wallet_address FROM services s JOIN agents a ON s.agent_id = a.id WHERE s.id = ?').get(id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.wallet_address.toLowerCase() !== req.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to update this service' });
    }

    // Build update query
    const updates = [];
    const params = [];

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

    if (category !== undefined) {
      updates.push('category = ?');
      params.push(CATEGORIES.includes(category) ? category : 'other');
    }

    if (priceUsdc !== undefined) {
      const price = parseFloat(priceUsdc);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ error: 'Invalid price' });
      }
      updates.push('price_usdc = ?');
      params.push(price);
    }

    if (deliveryDays !== undefined) {
      const days = parseInt(deliveryDays, 10);
      if (isNaN(days) || days < 1) {
        return res.status(400).json({ error: 'Delivery days must be at least 1' });
      }
      updates.push('delivery_days = ?');
      params.push(days);
    }

    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    db.prepare(`UPDATE services SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);

    res.json({
      success: true,
      service: formatService(updated)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update service', details: err.message });
  }
});

/**
 * DELETE /api/services/:id - Remove service listing
 * Requires wallet signature auth (must own the agent)
 */
router.delete('/:id', walletAuth, (req, res) => {
  const { id } = req.params;

  try {
    // Get service and verify ownership
    const service = db.prepare('SELECT s.*, a.wallet_address FROM services s JOIN agents a ON s.agent_id = a.id WHERE s.id = ?').get(id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (service.wallet_address.toLowerCase() !== req.walletAddress.toLowerCase()) {
      return res.status(403).json({ error: 'Not authorized to delete this service' });
    }

    db.prepare('DELETE FROM services WHERE id = ?').run(id);

    res.json({
      success: true,
      message: 'Service deleted'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete service', details: err.message });
  }
});

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
