import { describe, test, expect, afterEach } from "@jest/globals";
import { db } from "../../database2.js";
import { creditPayment } from "../../payments.js";
import { Session, BASE_URL, uniqueEmail, TEST_PASSWORD } from "./helpers.js";

async function loggedInSession(prefix, cleanupEmails) {
  const email = uniqueEmail(prefix);
  cleanupEmails.push(email);
  const session = new Session(BASE_URL);
  await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
  db.prepare(`UPDATE users SET email_verified=1 WHERE email=?`).run(email);
  await session.postCsrf("/api/login", { email, password: TEST_PASSWORD });
  return session;
}

describe("checkout session creation", () => {
  const cleanupEmails = [];
  afterEach(() => {
    while (cleanupEmails.length) {
      db.prepare(`DELETE FROM users WHERE email=?`).run(cleanupEmails.pop());
    }
  });

  test("GET /api/products lists the catalogue", async () => {
    const session = new Session(BASE_URL);
    const res = await session.request("GET", "/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.some((p) => p.id === "hour")).toBe(true);
    expect(res.body.products.every((p) => p.currency === "EUR")).toBe(true);
  });

  test.each(["stripe", "paypal"])("%s checkout requires an explicit boolean consent", async (provider) => {
    const session = await loggedInSession(`consent-${provider}`, cleanupEmails);
    for (const value of [undefined, false, "true", 1]) {
      const body = { productId: "hour" };
      if (value !== undefined) body.withdrawalConsent = value;
      const res = await session.postCsrf(`/api/checkout/${provider}`, body);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/withdrawal consent/i);
    }
  });

  test("payment records retain consent and the original currency", () => {
    const email = uniqueEmail("payment-consent");
    const userId = Number(db.prepare(`INSERT INTO users (email,password_hash,created_at) VALUES (?,?,?)`).run(email, "hash", Date.now()).lastInsertRowid);
    try {
      for (const [currency, consent] of [["USD", 0], ["EUR", 1]]) {
        const eventId = `${currency}-${userId}`;
        const result = creditPayment({
          pending: { provider: "stripe", user_id: userId, product_id: "hour", minutes: 60, amount: "2.00", currency, withdrawal_consent: consent },
          eventId, capturedAmount: "2.00", capturedCurrency: currency
        });
        expect(result.credited).toBe(true);
        expect(db.prepare(`SELECT currency,withdrawal_consent FROM purchases WHERE id=?`).get(eventId))
          .toEqual({ currency, withdrawal_consent: consent });
      }
    } finally {
      db.prepare(`DELETE FROM purchases WHERE user_id=?`).run(userId);
      db.prepare(`DELETE FROM processed_payment_events WHERE id IN (?,?)`).run(`USD-${userId}`, `EUR-${userId}`);
      db.prepare(`DELETE FROM users WHERE id=?`).run(userId);
    }
  });

  test("Stripe checkout creation rejects an unknown productId", async () => {
    const session = await loggedInSession("checkout-stripe", cleanupEmails);
    const res = await session.postCsrf("/api/checkout/stripe", { productId: "not-a-real-product", withdrawalConsent: true });
    expect(res.status).toBe(400);
  });

  test("PayPal order creation rejects an unknown productId", async () => {
    const session = await loggedInSession("checkout-paypal", cleanupEmails);
    const res = await session.postCsrf("/api/checkout/paypal", { productId: "not-a-real-product", withdrawalConsent: true });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid product");
  });
});
