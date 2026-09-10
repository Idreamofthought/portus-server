import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { fileURLToPath } from "url";
import crypto from "crypto";

import { db, cleanupExpired } from "./database2.js";
import {
  ACTIVITY_DISCOVERY_CHANCES,
  ARCHAEOLOGICAL_FINDS,
  ARTIFACTS,
  RARITY_WEIGHTS
} from "./data/discovery_catalog.js";

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
  hasFreeAccess,
  authLimiter,
  passwordResetLimiter,
  checkoutLimiter,
  webhookLimiter,
  generalApiLimiter
} from "./middleware.js";

import { PRODUCTS } from "./products.js";
import {
  sendVerificationEmail,
  sendPasswordResetEmail
} from "./email.js";

import {
  createPayPalOrder,
  capturePayPalOrder,
  createStripeCheckout,
  confirmStripeCheckout,
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

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function rollRarity() {
  let roll = Math.random() * 100;
  for (const rarity of RARITY_WEIGHTS) {
    roll -= rarity.weight;
    if (roll < 0) return rarity.id;
  }
  return RARITY_WEIGHTS[0].id;
}

const CODEX_ENTRY_IDS = new Set([
  ...ARTIFACTS.map((item) => item.codexEntry),
  ...ARCHAEOLOGICAL_FINDS.map((item) => item.codexEntry)
]);

function readCodexEntry(entryId) {
  if (!CODEX_ENTRY_IDS.has(entryId) || !/^[a-z0-9_/-]+$/.test(entryId)) return null;
  const filePath = path.join(__dirname, "portus", "codex", `${entryId}.md`);
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const heading = content.match(/^#\s+(.+)$/m);
    return { entryId, title: heading?.[1]?.trim() || entryId, content };
  } catch (error) {
    if (error.code !== "ENOENT") console.error("codex entry read failed", error);
    return { entryId, title: entryId, content: null };
  }
}

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

// ============================================================
// STRIPE WEBHOOK
// ============================================================

app.post(
  "/api/webhooks/stripe",
  webhookLimiter,
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

app.use(express.json({ limit: "600kb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

// ============================================================
// STATIC FILES
// ============================================================

app.get(["/portus", "/portus/"], authenticateRequest, requireVerified, requirePaid, (_req, res) =>
  res.sendFile(path.join(__dirname, "protected/game.html"))
);

// /tree used to be a separate homepage; its content is now merged into
// the real homepage (homepage/index.html). Redirect old links/bookmarks.
app.get(["/tree", "/tree/", "/tree/index.html"], (_req, res) =>
  res.redirect(301, "/#branches")
);

app.use(express.static(path.join(__dirname, "homepage")));
app.use("/homepage", express.static(path.join(__dirname, "homepage")));
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// PORTUS GAME ROUTING
// ============================================================

app.use("/portus", express.static(path.join(__dirname, "public")));

// ============================================================
// HOMEPAGE ROUTES
// ============================================================

app.get("/home", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/index.html"))
);
app.get("/about", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/about.html"))
);
app.get("/what-is", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/identity.html"))
);
app.get("/contact", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/contact.html"))
);
app.get("/fragments", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/fragments.html"))
);
app.get("/portus-info", (_req, res) =>
  res.sendFile(path.join(__dirname, "homepage/portus-info.html"))
);

// ============================================================
// PROTECTED GAME ROUTE
// ============================================================

app.get("/game", authenticateRequest, requireVerified, requirePaid, (_req, res) =>
  res.sendFile(path.join(__dirname, "protected/game.html"))
);
// /text-game needs no explicit route -- public/ is already mounted as
// static at root, and Express serves public/text-game/index.html for
// both /text-game and /text-game/ automatically.

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

    await sendVerificationEmail({ email, token: raw });
  } catch (err) {
    console.error("verification email failed", err);
    issueAuthCookie(res, userId);
    return res.status(502).json({
      error: "account created, but the verification email could not be sent"
    });
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
      await sendVerificationEmail({ email: user.email, token: raw });
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
    await sendPasswordResetEmail({ email, token: raw });
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
app.post("/api/delete-account", authenticateRequest, requireCsrf, generalApiLimiter, async (req, res) => {
  const userId = req.user.uid;

  db.prepare(`DELETE FROM users WHERE id=?`).run(userId);

  res.clearCookie("auth", { path: "/" });
  res.json({ ok: true });
});

// Access time
app.get("/api/access", authenticateRequest, (req, res) => {
  if (hasFreeAccess(req.user.uid)) {
    return res.json({
      remainingSeconds: null,
      canPlay: true,
      freeAccess: true,
      accessExpiresAt: null
    });
  }

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
app.post("/api/access/heartbeat", authenticateRequest, requireCsrf, generalApiLimiter, (req, res) => {
  if (hasFreeAccess(req.user.uid)) {
    return res.json({
      remainingSeconds: null,
      canPlay: true,
      freeAccess: true,
      accessExpiresAt: null
    });
  }

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
app.post("/api/access/stop", authenticateRequest, requireCsrf, generalApiLimiter, (req, res) => {
  db.prepare(
    `UPDATE time_tracking SET last_active_at=NULL,updated_at=? WHERE user_id=?`
  ).run(Date.now(), req.user.uid);

  res.json({ ok: true });
});

// Artifact and archaeological discovery
app.get("/api/discoveries", authenticateRequest, requireVerified, requirePaid, (req, res) => {
  const discoveries = db.prepare(
    `SELECT discovery_id, discovery_type, category, rarity, activity,
            fragment_index, fragment_count, discovered_at
     FROM player_discoveries WHERE user_id=? ORDER BY discovered_at DESC`
  ).all(req.user.uid);
  const codexUnlocks = db.prepare(
    `SELECT entry_id, unlocked_at, source FROM player_codex_unlocks
     WHERE user_id=? ORDER BY unlocked_at DESC`
  ).all(req.user.uid);

  const codexEntries = codexUnlocks
    .map((unlock) => {
      const entry = readCodexEntry(unlock.entry_id);
      return entry ? { ...entry, unlockedAt: unlock.unlocked_at, source: unlock.source } : null;
    })
    .filter(Boolean);

  res.json({ discoveries, codexUnlocks, codexEntries });
});

app.post("/api/discoveries/roll", authenticateRequest, requireVerified, requirePaid, requireCsrf, generalApiLimiter, (req, res) => {
  const activity = req.body?.activity;
  const turnNumber = req.body?.turnNumber;
  const chance = ACTIVITY_DISCOVERY_CHANCES[activity];

  if (chance === undefined || !Number.isSafeInteger(turnNumber) || turnNumber < 0) {
    return res.status(400).json({ error: "invalid discovery activity or turn number" });
  }

  const result = db.transaction(() => {
    const priorRoll = db.prepare(
      `SELECT result_json FROM player_discovery_rolls
       WHERE user_id=? AND activity=? AND turn_number=?`
    ).get(req.user.uid, activity, turnNumber);

    if (priorRoll) return { alreadyRolled: true, ...JSON.parse(priorRoll.result_json) };

    let discovery = null;
    if (Math.random() < chance) {
      if (Math.random() < 0.7) {
        const ownedIds = new Set(db.prepare(
          `SELECT discovery_id FROM player_discoveries
           WHERE user_id=? AND discovery_type='artifact'`
        ).all(req.user.uid).map((row) => row.discovery_id));
        const candidates = ARTIFACTS.filter((artifact) => !ownedIds.has(artifact.id));

        if (candidates.length > 0) {
          const artifact = randomItem(candidates);
          const rarity = rollRarity();
          db.prepare(
            `INSERT INTO player_discoveries
             (user_id,discovery_id,discovery_type,category,rarity,activity,fragment_index,fragment_count,discovered_at)
             VALUES (?,?,?,?,?,?,?,?,?)`
          ).run(req.user.uid, artifact.id, "artifact", artifact.category, rarity, activity, 0, 1, Date.now());
          db.prepare(
            `INSERT OR IGNORE INTO player_codex_unlocks (user_id,entry_id,unlocked_at,source)
             VALUES (?,?,?,?)`
          ).run(req.user.uid, artifact.codexEntry, Date.now(), artifact.id);
          discovery = { type: "artifact", id: artifact.id, title: artifact.title, category: artifact.category, rarity };
        }
      } else {
        const candidates = ARCHAEOLOGICAL_FINDS.filter((find) => {
          const row = db.prepare(
            `SELECT COUNT(*) AS count FROM player_discoveries
             WHERE user_id=? AND discovery_id=? AND discovery_type='archaeological_find'`
          ).get(req.user.uid, find.id);
          return row.count < find.fragments;
        });

        if (candidates.length > 0) {
          const find = randomItem(candidates);
          const row = db.prepare(
            `SELECT COUNT(*) AS count FROM player_discoveries
             WHERE user_id=? AND discovery_id=? AND discovery_type='archaeological_find'`
          ).get(req.user.uid, find.id);
          const fragmentIndex = row.count + 1;
          db.prepare(
            `INSERT INTO player_discoveries
             (user_id,discovery_id,discovery_type,category,rarity,activity,fragment_index,fragment_count,discovered_at)
             VALUES (?,?,?,?,?,?,?,?,?)`
          ).run(req.user.uid, find.id, "archaeological_find", "archaeological_finds", null, activity, fragmentIndex, find.fragments, Date.now());
          const assembled = fragmentIndex === find.fragments;
          if (assembled) {
            db.prepare(
              `INSERT OR IGNORE INTO player_codex_unlocks (user_id,entry_id,unlocked_at,source)
               VALUES (?,?,?,?)`
            ).run(req.user.uid, find.codexEntry, Date.now(), find.id);
          }
          discovery = { type: "archaeological_find", id: find.id, title: find.title, fragmentIndex, fragmentCount: find.fragments, assembled };
        }
      }
    }

    const response = { discovery };
    db.prepare(
      `INSERT INTO player_discovery_rolls (user_id,activity,turn_number,result_json,rolled_at)
       VALUES (?,?,?,?,?)`
    ).run(req.user.uid, activity, turnNumber, JSON.stringify(response), Date.now());
    return response;
  })();

  res.json({ ok: true, activity, turnNumber, ...result });
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

app.post(
  "/api/checkout/stripe/confirm",
  authenticateRequest,
  requireVerified,
  requireCsrf,
  checkoutLimiter,
  async (req, res) => {
    try {
      res.json(
        await confirmStripeCheckout({
          userId: req.user.uid,
          sessionId: req.body.sessionId
        })
      );
    } catch (err) {
      console.error("stripe checkout confirmation failed", err);
      res.status(400).json({ error: err.message });
    }
  }
);

// PayPal webhook
app.post("/api/webhooks/paypal", webhookLimiter, async (req, res) => {
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
    const eventId = req.body?.id || capture?.id;
    const capturedAmount = capture?.amount?.value;
    const capturedCurrency = capture?.amount?.currency_code;

    if (!orderId || !eventId || !capturedAmount || !capturedCurrency) {
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

    const result = creditPayment({ pending, eventId, capturedAmount, capturedCurrency });
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error("paypal webhook error", err);
    return res.status(400).json({ error: "webhook error" });
  }
});

// Save game state
app.post("/api/save", authenticateRequest, requireCsrf, generalApiLimiter, (req, res) => {
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
