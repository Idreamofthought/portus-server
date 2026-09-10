import { describe, test, expect, afterEach } from "@jest/globals";
import { db } from "../../database2.js";
import { Session, BASE_URL, uniqueEmail, TEST_PASSWORD, signStripePayload } from "./helpers.js";

const secret = process.env.STRIPE_WEBHOOK_SECRET;
const maybe = secret ? describe : describe.skip;

async function createVerifiedUser(cleanupEmails) {
  const email = uniqueEmail("stripe");
  cleanupEmails.push(email);
  const session = new Session(BASE_URL);
  await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
  db.prepare(`UPDATE users SET email_verified=1 WHERE email=?`).run(email);
  const row = db.prepare(`SELECT id FROM users WHERE email=?`).get(email);
  return row.id;
}

function checkoutSessionEvent({ id, userId, productId = "hour", amountTotal = 200, currency = "usd" }) {
  return {
    id: `evt_${id}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id,
        payment_status: "paid",
        amount_total: amountTotal,
        currency,
        metadata: { userId: String(userId), productId }
      }
    }
  };
}

async function postWebhook(payload, signatureHeader) {
  const res = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "stripe-signature": signatureHeader },
    body: payload
  });
  return { status: res.status, body: await res.json() };
}

// Skipped automatically unless the server and this test process share the
// same STRIPE_WEBHOOK_SECRET (i.e. both loaded the same .env / test env).
maybe("Stripe webhook \u2014 signed test events (no real Stripe checkout needed)", () => {
  const cleanupEmails = [];
  afterEach(() => {
    while (cleanupEmails.length) {
      db.prepare(`DELETE FROM users WHERE email=?`).run(cleanupEmails.pop());
    }
  });

  test("valid checkout.session.completed credits time once; replay is ignored as duplicate", async () => {
    const userId = await createVerifiedUser(cleanupEmails);
    const sessionId = `cs_test_${Date.now()}`;
    const event = checkoutSessionEvent({ id: sessionId, userId });

    const first = signStripePayload(event, secret);
    const firstRes = await postWebhook(first.payload, first.signatureHeader);
    expect(firstRes.status).toBe(200);
    expect(firstRes.body.credited).toBe(true);

    // Same event, re-signed (fresh timestamp) but same session id — must no-op.
    const replay = signStripePayload(event, secret);
    const replayRes = await postWebhook(replay.payload, replay.signatureHeader);
    expect(replayRes.status).toBe(200);
    expect(replayRes.body.duplicate).toBe(true);
  });

  test("wrong currency in webhook payload is rejected", async () => {
    const userId = await createVerifiedUser(cleanupEmails);
    const event = checkoutSessionEvent({ id: `cs_test_${Date.now()}_cur`, userId, currency: "eur" });
    const { payload, signatureHeader } = signStripePayload(event, secret);
    const res = await postWebhook(payload, signatureHeader);
    expect(res.status).toBe(400);
  });

  test("wrong amount in webhook payload is rejected", async () => {
    const userId = await createVerifiedUser(cleanupEmails);
    const event = checkoutSessionEvent({ id: `cs_test_${Date.now()}_amt`, userId, amountTotal: 999999 });
    const { payload, signatureHeader } = signStripePayload(event, secret);
    const res = await postWebhook(payload, signatureHeader);
    expect(res.status).toBe(400);
  });

  test("unknown product in webhook metadata is rejected", async () => {
    const userId = await createVerifiedUser(cleanupEmails);
    const event = checkoutSessionEvent({ id: `cs_test_${Date.now()}_prod`, userId, productId: "fake" });
    const { payload, signatureHeader } = signStripePayload(event, secret);
    const res = await postWebhook(payload, signatureHeader);
    expect(res.status).toBe(400);
  });
});
