import "dotenv/config";
import { afterEach, describe, expect, test } from "@jest/globals";
import jwt from "jsonwebtoken";
import { db } from "../../database2.js";
import { createSession } from "../../auth.js";
import { BASE_URL, uniqueEmail } from "./helpers.js";

function makeAuthCookie(userId) {
  const sid = createSession(userId);
  const token = jwt.sign({ uid: userId, sid }, process.env.JWT_SECRET, { expiresIn: "30d" });
  return `auth=${token}`;
}

function createUser({ verified }) {
  const email = uniqueEmail("auth-redirect");
  const result = db.prepare(
    `INSERT INTO users (email,password_hash,email_verified,created_at) VALUES (?,?,?,?)`
  ).run(email, "test-hash", verified ? 1 : 0, Date.now());
  return { userId: Number(result.lastInsertRowid), email };
}

async function requestHtml(path, cookie) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: "text/html",
      ...(cookie ? { Cookie: cookie } : {})
    },
    redirect: "manual"
  });
  return { status: res.status, location: res.headers.get("location") };
}

async function followRedirects(path, cookie) {
  const visited = new Set();
  let current = path;
  for (let i = 0; i < 8; i += 1) {
    if (visited.has(current)) return { looped: true, current };
    visited.add(current);
    const res = await fetch(`${BASE_URL}${current}`, {
      headers: {
        Accept: "text/html",
        ...(cookie ? { Cookie: cookie } : {})
      },
      redirect: "manual"
    });
    if (res.status < 300 || res.status > 399) return { looped: false, current, status: res.status };
    const location = res.headers.get("location");
    if (!location) return { looped: false, current, status: res.status };
    current = new URL(location, BASE_URL).pathname + new URL(location, BASE_URL).search;
  }
  return { looped: true, current };
}

describe("auth redirect states", () => {
  const cleanupEmails = [];

  afterEach(() => {
    while (cleanupEmails.length) {
      db.prepare(`DELETE FROM users WHERE email=?`).run(cleanupEmails.pop());
    }
  });

  test("GET /game without session redirects to login", async () => {
    const res = await requestHtml("/game");
    expect(res.status).toBe(302);
    expect(res.location).toBe("/login.html");
  });

  test("GET /game with unverified session redirects to verification status page", async () => {
    const user = createUser({ verified: false });
    cleanupEmails.push(user.email);
    const res = await requestHtml("/game", makeAuthCookie(user.userId));
    expect(res.status).toBe(302);
    expect(res.location).toBe("/portus-info?verify=required");
  });

  test("GET /game with verified session and no paid time redirects to paid status page", async () => {
    const user = createUser({ verified: true });
    cleanupEmails.push(user.email);
    const res = await requestHtml("/game", makeAuthCookie(user.userId));
    expect(res.status).toBe(302);
    expect(res.location).toBe("/portus-info?paid=required");
  });

  test("GET /game with verified paid session returns game", async () => {
    const user = createUser({ verified: true });
    cleanupEmails.push(user.email);
    db.prepare(
      `INSERT INTO time_tracking (user_id,remaining_seconds,updated_at) VALUES (?,?,?)`
    ).run(user.userId, 600, Date.now());
    const res = await fetch(`${BASE_URL}/game`, {
      headers: {
        Accept: "text/html",
        Cookie: makeAuthCookie(user.userId)
      },
      redirect: "manual"
    });
    expect(res.status).toBe(200);
  });

  test("GET /portus-info stays public", async () => {
    const res = await fetch(`${BASE_URL}/portus-info`, {
      headers: { Accept: "text/html" },
      redirect: "manual"
    });
    expect(res.status).toBe(200);
  });

  test("failure-state redirect chains never revisit the same URL", async () => {
    const unverified = createUser({ verified: false });
    const verifiedNoTime = createUser({ verified: true });
    cleanupEmails.push(unverified.email, verifiedNoTime.email);

    const flows = await Promise.all([
      followRedirects("/game", undefined),
      followRedirects("/game", makeAuthCookie(unverified.userId)),
      followRedirects("/game", makeAuthCookie(verifiedNoTime.userId))
    ]);

    for (const flow of flows) {
      expect(flow.looped).toBe(false);
      expect(flow.status).toBe(200);
    }
  });
});
