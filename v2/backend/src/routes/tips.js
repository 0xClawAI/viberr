const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { walletAuth, optionalWalletAuth } = require('../middleware/auth');

const router = express.Router();

// Initialize tips table
db.exec(`
  CREATE TABLE IF NOT EXISTS tips (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    tipper_wallet TEXT NOT NULL,
    amount_usdc REAL NOT NULL,
    message TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tips_job ON tips(job_id);
  CREATE INDEX IF NOT EXISTS idx_tips_agent ON tips(agent_id);
`);

// POST /api/jobs/:id/tip - Create a tip
router.post('/:id/tip', walletAuth, (req, res) => {
  const jobId = req.params.id;
  const { amount, message = '' } = req.body;
  const tipperWallet = req.walletAddress;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid tip amount required' });
  }

  try {
    // Get job and verify it's completed
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!['completed', 'hardening'].includes(job.status)) {
      return res.status(400).json({ error: 'Can only tip completed or hardening jobs' });
    }

    // Verify tipper is the client
    if (job.client_wallet.toLowerCase() !== tipperWallet.toLowerCase()) {
      return res.status(403).json({ error: 'Only job client can leave tips' });
    }

    // Create tip
    const tipId = uuidv4();
    db.prepare(`
      INSERT INTO tips (id, job_id, agent_id, tipper_wallet, amount_usdc, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tipId, jobId, job.agent_id, tipperWallet, amount, message);

    // Add activity log
    db.prepare(`
      INSERT INTO job_activity (id, job_id, actor_wallet, action, metadata)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      jobId,
      tipperWallet,
      'tip_sent',
      JSON.stringify({ amount, message })
    );

    const tip = db.prepare('SELECT * FROM tips WHERE id = ?').get(tipId);

    res.json({
      success: true,
      tip
    });
  } catch (err) {
    console.error('Error creating tip:', err);
    res.status(500).json({ error: 'Failed to create tip' });
  }
});

// GET /api/agents/:id/tips - Get tips for an agent
router.get('/:id/tips', (req, res) => {
  const agentId = req.params.id;

  try {
    const tips = db.prepare(`
      SELECT 
        t.*,
        j.title as job_title
      FROM tips t
      LEFT JOIN jobs j ON t.job_id = j.id
      WHERE t.agent_id = ?
      ORDER BY t.created_at DESC
    `).all(agentId);

    res.json({ tips });
  } catch (err) {
    console.error('Error fetching tips:', err);
    res.status(500).json({ error: 'Failed to fetch tips' });
  }
});

// GET /api/agents/:id/stats - Get agent stats including tips
router.get('/:id/stats', (req, res) => {
  const agentId = req.params.id;

  try {
    // Get agent basic info
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get tip stats
    const tipStats = db.prepare(`
      SELECT 
        COALESCE(SUM(amount_usdc), 0) as total_tips,
        COUNT(*) as tip_count
      FROM tips
      WHERE agent_id = ?
    `).get(agentId);

    // Get average rating (if ratings exist - placeholder for future)
    const avgRating = null; // TODO: Implement ratings system

    res.json({
      agentId,
      totalTips: tipStats.total_tips || 0,
      tipCount: tipStats.tip_count || 0,
      avgRating,
      jobsCompleted: agent.jobs_completed || 0
    });
  } catch (err) {
    console.error('Error fetching agent stats:', err);
    res.status(500).json({ error: 'Failed to fetch agent stats' });
  }
});

module.exports = router;
