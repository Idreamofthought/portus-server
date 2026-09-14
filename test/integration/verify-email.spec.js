import { describe, test, expect, afterEach } from "@jest/globals";
import crypto from "crypto";
import { db } from "../../database2.js";
import { hashToken } from "../../auth.js";
import { Session, BASE_URL, uniqueEmail, TEST_PASSWORD } from "./helpers.js";

function assertRedirectsToPortusInfo(location, expectedQuery) {
  expect(location).toBeTruthy();
  const url = new URL(location, BASE_URL);
  expect(url.pathname).toBe("/portus-info");
  expect(url.pathname).not.toBe("/portus");
  expect(url.search).toBe(expectedQuery);
}

describe("/verify-email redirect targets", () => {
  const cleanupEmails = [];
  afterEach(() => {
    while (cleanupEmails.length) {
      db.prepare(`DELETE FROM users WHERE email=?`).run(cleanupEmails.pop());
    }
  });

  test("missing token redirects to /portus-info?verify=missing", async () => {
    const session = new Session(BASE_URL);
    const res = await session.requestNoRedirect("GET", "/verify-email", { headers: { Accept: "text/html" } });
    assertRedirectsToPortusInfo(res.location, "?verify=missing");
  });

  test("invalid/unknown token redirects to /portus-info?verify=invalid", async () => {
    const session = new Session(BASE_URL);
    const res = await session.requestNoRedirect("GET", "/verify-email?token=not-a-real-token", {
      headers: { Accept: "text/html" }
    });
    assertRedirectsToPortusInfo(res.location, "?verify=invalid");
  });

  test("expired token redirects to /portus-info?verify=invalid", async () => {
    const email = uniqueEmail("verify-expired");
    cleanupEmails.push(email);
    const session = new Session(BASE_URL);
    await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
    const userId = db.prepare(`SELECT id FROM users WHERE email=?`).get(email).id;

    const raw = crypto.randomBytes(32).toString("hex");
    db.prepare(
      `INSERT INTO email_verification_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)`
    ).run(hashToken(raw), userId, Date.now() - 1000);

    const res = await session.requestNoRedirect(`GET`, `/verify-email?token=${raw}`, {
      headers: { Accept: "text/html" }
    });
    assertRedirectsToPortusInfo(res.location, "?verify=invalid");
  });

  test("valid token verifies the account and redirects to /portus-info?verify=success", async () => {
    const email = uniqueEmail("verify-valid");
    cleanupEmails.push(email);
    const session = new Session(BASE_URL);
    await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
    const userId = db.prepare(`SELECT id FROM users WHERE email=?`).get(email).id;

    const raw = crypto.randomBytes(32).toString("hex");
    db.prepare(
      `INSERT INTO email_verification_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)`
    ).run(hashToken(raw), userId, Date.now() + 86400000);

    const res = await session.requestNoRedirect(`GET`, `/verify-email?token=${raw}`, {
      headers: { Accept: "text/html" }
    });
    assertRedirectsToPortusInfo(res.location, "?verify=success");

    const row = db.prepare(`SELECT email_verified FROM users WHERE id=?`).get(userId);
    expect(row.email_verified).toBe(1);

    const target = new URL(res.location, BASE_URL);
    const landed = await session.requestNoRedirect("GET", target.pathname + target.search, { headers: { Accept: "text/html" } });
    expect(landed.status).toBe(200);
  });

  test("reusing an already-used token redirects to /portus-info?verify=invalid", async () => {
    const email = uniqueEmail("verify-reuse");
    cleanupEmails.push(email);
    const session = new Session(BASE_URL);
    await session.postCsrf("/api/signup", { email, password: TEST_PASSWORD });
    const userId = db.prepare(`SELECT id FROM users WHERE email=?`).get(email).id;

    const raw = crypto.randomBytes(32).toString("hex");
    db.prepare(
      `INSERT INTO email_verification_tokens (token_hash,user_id,expires_at) VALUES (?,?,?)`
    ).run(hashToken(raw), userId, Date.now() + 86400000);

    await session.requestNoRedirect(`GET`, `/verify-email?token=${raw}`, { headers: { Accept: "text/html" } });
    const second = await session.requestNoRedirect(`GET`, `/verify-email?token=${raw}`, {
      headers: { Accept: "text/html" }
    });
    assertRedirectsToPortusInfo(second.location, "?verify=invalid");
  });
});
