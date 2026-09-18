import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../database2.js";
import {
  hashIp,
  hashEmail,
  recordAuditEvent,
  recordFailedLogin,
  clearFailedLogins,
  isLoginLocked,
  recentFailedLogins,
  getUserRole,
  LOGIN_LOCKOUT_THRESHOLD
} from "../security.js";

function createUser(email) {
  const info = db
    .prepare(`INSERT INTO users (email,password_hash,created_at) VALUES (?,?,?)`)
    .run(email, "hash", Date.now());
  return info.lastInsertRowid;
}

function cleanupUser(userId, email) {
  db.prepare(`DELETE FROM audit_events WHERE user_id=?`).run(userId);
  db.prepare(`DELETE FROM users WHERE id=?`).run(userId);
  db.prepare(`DELETE FROM login_attempts WHERE email_hash=?`).run(hashEmail(email));
}

test("ip hashing is deterministic, non-reversible, and tolerates missing ips", () => {
  const hashed = hashIp("203.0.113.7");
  assert.equal(hashed, hashIp("203.0.113.7"));
  assert.notEqual(hashed, "203.0.113.7");
  assert.ok(!hashed.includes("203"));
  assert.equal(hashIp(null), null);
});

test("email hashing is case and whitespace insensitive", () => {
  assert.equal(hashEmail("  Player@Example.COM "), hashEmail("player@example.com"));
});

test("login lockout triggers only after the threshold is reached", () => {
  const email = `lockout-${Date.now()}@example.com`;
  clearFailedLogins(email);
  for (let attempt = 0; attempt < LOGIN_LOCKOUT_THRESHOLD - 1; attempt++) {
    recordFailedLogin(email, "203.0.113.7");
  }
  assert.equal(isLoginLocked(email), false);
  recordFailedLogin(email, "203.0.113.7");
  assert.equal(isLoginLocked(email), true);
  clearFailedLogins(email);
  assert.equal(isLoginLocked(email), false);
  assert.equal(recentFailedLogins(email), 0);
});

test("login lockout applies to unknown accounts so it cannot be used to enumerate", () => {
  const unknown = `ghost-${Date.now()}@example.com`;
  clearFailedLogins(unknown);
  for (let attempt = 0; attempt < LOGIN_LOCKOUT_THRESHOLD; attempt++) {
    recordFailedLogin(unknown, "203.0.113.9");
  }
  assert.equal(isLoginLocked(unknown), true);
  clearFailedLogins(unknown);
});

test("login attempts never store the raw email or ip", () => {
  const email = `raw-${Date.now()}@example.com`;
  clearFailedLogins(email);
  recordFailedLogin(email, "203.0.113.7");
  const row = db
    .prepare(`SELECT email_hash, ip_hash FROM login_attempts WHERE email_hash=?`)
    .get(hashEmail(email));
  assert.ok(row);
  assert.notEqual(row.email_hash, email);
  assert.notEqual(row.ip_hash, "203.0.113.7");
  clearFailedLogins(email);
});

test("audit events record type and hashed ip without raw values", () => {
  const email = `audit-${Date.now()}@example.com`;
  const userId = createUser(email);
  recordAuditEvent({ userId, eventType: "login_succeeded", ip: "198.51.100.4" });
  const row = db
    .prepare(`SELECT event_type, ip_hash FROM audit_events WHERE user_id=?`)
    .get(userId);
  assert.equal(row.event_type, "login_succeeded");
  assert.notEqual(row.ip_hash, "198.51.100.4");
  cleanupUser(userId, email);
});

test("audit metadata is truncated so logs cannot be flooded", () => {
  const email = `meta-${Date.now()}@example.com`;
  const userId = createUser(email);
  recordAuditEvent({
    userId,
    eventType: "test_event",
    metadata: { blob: "x".repeat(5000) }
  });
  const row = db
    .prepare(`SELECT metadata FROM audit_events WHERE user_id=? AND event_type='test_event'`)
    .get(userId);
  assert.ok(row.metadata.length <= 500);
  cleanupUser(userId, email);
});

test("audit events survive account deletion but are de-identified", () => {
  const email = `orphan-${Date.now()}@example.com`;
  const userId = createUser(email);
  recordAuditEvent({ userId, eventType: "payment_credited" });
  db.prepare(`DELETE FROM users WHERE id=?`).run(userId);

  const orphan = db
    .prepare(`SELECT user_id FROM audit_events WHERE event_type='payment_credited' AND user_id IS NULL`)
    .get();
  assert.ok(orphan, "expected the audit row to remain with a null user_id");
  db.prepare(`DELETE FROM audit_events WHERE user_id IS NULL AND event_type='payment_credited'`).run();
  db.prepare(`DELETE FROM login_attempts WHERE email_hash=?`).run(hashEmail(email));
});

test("new users default to the non-privileged user role", () => {
  const email = `role-${Date.now()}@example.com`;
  const userId = createUser(email);
  assert.equal(getUserRole(userId), "user");
  cleanupUser(userId, email);
});

test("getUserRole returns null for an unknown user", () => {
  assert.equal(getUserRole(-1), null);
});

test("performance-sensitive lookups are backed by indexes", () => {
  const indexed = [
    ["sessions", "sessions_user_id"],
    ["sessions", "sessions_expires_at"],
    ["purchases", "purchases_user_id"],
    ["processed_payment_events", "processed_payment_events_created_at"],
    ["login_attempts", "login_attempts_email_time"],
    ["audit_events", "audit_events_user_created"]
  ];
  for (const [table, indexName] of indexed) {
    const names = db.prepare(`PRAGMA index_list(${table})`).all().map((i) => i.name);
    assert.ok(names.includes(indexName), `${table} is missing index ${indexName}`);
  }
});

test("foreign keys are enforced", () => {
  assert.equal(db.pragma("foreign_keys", { simple: true }), 1);
  assert.throws(
    () => db.prepare(`INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)`)
      .run("orphan-session", -999, Date.now() + 1000, Date.now()),
    /FOREIGN KEY/
  );
});

test("deleting a user cascades to sessions and saves", () => {
  const email = `cascade-${Date.now()}@example.com`;
  const userId = createUser(email);
  db.prepare(`INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)`)
    .run(`sess-${userId}`, userId, Date.now() + 1000, Date.now());
  db.prepare(`INSERT INTO saves (user_id,state,updated_at) VALUES (?,?,?)`)
    .run(userId, "{}", Date.now());

  db.prepare(`DELETE FROM users WHERE id=?`).run(userId);

  assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM sessions WHERE user_id=?`).get(userId).c, 0);
  assert.equal(db.prepare(`SELECT COUNT(*) AS c FROM saves WHERE user_id=?`).get(userId).c, 0);
  db.prepare(`DELETE FROM audit_events WHERE user_id IS NULL`).run();
  db.prepare(`DELETE FROM login_attempts WHERE email_hash=?`).run(hashEmail(email));
});

test("duplicate payment event ids are rejected by the primary key", () => {
  const eventId = `evt-${Date.now()}`;
  db.prepare(`INSERT INTO processed_payment_events (id,created_at) VALUES (?,?)`).run(eventId, Date.now());
  assert.throws(
    () => db.prepare(`INSERT INTO processed_payment_events (id,created_at) VALUES (?,?)`).run(eventId, Date.now()),
    /UNIQUE/
  );
  db.prepare(`DELETE FROM processed_payment_events WHERE id=?`).run(eventId);
});

test("duplicate user emails are rejected", () => {
  const email = `unique-${Date.now()}@example.com`;
  const userId = createUser(email);
  assert.throws(() => createUser(email), /UNIQUE/);
  cleanupUser(userId, email);
});
