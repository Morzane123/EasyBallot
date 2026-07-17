import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DB_PATH || './data/easyballot.db';
    const absolutePath = path.resolve(dbPath);
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(absolutePath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vote_items (
      id TEXT PRIMARY KEY,
      vote_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS options (
      id TEXT PRIMARY KEY,
      vote_item_id TEXT NOT NULL,
      label TEXT NOT NULL,
      image_url TEXT,
      video_url TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vote_item_id) REFERENCES vote_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ballots (
      id TEXT PRIMARY KEY,
      vote_id TEXT NOT NULL,
      device_fingerprint TEXT NOT NULL,
      voter_number INTEGER NOT NULL,
      verification_code TEXT NOT NULL,
      choices TEXT NOT NULL,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (vote_id) REFERENCES votes(id) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_ballots_fingerprint
      ON ballots(vote_id, device_fingerprint);
  `);
}

export function closeDb() {
  if (db) {
    db.close();
  }
}
