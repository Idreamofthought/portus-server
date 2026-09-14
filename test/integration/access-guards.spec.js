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
  return { session, email };
}

describe("access guards on /portus never loop", () => {
  const cleanupEmails = [];
  afterEach(() => {
    while (cleanupEmails.length) {
      db.prepare(`DELETE FROM users WHERE email=?`).run(cleanupEmails.pop());
    }
  });

  test("unverified browser request to /portus redirects to /portus-info?verify=required, not to /portus", async () => {
    const email = uniqueEmail("guard-unverified");
    cleanupEmails.push(email);
    const session = new Session(BASE_URL);
    await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });

    const res = await session.requestNoRedirect("GET", "/portus", { headers: { Accept: "text/html" } });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.location).toBe("/portus-info?verify=required");
    expect(res.location).not.toMatch(/^\/portus(\?|$)/);

    const landed = await session.requestNoRedirect("GET", res.location, { headers: { Accept: "text/html" } });
    expect(landed.status).toBe(200);
  });

  test("unverified API request to /api/discoveries gets JSON 403, not a redirect", async () => {
    const email = uniqueEmail("guard-unverified-api");
    cleanupEmails.push(email);
    const session = new Session(BASE_URL);
    await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });

    const res = await session.request("GET", "/api/discoveries");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("email not verified");
  });

  test("verified but unpaid browser request to /portus redirects to /portus-info?paid=required, not to /portus", async () => {
    const { session } = await loggedInSession("guard-unpaid", cleanupEmails);

    const res = await session.requestNoRedirect("GET", "/portus", { headers: { Accept: "text/html" } });
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    expect(res.location).toBe("/portus-info?paid=required");
    expect(res.location).not.toMatch(/^\/portus(\?|$)/);

    const landed = await session.requestNoRedirect("GET", res.location, { headers: { Accept: "text/html" } });
    expect(landed.status).toBe(200);
  });

  test("verified but unpaid API request to /api/discoveries gets JSON 403, not a redirect", async () => {
    const { session } = await loggedInSession("guard-unpaid-api", cleanupEmails);

    const res = await session.request("GET", "/api/discoveries");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("no paid time");
  });

  test("granting time lets a previously-unpaid user through /portus", async () => {
    const { session, email } = await loggedInSession("guard-thenpaid", cleanupEmails);
    const userId = db.prepare(`SELECT id FROM users WHERE email=?`).get(email).id;

    db.prepare(
      `INSERT INTO time_tracking (user_id,remaining_seconds,last_active_at,updated_at) VALUES (?,3600,NULL,?)`
    ).run(userId, Date.now());

    const res = await session.requestNoRedirect("GET", "/portus", { headers: { Accept: "text/html" } });
    expect(res.status).toBe(200);
  });
});
