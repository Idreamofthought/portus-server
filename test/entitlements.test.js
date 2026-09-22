import test from "node:test";
import assert from "node:assert/strict";
import { db } from "../database2.js";
import {
  PORTUS_FULL_GAME,
  getActiveEntitlement,
  grantEntitlement,
  hasPermanentAccess,
  revokeEntitlement
} from "../entitlements.js";

function createUser() {
  const email = `entitlement-${Date.now()}-${Math.random()}@example.com`;
  return db.prepare(
    `INSERT INTO users (email,password_hash,email_verified,created_at) VALUES (?, ?, 1, ?)`
  ).run(email, "test-only", Date.now()).lastInsertRowid;
}

test("a Steam entitlement grants and revokes permanent Portus access", () => {
  const userId = Number(createUser());
  try {
    assert.equal(hasPermanentAccess(userId), false);

    grantEntitlement({
      userId,
      entitlement: PORTUS_FULL_GAME,
      provider: "steam",
      externalId: "steam-user-123"
    });

    assert.equal(hasPermanentAccess(userId), true);
    assert.equal(getActiveEntitlement(userId).provider, "steam");

    revokeEntitlement({ userId, provider: "steam" });
    assert.equal(hasPermanentAccess(userId), false);
  } finally {
    db.prepare(`DELETE FROM users WHERE id=?`).run(userId);
  }
});

test("unknown providers cannot grant access", () => {
  const userId = Number(createUser());
  try {
    assert.throws(
      () => grantEntitlement({ userId, provider: "untrusted-store" }),
      /invalid entitlement provider/
    );
  } finally {
    db.prepare(`DELETE FROM users WHERE id=?`).run(userId);
  }
});
