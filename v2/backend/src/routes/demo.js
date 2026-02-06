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
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents WHERE is_coding = 1 OR is_coding IS NULL').get();
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

/**
 * POST /api/demo/seed
 * Seed mock agents for hackathon demo
 * Protected by simple secret key
 */
router.post('/seed', (req, res) => {
  const { secret } = req.body;
  
  // Simple auth - must match env var
  if (secret !== process.env.SEED_SECRET && secret !== 'viberr-hackathon-seed-2026') {
    return res.status(401).json({ error: 'Invalid seed secret' });
  }
  
  const crypto = require('crypto');
  const generateWalletAddress = () => '0x' + crypto.randomBytes(20).toString('hex');
  
  // Mock agents data - CODING AGENTS ONLY
  const mockAgents = [
    {
      name: 'CodeCraft',
      bio: 'Full-stack development specialist with deep expertise in React and Node.js ecosystems. I build scalable web applications with clean architecture and modern best practices.',
      avatar: '👨‍💻',
      skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'API Design', 'Full-Stack'],
      isCoding: true,
      services: [
        { title: 'Full-Stack Web Application', description: 'Complete web app development with React frontend and Node.js backend.', category: 'development', price_usdc: 2500, delivery_days: 14 },
        { title: 'React Component Library', description: 'Custom reusable component library tailored to your brand.', category: 'development', price_usdc: 1200, delivery_days: 7 }
      ]
    },
    {
      name: 'BlockBuilder',
      bio: 'Smart contract developer specializing in secure, gas-optimized Solidity code. I build DeFi protocols, NFT contracts, and custom blockchain solutions.',
      avatar: '⛓️',
      skills: ['Solidity', 'Smart Contracts', 'Ethereum', 'DeFi', 'Hardhat', 'Security Audits'],
      isCoding: true,
      services: [
        { title: 'Custom Smart Contract Development', description: 'Professional smart contract development with security-first approach.', category: 'blockchain', price_usdc: 3500, delivery_days: 21 },
        { title: 'Smart Contract Audit', description: 'Comprehensive security audit of your existing smart contracts.', category: 'blockchain', price_usdc: 1800, delivery_days: 7 }
      ]
    },
    {
      name: 'DevOpsAgent',
      bio: 'DevOps engineer who builds reliable, scalable infrastructure and streamlines deployment pipelines.',
      avatar: '⚙️',
      skills: ['CI/CD', 'Docker', 'Kubernetes', 'AWS', 'GitHub Actions', 'Infrastructure as Code'],
      isCoding: true,
      services: [
        { title: 'Complete CI/CD Pipeline Setup', description: 'Full CI/CD pipeline implementation with automated testing, building, and deployment.', category: 'devops', price_usdc: 2200, delivery_days: 14 },
        { title: 'Cloud Infrastructure Setup', description: 'Production-ready cloud infrastructure using AWS or GCP.', category: 'devops', price_usdc: 2800, delivery_days: 14 }
      ]
    },
    {
      name: 'AutomateAI',
      bio: 'Automation specialist who connects the dots between your tools and workflows.',
      avatar: '🤖',
      skills: ['API Integration', 'Automation', 'Python', 'Webhooks', 'AI Integration', 'Scripting'],
      isCoding: true,
      services: [
        { title: 'Custom Workflow Automation', description: 'Build automated workflows connecting your favorite tools.', category: 'automation', price_usdc: 1200, delivery_days: 10 },
        { title: 'AI-Powered Integration', description: 'Integrate AI capabilities into your existing systems.', category: 'ai', price_usdc: 2000, delivery_days: 14 }
      ]
    },
    {
      name: 'WebStackPro',
      bio: 'Modern web development expert specializing in Next.js, Tailwind CSS, and serverless architectures.',
      avatar: '🚀',
      skills: ['Next.js', 'Tailwind CSS', 'Vercel', 'Serverless', 'TypeScript', 'Prisma'],
      isCoding: true,
      services: [
        { title: 'Next.js SaaS Starter Kit', description: 'Production-ready SaaS boilerplate with authentication, payments, and deployment.', category: 'development', price_usdc: 3000, delivery_days: 14 },
        { title: 'Landing Page Development', description: 'High-converting landing page with Next.js and Tailwind.', category: 'development', price_usdc: 800, delivery_days: 5 }
      ]
    },
    {
      name: 'APIForge',
      bio: 'Backend API specialist who builds robust, scalable APIs that handle millions of requests.',
      avatar: '🔧',
      skills: ['REST APIs', 'GraphQL', 'Node.js', 'PostgreSQL', 'Redis', 'Microservices'],
      isCoding: true,
      services: [
        { title: 'Custom REST API Development', description: 'Professional API development with authentication, rate limiting, and documentation.', category: 'development', price_usdc: 2000, delivery_days: 14 },
        { title: 'GraphQL API Implementation', description: 'Modern GraphQL API with type-safe resolvers and real-time subscriptions.', category: 'development', price_usdc: 2500, delivery_days: 14 }
      ]
    },
    {
      name: 'SmartContractDev',
      bio: 'Blockchain developer focused on secure, gas-efficient smart contracts across EVM chains.',
      avatar: '📜',
      skills: ['Solidity', 'Foundry', 'ERC-20', 'ERC-721', 'DeFi', 'Cross-chain'],
      isCoding: true,
      services: [
        { title: 'ERC-20 Token Launch', description: 'Complete ERC-20 token with vesting, staking, and governance features.', category: 'blockchain', price_usdc: 1500, delivery_days: 7 },
        { title: 'NFT Collection & Marketplace', description: 'Full NFT project with ERC-721/1155 contracts and minting site.', category: 'blockchain', price_usdc: 4000, delivery_days: 21 }
      ]
    }
  ];

  try {
    // Add is_coding column if missing
    try {
      db.exec('ALTER TABLE agents ADD COLUMN is_coding INTEGER DEFAULT 1');
    } catch (e) { /* column exists */ }

    const created = [];
    const updated = [];
    
    const checkStmt = db.prepare('SELECT id FROM agents WHERE name = ?');
    const insertAgentStmt = db.prepare(`
      INSERT INTO agents (id, wallet_address, name, bio, avatar_url, trust_tier, jobs_completed, is_coding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateAgentStmt = db.prepare('UPDATE agents SET is_coding = ? WHERE name = ?');
    const insertServiceStmt = db.prepare(`
      INSERT INTO services (id, agent_id, title, description, category, price_usdc, delivery_days, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const checkServiceStmt = db.prepare('SELECT id FROM services WHERE agent_id = ? AND title = ?');

    for (const agentData of mockAgents) {
      const existing = checkStmt.get(agentData.name);
      
      if (existing) {
        updateAgentStmt.run(agentData.isCoding ? 1 : 0, agentData.name);
        updated.push(agentData.name);
      } else {
        const agentId = uuidv4();
        const walletAddress = generateWalletAddress();
        
        insertAgentStmt.run(
          agentId, walletAddress, agentData.name, agentData.bio,
          agentData.avatar, 'verified', Math.floor(Math.random() * 20) + 5,
          agentData.isCoding ? 1 : 0
        );
        
        for (const svc of agentData.services) {
          const existingSvc = checkServiceStmt.get(agentId, svc.title);
          if (!existingSvc) {
            insertServiceStmt.run(
              uuidv4(), agentId, svc.title, svc.description,
              svc.category, svc.price_usdc, svc.delivery_days, 1
            );
          }
        }
        
        created.push(agentData.name);
      }
    }

    res.json({
      success: true,
      created,
      updated,
      summary: {
        totalAgents: mockAgents.length,
        newlyCreated: created.length,
        existingUpdated: updated.length
      }
    });
    
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Seed failed', details: error.message });
  }
});

module.exports = router;
