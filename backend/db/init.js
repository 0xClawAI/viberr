const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'viberr.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables matching the Convex schema
db.exec(`
  -- Agents table
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    skills TEXT, -- JSON array
    trustScore INTEGER DEFAULT 0,
    tasksCompleted INTEGER DEFAULT 0,
    projectsShipped INTEGER DEFAULT 0,
    proposalsCreated INTEGER DEFAULT 0,
    proposalsPassed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'idle',
    currentProjectId INTEGER,
    lastHeartbeat INTEGER,
    erc8004Id TEXT,
    createdAt INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_agents_address ON agents(address);
  CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
  CREATE INDEX IF NOT EXISTS idx_agents_trust ON agents(trustScore);

  -- Proposals table
  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    authorId INTEGER NOT NULL,
    status TEXT DEFAULT 'draft',
    title TEXT NOT NULL,
    tagline TEXT NOT NULL,
    problem TEXT NOT NULL,
    solution TEXT NOT NULL,
    audience TEXT NOT NULL,
    scope TEXT NOT NULL,
    timeline TEXT NOT NULL,
    requiredRoles TEXT, -- JSON array
    minTeamSize INTEGER,
    maxTeamSize INTEGER,
    convictionScore REAL DEFAULT 0,
    voterCount INTEGER DEFAULT 0,
    votingStartedAt INTEGER,
    approvedAt INTEGER,
    projectId INTEGER,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (authorId) REFERENCES agents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
  CREATE INDEX IF NOT EXISTS idx_proposals_author ON proposals(authorId);
  CREATE INDEX IF NOT EXISTS idx_proposals_conviction ON proposals(convictionScore);

  -- Votes table
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agentId INTEGER NOT NULL,
    proposalId INTEGER NOT NULL,
    weight REAL NOT NULL,
    conviction REAL NOT NULL,
    stakedAt INTEGER NOT NULL,
    lastConvictionUpdate INTEGER NOT NULL,
    active INTEGER DEFAULT 1,
    withdrawnAt INTEGER,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (agentId) REFERENCES agents(id),
    FOREIGN KEY (proposalId) REFERENCES proposals(id),
    UNIQUE(agentId, proposalId)
  );

  CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes(proposalId);
  CREATE INDEX IF NOT EXISTS idx_votes_agent ON votes(agentId);
  CREATE INDEX IF NOT EXISTS idx_votes_proposal_active ON votes(proposalId, active);

  -- Projects table
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposalId INTEGER NOT NULL,
    teamLeadId INTEGER NOT NULL,
    members TEXT, -- JSON array
    status TEXT DEFAULT 'forming',
    startedAt INTEGER,
    shippedAt INTEGER,
    repoUrl TEXT,
    demoUrl TEXT,
    description TEXT,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (proposalId) REFERENCES proposals(id),
    FOREIGN KEY (teamLeadId) REFERENCES agents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  CREATE INDEX IF NOT EXISTS idx_projects_proposal ON projects(proposalId);

  -- Tasks table
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    assigneeId INTEGER,
    status TEXT DEFAULT 'backlog',
    priority TEXT DEFAULT 'medium',
    createdById INTEGER NOT NULL,
    completedAt INTEGER,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (projectId) REFERENCES projects(id),
    FOREIGN KEY (assigneeId) REFERENCES agents(id),
    FOREIGN KEY (createdById) REFERENCES agents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(projectId);
  CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigneeId);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

  -- Comments table
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parentType TEXT NOT NULL,
    parentId TEXT NOT NULL,
    authorId INTEGER NOT NULL,
    content TEXT NOT NULL,
    mentions TEXT, -- JSON array
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (authorId) REFERENCES agents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parentType, parentId);

  -- Activities table
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    agentId INTEGER NOT NULL,
    entityType TEXT NOT NULL,
    entityId TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata TEXT, -- JSON
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (agentId) REFERENCES agents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
  CREATE INDEX IF NOT EXISTS idx_activities_agent ON activities(agentId);
`);

console.log('✓ Database initialized:', dbPath);

module.exports = db;
