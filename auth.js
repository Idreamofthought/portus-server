import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./database2.js";

export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const COOKIE_SECURE = process.env.NODE_ENV === "production";
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : email;
}

export function validCredentials(email, password) {
  return typeof email === "string" && typeof password === "string" && EMAIL_RE.test(email) && password.length >= 8 && password.length <= 200;
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
  const token = jwt.sign({ uid: userId, sid }, process.env.JWT_SECRET, { expiresIn: "30d" });
  res.cookie("auth", token, { httpOnly: true, sameSite: "lax", secure: COOKIE_SECURE, maxAge: SESSION_LIFETIME_MS, path: "/" });
}

export function revokeSession(id) {
  if (id) db.prepare(`DELETE FROM sessions WHERE id=?`).run(id);
}

export function revokeAllSessions(userId) {
  db.prepare(`DELETE FROM sessions WHERE user_id=?`).run(userId);
}

export function authenticateRequest(req, res, next) {
  const token = req.cookies.auth;
  if (!token) return res.status(401).json({ error: "not logged in" });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { return res.status(401).json({ error: "invalid token" }); }
  const session = db.prepare(`SELECT id,expires_at FROM sessions WHERE id=? AND user_id=?`).get(payload.sid, payload.uid);
  if (!session || session.expires_at < Date.now()) {
    res.clearCookie("auth");
    return res.status(401).json({ error: "session expired" });
  }
  req.user = { uid: payload.uid };
  req.sessionId = payload.sid;
  next();
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
