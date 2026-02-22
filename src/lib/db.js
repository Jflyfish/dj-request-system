import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';

function resolveDbPath() {
  if (process.env.DATABASE_PATH) {
    return process.env.DATABASE_PATH;
  }

  // Serverless platforms (Vercel/Vertex-style deployments) usually only allow writes in /tmp.
  if (process.env.VERCEL || process.env.K_SERVICE || process.env.NODE_ENV === 'production') {
    return path.join(os.tmpdir(), 'dj-request.db');
  }

  return path.join(process.cwd(), 'dj-request.db');
}

function ensureParentDir(filePath) {
  const parent = path.dirname(filePath);
  fs.mkdirSync(parent, { recursive: true });
}

function openDatabase() {
  const primaryPath = resolveDbPath();

  try {
    ensureParentDir(primaryPath);
    return new Database(primaryPath);
  } catch {
    const fallbackPath = path.join(os.tmpdir(), 'dj-request.db');
    ensureParentDir(fallbackPath);
    return new Database(fallbackPath);
  }
}

const db = openDatabase();

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dj_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'live',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,
    FOREIGN KEY(dj_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    song_name TEXT NOT NULL,
    artist TEXT NOT NULL,
    guest_message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    tip_amount REAL DEFAULT 0,
    payment_status TEXT DEFAULT 'none',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    played_at TEXT,
    FOREIGN KEY(event_id) REFERENCES events(id)
  );
`);

export default db;
