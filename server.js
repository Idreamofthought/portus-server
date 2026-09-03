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
// SECURITY & MIDDLEWARE
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

app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const result = await handleStripeWebhook(req.body, req.get("stripe-signature"));
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("stripe webhook error", err);
    res.status(400).json({ error: "invalid webhook" });
  }
});

// ============================================================
// STATIC ROUTING
// ============================================================

// Homepage and public assets
app.use(express.static(path.join(__dirname, "homepage")));
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// PORTUS GAME ROUTING — CLEAN VERSION
// ============================================================

// Serve Portus game from /portus using public/index.html
app.use("/portus", express.static(path.join(__dirname, "public")));

// Direct /portus to index.html for SPA-style routing
app.get("/portus", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// ============================================================
// HOMEPAGE ROUTES
// ============================================================

app.get("/", (_req, res) => res.sendFile(path.join(__dirname, "homepage/index.html")));
app.get("/about", (_req, res) => res.sendFile(path.join(__dirname, "homepage/about.html")));
app.get("/contact", (_req, res) => res.sendFile(path.join(__dirname, "homepage/contact.html")));
app.get("/portus-info", (_req, res) => res.sendFile(path.join(__dirname, "homepage/portus-info.html")));

// ============================================================
// PROTECTED GAME ROUTE
// ============================================================

app.get("/game", authenticateRequest, requireVerified, requirePaid, (_req, res) =>
  res.sendFile(path.join(__dirname, "protected/game.html"))
);

// ============================================================
// API ROUTES (signup, login, etc.)
// ============================================================

// ... keep all your existing API routes here unchanged ...

// ============================================================
// ERROR HANDLING & SERVER START
// ============================================================

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

cleanupExpired();
setInterval(cleanupExpired, 24 * 60 * 60 * 1000).unref();
app.listen(PORT, () => console.log(`Portus server listening on ${PORT}`));
