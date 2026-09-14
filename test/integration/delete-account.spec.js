import { describe, test, expect, afterEach } from "@jest/globals";
import { ACCOUNT_RETENTION_MS, cleanupExpired, db } from "../../database2.js";
import { Session, BASE_URL, uniqueEmail, TEST_PASSWORD } from "./helpers.js";

async function loggedInSession(prefix, cleanupEmails) {
  const email = uniqueEmail(prefix);
  cleanupEmails.push(email);
  const session = new Session(BASE_URL);
  await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
  db.prepare(`UPDATE users SET email_verified=1 WHERE email=?`).run(email);
  await session.postCsrf("/api/login", { email, password: TEST_PASSWORD });
  const { id } = db.prepare(`SELECT id FROM users WHERE email=?`).get(email);
  return { session, userId: id, email };
}

describe("account deletion", () => {
  const cleanupUserIds = [];
  const cleanupEmails = [];

  afterEach(() => {
    while (cleanupUserIds.length) {
      const userId = cleanupUserIds.pop();
      db.prepare(`DELETE FROM purchases WHERE user_id=?`).run(userId);
      db.prepare(`DELETE FROM users WHERE id=?`).run(userId);
    }
    while (cleanupEmails.length) {
      db.prepare(`DELETE FROM users WHERE email=?`).run(cleanupEmails.pop());
    }
  });

  test("keeps purchase records but anonymizes the account and logs out", async () => {
    const { session, userId, email } = await loggedInSession("delete-account", cleanupEmails);
    cleanupUserIds.push(userId);

    db.prepare(
      `INSERT INTO purchases (id,user_id,provider,product_id,minutes,amount,currency,created_at)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(`test-purchase-${userId}`, userId, "stripe", "hour", 60, "5.00", "EUR", Date.now());

    const res = await session.postCsrf("/api/delete-account", {});
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const user = db.prepare(`SELECT * FROM users WHERE id=?`).get(userId);
    expect(user).toBeTruthy();
    expect(user.email).not.toBe(email);
    expect(user.deleted_at).toBeGreaterThan(0);
    expect(user.stripe_customer_id).toBeNull();

    const purchase = db.prepare(`SELECT * FROM purchases WHERE user_id=?`).get(userId);
    expect(purchase).toBeTruthy();
    expect(purchase.id).toBe(`test-purchase-${userId}`);

    const sessions = db.prepare(`SELECT COUNT(*) AS n FROM sessions WHERE user_id=?`).get(userId);
    expect(sessions.n).toBe(0);

    const whoami = await session.request("GET", "/api/me");
    expect(whoami.status).toBe(401);
  });

  test("frees the original email for a new signup", async () => {
    const { session, userId, email } = await loggedInSession("delete-reuse", cleanupEmails);
    cleanupUserIds.push(userId);

    await session.postCsrf("/api/delete-account", {});

    const fresh = new Session(BASE_URL);
    const signupRes = await fresh.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
    expect(signupRes.status).toBe(200);
  });

  test("purges anonymized accounts and purchases after the retention window", async () => {
    const { session, userId } = await loggedInSession("delete-purge", cleanupEmails);
    cleanupUserIds.push(userId);

    db.prepare(`INSERT INTO purchases (id,user_id,provider,product_id,minutes,amount,currency,created_at)
      VALUES (?,?,?,?,?,?,?,?)`)
      .run(`test-purge-purchase-${userId}`, userId, "stripe", "hour", 60, "5.00", "EUR", Date.now());
    await session.postCsrf("/api/delete-account", {});
    db.prepare(`UPDATE users SET deleted_at=? WHERE id=?`).run(Date.now() - ACCOUNT_RETENTION_MS - 1, userId);

    cleanupExpired();

    expect(db.prepare(`SELECT id FROM users WHERE id=?`).get(userId)).toBeUndefined();
    expect(db.prepare(`SELECT id FROM purchases WHERE user_id=?`).get(userId)).toBeUndefined();
  });
});