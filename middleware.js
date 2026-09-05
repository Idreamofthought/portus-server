import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { db } from "./database2.js";

export function issueCsrfCookie(res) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie("csrf", token, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return token;
}

export function requireCsrf(req, res, next) {
  const cookie = req.cookies.csrf;
  const header = req.get("X-CSRF-Token");
  if (!cookie || !header || cookie !== header) return res.status(403).json({ error: "csrf check failed" });
  next();
}

export function wantsHTML(req) {
  return String(req.headers.accept || "").includes("text/html");
}

export function requireVerified(req, res, next) {
  const row = db.prepare(`SELECT email_verified FROM users WHERE id=?`).get(req.user.uid);
  if (!row || !row.email_verified) {
    if (wantsHTML(req)) return res.redirect(`/portus?verify=required`);
    return res.status(403).json({ error: "email not verified" });
  }
  next();
}

export function requirePaid(req, res, next) {
  const row = db.prepare(`SELECT remaining_seconds FROM time_tracking WHERE user_id=?`).get(req.user.uid);
  if (!row || row.remaining_seconds <= 0) {
    if (wantsHTML(req)) return res.redirect(`/portus?paid=required`);
    return res.status(403).json({ error: "no paid time" });
  }
  next();
}

export const jsonRateLimitHandler = (_req, res) => res.status(429).json({ error: "Too many requests — please wait a bit and try again." });
export const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, handler: jsonRateLimitHandler });
export const passwordResetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, handler: jsonRateLimitHandler });
export const checkoutLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, handler: jsonRateLimitHandler });
export const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, handler: jsonRateLimitHandler });
export const generalApiLimiter = rateLimit({ windowMs: 60 * 1000, max: 200, handler: jsonRateLimitHandler });
