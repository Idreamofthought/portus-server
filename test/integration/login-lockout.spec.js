import { describe, test, expect, afterEach } from "@jest/globals";
import { db } from "../../database2.js";
import { Session, BASE_URL, uniqueEmail, TEST_PASSWORD } from "./helpers.js";

// Mirrors LOGIN_LOCKOUT_THRESHOLD in security.js.
const LOCKOUT_THRESHOLD = 8;

async function registerVerified(email) {
  const session = new Session(BASE_URL);
  await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
  db.prepare(`UPDATE users SET email_verified=1 WHERE email=?`).run(email);
  return session;
}

describe("login brute-force protection", () => {
  const cleanupEmails = [];
  afterEach(() => {
    while (cleanupEmails.length) {
      db.prepare(`DELETE FROM users WHERE email=?`).run(cleanupEmails.pop());
    }
    db.prepare(`DELETE FROM login_attempts`).run();
  });

  test("repeated wrong passwords lock the account out", async () => {
    const email = uniqueEmail("lockout");
    cleanupEmails.push(email);
    const session = await registerVerified(email);

    let sawLockout = false;
    for (let attempt = 0; attempt < LOCKOUT_THRESHOLD + 1; attempt++) {
      const res = await session.postCsrf("/api/login", { email, password: "wrong-password-1" });
      if (res.status === 429) {
        sawLockout = true;
        break;
      }
      expect(res.status).toBe(400);
    }
    expect(sawLockout).toBe(true);

    // The correct password is refused too, so lockout cannot be bypassed.
    const correct = await session.postCsrf("/api/login", { email, password: TEST_PASSWORD });
    expect(correct.status).toBe(429);
  });

  test("lockout response is identical for accounts that do not exist", async () => {
    const ghost = uniqueEmail("ghost");
    const session = new Session(BASE_URL);

    let lockedStatus = null;
    for (let attempt = 0; attempt < LOCKOUT_THRESHOLD + 1; attempt++) {
      const res = await session.postCsrf("/api/login", { email: ghost, password: "wrong-password-1" });
      if (res.status === 429) {
        lockedStatus = res.status;
        break;
      }
    }
    expect(lockedStatus).toBe(429);
  });

  test("a successful login is recorded in the audit trail and clears failures", async () => {
    const email = uniqueEmail("audit-login");
    cleanupEmails.push(email);
    const session = await registerVerified(email);

    await session.postCsrf("/api/login", { email, password: "wrong-password-1" });
    const ok = await session.postCsrf("/api/login", { email, password: TEST_PASSWORD });
    expect(ok.status).toBe(200);

    const user = db.prepare(`SELECT id FROM users WHERE email=?`).get(email);
    const events = db
      .prepare(`SELECT event_type FROM audit_events WHERE user_id=? ORDER BY id`)
      .all(user.id)
      .map((row) => row.event_type);

    expect(events).toContain("login_failed");
    expect(events).toContain("login_succeeded");

    const remaining = db.prepare(`SELECT COUNT(*) AS c FROM login_attempts`).get().c;
    expect(remaining).toBe(0);
  });
});
