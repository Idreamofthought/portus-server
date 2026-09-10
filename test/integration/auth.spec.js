import { describe, test, expect, afterEach } from "@jest/globals";
import { db } from "../../database2.js";
import { Session, BASE_URL, uniqueEmail, TEST_PASSWORD } from "./helpers.js";

// These tests write directly to the sqlite file the server is running
// against (bypassing the email link) so signup -> login can be automated
// without a real inbox. Run against a local/dev DB, not production.
describe("auth flow", () => {
  const cleanupEmails = [];
  afterEach(() => {
    while (cleanupEmails.length) {
      db.prepare(`DELETE FROM users WHERE email=?`).run(cleanupEmails.pop());
    }
  });

  test("signup -> verify -> login -> /api/me -> logout", async () => {
    const email = uniqueEmail("auth");
    cleanupEmails.push(email);
    const session = new Session(BASE_URL);

    const signupRes = await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
    expect(signupRes.status).toBe(200);
    expect(signupRes.body.ok).toBe(true);

    const preVerifyLogin = await session.postCsrf("/api/login", { email, password: TEST_PASSWORD });
    expect(preVerifyLogin.status).toBe(403);

    const info = db.prepare(`UPDATE users SET email_verified=1 WHERE email=?`).run(email);
    expect(info.changes).toBe(1);

    const loginRes = await session.postCsrf("/api/login", { email, password: TEST_PASSWORD });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.ok).toBe(true);
    expect(session.cookies.get("auth")).toBeTruthy();

    const meRes = await session.request("GET", "/api/me");
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);
    expect(meRes.body.emailVerified).toBe(true);

    const logoutRes = await session.postCsrf("/api/logout", {});
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await session.request("GET", "/api/me");
    expect(meAfterLogout.status).toBe(401);
  });

  test("login with wrong password is rejected", async () => {
    const email = uniqueEmail("auth-bad");
    cleanupEmails.push(email);
    const session = new Session(BASE_URL);
    await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
    db.prepare(`UPDATE users SET email_verified=1 WHERE email=?`).run(email);

    const res = await session.postCsrf("/api/login", { email, password: "WrongPassword1" });
    expect(res.status).toBe(400);
  });
});
