const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// Generate short ID (same format as interview routes)
const shortId = () => uuidv4().split('-')[0];

/**
 * POST /api/demo/submit
 * Create a demo job and start interview automatically
 * Body: { projectType, description, twitterHandle? }
 */
router.post('/submit', async (req, res) => {
  const transaction = db.transaction(() => {
    const { projectType, description, twitterHandle } = req.body;
    
    if (!projectType || !description) {
      throw new Error('projectType and description are required');
    }
    
    const jobId = shortId();
    const interviewId = shortId();
    
    // Create demo job - assigned to demo agent, no payment
    db.prepare(`
      INSERT INTO jobs (
        id, client_wallet, agent_id, service_id, title, description, 
        price_usdc, status, is_demo, submitter_twitter
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jobId,
      'demo-user',           // placeholder wallet for demo
      'demo-agent',          // special demo agent
      null,                  // no service linked
      projectType,
      description,
      0,                     // demo jobs are free
      'pending',             // standard status
      1,                     // is_demo = true
      twitterHandle || null
    );
    
    // Create interview record with demo flag
    db.prepare(`
      INSERT INTO interviews (
        id, wallet_address, status, is_demo, 
        project_type, submitter_twitter
      )
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      interviewId,
      'demo-user',
      'in_progress',
      1,                     // is_demo = true
      projectType,
      twitterHandle || null
    );
    
    // Save initial user message
    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content)
      VALUES (?, ?, ?, ?)
    `).run(
      shortId(),
      interviewId,
      'user',
      `I need a ${projectType}: ${description}`
    );
    
    // Add initial AI greeting (simulate agent response)
    db.prepare(`
      INSERT INTO interview_messages (id, interview_id, role, content)
      VALUES (?, ?, ?, ?)
    `).run(
      shortId(),
      interviewId,
      'assistant',
      `Thanks for your interest! I'd love to help you build your ${projectType}. Let me ask you a few questions to understand your requirements better.\n\nFirst, who is the target audience for this project?`
    );
    
    return { jobId, interviewId, projectType };
  });

  try {
    const result = transaction(req.body);
    
    res.json({
      success: true,
      jobId: result.jobId,
      interviewId: result.interviewId,
      dashboardUrl: `https://viberr.fun/interview/${result.interviewId}`,
      message: 'Demo interview started! You can now chat with the AI to refine your requirements.',
      note: 'This is a demo - no real payment or agent assignment will occur.'
    });
    
  } catch (error) {
    console.error('Demo submit error:', error);
    res.status(400).json({ 
      error: error.message || 'Failed to create demo job'
    });
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
