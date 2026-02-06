const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Initialize health_checks table
db.exec(`
  CREATE TABLE IF NOT EXISTS health_checks (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    url TEXT NOT NULL,
    status TEXT DEFAULT 'unknown',
    last_checked TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );
  CREATE INDEX IF NOT EXISTS idx_health_checks_job ON health_checks(job_id);
  CREATE INDEX IF NOT EXISTS idx_health_checks_url ON health_checks(url);
`);

/**
 * POST /api/health-checks/register
 * Register a URL to monitor for a job
 * Body: { jobId, url }
 */
router.post('/register', (req, res) => {
  const { jobId, url } = req.body;

  if (!jobId || !url) {
    return res.status(400).json({ error: 'jobId and url are required' });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Check if job exists
  const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Check if URL already registered for this job
  const existing = db.prepare('SELECT id FROM health_checks WHERE job_id = ? AND url = ?').get(jobId, url);
  if (existing) {
    return res.json({ 
      success: true, 
      message: 'URL already registered',
      healthCheckId: existing.id 
    });
  }

  // Register the URL
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO health_checks (id, job_id, url, status, created_at)
    VALUES (?, ?, ?, 'unknown', ?)
  `).run(id, jobId, url, now);

  console.log(`[Health Check] Registered URL for job ${jobId}: ${url}`);

  // Trigger immediate check
  checkUrlHealth(id, url);

  res.status(201).json({
    success: true,
    healthCheckId: id,
    jobId,
    url,
    message: 'URL registered for monitoring'
  });
});

/**
 * GET /api/health-checks/:jobId
 * Get health status for all URLs registered to a job
 */
router.get('/:jobId', (req, res) => {
  const { jobId } = req.params;

  // Check if job exists
  const job = db.prepare('SELECT id FROM jobs WHERE id = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Get all health checks for this job
  const checks = db.prepare(`
    SELECT id, job_id, url, status, last_checked, created_at
    FROM health_checks
    WHERE job_id = ?
    ORDER BY created_at DESC
  `).all(jobId);

  res.json({
    jobId,
    checks: checks.map(c => ({
      id: c.id,
      url: c.url,
      status: c.status,
      lastChecked: c.last_checked,
      createdAt: c.created_at
    })),
    total: checks.length
  });
});

/**
 * Helper: Check URL health
 */
async function checkUrlHealth(id, url) {
  const now = new Date().toISOString();
  let status = 'down';

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: (status) => status >= 200 && status < 500, // Accept 2xx-4xx as "up"
      headers: {
        'User-Agent': 'Viberr-Health-Check/1.0'
      }
    });

    // Consider 2xx and 3xx as "up"
    if (response.status >= 200 && response.status < 400) {
      status = 'up';
    }
  } catch (error) {
    console.error(`[Health Check] Failed to check ${url}:`, error.message);
    status = 'down';
  }

  // Update status in DB
  db.prepare(`
    UPDATE health_checks
    SET status = ?, last_checked = ?
    WHERE id = ?
  `).run(status, now, id);

  return status;
}

/**
 * Background checker: Ping all registered URLs every 5 minutes
 */
let healthCheckInterval = null;

function startHealthCheckMonitor() {
  if (healthCheckInterval) {
    console.log('[Health Check] Monitor already running');
    return;
  }

  console.log('[Health Check] Starting background monitor (5-minute interval)');

  healthCheckInterval = setInterval(async () => {
    const allChecks = db.prepare('SELECT id, url FROM health_checks').all();
    
    if (allChecks.length === 0) {
      return;
    }

    console.log(`[Health Check] Running checks for ${allChecks.length} URLs...`);

    for (const check of allChecks) {
      try {
        await checkUrlHealth(check.id, check.url);
      } catch (error) {
        console.error(`[Health Check] Error checking ${check.url}:`, error.message);
      }
    }

    console.log(`[Health Check] Check cycle complete`);
  }, 5 * 60 * 1000); // 5 minutes
}

function stopHealthCheckMonitor() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('[Health Check] Monitor stopped');
  }
}

// Start monitor on module load
startHealthCheckMonitor();

// Export functions for testing/manual control
router.startMonitor = startHealthCheckMonitor;
router.stopMonitor = stopHealthCheckMonitor;

module.exports = router;
