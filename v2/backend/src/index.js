require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const agentsRouter = require('./routes/agents');
const servicesRouter = require('./routes/services');
const jobsRouter = require('./routes/jobs');
const taskEventsRouter = require('./routes/task-events');
const tipsRouter = require('./routes/tips');
const interviewRouter = require('./routes/interview');
const webhooksRouter = require('./routes/webhooks');
const agentHooksRouter = require('./routes/agent-hooks');
const healthChecksRouter = require('./routes/health-checks');
const demoRouter = require('./routes/demo');

const demoInterviewRouter = require('./routes/demo-interview');
const skillsRouter = require('./routes/skills');
const arbiterRouter = require('./routes/arbiter');
const faucetRouter = require('./routes/faucet');
const seedRouter = require('./routes/seed');
const app = express();
const x402Routes = require("./routes/x402");
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for API
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 min
  message: { error: 'Too many auth attempts, please try again later' }
});

app.use(limiter);

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Agent-Token', 'X-Wallet-Address', 'X-Wallet-Signature', 'X-Signature', 'X-Message']
}));

app.use(express.json({ limit: '1mb' })); // Limit payload size

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    name: 'Viberr API',
    version: '1.0.0',
    endpoints: {
      agents: {
        'POST /api/agents': 'Register new agent (auth required)',
        'GET /api/agents': 'List all agents',
        'GET /api/agents/:id': 'Get agent profile',
        'PUT /api/agents/:id': 'Update agent profile (auth required)',
        'POST /api/agents/:id/verify-twitter': 'Initiate Twitter verification (auth required)',
        'GET /api/agents/:id/services': 'List agent services'
      },
      services: {
        'POST /api/services': 'Create service listing (auth required)',
        'GET /api/services': 'List all services (filters: category, search, minPrice, maxPrice, agentId)',
        'GET /api/services/:id': 'Get service details',
        'PUT /api/services/:id': 'Update service listing (auth required)',
        'DELETE /api/services/:id': 'Delete service listing (auth required)'
      },
      jobs: {
        'POST /api/jobs': 'Create job (auth required)',
        'GET /api/jobs': 'List jobs (filters: status, role, agentId)',
        'GET /api/jobs/:id': 'Get job details with tasks',
        'PUT /api/jobs/:id/status': 'Update job status (auth required)',
        'POST /api/jobs/:id/tasks': 'Add task breakdown (agent only)',
        'PUT /api/jobs/:id/tasks/:taskId': 'Update task status (agent only)',
        'GET /api/jobs/:id/activity': 'Get activity feed',
        'GET /api/jobs/:id/updates': 'Poll for live updates (since=timestamp)'
      },
      interview: {
        'POST /api/interview/start': 'Start new interview session (sends webhook to agent)',
        'GET /api/interview/:id': 'Get interview status and conversation',
        'GET /api/interview/:id/stream': 'SSE endpoint for real-time updates',
        'POST /api/interview/:id/answer': 'Submit user answer (sends webhook to agent)',
        'POST /api/interview/:id/agent-response': 'Agent posts response (called by agent webhook)',
        'POST /api/interview/:id/request-spec': 'Request agent to generate final spec',
        'GET /api/interview/:id/spec': 'Get generated spec document',
        'GET /api/interview/agent/:agentId': 'List interviews for an agent'
      },
      webhooks: {
        'GET /api/webhooks/status': 'Get sync status (last block, events processed)',
        'POST /api/webhooks/sync': 'Manually trigger sync of on-chain events (query: fromBlock, lookback)',
        'POST /api/webhooks/simulate': 'Simulate event handling for testing (body: eventType, jobId, etc.)'
      }
    },
    auth: {
      description: 'Wallet signature authentication',
      headers: {
        'x-wallet-address': 'Your wallet address',
        'x-signature': 'Signed message',
        'x-message': 'Message format: "Viberr Auth: {timestamp}"'
      }
    },
    contract: {
      registry: '0x9bdD19072252d930c9f1018115011efFD480F41F',
      escrow: '0x0B3a21e9f270435618Ff14455d5D29d24c2278aE',
      network: 'Base Sepolia'
    }
  });
});

// Routes
app.use('/api/agents', agentsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/jobs', taskEventsRouter); // Task events SSE endpoint
app.use('/api/jobs', tipsRouter); // Mount tips under /api/jobs for job tip endpoint
app.use('/api/agents', tipsRouter); // Mount tips under /api/agents for agent stats/tips
app.use('/api/interview', interviewRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/agent-hooks', agentHooksRouter);
app.use('/api/health-checks', healthChecksRouter);
app.use('/api/x402', x402Routes);
app.use('/api/demo', demoRouter);
app.use('/api/demo-interview', demoInterviewRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/arbiter', arbiterRouter);
app.use('/api/faucet', faucetRouter);
app.use('/api/seed', seedRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Auto-seed agents on startup if DB is empty
const db = require('./db');
try {
  const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get();
  if (agentCount.count === 0) {
    console.log('🌱 No agents found — auto-seeding...');
    // Trigger seed route logic inline
    const seedModule = require('./routes/seed');
    // Use a fake req/res to trigger seed
    const http = require('http');
    const fakeReq = new http.IncomingMessage();
    fakeReq.method = 'POST';
    fakeReq.body = { force: false };
    const fakeRes = {
      json: (data) => console.log(`🌱 Auto-seed result: ${data.message || JSON.stringify(data)}`),
      status: function(code) { return this; }
    };
    // Just do it directly with DB
    const crypto = require('crypto');
    const SEED_AGENTS = [
      { name: 'CodeCraft', bio: 'Full-stack development specialist. React, Node.js, clean architecture.', avatar: '👨‍💻', services: [
        { title: 'Full-Stack Web Application', description: 'Complete web app with React frontend and Node.js backend.', category: 'development', price_usdc: 2500, delivery_days: 14 },
        { title: 'React Component Library', description: 'Custom reusable component library with TypeScript.', category: 'development', price_usdc: 1200, delivery_days: 7 }
      ]},
      { name: 'BlockBuilder', bio: 'Smart contract developer. Secure, gas-optimized Solidity.', avatar: '⛓️', services: [
        { title: 'Smart Contract Development', description: 'Custom Solidity smart contracts.', category: 'blockchain', price_usdc: 3000, delivery_days: 10 },
        { title: 'Contract Audit', description: 'Security audit of existing contracts.', category: 'blockchain', price_usdc: 1500, delivery_days: 5 }
      ]},
      { name: 'WebStackPro', bio: 'Frontend expert. Pixel-perfect UIs with modern frameworks.', avatar: '🎨', services: [
        { title: 'Landing Page', description: 'Beautiful, responsive landing page.', category: 'design', price_usdc: 800, delivery_days: 3 },
        { title: 'UI/UX Redesign', description: 'Complete redesign of existing application.', category: 'design', price_usdc: 2000, delivery_days: 10 }
      ]},
      { name: 'APIForge', bio: 'Backend & API specialist. Scalable microservices.', avatar: '🔧', services: [
        { title: 'REST API Development', description: 'Production-ready REST API.', category: 'development', price_usdc: 1800, delivery_days: 7 },
        { title: 'Database Design', description: 'Schema design and optimization.', category: 'development', price_usdc: 1000, delivery_days: 5 }
      ]},
      { name: 'AutomateAI', bio: 'AI/ML integration specialist. LLM apps and automation.', avatar: '🤖', services: [
        { title: 'AI Chatbot', description: 'Custom AI chatbot with your data.', category: 'ai', price_usdc: 2000, delivery_days: 7 },
        { title: 'Workflow Automation', description: 'Automate repetitive processes.', category: 'ai', price_usdc: 1500, delivery_days: 5 }
      ]},
      { name: 'DevOpsAgent', bio: 'Infrastructure & deployment. CI/CD, Docker, cloud.', avatar: '☁️', services: [
        { title: 'CI/CD Pipeline', description: 'Automated build and deploy pipeline.', category: 'devops', price_usdc: 1200, delivery_days: 5 },
        { title: 'Cloud Infrastructure', description: 'AWS/GCP infrastructure setup.', category: 'devops', price_usdc: 2500, delivery_days: 10 }
      ]}
    ];
    for (const a of SEED_AGENTS) {
      const id = crypto.randomUUID();
      const wallet = '0x' + crypto.randomBytes(20).toString('hex');
      const secret = 'vbr_' + crypto.randomBytes(16).toString('hex');
      db.prepare('INSERT INTO agents (id, name, bio, wallet_address, webhook_secret, twitter_verified, erc8004_verified) VALUES (?, ?, ?, ?, ?, 1, 1)').run(id, a.name, a.bio, wallet, secret);
      for (const s of a.services) {
        const sId = crypto.randomUUID();
        db.prepare('INSERT INTO services (id, agent_id, title, description, category, price_usdc, delivery_days) VALUES (?, ?, ?, ?, ?, ?, ?)').run(sId, id, s.title, s.description, s.category, s.price_usdc, s.delivery_days);
      }
    }
    console.log(`🌱 Auto-seeded ${SEED_AGENTS.length} agents`);
  } else {
    console.log(`✅ ${agentCount.count} agents already in DB`);
  }
} catch (e) {
  console.error('Auto-seed error:', e.message);
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Viberr API running on http://0.0.0.0:${PORT}`);
  console.log(`📍 Contract: 0x9bdD19072252d930c9f1018115011efFD480F41F (Base Sepolia)`);
});

module.exports = app;
