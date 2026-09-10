import { describe, test, expect, afterEach } from "@jest/globals";
import { db } from "../../database2.js";
import { Session, BASE_URL, uniqueEmail, TEST_PASSWORD, validSaveFixture } from "./helpers.js";

async function loggedInSession(prefix, cleanupEmails) {
  const email = uniqueEmail(prefix);
  cleanupEmails.push(email);
  const session = new Session(BASE_URL);
  await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
  db.prepare(`UPDATE users SET email_verified=1 WHERE email=?`).run(email);
  await session.postCsrf("/api/login", { email, password: TEST_PASSWORD });
  return session;
}

describe("save / load", () => {
  const cleanupEmails = [];
  afterEach(() => {
    while (cleanupEmails.length) {
      db.prepare(`DELETE FROM users WHERE email=?`).run(cleanupEmails.pop());
    }
  });

  test("valid save round-trips through save/load", async () => {
    const session = await loggedInSession("save", cleanupEmails);
    const save = validSaveFixture();
    save.coin = 42;

    const saveRes = await session.postCsrf("/api/save", save);
    expect(saveRes.status).toBe(200);
    expect(saveRes.body.ok).toBe(true);

    const loadRes = await session.request("GET", "/api/save");
    expect(loadRes.status).toBe(200);
    expect(loadRes.body.state.coin).toBe(42);
  });

  test("save missing required keys is rejected as invalid_save", async () => {
    const session = await loggedInSession("save-missing", cleanupEmails);
    const res = await session.postCsrf("/api/save", { resources: {} });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_save");
  });

  test("save with an unknown building id is rejected as invalid_save", async () => {
    const session = await loggedInSession("save-badbuild", cleanupEmails);
    const save = validSaveFixture();
    save.buildings = [{ id: "FAKE", x: 0, y: 0 }];

    const res = await session.postCsrf("/api/save", save);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_save");
  });

  test("oversized save (>512KB) is rejected with 413 before schema validation", async () => {
    const session = await loggedInSession("save-oversized", cleanupEmails);
    const csrfToken = await session.withCsrf();
    const oversizedPad = "a".repeat(550 * 1024);
    const res = await session.request("POST", "/api/save", {
      body: { pad: oversizedPad },
      headers: { "X-CSRF-Token": csrfToken }
    });
    expect(res.status).toBe(413);
    expect(res.body.error).toBe("save too large");
  });
});
