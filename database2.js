import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDatabasePath = path.join(moduleDir, "portus2.db");
const configuredDatabasePath = process.env.DATABASE_PATH || defaultDatabasePath;

if (process.env.NODE_ENV === "production" && (!process.env.DATABASE_PATH || !path.isAbsolute(process.env.DATABASE_PATH))) {
  throw new Error("DATABASE_PATH must be an absolute path in production; mount a Railway volume first");
}

export const db = new Database(configuredDatabasePath);
db.pragma("foreign_keys = ON");
db.pragma(process.env.NODE_ENV === "test" ? "journal_mode = DELETE" : "journal_mode = WAL");

// Retention for webhook deduplication and in-flight order bookkeeping.
const PAYMENT_RECORD_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
export const ACCOUNT_RETENTION_MS = 10 * 365 * 24 * 60 * 60 * 1000;
export const AUDIT_RETENTION_MS = 400 * 24 * 60 * 60 * 1000;
export const LOGIN_ATTEMPT_RETENTION_MS = 24 * 60 * 60 * 1000;

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified INTEGER DEFAULT 0,
  captain_name TEXT DEFAULT '',
  stripe_customer_id TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
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
  customer_id TEXT,
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS time_tracking (
  user_id INTEGER PRIMARY KEY,
  remaining_seconds INTEGER NOT NULL DEFAULT 0,
  last_active_at INTEGER,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Platform-neutral ownership. Steam, web purchases, promotions and manual
-- grants all unlock the same game; platform SDK details stay outside gameplay.
CREATE TABLE IF NOT EXISTS entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  entitlement TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_id TEXT,
  granted_at INTEGER NOT NULL,
  revoked_at INTEGER,
  UNIQUE(user_id, entitlement, provider),
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

-- Security audit trail. user_id is nulled rather than cascaded on account
-- deletion so the record of an event survives while being de-identified.
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  event_type TEXT NOT NULL,
  ip_hash TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Keyed by hashed email so lockout behaves identically for accounts that do
-- not exist, preventing account enumeration.
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_hash TEXT NOT NULL,
  ip_hash TEXT,
  attempted_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS entitlements_user_active ON entitlements(user_id, entitlement, revoked_at);
CREATE INDEX IF NOT EXISTS processed_payment_events_created_at ON processed_payment_events(created_at);
CREATE INDEX IF NOT EXISTS pending_orders_created_at ON pending_orders(created_at);
CREATE INDEX IF NOT EXISTS audit_events_user_created ON audit_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS audit_events_created_at ON audit_events(created_at);
CREATE INDEX IF NOT EXISTS login_attempts_email_time ON login_attempts(email_hash, attempted_at);
`);

const userColumns = db.prepare(`PRAGMA table_info(users)`).all();
if (!userColumns.some((column) => column.name === "stripe_customer_id")) {
  db.exec(`ALTER TABLE users ADD COLUMN stripe_customer_id TEXT`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id ON users(stripe_customer_id)`);
}
if (!userColumns.some((column) => column.name === "deleted_at")) {
  db.exec(`ALTER TABLE users ADD COLUMN deleted_at INTEGER`);
}
if (!userColumns.some((column) => column.name === "role")) {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'`);
}

const purchaseColumns = db.prepare(`PRAGMA table_info(purchases)`).all();
for (const column of ["customer_id", "checkout_session_id", "payment_intent_id"]) {
  if (!purchaseColumns.some((existing) => existing.name === column)) {
    db.exec(`ALTER TABLE purchases ADD COLUMN ${column} TEXT`);
  }
}

const purchasesCascadesFromUsers = db
  .prepare(`PRAGMA foreign_key_list(purchases)`)
  .all()
  .some((foreignKey) => foreignKey.table === "users" && foreignKey.on_delete === "CASCADE");

if (purchasesCascadesFromUsers) {
  db.transaction(() => {
    db.exec(`
      CREATE TABLE purchases_new (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        provider TEXT NOT NULL,
        product_id TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        amount TEXT NOT NULL,
        currency TEXT NOT NULL,
        customer_id TEXT,
        checkout_session_id TEXT,
        payment_intent_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );
      INSERT INTO purchases_new SELECT
        id, user_id, provider, product_id, minutes, amount, currency,
        customer_id, checkout_session_id, payment_intent_id, created_at
      FROM purchases;
      DROP TABLE purchases;
      ALTER TABLE purchases_new RENAME TO purchases;
    `);
  })();
}

export function cleanupExpired() {
  const now = Date.now();
  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(now);
  db.prepare(`DELETE FROM email_verification_tokens WHERE expires_at < ?`).run(now);
  db.prepare(`DELETE FROM password_reset_tokens WHERE expires_at < ?`).run(now);
  const paymentRecordCutoff = now - PAYMENT_RECORD_RETENTION_MS;
  db.prepare(`DELETE FROM processed_payment_events WHERE created_at < ?`).run(paymentRecordCutoff);
  db.prepare(`DELETE FROM pending_orders WHERE created_at < ?`).run(paymentRecordCutoff);
  db.prepare(`DELETE FROM login_attempts WHERE attempted_at < ?`).run(now - LOGIN_ATTEMPT_RETENTION_MS);
  db.prepare(`DELETE FROM audit_events WHERE created_at < ?`).run(now - AUDIT_RETENTION_MS);

  const accountRetentionCutoff = now - ACCOUNT_RETENTION_MS;
  db.transaction(() => {
    db.prepare(
      `DELETE FROM purchases
       WHERE user_id IN (SELECT id FROM users WHERE deleted_at IS NOT NULL AND deleted_at < ?)`
    ).run(accountRetentionCutoff);
    db.prepare(
      `DELETE FROM users
       WHERE deleted_at IS NOT NULL AND deleted_at < ?
         AND NOT EXISTS (SELECT 1 FROM purchases WHERE purchases.user_id = users.id)`
    ).run(accountRetentionCutoff);
  })();
}
