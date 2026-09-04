import "dotenv/config";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "url";
import crypto from "crypto";

import { db, cleanupExpired } from "./database2.js";
import { resend } from "./resend.js";

import {
  normalizeEmail,
  validCredentials,
  hashToken,
  issueAuthCookie,
  authenticateRequest,
  revokeSession,
  revokeAllSessions,
  hashPassword,
  verifyPassword
} from "./auth.js";

import {
  issueCsrfCookie,
  requireCsrf,
  requireVerified,
  requirePaid,
  authLimiter,
  passwordResetLimiter,
  checkoutLimiter,
  generalApiLimiter
} from "./middleware.js";

import { PRODUCTS } from "./products.js";

import {
  createPayPalOrder,
  capturePayPalOrder,
  createStripeCheckout,
  handleStripeWebhook,
  verifyPayPalWebhookSignature,
  creditPayment
} from "./payments.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 8080);
const SITE_URL = process.env.SITE_URL || "https://www.idreamofthought.org";
const MAX_SAVE_BYTES = 512 * 1024;
const HEARTBEAT_MAX_GAP_MS = 30_000;

// ============================================================
// SECURITY
// ============================================================

app.set("trust proxy", 1);

app.use(helmet({ contentSecurityPolicy: false }));

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `connect-src 'self' ${SITE_URL}`,
      "img-src 'self' data:",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "object-src 'none'",
      "frame-ancestors 'none'"
    ].join("; ")
  );
  next();
});

app.use(cookieParser());
app.use(cors({ origin: SITE_URL, credentials: true }));
app.use(express.json({ limit: "600kb" }));

// ============================================================
// STRIPE WEBHOOK
// ============================================================

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const result = await handleStripeWebhook(
        req.body,
        req.get("stripe-signature")
      );
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("stripe webhook error", err);
      res.status(400).json({ error: "invalid webhook" });
    }
  }
);

// ============================================================
// STATIC FILES
// ============================================================

app.use(express.static(path.join(__dirname, "homepage")));
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// PORTUS GAME ROUTING
// ============================================================

app.use("/portus", express.static(path.join(__dirname, "public")));

app.get(["/portus", "/portus/"], (_req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ============================================================
// HOMEPAGE ROUTES
// ============================================================

app.get("/", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/index.html"))
);
app.get("/about", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/about.html"))
);
app.get("/contact", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/contact.html"))
);
app.get("/portus-info", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/portus-info.html"))
);

// ============================================================
// PROTECTED GAME ROUTE
// ============================================================

app.get(
  "/game",
  authenticateRequest,
  requireVerified,
  requirePaid,
  (_req, res) =>
    res.sendFile(path.join(__dirname, "protected/game.html"))
);

// ============================================================
// API ROUTES
// ============================================================

// CSRF token
app.get("/api/csrf-token", (_req, res) =>
  res.json({ csrfToken: issueCsrfCookie(res) })
);

// Signup
app.post("/api/signup", authLimiter, requireCsrf, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!validCredentials(email, password))
    return res
      .status(400)
      .json({ error: "invalid email or password (min 8 characters)" });

  const passwordHash = await hashPassword(password);

  let userId;
  try {
    userId = db
      .prepare(
        `INSERT INTO users (email,password_hash,email_verified,created_at) VALUES (?,?,0,?)`
      )
      .run(email, passwordHash, Date.now()).lastInsertRowid;
  } catch {
    return res.status(400).json({ error: "unable to create account" });
  }

  try {
    const raw = crypto.randomBytes(32).toString("hex");
    db.prepare(
      `INSERT INTO email_verification_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)`
    ).run(hashToken(raw), userId, Date.now() + 86400000);

    const url = `${SITE_URL}/verify-email?token=${encodeURIComponent(raw)}`;

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Verify your Portus account",
      html: `<p>Click to verify your email:</p><p><a href="${url}">${url}</a></p>`
    });
  } catch (err) {
    console.error("verification email failed", err);
  }

  issueAuthCookie(res, userId);
  res.json({ ok: true });
});

// Login
app.post("/api/login", authLimiter, requireCsrf, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = req.body.password;

  if (!validCredentials(email, password))
    return res.status(400).json({ error: "invalid credentials" });

  const user = db
    .prepare(`SELECT id,password_hash,email_verified FROM users WHERE email=?`)
    .get(email);

  const dummy =
    "$2a$12$C6UzMDM.H6dfI/f/IKco.aH0uP.tX3XLE5X8y5X8y5X8y5X8y5X8y";
  const ok = await verifyPassword(password, user?.password_hash || dummy);

  if (!user || !ok)
    return res.status(400).json({ error: "invalid credentials" });

  if (!user.email_verified)
    return res
      .status(403)
      .json({ error: "please verify your email before logging in" });

  issueAuthCookie(res, user.id);
  res.json({ ok: true });
});

// Logout
app.post("/api/logout", requireCsrf, (req, res) => {
  try {
    const token = req.cookies.auth;
    if (token) {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString()
      );
      revokeSession(payload.sid);
    }
  } catch {}

  res.clearCookie("auth", { path: "/" });
  res.json({ ok: true });
});

// Me
app.get("/api/me", authenticateRequest, (req, res) => {
  const user = db
    .prepare(
      `SELECT email,email_verified,captain_name FROM users WHERE id=?`
    )
    .get(req.user.uid);

  if (!user) return res.status(401).json({ error: "not logged in" });

  res.json({
    email: user.email,
    emailVerified: !!user.email_verified,
    captainName: user.captain_name || ""
  });
});

// Email verification
app.get("/verify-email", passwordResetLimiter, (req, res) => {
  const token = req.query.token;

  if (typeof token !== "string")
    return res.redirect(`${SITE_URL}/portus?verify=missing`);

  const row = db
    .prepare(`SELECT * FROM email_verification_tokens WHERE token_hash=?`)
    .get(hashToken(token));

  if (!row || row.used || row.expires_at < Date.now())
    return res.redirect(`${SITE_URL}/portus?verify=invalid`);

  const tx = db.transaction(() => {
    db.prepare(`UPDATE users SET email_verified=1 WHERE id=?`).run(
      row.user_id
    );
    db.prepare(`UPDATE email_verification_tokens SET used=1 WHERE token_hash=?`)
      .run(row.token_hash);
  });

  tx();
  res.redirect(`${SITE_URL}/portus?verify=success`);
});

// Resend verification
app.post(
  "/api/resend-verification",
  authenticateRequest,
  requireCsrf,
  passwordResetLimiter,
  async (req, res) => {
    const user = db
      .prepare(`SELECT email,email_verified FROM users WHERE id=?`)
      .get(req.user.uid);

    if (!user) return res.status(401).json({ error: "not logged in" });

    if (user.email_verified)
      return res.json({ ok: true, alreadyVerified: true });

    const raw = crypto.randomBytes(32).toString("hex");

    db.prepare(
      `INSERT INTO email_verification_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)`
    ).run(hashToken(raw), req.user.uid, Date.now() + 86400000);

    try {
      const url = `${SITE_URL}/verify-email?token=${encodeURIComponent(raw)}`;

      await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Verify your Portus account",
        html: `<p><a href="${url}">${url}</a></p>`
      });
    } catch (err) {
      console.error("resend verification failed", err);
      return res
        .status(500)
        .json({ error: "could not send email — try again shortly" });
    }

    res.json({ ok: true, alreadyVerified: false });
  }
);

// Password reset request
app.post("/api/request-password-reset", passwordResetLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);

  if (typeof email !== "string") return res.json({ ok: true });

  const user = db
    .prepare(`SELECT id FROM users WHERE email=?`)
    .get(email);

  if (!user) return res.json({ ok: true });

  const raw = crypto.randomBytes(32).toString("hex");

  db.prepare(
    `INSERT INTO password_reset_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)`
  ).run(hashToken(raw), user.id, Date.now() + 3600000);

  try {
    const url = `${SITE_URL}/reset-password.html?token=${encodeURIComponent(
      raw
    )}`;

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Reset your Portus password",
      html: `<p><a href="${url}">${url}</a></p>`
    });
  } catch (err) {
    console.error("reset email failed", err);
  }

  res.json({ ok: true });
});

// Password reset
app.post("/api/reset-password", passwordResetLimiter, async (req, res) => {
  const token = req.body.token;
  const password = req.body.newPassword;

  if (
    typeof token !== "string" ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 200
  )
    return res.status(400).json({ error: "invalid request" });

  const row = db
    .prepare(`SELECT * FROM password_reset_tokens WHERE token_hash=?`)
    .get(hashToken(token));

  if (!row || row.used || row.expires_at < Date.now())
    return res.status(400).json({ error: "invalid or expired token" });

  const hash = await hashPassword(password);

  const tx = db.transaction(() => {
    db.prepare(`UPDATE users SET password_hash=? WHERE id=?`).run(
      hash,
      row.user_id
    );
    db.prepare(`UPDATE password_reset_tokens SET used=1 WHERE token_hash=?`)
      .run(row.token_hash);
    revokeAllSessions(row.user_id);
  });

  tx();
  res.json({ ok: true });
});

// Change password
app.post(
  "/api/change-password",
  authenticateRequest,
  requireCsrf,
  authLimiter,
  async (req, res) => {
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;

    if (
      typeof oldPassword !== "string" ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 200
    )
      return res.status(400).json({ error: "invalid password" });

    const user = db
      .prepare(`SELECT password_hash FROM users WHERE id=?`)
      .get(req.user.uid);

    if (!user || !(await verifyPassword(oldPassword, user.password_hash)))
      return res.status(400).json({ error: "current password is incorrect" });

    db.prepare(`UPDATE users SET password_hash=? WHERE id=?`).run(
      await hashPassword(newPassword),
      req.user.uid
    );

    revokeAllSessions(req.user.uid);
    res.clearCookie("auth", { path: "/" });

    res.json({ ok: true });
  }
);

// Delete account
app.post("/api/delete-account", authenticateRequest, requireCsrf, async (req, res) => {
  const userId = req.user.uid;

  db.prepare(`DELETE FROM users WHERE id=?`).run(userId);

  res.clearCookie("auth", { path: "/" });
  res.json({ ok: true });
});

// Access time
app.get("/api/access", authenticateRequest, (req, res) => {
  const row = db
    .prepare(`SELECT remaining_seconds FROM time_tracking WHERE user_id=?`)
    .get(req.user.uid);

  const seconds = Math.max(0, Math.floor(row?.remaining_seconds || 0));

  res.json({
    remainingSeconds: seconds,
    canPlay: seconds > 0,
    accessExpiresAt: Date.now() + seconds * 1000
  });
});

// Heartbeat
app.post("/api/access/heartbeat", authenticateRequest, requireCsrf, (req, res) => {
  const now = Date.now();
  let remaining;

  const tx = db.transaction(() => {
    let row = db
      .prepare(
        `SELECT remaining_seconds,last_active_at FROM time_tracking WHERE user_id=?`
      )
      .get(req.user.uid);

    if (!row) {
      db.prepare(
        `INSERT INTO time_tracking (user_id,remaining_seconds,last_active_at,updated_at) VALUES (?,0,?,?)`
      ).run(req.user.uid, now, now);
      remaining = 0;
      return;
    }

    let elapsed = row.last_active_at ? now - row.last_active_at : 0;

    if (elapsed > HEARTBEAT_MAX_GAP_MS) elapsed = 0;

    const debit = Math.max(0, Math.floor(elapsed / 1000));

    remaining = Math.max(0, row.remaining_seconds - debit);

    db.prepare(
      `UPDATE time_tracking SET remaining_seconds=?,last_active_at=?,updated_at=? WHERE user_id=?`
    ).run(remaining, now, now, req.user.uid);
  });

  tx();

  res.json({
    remainingSeconds: remaining,
    canPlay: remaining > 0,
    accessExpiresAt: now + remaining * 1000
  });
});

// Stop access
app.post("/api/access/stop", authenticateRequest, requireCsrf, (req, res) => {
  db.prepare(
    `UPDATE time_tracking SET last_active_at=NULL,updated_at=? WHERE user_id=?`
  ).run(Date.now(), req.user.uid);

  res.json({ ok: true });
});

// Products
app.get("/api/products", (_req, res) =>
  res.json({ products: Object.values(PRODUCTS) })
);

// PayPal checkout
app.post(
  "/api/checkout/paypal",
  authenticateRequest,
  requireVerified,
  requireCsrf,
  checkoutLimiter,
  async (req, res) => {
    try {
      res.json(
        await createPayPalOrder({
          userId: req.user.uid,
          productId: req.body.productId,
          siteUrl: SITE_URL
        })
      );
    } catch (err) {
      console.error("paypal create order failed", err);
      res.status(400).json({
        error: err.message === "invalid product" ? err.message : "paypal error"
      });
    }
  }
);

// PayPal capture
app.post(
  "/api/checkout/paypal/capture",
  authenticateRequest,
  requireCsrf,
  checkoutLimiter,
  async (req, res) => {
    try {
      res.json(
        await capturePayPalOrder({
          userId: req.user.uid,
          orderId: req.body.orderId
        })
      );
    } catch (err) {
      console.error("paypal capture failed", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// Stripe checkout
app.post(
  "/api/checkout/stripe",
  authenticateRequest,
  requireVerified,
  requireCsrf,
  checkoutLimiter,
  async (req, res) => {
    try {
      res.json(
        await createStripeCheckout({
          userId: req.user.uid,
          productId: req.body.productId,
          siteUrl: SITE_URL
        })
      );
    } catch (err) {
      console.error("stripe checkout failed", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// PayPal webhook
app.post("/api/webhooks/paypal", async (req, res) => {
  try {
    const valid = await verifyPayPalWebhookSignature(req.headers, req.body);
    if (!valid) {
      return res.status(400).json({ error: "invalid signature" });
    }

    if (req.body.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      return res.json({ ok: true, ignored: true });
    }

    const capture = req.body.resource;
    const orderId =
      capture?.supplementary_data?.related_ids?.order_id;
    const eventId = capture?.id;
    const capturedAmount = capture?.amount?.value;

    if (!orderId || !eventId || !capturedAmount) {
      return res.status(400).json({ error: "malformed event" });
    }

    const pending = db
      .prepare(
        `SELECT * FROM pending_orders WHERE order_id=? AND provider='paypal'`
      )
      .get(orderId);

    if (!pending) {
      return res.json({ ok: true, unknownOrder: true });
    }

    const result = creditPayment({ pending, eventId, capturedAmount });
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("paypal webhook error", err);
    return res.status(400).json({ error: "webhook error" });
  }
});

// Save game state
app.post("/api/save", authenticateRequest, requireCsrf, (req, res) => {
  const json = JSON.stringify(req.body ?? {});
  if (Buffer.byteLength(json, "utf8") > MAX_SAVE_BYTES) {
    return res.status(413).json({ error: "save too large" });
  }

  db.prepare(
    `INSERT INTO saves (user_id,state,updated_at)
     VALUES (?,?,?)
     ON CONFLICT(user_id)
     DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at`
  ).run(req.user.uid, json, Date.now());

  if (typeof req.body?.captain === "string") {
    db.prepare(`UPDATE users SET captain_name=? WHERE id=?`).run(
      req.body.captain.slice(0, 24),
      req.user.uid
    );
  }

  res.json({ ok: true });
});

// Load game state
app.get("/api/save", authenticateRequest, (req, res) => {
  const row = db
    .prepare(`SELECT state FROM saves WHERE user_id=?`)
    .get(req.user.uid);

  let state = null;
  try {
    state = row ? JSON.parse(row.state) : null;
  } catch {
    state = null;
  }

  res.json({ state });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

// Cleanup expired tokens / orders
cleanupExpired();
setInterval(cleanupExpired, 24 * 60 * 60 * 1000).unref();

// Start server
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
