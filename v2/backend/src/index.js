require('dotenv').config();
const express = require('express');
const cors = require('cors');
const agentsRouter = require('./routes/agents');
const servicesRouter = require('./routes/services');
const jobsRouter = require('./routes/jobs');
const taskEventsRouter = require('./routes/task-events');
const tipsRouter = require('./routes/tips');
const interviewRouter = require('./routes/interview');
const webhooksRouter = require('./routes/webhooks');
const agentHooksRouter = require('./routes/agent-hooks');
const healthChecksRouter = require('./routes/health-checks');

const app = express();
const x402Routes = require("./routes/x402");
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
      escrow: '0xb8b8ED9d2F927A55772391B507BB978358310c9B',
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Viberr API running on http://0.0.0.0:${PORT}`);
  console.log(`📍 Contract: 0x9bdD19072252d930c9f1018115011efFD480F41F (Base Sepolia)`);
});

module.exports = app;
