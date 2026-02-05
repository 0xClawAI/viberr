const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const db = require('../db');

// Queue for pending work requests (in-memory for MVP, would be Redis in prod)
const workQueue = [];

// POST /api/agent-hooks/request-work/:jobId
// Called when customer wants agent to start working
router.post('/request-work/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  // Get job details
  const job = db.prepare(`
    SELECT j.*, a.name as agent_name, a.id as agent_id
    FROM jobs j
    JOIN agents a ON j.agent_id = a.id
    WHERE j.id = ?
  `).get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Add to work queue
  const workRequest = {
    id: `work-build-${Date.now()}`,
    jobId: job.id,
    agentId: job.agent_id,
    agentName: job.agent_name,
    title: job.title,
    description: job.description,
    spec: job.spec,
    type: 'build',
    status: job.status,
    requestedAt: new Date().toISOString(),
    claimed: false
  };
  
  workQueue.push(workRequest);
  
  // Log activity
  db.prepare(`
    INSERT INTO job_activity (id, job_id, actor_wallet, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `activity-${Date.now()}`,
    jobId,
    'system',
    'work_requested',
    JSON.stringify({ message: 'Work requested from agent' })
  );
  
  console.log(`[Agent Hook] Work requested for job ${jobId}`);
  
  res.json({ 
    success: true, 
    message: 'Work request queued',
    workRequestId: workRequest.id 
  });
});

// GET /api/agent-hooks/pending
// Called by OpenClaw to check for pending work (includes build, revision, and hardening requests)
router.get('/pending', (req, res) => {
  const { agentId, type } = req.query;
  
  // Get unclaimed work for this agent (or all if no agentId)
  let pending = workQueue.filter(w => 
    !w.claimed && (!agentId || w.agentId === agentId)
  );
  
  // Optionally filter by type
  if (type) {
    pending = pending.filter(w => w.type === type);
  }
  
  res.json({ pending });
});

// POST /api/agent-hooks/claim/:workRequestId
// Called by OpenClaw worker to claim a work request
router.post('/claim/:workRequestId', (req, res) => {
  const { workRequestId } = req.params;
  const { workerId } = req.body;
  
  const workRequest = workQueue.find(w => w.id === workRequestId);
  
  if (!workRequest) {
    return res.status(404).json({ error: 'Work request not found' });
  }
  
  if (workRequest.claimed) {
    return res.status(409).json({ error: 'Work already claimed' });
  }
  
  workRequest.claimed = true;
  workRequest.claimedBy = workerId;
  workRequest.claimedAt = new Date().toISOString();
  
  // Update job status — keep "revisions" status for revision work, use "in_progress" for initial builds
  const newStatus = workRequest.type === 'revisions' ? 'revisions' : 'in_progress';
  db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(newStatus, workRequest.jobId);
  
  // Log activity
  db.prepare(`
    INSERT INTO job_activity (id, job_id, actor_wallet, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `activity-${Date.now()}`,
    workRequest.jobId,
    'agent',
    'work_started',
    JSON.stringify({ workerId, message: 'Agent started working' })
  );
  
  console.log(`[Agent Hook] Work claimed for job ${workRequest.jobId} by ${workerId}`);
  
  res.json({ success: true, workRequest });
});

// POST /api/agent-hooks/complete/:jobId
// Called by OpenClaw worker when initial build is done → transitions to "review" (Review 1)
router.post('/complete/:jobId', (req, res) => {
  const { jobId } = req.params;
  const { deliverables, summary } = req.body;
  
  // Check current status — only transition to "review" from "in_progress"
  // Don't blindly override if the job has already progressed past initial build
  const job = db.prepare('SELECT status FROM jobs WHERE id = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  if (job.status !== 'in_progress') {
    console.log(`[Agent Hook] Ignoring complete call for job ${jobId} — status is "${job.status}", not "in_progress"`);
    return res.json({ success: true, message: `Job already in "${job.status}" status, skipping.` });
  }
  
  // Update job status to review (Review 1)
  db.prepare(`
    UPDATE jobs SET status = 'review', deliverables = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(JSON.stringify(deliverables || []), jobId);
  
  // Mark all build tasks as completed
  db.prepare(`
    UPDATE job_tasks SET status = 'completed', updated_at = datetime('now')
    WHERE job_id = ? AND status != 'completed'
  `).run(jobId);
  
  // Log activity
  db.prepare(`
    INSERT INTO job_activity (id, job_id, actor_wallet, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `activity-${Date.now()}`,
    jobId,
    'agent',
    'work_completed',
    JSON.stringify({ summary, deliverables })
  );
  
  // Remove from queue
  const idx = workQueue.findIndex(w => w.jobId === jobId);
  if (idx > -1) workQueue.splice(idx, 1);
  
  console.log(`[Agent Hook] Work completed for job ${jobId} → review`);
  
  res.json({ success: true, message: 'Work marked for review' });
});

// POST /api/agent-hooks/queue-work
// Internal endpoint: queue work for the agent (called from submit-feedback)
router.post('/queue-work', (req, res) => {
  const { jobId, type, round, feedback, secret } = req.body;
  
  if (secret !== 'viberr-internal-2026') {
    return res.status(401).json({ error: 'Invalid secret' });
  }
  
  // Get job details
  const job = db.prepare(`
    SELECT j.*, a.name as agent_name, a.id as agent_id
    FROM jobs j
    JOIN agents a ON j.agent_id = a.id
    WHERE j.id = ?
  `).get(jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  const workRequest = {
    id: `work-${type}-${Date.now()}`,
    jobId: job.id,
    agentId: job.agent_id,
    agentName: job.agent_name,
    title: job.title,
    description: job.description,
    type: type, // 'build', 'revisions', or 'hardening'
    round: round || null,
    feedback: feedback || null,
    status: job.status,
    requestedAt: new Date().toISOString(),
    claimed: false
  };
  
  workQueue.push(workRequest);
  
  console.log(`[Agent Hook] ${type} work queued for job ${jobId}${round ? ` (round ${round})` : ''}`);
  
  res.json({ 
    success: true, 
    message: `${type} work request queued`,
    workRequestId: workRequest.id 
  });
});

// POST /api/agent-hooks/revisions-complete/:jobId
// Called by OpenClaw worker when revisions are done → transitions to final_review
router.post('/revisions-complete/:jobId', (req, res) => {
  const { jobId } = req.params;
  const { deliverables, summary } = req.body;
  
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  if (job.status !== 'revisions') {
    return res.status(400).json({ error: `Job is in "${job.status}" status, expected "revisions"` });
  }
  
  // Update job status to final_review, update deliverables if provided
  const updatedDeliverables = deliverables ? JSON.stringify(deliverables) : job.deliverables;
  db.prepare(`
    UPDATE jobs SET status = 'final_review', deliverables = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(updatedDeliverables, jobId);
  
  // Mark all revision tasks as completed
  db.prepare(`
    UPDATE job_tasks SET status = 'completed', updated_at = datetime('now')
    WHERE job_id = ? AND task_type = 'revision' AND status != 'completed'
  `).run(jobId);
  
  // Clear review messages so the final review chat starts fresh
  db.prepare('DELETE FROM review_messages WHERE job_id = ?').run(jobId);
  
  // Log activity
  db.prepare(`
    INSERT INTO job_activity (id, job_id, actor_wallet, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `activity-${Date.now()}`,
    jobId,
    'agent',
    'revisions_completed',
    JSON.stringify({ summary, round: job.revision_round || 1 })
  );
  
  // Remove from queue
  const idx = workQueue.findIndex(w => w.jobId === jobId && !w.claimed);
  if (idx > -1) workQueue.splice(idx, 1);
  
  console.log(`[Agent Hook] Revisions completed for job ${jobId} → final_review`);
  
  res.json({ success: true, message: 'Revisions complete. Job moved to final review.' });
});

// POST /api/agent-hooks/hardening-complete/:jobId
// Called by OpenClaw worker when hardening (security audit) is done → transitions to completed
router.post('/hardening-complete/:jobId', (req, res) => {
  const { jobId } = req.params;
  const { deliverables, securityReport, summary } = req.body;
  
  const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  if (job.status !== 'hardening') {
    return res.status(400).json({ error: `Job is in "${job.status}" status, expected "hardening"` });
  }
  
  // Build final deliverables — merge existing + any new ones from hardening
  let existingDeliverables = [];
  try {
    existingDeliverables = JSON.parse(job.deliverables || '[]');
  } catch (e) { /* ignore */ }
  
  const finalDeliverables = deliverables 
    ? [...existingDeliverables, ...deliverables]
    : existingDeliverables;
  
  // Add security report as a deliverable if provided
  if (securityReport) {
    finalDeliverables.push({
      title: 'Security Audit Report',
      description: securityReport,
      type: 'report'
    });
  }
  
  // Update job to completed
  db.prepare(`
    UPDATE jobs SET status = 'completed', deliverables = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(JSON.stringify(finalDeliverables), jobId);
  
  // Log activity
  db.prepare(`
    INSERT INTO job_activity (id, job_id, actor_wallet, action, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    `activity-${Date.now()}`,
    jobId,
    'agent',
    'hardening_completed',
    JSON.stringify({ summary, securityReport: securityReport ? 'included' : 'none' })
  );
  
  // Remove from queue
  const idx = workQueue.findIndex(w => w.jobId === jobId);
  if (idx > -1) workQueue.splice(idx, 1);
  
  console.log(`[Agent Hook] Hardening completed for job ${jobId} → completed`);
  
  res.json({ success: true, message: 'Hardening complete. Job delivered!' });
});

module.exports = router;
