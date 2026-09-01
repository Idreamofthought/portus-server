import Database from "better-sqlite3";

export const db = new Database(process.env.DATABASE_PATH || "database.db");
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

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
`);

// Compatibility migration for the original Portus schema.
function tableColumns(table){ return db.prepare(`PRAGMA table_info(${table})`).all().map(x=>x.name); }

const columns = tableColumns("time_tracking");
if (!columns.includes("remaining_seconds")) {
  db.exec(`ALTER TABLE time_tracking ADD COLUMN remaining_seconds INTEGER`);
  db.exec(`UPDATE time_tracking SET remaining_seconds = COALESCE(remaining_minutes, 0) * 60 WHERE remaining_seconds IS NULL`);
}
if (!columns.includes("last_active_at")) {
  db.exec(`ALTER TABLE time_tracking ADD COLUMN last_active_at INTEGER`);
}

db.prepare(`UPDATE time_tracking SET remaining_seconds=COALESCE(remaining_seconds, COALESCE(remaining_minutes,0)*60) WHERE remaining_seconds IS NULL`).run();

// Migrate the original payment tables without requiring a manual database reset.
let purchaseCols = tableColumns("purchases");
for (const [name, type] of [["provider","TEXT"],["product_id","TEXT"],["amount","TEXT"],["currency","TEXT"]]) {
  if (!purchaseCols.includes(name)) { db.exec(`ALTER TABLE purchases ADD COLUMN ${name} ${type}`); purchaseCols.push(name); }
}
db.prepare(`UPDATE purchases SET provider=COALESCE(provider,'paypal'), product_id=COALESCE(product_id,'legacy'), amount=COALESCE(amount,'0.00'), currency=COALESCE(currency,'USD')`).run();

let pendingCols = tableColumns("pending_orders");
for (const [name, type] of [["provider","TEXT"],["product_id","TEXT"],["minutes","INTEGER"],["amount","TEXT"],["currency","TEXT"]]) {
  if (!pendingCols.includes(name)) { db.exec(`ALTER TABLE pending_orders ADD COLUMN ${name} ${type}`); pendingCols.push(name); }
}
if (pendingCols.includes("hours")) db.prepare(`UPDATE pending_orders SET provider=COALESCE(provider,'paypal'), product_id=CASE COALESCE(hours,0) WHEN 1 THEN 'hour' WHEN 3 THEN 'three_hours' WHEN 24 THEN 'day' ELSE COALESCE(product_id,'legacy') END, minutes=COALESCE(minutes,COALESCE(hours,0)*60), amount=COALESCE(amount,amount_usd), currency=COALESCE(currency,'USD')`).run();

export function cleanupExpired() {
  const now = Date.now();
  db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).run(now);
  db.prepare(`DELETE FROM email_verification_tokens WHERE expires_at < ?`).run(now);
  db.prepare(`DELETE FROM password_reset_tokens WHERE expires_at < ?`).run(now);
}
