import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./database2.js";
import { ROUTES } from "./routes-config.js";
import { jwtSecret, secureCookies } from "./runtime-security.js";

export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getJwtSecret() {
  return jwtSecret();
}

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : email;
}

export function validCredentials(email, password) {
  return typeof email === "string" && EMAIL_RE.test(email) && validPassword(password);
}

export const PASSWORD_REQUIREMENTS = "Password must contain at least 8 characters and no more than 72 UTF-8 bytes. Long passwords may need to be reset.";

export function validPassword(password) {
  return typeof password === "string" && password.length >= 8 && Buffer.byteLength(password, "utf8") <= 72;
}

export function hashToken(raw) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function createSession(userId) {
  const id = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  db.prepare(`INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)`).run(id, userId, now + SESSION_LIFETIME_MS, now);
  return id;
}

export function issueAuthCookie(res, userId) {
  const sid = createSession(userId);
  const token = jwt.sign({ uid: userId, sid }, getJwtSecret(), { expiresIn: "30d" });
  res.cookie("auth", token, { httpOnly: true, sameSite: "lax", secure: secureCookies(), maxAge: SESSION_LIFETIME_MS, path: "/" });
}

export function revokeSession(id) {
  if (id) db.prepare(`DELETE FROM sessions WHERE id=?`).run(id);
}

// Logout still needs the claims from an expired token, but the signature must
// hold: an unverified payload would let a caller name any session or user.
export function verifyAuthToken(token, { ignoreExpiration = false } = {}) {
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret(), { ignoreExpiration, algorithms: ["HS256"] });
  } catch {
    return null;
  }
}

export function revokeAllSessions(userId) {
  db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(userId);
}

export function authenticateRequest(req, res, next) {
  const wantsHTML = String(req.headers.accept || "").includes("text/html");
  const token = req.cookies.auth;
  if (!token) return wantsHTML ? res.redirect(ROUTES.signup) : res.status(401).json({ error: "not logged in" });
  let payload;
  try { payload = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }); } catch { return wantsHTML ? res.redirect(ROUTES.login) : res.status(401).json({ error: "invalid token" }); }
  const session = db.prepare(`SELECT id,expires_at FROM sessions WHERE id=? AND user_id=?`).get(payload.sid, payload.uid);
  if (!session || session.expires_at < Date.now()) {
    res.clearCookie("auth");
    return wantsHTML ? res.redirect(ROUTES.login) : res.status(401).json({ error: "session expired" });
  }
  req.user = { uid: payload.uid };
  req.sessionId = payload.sid;
  next();
}

export async function hashPassword(password) {
  if (!validPassword(password)) throw new Error(PASSWORD_REQUIREMENTS);
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  if (!validPassword(password)) return false;
  return bcrypt.compare(password, hash);
}
