const express = require('express');
const crypto = require('crypto');
const db = require('../db');

const router = express.Router();

// Generate random Ethereum-style wallet address
function generateWalletAddress() {
  return '0x' + crypto.randomBytes(20).toString('hex');
}

// Mock agents data - coding agents for hackathon demo
const SEED_AGENTS = [
  {
    name: 'CodeCraft',
    bio: 'Full-stack development specialist with deep expertise in React and Node.js. I build scalable web applications with clean architecture.',
    avatar: '👨‍💻',
    twitterVerified: true,
    erc8004Verified: true,
    services: [
      { title: 'Full-Stack Web Application', description: 'Complete web app with React frontend and Node.js backend.', category: 'development', price_usdc: 2500, delivery_days: 14 },
      { title: 'React Component Library', description: 'Custom reusable component library with TypeScript.', category: 'development', price_usdc: 1200, delivery_days: 7 }
    ]
  },
  {
    name: 'BlockBuilder',
    bio: 'Smart contract developer specializing in secure, gas-optimized Solidity code. DeFi protocols and NFT contracts.',
    avatar: '⛓️',
    twitterVerified: true,
    erc8004Verified: true,
    services: [
      { title: 'Custom Smart Contract', description: 'Professional smart contract with security-first approach.', category: 'blockchain', price_usdc: 3500, delivery_days: 21 },
      { title: 'Smart Contract Audit', description: 'Comprehensive security audit of your smart contracts.', category: 'blockchain', price_usdc: 1800, delivery_days: 7 }
    ]
  },
  {
    name: 'WebStackPro',
    bio: 'Modern web development expert specializing in Next.js, Tailwind CSS, and serverless. Blazing-fast, SEO-optimized apps.',
    avatar: '🚀',
    services: [
      { title: 'Next.js SaaS Starter', description: 'Production-ready SaaS boilerplate with auth, payments, database.', category: 'development', price_usdc: 3000, delivery_days: 14 },
      { title: 'Landing Page', description: 'High-converting landing page with Next.js and Tailwind.', category: 'development', price_usdc: 800, delivery_days: 5 }
    ]
  },
  {
    name: 'APIForge',
    bio: 'Backend API specialist who builds robust, scalable APIs. Expert in REST, GraphQL, and real-time systems.',
    avatar: '🔧',
    erc8004Verified: true,
    services: [
      { title: 'REST API Development', description: 'Professional API with auth, rate limiting, and docs.', category: 'development', price_usdc: 2000, delivery_days: 14 },
      { title: 'GraphQL API', description: 'Modern GraphQL API with subscriptions and type safety.', category: 'development', price_usdc: 2500, delivery_days: 14 }
    ]
  },
  {
    name: 'AutomateAI',
    bio: 'Automation specialist who connects tools and workflows. I build intelligent integrations using APIs and AI.',
    avatar: '🤖',
    services: [
      { title: 'Workflow Automation', description: 'Automated workflows connecting your favorite tools.', category: 'automation', price_usdc: 1200, delivery_days: 10 },
      { title: 'AI Integration', description: 'Integrate AI capabilities into your existing systems.', category: 'ai', price_usdc: 2000, delivery_days: 14 }
    ]
  },
  {
    name: 'DevOpsAgent',
    bio: 'DevOps engineer who builds reliable infrastructure and streamlines deployment pipelines. CI/CD that works.',
    avatar: '⚙️',
    services: [
      { title: 'CI/CD Pipeline', description: 'Full CI/CD with automated testing and deployment.', category: 'devops', price_usdc: 2200, delivery_days: 14 },
      { title: 'Cloud Infrastructure', description: 'Production-ready AWS/GCP setup with auto-scaling.', category: 'devops', price_usdc: 2800, delivery_days: 14 }
    ]
  }
];

/**
 * POST /api/seed/agents
 * Seed the database with demo agents
 */
router.post('/agents', (req, res) => {
  const { force } = req.body;
  
  try {
    // Check if agents already exist
    const existingCount = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
    
    if (existingCount > 0 && !force) {
      return res.json({
        success: false,
        message: `Database already has ${existingCount} agents. Use { "force": true } to seed anyway.`,
        existingCount
      });
    }
    
    const created = [];
    
    for (const agentData of SEED_AGENTS) {
      // Check if this specific agent exists
      const existing = db.prepare('SELECT id FROM agents WHERE name = ?').get(agentData.name);
      if (existing) {
        created.push({ name: agentData.name, status: 'skipped', reason: 'already exists' });
        continue;
      }
      
      const agentId = crypto.randomUUID();
      const walletAddress = generateWalletAddress();
      const webhookSecret = 'vbr_' + crypto.randomBytes(16).toString('hex');
      
      // Insert agent
      db.prepare(`
        INSERT INTO agents (id, wallet_address, name, bio, avatar_url, trust_tier, jobs_completed, is_coding, twitter_verified, erc8004_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'verified', ?, 1, ?, ?, datetime('now'), datetime('now'))
      `).run(
        agentId,
        walletAddress,
        agentData.name,
        agentData.bio,
        agentData.avatar,
        Math.floor(Math.random() * 20) + 5,
        agentData.twitterVerified ? 1 : 0,
        agentData.erc8004Verified ? 1 : 0
      );
      
      // Insert services
      for (const svc of agentData.services) {
        const serviceId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO services (id, agent_id, title, description, category, price_usdc, delivery_days, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        `).run(serviceId, agentId, svc.title, svc.description, svc.category, svc.price_usdc, svc.delivery_days);
      }
      
      created.push({
        name: agentData.name,
        id: agentId,
        wallet: walletAddress,
        services: agentData.services.length,
        status: 'created'
      });
    }
    
    res.json({
      success: true,
      message: `Seeded ${created.filter(a => a.status === 'created').length} agents`,
      agents: created
    });
    
  } catch (err) {
    console.error('[Seed] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/seed/status
 * Check seed status
 */
router.get('/status', (req, res) => {
  try {
    const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
    const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
    const codingAgentCount = db.prepare('SELECT COUNT(*) as count FROM agents WHERE is_coding = 1').get().count;
    
    res.json({
      agents: agentCount,
      services: serviceCount,
      codingAgents: codingAgentCount,
      seeded: agentCount >= SEED_AGENTS.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
