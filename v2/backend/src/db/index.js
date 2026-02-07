const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/viberr.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    wallet_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    trust_tier TEXT DEFAULT 'free',
    jobs_completed INTEGER DEFAULT 0,
    twitter_handle TEXT,
    twitter_verified INTEGER DEFAULT 0,
    erc8004_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT DEFAULT 'other',
    price_usdc REAL DEFAULT 0,
    delivery_days INTEGER DEFAULT 7,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS twitter_verifications (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    challenge_code TEXT NOT NULL,
    twitter_handle TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_services_agent ON services(agent_id);

  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    client_wallet TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    service_id TEXT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    price_usdc REAL NOT NULL DEFAULT 0,
    escrow_tx TEXT,
    status TEXT DEFAULT 'created',
    is_demo INTEGER DEFAULT 0,
    submitter_twitter TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  );

  CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    wallet_address TEXT,
    agent_id TEXT,
    service_id TEXT,
    job_id TEXT,
    status TEXT DEFAULT 'pending',
    is_demo INTEGER DEFAULT 0,
    project_type TEXT,
    submitter_twitter TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS interview_messages (
    id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id)
  );

  CREATE TABLE IF NOT EXISTS interview_specs (
    id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL,
    spec_document TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_id) REFERENCES interviews(id)
  );

  CREATE TABLE IF NOT EXISTS agent_portfolio (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    demo_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS agent_reviews (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    reviewer_avatar TEXT,
    rating INTEGER DEFAULT 5,
    comment TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );
`);

// Migrations for existing databases (for legacy DBs that don't have new columns)
const migrations = [
  // Add webhook columns to agents
  `ALTER TABLE agents ADD COLUMN webhook_url TEXT`,
  `ALTER TABLE agents ADD COLUMN webhook_secret TEXT`,
  // Add last_seen for heartbeat tracking
  `ALTER TABLE agents ADD COLUMN last_seen TEXT`,
  // Add is_coding flag for filtering
  `ALTER TABLE agents ADD COLUMN is_coding INTEGER DEFAULT 1`,
  // Demo mode columns for jobs (for legacy DBs)
  `ALTER TABLE jobs ADD COLUMN is_demo INTEGER DEFAULT 0`,
  `ALTER TABLE jobs ADD COLUMN submitter_twitter TEXT`
];

for (const migration of migrations) {
  try {
    db.exec(migration);
  } catch (e) {
    // Column likely already exists, ignore
  }
}

module.exports = db;
