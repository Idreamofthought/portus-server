import { describe, test, expect, afterEach } from "@jest/globals";
import { db } from "../../database2.js";
import { hashToken, hashPassword, verifyPassword } from "../../auth.js";
import { Session, BASE_URL, uniqueEmail } from "./helpers.js";

describe("password security", () => {
  const users = [];
  afterEach(() => { while (users.length) db.prepare("DELETE FROM users WHERE id=?").run(users.pop()); });
  async function user() {
    const id = Number(db.prepare("INSERT INTO users (email,password_hash,email_verified,created_at) VALUES (?,?,1,?)")
      .run(uniqueEmail("password-security"), await hashPassword("OriginalPassword_123"), Date.now()).lastInsertRowid);
    users.push(id); return id;
  }
  function reset(id, value) {
    db.prepare("INSERT INTO password_reset_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)")
      .run(hashToken(value), id, Date.now() + 60000);
  }
  test("a reset token succeeds once under concurrent use and revokes other tokens and sessions", async () => {
    const id = await user();
    const token = `audit-reset-${id}`;
    reset(id, token); reset(id, `other-${token}`);
    db.prepare("INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)").run(`old-${id}`, id, Date.now()+60000, Date.now());
    const passwords = ["FirstReplacement_123", "SecondReplacement_456"];
    const results = await Promise.all(passwords.map(async newPassword => {
      const r = await fetch(BASE_URL + "/api/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword }) });
      return r.status;
    }));
    expect([...results].sort()).toEqual([200,400]);
    const hash = db.prepare("SELECT password_hash FROM users WHERE id=?").get(id).password_hash;
    expect(await verifyPassword(passwords[results.indexOf(200)], hash)).toBe(true);
    expect(db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id=?").get(id).n).toBe(0);
    expect(db.prepare("SELECT COUNT(*) AS n FROM password_reset_tokens WHERE user_id=? AND used=0").get(id).n).toBe(0);
  });
  test("new passwords reject truncation, including multibyte UTF-8", async () => {
    const session = new Session(BASE_URL);
    for (const password of ["a".repeat(73), "é".repeat(37)]) {
      const r = await session.postCsrf("/api/signup", { email: uniqueEmail("long-password"), password });
      expect(r.status).toBe(400);
      expect(r.body.error).toMatch(/72 UTF-8 bytes/);
      await expect(hashPassword(password)).rejects.toThrow(/72 UTF-8 bytes/);
    }
    const hash = await hashPassword("a".repeat(72));
    expect(await verifyPassword("a".repeat(72), hash)).toBe(true);
    expect(await verifyPassword("a".repeat(72)+"ignored-suffix", hash)).toBe(false);
  });
});
