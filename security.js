import crypto from "crypto";
import { db } from "./database2.js";
import { wantsHTML } from "./middleware.js";

// Failed logins are counted per hashed email over a rolling window. Counting by
// email rather than user id means unknown accounts lock out identically to real
// ones, so the response cannot be used to enumerate accounts.
export const LOGIN_LOCKOUT_THRESHOLD = 8;
export const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

// IPs are stored only as salted hashes so the audit trail cannot be trivially
// reversed into a location history.
const IP_HASH_SALT = process.env.IP_HASH_SALT || "portus-audit-salt";

export function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash("sha256").update(`${IP_HASH_SALT}:${ip}`).digest("hex").slice(0, 32);
}

export function hashEmail(email) {
  return crypto.createHash("sha256").update(String(email || "").trim().toLowerCase()).digest("hex");
}

const AUDIT_METADATA_MAX = 500;

export function recordAuditEvent({ userId = null, eventType, ip = null, metadata = null }) {
  let serialized = null;
  if (metadata) {
    serialized = JSON.stringify(metadata);
    if (serialized.length > AUDIT_METADATA_MAX) serialized = serialized.slice(0, AUDIT_METADATA_MAX);
  }
  db.prepare(
    `INSERT INTO audit_events (user_id,event_type,ip_hash,metadata,created_at) VALUES (?,?,?,?,?)`
  ).run(userId, eventType, hashIp(ip), serialized, Date.now());
}

export function recordFailedLogin(email, ip) {
  db.prepare(`INSERT INTO login_attempts (email_hash,ip_hash,attempted_at) VALUES (?,?,?)`).run(
    hashEmail(email),
    hashIp(ip),
    Date.now()
  );
}

export function recentFailedLogins(email) {
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM login_attempts WHERE email_hash=? AND attempted_at > ?`)
    .get(hashEmail(email), Date.now() - LOGIN_LOCKOUT_WINDOW_MS);
  return row ? row.count : 0;
}

export function isLoginLocked(email) {
  return recentFailedLogins(email) >= LOGIN_LOCKOUT_THRESHOLD;
}

export function clearFailedLogins(email) {
  db.prepare(`DELETE FROM login_attempts WHERE email_hash=?`).run(hashEmail(email));
}

export function getUserRole(userId) {
  const row = db.prepare(`SELECT role FROM users WHERE id=?`).get(userId);
  return row ? row.role : null;
}

// Roles are always read from the database for the authenticated user; nothing
// role-related is ever taken from the request.
export function requireAdmin(req, res, next) {
  const role = getUserRole(req.user.uid);
  if (role !== "admin") {
    recordAuditEvent({
      userId: req.user.uid,
      eventType: "admin_access_denied",
      ip: req.ip,
      metadata: { path: req.path }
    });
    if (wantsHTML(req)) return res.status(403).send("Forbidden");
    return res.status(403).json({ error: "forbidden" });
  }
  next();
}
