import { describe, test, expect, afterEach } from "@jest/globals";
import { db } from "../../database2.js";
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

  test("checkout creation requires withdrawal consent", async () => {
    const session = await loggedInSession("checkout-consent", cleanupEmails);
    const stripeRes = await session.postCsrf("/api/checkout/stripe", { productId: "hour" });
    expect(stripeRes.status).toBe(400);
    expect(stripeRes.body.error).toBe("withdrawal consent is required before checkout");

    const paypalRes = await session.postCsrf("/api/checkout/paypal", { productId: "hour" });
    expect(paypalRes.status).toBe(400);
    expect(paypalRes.body.error).toBe("withdrawal consent is required before checkout");
  });

  test("checkout rejects non-boolean withdrawal consent", async () => {
    const session = await loggedInSession("checkout-consent-type", cleanupEmails);
    const stripeRes = await session.postCsrf("/api/checkout/stripe", { productId: "hour", withdrawalConsent: "true" });
    expect(stripeRes.status).toBe(400);
    expect(stripeRes.body.error).toBe("withdrawal consent is required before checkout");

    const paypalRes = await session.postCsrf("/api/checkout/paypal", { productId: "hour", withdrawalConsent: 1 });
    expect(paypalRes.status).toBe(400);
    expect(paypalRes.body.error).toBe("withdrawal consent is required before checkout");
  });
});
