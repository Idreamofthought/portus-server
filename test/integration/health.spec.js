import { describe, test, expect } from "@jest/globals";
import { Session, BASE_URL } from "./helpers.js";

describe("health check", () => {
  test("GET /health returns ok", async () => {
    const session = new Session(BASE_URL);
    const res = await session.request("GET", "/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
