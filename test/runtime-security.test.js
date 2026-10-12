import test from "node:test";
import assert from "node:assert/strict";
import { jwtSecret, secureCookies } from "../runtime-security.js";

test("public HTTPS sets Secure even when NODE_ENV is missing", () => {
  assert.equal(secureCookies({ SITE_URL: "https://www.idreamofthought.org" }), true);
  assert.equal(secureCookies({}), true);
  assert.equal(secureCookies({ NODE_ENV: "production", SITE_URL: "http://localhost:8080" }), true);
  assert.equal(secureCookies({ NODE_ENV: "development", SITE_URL: "http://localhost:8080" }), false);
});

test("development JWT defaults cannot leak into public deployments", () => {
  for (const env of [{}, { JWT_SECRET: "test-secret" }, { JWT_SECRET: "short" },
    { NODE_ENV: "production", JWT_SECRET: "replace-with-a-long-random-secret" }]) {
    assert.throws(() => jwtSecret(env), /random secret/);
  }
  assert.equal(jwtSecret({ NODE_ENV: "test" }), "test-secret");
  assert.equal(jwtSecret({ SITE_URL: "http://localhost:8080" }), "test-secret");
  const secret = "9c802457f8a052d5f7a1ca2a65f10643dbe7bbd2";
  assert.equal(jwtSecret({ JWT_SECRET: secret }), secret);
});
