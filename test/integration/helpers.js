import "dotenv/config";
import crypto from "crypto";

export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:8080";

// Minimal cookie-jar-backed HTTP client so integration tests behave like a browser session.
export class Session {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  _cookieHeader() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  _storeCookies(res) {
    const setCookies = typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
    for (const raw of setCookies) {
      const [pair] = raw.split(";");
      const eq = pair.indexOf("=");
      if (eq === -1) continue;
      this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }

  async request(method, path, { body, headers = {}, raw = false } = {}) {
    const cookieHeader = this._cookieHeader();
    const res = await fetch(this.baseUrl + path, {
      method,
      headers: {
        ...(body !== undefined && !raw ? { "Content-Type": "application/json" } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...headers
      },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body)
    });
    this._storeCookies(res);
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON response, leave json null */
    }
    return { status: res.status, headers: res.headers, body: json, text };
  }

  async withCsrf() {
    const { body } = await this.request("GET", "/api/csrf-token");
    return body.csrfToken;
  }

  async postCsrf(path, body) {
    const csrfToken = await this.withCsrf();
    return this.request("POST", path, { body, headers: { "X-CSRF-Token": csrfToken } });
  }
}

export function uniqueEmail(prefix = "test") {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}@example.com`;
}

export const TEST_PASSWORD = "Test1234!";

// Replicates Stripe's webhook signing scheme so we can fabricate signed
// test events locally without going through a real checkout.
export function signStripePayload(payloadObject, secret) {
  const payload = JSON.stringify(payloadObject);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return { payload, signatureHeader: `t=${timestamp},v1=${signature}` };
}

export function validSaveFixture() {
  const resourceKeys = [
    "wood", "stone", "clay", "pottery", "tools", "goldOre", "silverOre", "copperOre",
    "gold", "silver", "copper", "wheat", "olives", "chickpeas", "grapes", "fish",
    "deer", "bread", "scrolls", "flour", "oliveOil", "salt"
  ];
  return {
    v: 1,
    captain: "Captain",
    res: Object.fromEntries(resourceKeys.map((key) => [key, 0])),
    cap: { general: 150, food: 150 },
    pop: { count: 6, capacity: 10 },
    happiness: 55,
    boats: 0,
    coin: 20,
    research: 0,
    unlockedTechs: [],
    techBonus: { field: 1, quarry: 1, fish: 1, foundry: 1, trade: 1 },
    military: { soldiers: 0, cap: 0 },
    droughtTicksLeft: 0,
    taxRate: 0,
    scenarioId: null,
    scenarioState: { disastersSurvived: 0, failed: false },
    grid: Array.from({ length: 20 }, () => Array.from({ length: 30 }, () => ({ terrain: "grass", deposit: null }))),
    buildings: [{ id: "house", x: 0, y: 0 }]
  };
}
