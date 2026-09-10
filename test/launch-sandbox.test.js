import test from "node:test";
import assert from "node:assert/strict";

const enabled = process.env.RUN_LAUNCH_SANDBOX === "1";
const baseUrl = (process.env.LAUNCH_TEST_BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const email = process.env.LAUNCH_TEST_EMAIL;
const password = process.env.LAUNCH_TEST_PASSWORD;
const productId = process.env.LAUNCH_TEST_PRODUCT_ID || "hour";
const cookies = new Map();

function updateCookies(response) {
  const values = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : response.headers.get("set-cookie")?.split(/,(?=[^;]+?=)/) || [];
  for (const value of values) {
    const [nameValue] = value.split(";", 1);
    const separator = nameValue.indexOf("=");
    if (separator > 0) cookies.set(nameValue.slice(0, separator), nameValue.slice(separator + 1));
  }
}

async function request(path, { method = "GET", body, csrfToken } = {}) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;
  if (cookies.size) headers.Cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  updateCookies(response);
  const data = await response.json();
  return { response, data };
}

test("sandbox launch smoke test", { skip: !enabled && "Set RUN_LAUNCH_SANDBOX=1 to run live checks." }, async (suite) => {
  await suite.test("health and product catalogue are available", async () => {
    const health = await request("/health");
    assert.equal(health.response.status, 200);
    assert.deepEqual(health.data, { ok: true });

    const products = await request("/api/products");
    assert.equal(products.response.status, 200);
    assert.ok(products.data.products.some((product) => product.id === productId));
  });

  await suite.test("authentication, CSRF, and save validation work", { skip: !(email && password) && "Set LAUNCH_TEST_EMAIL and LAUNCH_TEST_PASSWORD." }, async () => {
    const csrf = await request("/api/csrf-token");
    assert.equal(csrf.response.status, 200);
    assert.equal(typeof csrf.data.csrfToken, "string");

    const login = await request("/api/login", { method: "POST", body: { email, password }, csrfToken: csrf.data.csrfToken });
    assert.equal(login.response.status, 200, JSON.stringify(login.data));
    assert.equal(login.data.ok, true);

    const me = await request("/api/me");
    assert.equal(me.response.status, 200);
    assert.equal(me.data.email, email.toLowerCase());

    const invalidSave = await request("/api/save", { method: "POST", body: { resources: {} }, csrfToken: csrf.data.csrfToken });
    assert.equal(invalidSave.response.status, 400);
    assert.deepEqual(invalidSave.data, { error: "invalid_save" });
  });

  await suite.test("checkout sessions can be created", { skip: !(email && password && process.env.RUN_PAYMENT_SANDBOX === "1") && "Set credentials and RUN_PAYMENT_SANDBOX=1." }, async () => {
    const csrf = await request("/api/csrf-token");
    const login = await request("/api/login", { method: "POST", body: { email, password }, csrfToken: csrf.data.csrfToken });
    assert.equal(login.response.status, 200, JSON.stringify(login.data));

    const stripe = await request("/api/checkout/stripe", { method: "POST", body: { productId }, csrfToken: csrf.data.csrfToken });
    assert.equal(stripe.response.status, 200, JSON.stringify(stripe.data));
    assert.match(stripe.data.url, /^https:\/\//);

    const paypal = await request("/api/checkout/paypal", { method: "POST", body: { productId }, csrfToken: csrf.data.csrfToken });
    assert.equal(paypal.response.status, 200, JSON.stringify(paypal.data));
    assert.match(paypal.data.url, /^https:\/\//);
  });
});