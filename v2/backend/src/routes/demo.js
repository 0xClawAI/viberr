const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

/**
 * POST /api/demo/submit
 * Create a demo job (no auth required)
 * Body: { projectType, description, twitterHandle? }
 */
router.post('/submit', async (req, res) => {
  try {
    const { projectType, description, twitterHandle } = req.body;
    
    if (!projectType || !description) {
      return res.status(400).json({ 
        error: 'projectType and description are required' 
      });
    }
    
    const jobId = crypto.randomUUID();
    const interviewId = crypto.randomUUID();
    
    // Create demo job - no agent assigned yet, minimal wallet
    const stmt = db.prepare(`
      INSERT INTO jobs (id, client_wallet, agent_id, title, description, price_usdc, status, is_demo, submitter_twitter)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      jobId,
      'demo-user',           // placeholder wallet
      'unassigned',          // no agent yet
      projectType,
      description,
      0,                     // demo = free
      'demo_pending',        // special demo status
      1,                     // is_demo = true
      twitterHandle || null
    );
    
    // Create interview record
    const interviewStmt = db.prepare(`
      INSERT INTO interviews (id, job_id, status, questions, answers, spec)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    try {
      interviewStmt.run(
        interviewId,
        jobId,
        'pending',
        '[]',
        '[]',
        null
      );
    } catch (e) {
      // interviews table might not exist, that's ok
      console.log('Note: interviews table not available for demo');
    }
    
    res.json({
      success: true,
      jobId,
      interviewId,
      dashboardUrl: `https://viberr.fun/jobs/${jobId}`,
      message: 'Demo job created! Visit your dashboard to see the job status.',
      note: 'This is a demo job - no real payment or agent assignment.'
    });
    
  } catch (error) {
    console.error('Demo submit error:', error);
    res.status(500).json({ error: 'Failed to create demo job' });
  }
});

/**
 * GET /api/demo/jobs
 * List all demo jobs (public gallery)
 */
router.get('/jobs', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        id,
        title,
        description,
        status,
        submitter_twitter,
        created_at,
        updated_at
      FROM jobs 
      WHERE is_demo = 1
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    const jobs = stmt.all();
    
    res.json({
      success: true,
      count: jobs.length,
      jobs: jobs.map(job => ({
        ...job,
        dashboardUrl: `https://viberr.fun/jobs/${job.id}`
      }))
    });
    
  } catch (error) {
    console.error('Demo jobs list error:', error);
    res.status(500).json({ error: 'Failed to fetch demo jobs' });
  }
});

/**
 * GET /api/demo/jobs/:id
 * Get a single demo job
 */
router.get('/jobs/:id', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM jobs WHERE id = ? AND is_demo = 1
    `);
    
    const job = stmt.get(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Demo job not found' });
    }
    
    res.json({
      success: true,
      job: {
        ...job,
        dashboardUrl: `https://viberr.fun/jobs/${job.id}`
      }
    });
    
  } catch (error) {
    console.error('Demo job fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch demo job' });
  }
});

/**
 * GET /api/demo/stats
 * Demo mode statistics
 */
router.get('/stats', (req, res) => {
  try {
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
    const demoJobCount = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE is_demo = 1').get();
    const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services WHERE active = 1').get();
    
    res.json({
      success: true,
      stats: {
        agents: agentCount.count,
        demoJobs: demoJobCount.count,
        services: serviceCount.count
      }
    });
    
  } catch (error) {
    console.error('Demo stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
