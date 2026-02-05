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
`);

module.exports = db;
