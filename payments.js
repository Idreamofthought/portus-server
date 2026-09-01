import crypto from "crypto";
import paypal from "@paypal/checkout-server-sdk";
import Stripe from "stripe";
import { db } from "./database.js";
import { PRODUCTS, getProduct } from "./products.js";

const paypalEnv = process.env.NODE_ENV === "production"
  ? new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET)
  : new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);
const paypalClient = new paypal.core.PayPalHttpClient(paypalEnv);
const PAYPAL_API_BASE = process.env.NODE_ENV === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export async function createPayPalOrder({ userId, productId, siteUrl }) {
  const product = getProduct(productId);
  if (!product) throw new Error("invalid product");
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [{ amount: { currency_code: product.currency, value: product.amount } }],
    application_context: {
      return_url: `${siteUrl}/purchase.html?provider=paypal&status=return`,
      cancel_url: `${siteUrl}/purchase.html?provider=paypal&status=cancelled`
    }
  });
  const result = await paypalClient.execute(request);
  const orderId = result.result.id;
  db.prepare(`INSERT INTO pending_orders (order_id,provider,user_id,product_id,minutes,amount,currency,created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(orderId, "paypal", userId, product.id, product.minutes, product.amount, product.currency, Date.now());
  const approval = result.result.links?.find(x => x.rel === "approve")?.href;
  return { id: orderId, url: approval };
}

export async function capturePayPalOrder({ userId, orderId }) {
  const pending = db.prepare(`SELECT * FROM pending_orders WHERE order_id=? AND provider='paypal' AND user_id=?`).get(orderId, userId);
  if (!pending) throw new Error("unknown order");
  if (pending.consumed) return { ok: true, duplicate: true };
  const request = new paypal.orders.OrdersCaptureRequest(orderId);
  request.requestBody({});
  const result = await paypalClient.execute(request);
  const capture = result.result;
  if (capture.status !== "COMPLETED") throw new Error("payment not completed");
  const capturedAmount = capture?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
  return creditPayment({ pending, eventId: capture.id, capturedAmount });
}

export async function createStripeCheckout({ userId, productId, siteUrl }) {
  if (!stripe) throw new Error("Stripe is not configured");
  const product = getProduct(productId);
  if (!product) throw new Error("invalid product");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price_data: {
      currency: product.currency.toLowerCase(),
      product_data: { name: `Portus — ${product.label}` },
      unit_amount: Math.round(Number(product.amount) * 100)
    }, quantity: 1 }],
    success_url: `${siteUrl}/purchase.html?provider=stripe&status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/purchase.html?provider=stripe&status=cancelled`,
    metadata: { userId: String(userId), productId: product.id }
  });
  return { url: session.url };
}

export async function handleStripeWebhook(rawBody, signature) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) throw new Error("Stripe webhook is not configured");
  const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  if (event.type !== "checkout.session.completed") return { ignored: true };
  const session = event.data.object;
  if (session.payment_status !== "paid") return { ignored: true };
  const userId = Number(session.metadata?.userId);
  const product = getProduct(session.metadata?.productId);
  if (!userId || !product) throw new Error("invalid Stripe metadata");
  return creditPayment({
    pending: {
      order_id: session.id,
      provider: "stripe",
      user_id: userId,
      product_id: product.id,
      minutes: product.minutes,
      amount: product.amount,
      currency: product.currency,
      consumed: 0
    },
    eventId: event.id,
    capturedAmount: Number(session.amount_total / 100).toFixed(2)
  });
}

export function creditPayment({ pending, eventId, capturedAmount }) {
  const expected = Number(pending.amount).toFixed(2);
  if (Number(capturedAmount).toFixed(2) !== expected) throw new Error("payment amount mismatch");
  const existing = db.prepare(`SELECT id FROM processed_payment_events WHERE id=?`).get(eventId);
  if (existing) return { credited: false, duplicate: true };
  let credited = false;
  const tx = db.transaction(() => {
    const claim = pending.provider === "paypal"
      ? db.prepare(`UPDATE pending_orders SET consumed=1 WHERE order_id=? AND consumed=0`).run(pending.order_id)
      : { changes: 1 };
    if (pending.provider === "paypal" && claim.changes === 0) return;
    db.prepare(`INSERT INTO processed_payment_events (id,created_at) VALUES (?,?)`).run(eventId, Date.now());
    db.prepare(`INSERT INTO purchases (id,user_id,provider,product_id,minutes,amount,currency,created_at) VALUES (?,?,?,?,?,?,?,?)`)
      .run(eventId, pending.user_id, pending.provider, pending.product_id, pending.minutes, pending.amount, pending.currency, Date.now());
    const row = db.prepare(`SELECT remaining_seconds FROM time_tracking WHERE user_id=?`).get(pending.user_id);
    if (row) db.prepare(`UPDATE time_tracking SET remaining_seconds=remaining_seconds+?,updated_at=?,last_active_at=NULL WHERE user_id=?`).run(pending.minutes*60, Date.now(), pending.user_id);
    else db.prepare(`INSERT INTO time_tracking (user_id,remaining_seconds,last_active_at,updated_at) VALUES (?,?,NULL,?)`).run(pending.user_id, pending.minutes*60, Date.now());
    credited = true;
  });
  tx();
  return { credited };
}

export async function verifyPayPalWebhookSignature(headers, body) {
  if (!process.env.PAYPAL_WEBHOOK_ID) return false;
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const tokenResp = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, { method:"POST", headers:{ Authorization:`Basic ${auth}`, "Content-Type":"application/x-www-form-urlencoded" }, body:"grant_type=client_credentials" });
  if (!tokenResp.ok) return false;
  const { access_token } = await tokenResp.json();
  const resp = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method:"POST", headers:{ Authorization:`Bearer ${access_token}`, "Content-Type":"application/json" },
    body: JSON.stringify({
      transmission_id: headers["paypal-transmission-id"], transmission_time: headers["paypal-transmission-time"],
      cert_url: headers["paypal-cert-url"], auth_algo: headers["paypal-auth-algo"], transmission_sig: headers["paypal-transmission-sig"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID, webhook_event: body
    })
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  return data.verification_status === "SUCCESS";
}
