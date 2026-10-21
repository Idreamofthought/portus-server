import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Resend } from "resend";
import { createStripeClient, STRIPE_API_VERSION } from "../stripe-client.js";

test("Stripe SDK preserves checkout API contract and verifies webhook signatures", async () => {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests.push({ url: req.url, version: req.headers["stripe-version"], body });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ id: "cs_test_contract", object: "checkout.session", payment_status: "paid", url: "https://checkout.example.test/session" }));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const stripe = createStripeClient("sk_test_contract", { host: "127.0.0.1", port: server.address().port, protocol: "http", maxNetworkRetries: 0 });
    const session = await stripe.checkout.sessions.create({
      mode: "payment", payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "eur", product_data: { name: "Play pass" }, unit_amount: 100 }, quantity: 1 }],
      success_url: "https://example.test/success", cancel_url: "https://example.test/cancel",
      metadata: { userId: "1", withdrawalConsent: "1" }
    });
    assert.equal(session.id, "cs_test_contract");
    assert.equal(requests[0].version, STRIPE_API_VERSION);
    assert.equal(requests[0].version, "2024-06-20");
    const form = new URLSearchParams(requests[0].body);
    assert.equal(form.get("payment_method_types[0]"), "card");
    assert.equal(form.get("metadata[withdrawalConsent]"), "1");
    assert.equal((await stripe.checkout.sessions.retrieve(session.id)).payment_status, "paid");
    assert.equal(requests[1].url, "/v1/checkout/sessions/cs_test_contract");
    const payload = JSON.stringify({ id: "evt_contract", type: "checkout.session.completed", data: { object: session } });
    const secret = "whsec_contract";
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    assert.equal(stripe.webhooks.constructEvent(payload, signature, secret).id, "evt_contract");
    assert.throws(() => stripe.webhooks.constructEvent(payload + " ", signature, secret));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test("Resend SDK serializes HTML mail and preserves provider errors", async t => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url: String(url), body: JSON.parse(options.body) });
    const failure = requests.length === 2;
    return new Response(JSON.stringify(failure
      ? { name: "validation_error", message: "Invalid sender" }
      : { id: "email_contract" }), { status: failure ? 422 : 200, headers: { "content-type": "application/json" } });
  });
  const resend = new Resend("re_contract");
  const message = { from: "Breluce <sender@example.test>", to: "player@example.test", subject: "Verify", html: "<p>Verify your account</p>" };
  const result = await resend.emails.send(message);
  assert.equal(result.data.id, "email_contract");
  assert.equal(result.error, null);
  assert.equal(new URL(requests[0].url).pathname, "/emails");
  assert.deepEqual(requests[0].body, message);
  const rejected = await resend.emails.send(message);
  assert.equal(rejected.data, null);
  assert.equal(rejected.error.message, "Invalid sender");
});
