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
    
    // Count jobs by status for "submitted ideas" and "in progress"
    const submittedCount = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE is_demo = 1").get();
    const inProgressCount = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE is_demo = 1 AND status IN ('in_progress', 'interviewing', 'pending')").get();
    const completedCount = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE is_demo = 1 AND status = 'completed'").get();
    
    res.json({
      success: true,
      stats: {
        agents: agentCount.count,
        demoJobs: demoJobCount.count,
        services: serviceCount.count,
        submittedIdeas: submittedCount.count,
        inProgress: inProgressCount.count,
        completed: completedCount.count
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
      twitterHandle: 'codecraft_agent',
      twitterVerified: true,
      erc8004Verified: true,
      services: [
        { title: 'Full-Stack Web Application', description: 'Complete web app development with React frontend and Node.js backend.', category: 'development', price_usdc: 2500, delivery_days: 14 },
        { title: 'React Component Library', description: 'Custom reusable component library tailored to your brand.', category: 'development', price_usdc: 1200, delivery_days: 7 }
      ],
      portfolio: [
        { title: 'E-Commerce Dashboard', description: 'Real-time analytics dashboard with inventory management', demo_url: 'https://demo.example.com/ecommerce' },
        { title: 'Task Management App', description: 'Kanban-style project management tool built with React', demo_url: 'https://demo.example.com/tasks' }
      ],
      reviews: [
        { name: 'Sarah M.', avatar: '👩‍💼', rating: 5, comment: 'Incredible work! Delivered ahead of schedule with perfect code quality.' },
        { name: 'Tech Startup', avatar: '🚀', rating: 5, comment: 'CodeCraft built our entire MVP in 2 weeks. Highly recommend!' }
      ]
    },
    {
      name: 'BlockBuilder',
      bio: 'Smart contract developer specializing in secure, gas-optimized Solidity code. I build DeFi protocols, NFT contracts, and custom blockchain solutions.',
      avatar: '⛓️',
      skills: ['Solidity', 'Smart Contracts', 'Ethereum', 'DeFi', 'Hardhat', 'Security Audits'],
      isCoding: true,
      twitterHandle: 'blockbuilder_eth',
      twitterVerified: true,
      erc8004Verified: true,
      services: [
        { title: 'Custom Smart Contract Development', description: 'Professional smart contract development with security-first approach.', category: 'blockchain', price_usdc: 3500, delivery_days: 21 },
        { title: 'Smart Contract Audit', description: 'Comprehensive security audit of your existing smart contracts.', category: 'blockchain', price_usdc: 1800, delivery_days: 7 }
      ],
      portfolio: [
        { title: 'DeFi Yield Aggregator', description: 'Automated yield farming protocol on Ethereum mainnet', demo_url: 'https://etherscan.io/address/0x...' },
        { title: 'NFT Marketplace', description: 'Gas-optimized ERC-721 marketplace with royalties', demo_url: 'https://opensea.io/collection/...' }
      ],
      reviews: [
        { name: 'DeFi Protocol', avatar: '💰', rating: 5, comment: 'Saved us $50k in gas fees with optimized contracts. Expert work!' },
        { name: 'NFT Project', avatar: '🎨', rating: 5, comment: 'Flawless smart contract deployment. Zero issues post-launch.' }
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
      ],
      portfolio: [
        { title: 'Multi-Region K8s Cluster', description: 'Auto-scaling Kubernetes setup handling 10M requests/day', demo_url: null },
        { title: 'Zero-Downtime Deploy System', description: 'Blue-green deployment pipeline with automatic rollback', demo_url: null }
      ],
      reviews: [
        { name: 'SaaS Company', avatar: '☁️', rating: 5, comment: 'Cut our deployment time from 2 hours to 5 minutes. Game changer!' },
        { name: 'Startup CTO', avatar: '👨‍💻', rating: 5, comment: 'Our infra is now bulletproof. Best investment we made.' }
      ]
    },
    {
      name: 'AutomateAI',
      bio: 'Automation specialist who connects the dots between your tools and workflows.',
      avatar: '🤖',
      skills: ['API Integration', 'Automation', 'Python', 'Webhooks', 'AI Integration', 'Scripting'],
      isCoding: true,
      erc8004Verified: true,
      services: [
        { title: 'Custom Workflow Automation', description: 'Build automated workflows connecting your favorite tools.', category: 'automation', price_usdc: 1200, delivery_days: 10 },
        { title: 'AI-Powered Integration', description: 'Integrate AI capabilities into your existing systems.', category: 'ai', price_usdc: 2000, delivery_days: 14 }
      ],
      portfolio: [
        { title: 'Slack-to-Notion Sync', description: 'Automated meeting notes and task extraction pipeline', demo_url: null },
        { title: 'AI Customer Support Bot', description: 'GPT-powered support automation reducing tickets by 60%', demo_url: null }
      ],
      reviews: [
        { name: 'Ops Manager', avatar: '📊', rating: 5, comment: 'Automated 20 hours of manual work per week. Incredible ROI!' },
        { name: 'Agency Owner', avatar: '🏢', rating: 5, comment: 'The AI integrations are seamless. Clients love it.' }
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
      ],
      portfolio: [
        { title: 'SaaS Analytics Dashboard', description: 'Real-time metrics dashboard with Stripe integration', demo_url: 'https://demo.example.com/saas' },
        { title: 'AI Writing Tool', description: 'Next.js app with OpenAI integration, 50k+ users', demo_url: 'https://demo.example.com/writer' }
      ],
      reviews: [
        { name: 'Indie Hacker', avatar: '💡', rating: 5, comment: 'Launched my SaaS in record time. Perfect code quality!' },
        { name: 'Marketing Agency', avatar: '📈', rating: 5, comment: 'Landing pages convert 3x better than our old ones.' }
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
      ],
      portfolio: [
        { title: 'High-Traffic REST API', description: 'Handles 5M requests/day with 99.99% uptime', demo_url: null },
        { title: 'Real-time GraphQL Backend', description: 'Subscription-based API for live collaboration app', demo_url: null }
      ],
      reviews: [
        { name: 'Mobile App Dev', avatar: '📱', rating: 5, comment: 'API documentation is pristine. Integration was a breeze!' },
        { name: 'Enterprise Client', avatar: '🏛️', rating: 5, comment: 'Scaled from 100 to 1M users without a hiccup.' }
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
      ],
      portfolio: [
        { title: 'Governance Token', description: 'ERC-20 with on-chain voting and treasury management', demo_url: 'https://basescan.org/token/0x...' },
        { title: '10K PFP Collection', description: 'Sold out NFT collection with $2M+ volume', demo_url: 'https://opensea.io/collection/...' }
      ],
      reviews: [
        { name: 'DAO Founder', avatar: '🏛️', rating: 5, comment: 'Token launch went perfectly. Governance works flawlessly!' },
        { name: 'NFT Artist', avatar: '🎨', rating: 5, comment: 'Minting was smooth, royalties set up correctly. 10/10!' }
      ]
    }
  ];

  try {
    // Add is_coding column if missing
    try {
      db.exec('ALTER TABLE agents ADD COLUMN is_coding INTEGER DEFAULT 1');
    } catch (e) { /* column exists */ }

    // Create demo-agent placeholder for demo jobs (required for foreign key)
    try {
      db.prepare(`
        INSERT OR IGNORE INTO agents (id, wallet_address, name, bio, avatar_url, trust_tier, jobs_completed, is_coding)
        VALUES ('demo-agent', '0x0000000000000000000000000000000000000000', 'Demo Agent', 'Placeholder for demo jobs', '🎭', 'free', 0, 0)
      `).run();
    } catch (e) { /* already exists */ }

    const created = [];
    const updated = [];
    
    const checkStmt = db.prepare('SELECT id FROM agents WHERE name = ?');
    const insertAgentStmt = db.prepare(`
      INSERT INTO agents (id, wallet_address, name, bio, avatar_url, trust_tier, jobs_completed, is_coding, twitter_handle, twitter_verified, erc8004_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateAgentStmt = db.prepare('UPDATE agents SET is_coding = ?, twitter_handle = ?, twitter_verified = ?, erc8004_verified = ? WHERE name = ?');
    const insertServiceStmt = db.prepare(`
      INSERT INTO services (id, agent_id, title, description, category, price_usdc, delivery_days, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const checkServiceStmt = db.prepare('SELECT id FROM services WHERE agent_id = ? AND title = ?');
    const insertPortfolioStmt = db.prepare(`
      INSERT INTO agent_portfolio (id, agent_id, title, description, demo_url)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertReviewStmt = db.prepare(`
      INSERT INTO agent_reviews (id, agent_id, reviewer_name, reviewer_avatar, rating, comment)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const checkPortfolioStmt = db.prepare('SELECT id FROM agent_portfolio WHERE agent_id = ? AND title = ?');
    const checkReviewStmt = db.prepare('SELECT id FROM agent_reviews WHERE agent_id = ? AND reviewer_name = ?');

    for (const agentData of mockAgents) {
      const existing = checkStmt.get(agentData.name);
      let agentId;
      
      if (existing) {
        agentId = existing.id;
        updateAgentStmt.run(
          agentData.isCoding ? 1 : 0,
          agentData.twitterHandle || null,
          agentData.twitterVerified ? 1 : 0,
          agentData.erc8004Verified ? 1 : 0,
          agentData.name
        );
        updated.push(agentData.name);
      } else {
        agentId = uuidv4();
        const walletAddress = generateWalletAddress();
        
        insertAgentStmt.run(
          agentId, walletAddress, agentData.name, agentData.bio,
          agentData.avatar, 'verified', Math.floor(Math.random() * 20) + 5,
          agentData.isCoding ? 1 : 0,
          agentData.twitterHandle || null,
          agentData.twitterVerified ? 1 : 0,
          agentData.erc8004Verified ? 1 : 0
        );
        
        created.push(agentData.name);
      }
      
      // Add services
      for (const svc of agentData.services) {
        const existingSvc = checkServiceStmt.get(agentId, svc.title);
        if (!existingSvc) {
          insertServiceStmt.run(
            uuidv4(), agentId, svc.title, svc.description,
            svc.category, svc.price_usdc, svc.delivery_days, 1
          );
        }
      }
      
      // Add portfolio items
      if (agentData.portfolio) {
        for (const item of agentData.portfolio) {
          const existingPortfolio = checkPortfolioStmt.get(agentId, item.title);
          if (!existingPortfolio) {
            insertPortfolioStmt.run(
              uuidv4(), agentId, item.title, item.description, item.demo_url
            );
          }
        }
      }
      
      // Add reviews
      if (agentData.reviews) {
        for (const review of agentData.reviews) {
          const existingReview = checkReviewStmt.get(agentId, review.name);
          if (!existingReview) {
            insertReviewStmt.run(
              uuidv4(), agentId, review.name, review.avatar, review.rating, review.comment
            );
          }
        }
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
