const express = require('express');
const cors = require('cors');
const db = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3457;

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Get current timestamp in seconds
const now = () => Math.floor(Date.now() / 1000);

// ============ AGENTS ============

// Get all agents
app.get('/api/agents', (req, res) => {
  const agents = db.prepare('SELECT * FROM agents ORDER BY trustScore DESC').all();
  res.json(agents.map(agent => ({
    ...agent,
    skills: agent.skills ? JSON.parse(agent.skills) : []
  })));
});

// Get agent by ID
app.get('/api/agents/:id', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({
    ...agent,
    skills: agent.skills ? JSON.parse(agent.skills) : []
  });
});

// Get agent by address
app.get('/api/agents/by-address/:address', (req, res) => {
  const agent = db.prepare('SELECT * FROM agents WHERE address = ?').get(req.params.address);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  res.json({
    ...agent,
    skills: agent.skills ? JSON.parse(agent.skills) : []
  });
});

// Create agent
app.post('/api/agents', (req, res) => {
  const { address, name, avatar, bio, skills } = req.body;
  
  try {
    const result = db.prepare(`
      INSERT INTO agents (address, name, avatar, bio, skills, lastHeartbeat)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(address, name, avatar, bio, JSON.stringify(skills || []), now());
    
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...agent,
      skills: agent.skills ? JSON.parse(agent.skills) : []
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update agent
app.patch('/api/agents/:id', (req, res) => {
  const updates = [];
  const values = [];
  
  ['name', 'avatar', 'bio', 'status', 'currentProjectId', 'erc8004Id'].forEach(field => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  });
  
  if (req.body.skills !== undefined) {
    updates.push('skills = ?');
    values.push(JSON.stringify(req.body.skills));
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  values.push(req.params.id);
  
  try {
    db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    res.json({
      ...agent,
      skills: agent.skills ? JSON.parse(agent.skills) : []
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ PROPOSALS ============

// Get all proposals
app.get('/api/proposals', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM proposals';
  const params = [];
  
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY convictionScore DESC, createdAt DESC';
  
  const proposals = db.prepare(query).all(...params);
  res.json(proposals.map(p => ({
    ...p,
    requiredRoles: p.requiredRoles ? JSON.parse(p.requiredRoles) : []
  })));
});

// Get proposal by ID
app.get('/api/proposals/:id', (req, res) => {
  const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
  if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
  res.json({
    ...proposal,
    requiredRoles: proposal.requiredRoles ? JSON.parse(proposal.requiredRoles) : []
  });
});

// Create proposal
app.post('/api/proposals', (req, res) => {
  const {
    authorId, title, tagline, problem, solution, audience, scope, timeline,
    requiredRoles, minTeamSize, maxTeamSize
  } = req.body;
  
  try {
    const result = db.prepare(`
      INSERT INTO proposals (
        authorId, title, tagline, problem, solution, audience, scope, timeline,
        requiredRoles, minTeamSize, maxTeamSize
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      authorId, title, tagline, problem, solution, audience, scope, timeline,
      JSON.stringify(requiredRoles || []), minTeamSize, maxTeamSize
    );
    
    // Update author's proposal count
    db.prepare('UPDATE agents SET proposalsCreated = proposalsCreated + 1 WHERE id = ?')
      .run(authorId);
    
    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...proposal,
      requiredRoles: proposal.requiredRoles ? JSON.parse(proposal.requiredRoles) : []
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update proposal status
app.patch('/api/proposals/:id', (req, res) => {
  const { status, projectId } = req.body;
  const updates = [];
  const values = [];
  
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
    
    if (status === 'voting') {
      updates.push('votingStartedAt = ?');
      values.push(now());
    } else if (status === 'approved') {
      updates.push('approvedAt = ?');
      values.push(now());
    }
  }
  
  if (projectId !== undefined) {
    updates.push('projectId = ?');
    values.push(projectId);
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  values.push(req.params.id);
  
  try {
    db.prepare(`UPDATE proposals SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const proposal = db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id);
    res.json({
      ...proposal,
      requiredRoles: proposal.requiredRoles ? JSON.parse(proposal.requiredRoles) : []
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ VOTES ============

// Get votes for a proposal
app.get('/api/votes/proposal/:proposalId', (req, res) => {
  const votes = db.prepare(`
    SELECT v.*, a.name as agentName, a.address as agentAddress
    FROM votes v
    JOIN agents a ON v.agentId = a.id
    WHERE v.proposalId = ? AND v.active = 1
    ORDER BY v.conviction DESC
  `).all(req.params.proposalId);
  res.json(votes);
});

// Cast/update vote
app.post('/api/votes', (req, res) => {
  const { agentId, proposalId, weight } = req.body;
  
  try {
    // Check if vote exists
    const existing = db.prepare('SELECT * FROM votes WHERE agentId = ? AND proposalId = ?')
      .get(agentId, proposalId);
    
    const timestamp = now();
    
    if (existing) {
      // Update existing vote
      db.prepare(`
        UPDATE votes 
        SET weight = ?, conviction = ?, lastConvictionUpdate = ?, active = 1
        WHERE agentId = ? AND proposalId = ?
      `).run(weight, weight, timestamp, agentId, proposalId);
    } else {
      // Create new vote
      db.prepare(`
        INSERT INTO votes (agentId, proposalId, weight, conviction, stakedAt, lastConvictionUpdate)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(agentId, proposalId, weight, weight, timestamp, timestamp);
    }
    
    // Update proposal conviction score
    const totalConviction = db.prepare(`
      SELECT SUM(conviction) as total, COUNT(*) as count
      FROM votes
      WHERE proposalId = ? AND active = 1
    `).get(proposalId);
    
    db.prepare(`
      UPDATE proposals 
      SET convictionScore = ?, voterCount = ?
      WHERE id = ?
    `).run(totalConviction.total || 0, totalConviction.count || 0, proposalId);
    
    const vote = db.prepare('SELECT * FROM votes WHERE agentId = ? AND proposalId = ?')
      .get(agentId, proposalId);
    res.status(201).json(vote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Withdraw vote
app.delete('/api/votes/:agentId/:proposalId', (req, res) => {
  const { agentId, proposalId } = req.params;
  
  try {
    db.prepare(`
      UPDATE votes 
      SET active = 0, withdrawnAt = ?
      WHERE agentId = ? AND proposalId = ?
    `).run(now(), agentId, proposalId);
    
    // Update proposal conviction score
    const totalConviction = db.prepare(`
      SELECT SUM(conviction) as total, COUNT(*) as count
      FROM votes
      WHERE proposalId = ? AND active = 1
    `).get(proposalId);
    
    db.prepare(`
      UPDATE proposals 
      SET convictionScore = ?, voterCount = ?
      WHERE id = ?
    `).run(totalConviction.total || 0, totalConviction.count || 0, proposalId);
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ PROJECTS ============

// Get all projects
app.get('/api/projects', (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM projects';
  const params = [];
  
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY createdAt DESC';
  
  const projects = db.prepare(query).all(...params);
  res.json(projects.map(p => ({
    ...p,
    members: p.members ? JSON.parse(p.members) : []
  })));
});

// Get project by ID
app.get('/api/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json({
    ...project,
    members: project.members ? JSON.parse(project.members) : []
  });
});

// Create project
app.post('/api/projects', (req, res) => {
  const { proposalId, teamLeadId, members, description } = req.body;
  
  try {
    const result = db.prepare(`
      INSERT INTO projects (proposalId, teamLeadId, members, description, startedAt)
      VALUES (?, ?, ?, ?, ?)
    `).run(proposalId, teamLeadId, JSON.stringify(members || []), description, now());
    
    // Update proposal
    db.prepare(`
      UPDATE proposals 
      SET status = 'building', projectId = ?
      WHERE id = ?
    `).run(result.lastInsertRowid, proposalId);
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...project,
      members: project.members ? JSON.parse(project.members) : []
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update project
app.patch('/api/projects/:id', (req, res) => {
  const updates = [];
  const values = [];
  
  ['status', 'repoUrl', 'demoUrl', 'description'].forEach(field => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  });
  
  if (req.body.members !== undefined) {
    updates.push('members = ?');
    values.push(JSON.stringify(req.body.members));
  }
  
  if (req.body.status === 'shipped') {
    updates.push('shippedAt = ?');
    values.push(now());
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  values.push(req.params.id);
  
  try {
    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    res.json({
      ...project,
      members: project.members ? JSON.parse(project.members) : []
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ TASKS ============

// Get tasks for a project
app.get('/api/tasks/project/:projectId', (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, a.name as assigneeName
    FROM tasks t
    LEFT JOIN agents a ON t.assigneeId = a.id
    WHERE t.projectId = ?
    ORDER BY 
      CASE t.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      t.createdAt DESC
  `).all(req.params.projectId);
  res.json(tasks);
});

// Create task
app.post('/api/tasks', (req, res) => {
  const { projectId, title, description, assigneeId, priority, createdById } = req.body;
  
  try {
    const result = db.prepare(`
      INSERT INTO tasks (projectId, title, description, assigneeId, priority, createdById)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(projectId, title, description, assigneeId || null, priority || 'medium', createdById);
    
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update task
app.patch('/api/tasks/:id', (req, res) => {
  const updates = [];
  const values = [];
  
  ['title', 'description', 'assigneeId', 'status', 'priority'].forEach(field => {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(req.body[field]);
    }
  });
  
  if (req.body.status === 'done') {
    updates.push('completedAt = ?');
    values.push(now());
  }
  
  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }
  
  values.push(req.params.id);
  
  try {
    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ ACTIVITIES ============

// Get recent activities
app.get('/api/activities', (req, res) => {
  const { limit = 50 } = req.query;
  const activities = db.prepare(`
    SELECT a.*, ag.name as agentName, ag.avatar as agentAvatar
    FROM activities a
    JOIN agents ag ON a.agentId = ag.id
    ORDER BY a.createdAt DESC
    LIMIT ?
  `).all(limit);
  
  res.json(activities.map(a => ({
    ...a,
    metadata: a.metadata ? JSON.parse(a.metadata) : null
  })));
});

// Create activity
app.post('/api/activities', (req, res) => {
  const { type, agentId, entityType, entityId, summary, metadata } = req.body;
  
  try {
    const result = db.prepare(`
      INSERT INTO activities (type, agentId, entityType, entityId, summary, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, agentId, entityType, entityId, summary, JSON.stringify(metadata || {}));
    
    const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============ HEALTH CHECK ============

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    backend: 'sqlite',
    database: 'viberr.db',
    timestamp: now()
  });
});

// ============ STATS ============

app.get('/api/stats', (req, res) => {
  const stats = {
    agents: db.prepare('SELECT COUNT(*) as count FROM agents').get().count,
    proposals: db.prepare('SELECT COUNT(*) as count FROM proposals').get().count,
    projects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
    tasks: db.prepare('SELECT COUNT(*) as count FROM tasks').get().count,
    activities: db.prepare('SELECT COUNT(*) as count FROM activities').get().count
  };
  res.json(stats);
});

// Start server
app.listen(PORT, () => {
  console.log(`✨ Viberr backend running on http://localhost:${PORT}`);
  console.log(`   Backend: SQLite`);
  console.log(`   Database: ${__dirname}/db/viberr.db`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
