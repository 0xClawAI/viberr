const express = require('express');
const { ethers } = require('ethers');
const db = require('../db');
const router = express.Router();

// Config - ViberrEscrow V3
const ESCROW_ADDRESS = '0x66cdf0431896c2c2ac38eaa716284e4d4159c05e';
const RPC_URL = 'https://sepolia.base.org';

// Resolution enum matches contract
const Resolution = {
  Release: 0,
  Revise: 1,
  Refund: 2
};

// Arbiter wallet (loaded from env or config)
let arbiterWallet = null;

function getArbiterWallet() {
  if (!arbiterWallet) {
    const privateKey = process.env.ARBITER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('ARBITER_PRIVATE_KEY not set');
    }
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    arbiterWallet = new ethers.Wallet(privateKey, provider);
  }
  return arbiterWallet;
}

// ABI for escrow contract
const ESCROW_ABI = [
  'function resolveDispute(uint256 jobId, uint8 resolution, string calldata notes) external',
  'function getJob(uint256 jobId) external view returns (address, address, uint256, uint8, bytes32, uint256, string memory)',
  'event DisputeResolved(uint256 indexed jobId, uint8 resolution, string notes)'
];

/**
 * GET /api/arbiter/disputed
 * List all jobs in disputed status
 */
router.get('/disputed', (req, res) => {
  try {
    const jobs = db.prepare(`
      SELECT j.*, a.name as agent_name, a.wallet_address as agent_wallet
      FROM jobs j
      LEFT JOIN agents a ON j.agent_id = a.id
      WHERE j.status = 'disputed'
      ORDER BY j.updated_at DESC
    `).all();
    
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/arbiter/evidence/:jobId
 * Gather all evidence for a dispute
 */
router.get('/evidence/:jobId', (req, res) => {
  const { jobId } = req.params;
  
  try {
    // Get job
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Get spec from interview
    const interview = db.prepare(`
      SELECT i.*, s.spec_document 
      FROM interviews i
      LEFT JOIN interview_specs s ON i.id = s.interview_id
      WHERE i.job_id = ?
    `).get(jobId);
    
    // Get interview messages
    const interviewMessages = interview ? db.prepare(`
      SELECT role, content, created_at 
      FROM interview_messages 
      WHERE interview_id = ?
      ORDER BY created_at
    `).all(interview.id) : [];
    
    // Get review messages
    const reviewMessages = db.prepare(`
      SELECT role, content, created_at
      FROM review_messages
      WHERE job_id = ?
      ORDER BY created_at
    `).all(jobId);
    
    // Get activity log
    const activity = db.prepare(`
      SELECT * FROM job_activity
      WHERE job_id = ?
      ORDER BY created_at
    `).all(jobId);
    
    // Get tasks
    const tasks = db.prepare(`
      SELECT * FROM job_tasks
      WHERE job_id = ?
    `).all(jobId);
    
    // Parse deliverables
    let deliverables = [];
    try {
      deliverables = JSON.parse(job.deliverables || '[]');
    } catch (e) {}
    
    res.json({
      job: {
        id: job.id,
        title: job.title,
        status: job.status,
        priceUsdc: job.price_usdc,
        createdAt: job.created_at
      },
      spec: interview?.spec_document || job.spec || job.description,
      deliverables,
      interviewMessages,
      reviewMessages,
      activity,
      tasks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/arbiter/resolve/:jobId
 * AI Arbiter resolves a dispute
 * Body: { resolution: 'release'|'revise'|'refund', notes: string, chainJobId: number }
 */
router.post('/resolve/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const { resolution, notes, chainJobId } = req.body;
  
  // Validate
  if (!['release', 'revise', 'refund'].includes(resolution)) {
    return res.status(400).json({ error: 'Invalid resolution. Must be: release, revise, or refund' });
  }
  
  if (!notes) {
    return res.status(400).json({ error: 'Notes/reasoning required' });
  }
  
  try {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    if (job.status !== 'disputed') {
      return res.status(400).json({ error: 'Job is not in disputed status' });
    }
    
    // Map resolution to enum
    const resolutionEnum = Resolution[resolution.charAt(0).toUpperCase() + resolution.slice(1)];
    
    // Call contract if chainJobId provided
    let txHash = null;
    if (chainJobId !== undefined) {
      try {
        const wallet = getArbiterWallet();
        const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet);
        
        const tx = await contract.resolveDispute(chainJobId, resolutionEnum, notes);
        const receipt = await tx.wait();
        txHash = receipt.hash;
        
        console.log(`[Arbiter] Resolved dispute on-chain: jobId=${chainJobId}, resolution=${resolution}, tx=${txHash}`);
      } catch (chainErr) {
        console.error('[Arbiter] Chain error:', chainErr);
        return res.status(500).json({ error: 'Failed to resolve on-chain', details: chainErr.message });
      }
    }
    
    // Update API job status
    const now = new Date().toISOString();
    let newStatus;
    
    if (resolution === 'release') {
      newStatus = 'completed';
    } else if (resolution === 'revise') {
      newStatus = 'revisions';
    } else {
      newStatus = 'refunded';
    }
    
    db.prepare(`
      UPDATE jobs SET status = ?, updated_at = ?
      WHERE id = ?
    `).run(newStatus, now, jobId);
    
    // Log the resolution
    db.prepare(`
      INSERT INTO job_activity (id, job_id, actor_wallet, action, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `activity-${Date.now()}`,
      jobId,
      'arbiter',
      'dispute_resolved',
      JSON.stringify({ resolution, notes, txHash })
    );
    
    // If revise, store the requirements
    if (resolution === 'revise') {
      db.prepare(`
        UPDATE jobs SET description = description || ? WHERE id = ?
      `).run(`\n\n---\n## Arbiter Revision Requirements\n${notes}`, jobId);
    }
    
    res.json({
      success: true,
      resolution,
      newStatus,
      txHash,
      message: `Dispute resolved: ${resolution}`
    });
    
  } catch (err) {
    console.error('[Arbiter] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/arbiter/status
 * Arbiter system status
 */
router.get('/status', (req, res) => {
  const disputedCount = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('disputed');
  const resolvedCount = db.prepare(`
    SELECT COUNT(*) as count FROM job_activity WHERE action = 'dispute_resolved'
  `).get();
  
  res.json({
    arbiterAddress: '0x7878084d8A7975a94B3eb6dA28b12206DED2C46f',
    escrowContract: ESCROW_ADDRESS,
    pendingDisputes: disputedCount.count,
    resolvedDisputes: resolvedCount.count,
    status: 'active'
  });
});

/**
 * POST /api/arbiter/monitor
 * Scan for on-chain Disputed events and sync to API
 * Called by cron job
 */
router.post('/monitor', async (req, res) => {
  const { fromBlock, lookback = 5000 } = req.query;
  
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const currentBlock = await provider.getBlockNumber();
    
    // Get last synced block from DB
    const syncState = db.prepare('SELECT last_block FROM webhook_sync_state WHERE id = 1').get();
    const startBlock = fromBlock ? parseInt(fromBlock) : (syncState?.last_block || currentBlock - parseInt(lookback));
    
    console.log(`[Arbiter Monitor] Scanning blocks ${startBlock} to ${currentBlock}`);
    
    // Create contract interface for event parsing
    const contract = new ethers.Contract(ESCROW_ADDRESS, [
      'event Disputed(uint256 indexed jobId, address indexed client)',
      'event RevisionRequired(uint256 indexed jobId, uint256 deadline, string requirements)',
    ], provider);
    
    // Get Disputed events
    const disputedFilter = contract.filters.Disputed();
    const disputedEvents = await contract.queryFilter(disputedFilter, startBlock, currentBlock);
    
    const results = [];
    
    for (const event of disputedEvents) {
      const chainJobId = event.args[0].toString();
      const clientAddress = event.args[1];
      
      // Check if already processed
      const existing = db.prepare(
        'SELECT 1 FROM processed_events WHERE tx_hash = ? AND log_index = ?'
      ).get(event.transactionHash, event.index);
      
      if (existing) continue;
      
      // Find matching job in our DB by client wallet or recent funded job
      const job = db.prepare(`
        SELECT j.* FROM jobs j
        WHERE j.status IN ('funded', 'in_progress', 'review')
        ORDER BY j.updated_at DESC
        LIMIT 1
      `).get();
      
      if (job) {
        // Update job status to disputed
        const now = new Date().toISOString();
        db.prepare(`
          UPDATE jobs SET status = 'disputed', escrow_job_id = ?, updated_at = ?
          WHERE id = ?
        `).run(chainJobId, now, job.id);
        
        // Log activity
        db.prepare(`
          INSERT INTO job_activity (id, job_id, actor_wallet, action, details)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          `activity-${Date.now()}-${event.index}`,
          job.id,
          clientAddress,
          'disputed',
          JSON.stringify({ chainJobId, txHash: event.transactionHash })
        );
        
        results.push({
          chainJobId,
          apiJobId: job.id,
          status: 'synced'
        });
      }
      
      // Mark as processed
      db.prepare(`
        INSERT INTO processed_events (tx_hash, log_index, event_type, chain_job_id)
        VALUES (?, ?, 'Disputed', ?)
      `).run(event.transactionHash, event.index, chainJobId);
    }
    
    res.json({
      success: true,
      scannedBlocks: { from: startBlock, to: currentBlock },
      disputesFound: disputedEvents.length,
      disputesSynced: results.length,
      results
    });
    
  } catch (err) {
    console.error('[Arbiter Monitor] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/arbiter/check-timeouts
 * Check for jobs in revision that have passed their deadline
 * Auto-triggers refund after timeout
 */
router.post('/check-timeouts', async (req, res) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(ESCROW_ADDRESS, [
      'function getJob(uint256 jobId) view returns (address, address, uint256, uint8, bytes32, uint256, string)',
      'function claimRefundAfterTimeout(uint256 jobId) external'
    ], provider);
    
    // Get jobs that might have timed out (in revision status)
    const revisionJobs = db.prepare(`
      SELECT j.*, j.escrow_job_id as chain_job_id
      FROM jobs j
      WHERE j.status = 'revisions' AND j.escrow_job_id IS NOT NULL
    `).all();
    
    const results = [];
    
    for (const job of revisionJobs) {
      try {
        // Check on-chain state
        const [client, agent, amount, status, specHash, revisionDeadline, arbiterNotes] = 
          await contract.getJob(job.chain_job_id);
        
        // Status 4 = InRevision on chain
        if (status === 4 && revisionDeadline > 0) {
          const now = Math.floor(Date.now() / 1000);
          if (now > revisionDeadline) {
            // Deadline passed - can trigger refund
            results.push({
              jobId: job.id,
              chainJobId: job.chain_job_id,
              deadline: new Date(Number(revisionDeadline) * 1000).toISOString(),
              status: 'timeout_eligible',
              note: 'Call claimRefundAfterTimeout to refund client'
            });
          } else {
            const timeLeft = revisionDeadline - now;
            results.push({
              jobId: job.id,
              chainJobId: job.chain_job_id,
              deadline: new Date(Number(revisionDeadline) * 1000).toISOString(),
              status: 'pending',
              timeLeftSeconds: Number(timeLeft)
            });
          }
        }
      } catch (err) {
        results.push({
          jobId: job.id,
          error: err.message
        });
      }
    }
    
    res.json({
      success: true,
      checked: revisionJobs.length,
      results
    });
    
  } catch (err) {
    console.error('[Arbiter Timeout] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/arbiter/auto-resolve/:jobId
 * AI Arbiter automatically analyzes evidence and makes decision
 * This is the brain of the arbiter
 */
router.post('/auto-resolve/:jobId', async (req, res) => {
  const { jobId } = req.params;
  
  try {
    // Get all evidence
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'disputed') return res.status(400).json({ error: 'Job not disputed' });
    
    // Gather evidence
    const interview = db.prepare(`
      SELECT i.*, s.spec_document 
      FROM interviews i
      LEFT JOIN interview_specs s ON i.id = s.interview_id
      WHERE i.job_id = ?
    `).get(jobId);
    
    const tasks = db.prepare('SELECT * FROM job_tasks WHERE job_id = ?').all(jobId);
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    
    const reviewMessages = db.prepare(`
      SELECT role, content FROM review_messages WHERE job_id = ? ORDER BY created_at
    `).all(jobId);
    
    let deliverables = [];
    try { deliverables = JSON.parse(job.deliverables || '[]'); } catch (e) {}
    
    // Simple heuristic-based decision (in production, call GPT-4/Claude)
    // This is a placeholder - real AI analysis would be more sophisticated
    
    let decision = 'revise'; // Default to revise
    let reasoning = [];
    
    // Check task completion
    const taskCompletionRate = tasks.length > 0 ? completedTasks / tasks.length : 0;
    reasoning.push(`Task completion: ${completedTasks}/${tasks.length} (${Math.round(taskCompletionRate * 100)}%)`);
    
    // Check if deliverables exist
    const hasDeliverables = deliverables.length > 0;
    reasoning.push(`Deliverables submitted: ${hasDeliverables ? 'Yes' : 'No'}`);
    
    // Check review conversation
    const clientComplaints = reviewMessages.filter(m => 
      m.role === 'client' && 
      (m.content.toLowerCase().includes('not working') || 
       m.content.toLowerCase().includes('broken') ||
       m.content.toLowerCase().includes('wrong') ||
       m.content.toLowerCase().includes('missing'))
    ).length;
    reasoning.push(`Client complaints detected: ${clientComplaints}`);
    
    // Decision logic
    if (taskCompletionRate >= 0.9 && hasDeliverables && clientComplaints === 0) {
      decision = 'release';
      reasoning.push('Decision: RELEASE - Work appears complete with deliverables and no major complaints');
    } else if (taskCompletionRate < 0.3 || !hasDeliverables) {
      decision = 'refund';
      reasoning.push('Decision: REFUND - Insufficient work completed or no deliverables');
    } else {
      decision = 'revise';
      reasoning.push('Decision: REVISE - Partial completion, agent should address issues');
    }
    
    const notes = `AI Arbiter Analysis:\n${reasoning.join('\n')}`;
    
    // Auto-resolve if requested
    if (req.body.execute) {
      const chainJobId = job.escrow_job_id;
      if (chainJobId) {
        try {
          const wallet = getArbiterWallet();
          const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, wallet);
          
          const resolutionEnum = Resolution[decision.charAt(0).toUpperCase() + decision.slice(1)];
          const tx = await contract.resolveDispute(chainJobId, resolutionEnum, notes);
          await tx.wait();
          
          // Update API
          const newStatus = decision === 'release' ? 'completed' : decision === 'refund' ? 'refunded' : 'revisions';
          db.prepare('UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?')
            .run(newStatus, new Date().toISOString(), jobId);
          
          return res.json({
            success: true,
            decision,
            reasoning,
            executed: true,
            txHash: tx.hash
          });
        } catch (chainErr) {
          return res.status(500).json({ error: 'Chain execution failed', details: chainErr.message });
        }
      }
    }
    
    // Return analysis without executing
    res.json({
      success: true,
      decision,
      reasoning,
      notes,
      executed: false,
      hint: 'Add { "execute": true } to body to auto-execute the decision'
    });
    
  } catch (err) {
    console.error('[Arbiter Auto-Resolve] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
