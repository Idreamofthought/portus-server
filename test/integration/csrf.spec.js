import { describe, test, expect } from "@jest/globals";
import { Session, BASE_URL, validSaveFixture } from "./helpers.js";

describe("CSRF protection", () => {
  test("GET /api/csrf-token issues a token and matching cookie", async () => {
    const session = new Session(BASE_URL);
    const csrfToken = await session.withCsrf();
    expect(csrfToken).toBeTruthy();
    expect(session.cookies.get("csrf")).toBeTruthy();
  });

  test("missing CSRF header is rejected with 403", async () => {
    const session = new Session(BASE_URL);
    await session.withCsrf(); // cookie set, but header intentionally withheld
    const res = await session.request("POST", "/api/save", { body: validSaveFixture() });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("csrf check failed");
  });

  test("mismatched CSRF header value is rejected with 403", async () => {
    const session = new Session(BASE_URL);
    await session.withCsrf();
    const res = await session.request("POST", "/api/save", {
      body: validSaveFixture(),
      headers: { "X-CSRF-Token": "not-the-real-token" }
    });
    expect(res.status).toBe(403);
  });
});
