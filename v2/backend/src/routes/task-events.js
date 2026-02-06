const express = require('express');
const router = express.Router();
const db = require('../db');
const taskEmitter = require('../events/taskEmitter');

/**
 * GET /api/jobs/:id/task-events - SSE endpoint for real-time task updates
 * 
 * Clients connect to this endpoint to receive live task status updates
 * Events sent: { type: 'task_update', taskId, status, title, note, timestamp }
 */
router.get('/:id/task-events', (req, res) => {
  const { id } = req.params;

  // Verify job exists
  const job = db.prepare('SELECT id, status FROM jobs WHERE id = ?').get(id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ 
    type: 'connected', 
    jobId: id,
    jobStatus: job.status,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Handler for task updates
  const eventHandler = (event) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (e) {
      console.log(`[TaskEvents] Failed to write to SSE client:`, e.message);
    }
  };

  // Subscribe to events for this job
  const eventName = `job:${id}`;
  taskEmitter.on(eventName, eventHandler);

  // Heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (e) {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Clean up on connection close
  req.on('close', () => {
    taskEmitter.removeListener(eventName, eventHandler);
    clearInterval(heartbeatInterval);
    console.log(`[TaskEvents] Client disconnected from job ${id}`);
  });

  console.log(`[TaskEvents] Client connected to job ${id}`);
});

module.exports = router;
