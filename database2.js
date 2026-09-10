import Database from "better-sqlite3";
import path from "node:path";

const configuredDatabasePath = process.env.DATABASE_PATH;
if (process.env.NODE_ENV === "production" && (!configuredDatabasePath || !path.isAbsolute(configuredDatabasePath))) {
  throw new Error("DATABASE_PATH must be an absolute path in production; mount a Railway volume first");
}

export const db = new Database(configuredDatabasePath || "portus2.db");
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

const PAYMENT_RECORD_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0,
  captain_name TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  provider TEXT NOT NULL,
  product_id TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS time_tracking (
  user_id INTEGER PRIMARY KEY,
  remaining_seconds INTEGER NOT NULL DEFAULT 0,
  last_active_at INTEGER,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saves (
  user_id INTEGER PRIMARY KEY,
  state TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS processed_payment_events (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_orders (
  order_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  consumed INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  discovery_id TEXT NOT NULL,
  discovery_type TEXT NOT NULL CHECK(discovery_type IN ('artifact', 'archaeological_find')),
  category TEXT NOT NULL,
  rarity TEXT,
  activity TEXT NOT NULL,
  fragment_index INTEGER NOT NULL DEFAULT 0,
  fragment_count INTEGER NOT NULL DEFAULT 1,
  discovered_at INTEGER NOT NULL,
  UNIQUE(user_id, discovery_id, discovery_type, fragment_index),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_codex_unlocks (
  user_id INTEGER NOT NULL,
  entry_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY(user_id, entry_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS player_discovery_rolls (
  user_id INTEGER NOT NULL,
  activity TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  result_json TEXT NOT NULL,
  rolled_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, activity, turn_number),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

export function cleanupExpired() {
  const now = Date.now();
  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(now);
  db.prepare(`DELETE FROM email_verification_tokens WHERE expires_at < ?`).run(now);
  db.prepare(`DELETE FROM password_reset_tokens WHERE expires_at < ?`).run(now);
  const paymentRecordCutoff = now - PAYMENT_RECORD_RETENTION_MS;
  db.prepare(`DELETE FROM processed_payment_events WHERE created_at < ?`).run(paymentRecordCutoff);
  db.prepare(`DELETE FROM pending_orders WHERE created_at < ?`).run(paymentRecordCutoff);
}
