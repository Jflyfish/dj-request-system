import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'dj-request.db');
const db = new Database(dbPath);

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
