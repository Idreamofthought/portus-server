import { db } from "./database2.js";

export const PORTUS_FULL_GAME = "portus_full_game";

const VALID_ENTITLEMENTS = new Set([PORTUS_FULL_GAME]);
const VALID_PROVIDERS = new Set(["steam", "web", "admin", "promotion"]);

export function grantEntitlement({ userId, entitlement = PORTUS_FULL_GAME, provider, externalId = null }) {
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("invalid user id");
  if (!VALID_ENTITLEMENTS.has(entitlement)) throw new Error("invalid entitlement");
  if (!VALID_PROVIDERS.has(provider)) throw new Error("invalid entitlement provider");

  db.prepare(
    `INSERT INTO entitlements (user_id, entitlement, provider, external_id, granted_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, NULL)
     ON CONFLICT(user_id, entitlement, provider) DO UPDATE SET
       external_id=excluded.external_id,
       granted_at=excluded.granted_at,
       revoked_at=NULL`
  ).run(userId, entitlement, provider, externalId, Date.now());
}

export function revokeEntitlement({ userId, entitlement = PORTUS_FULL_GAME, provider }) {
  if (!VALID_ENTITLEMENTS.has(entitlement)) throw new Error("invalid entitlement");
  if (!VALID_PROVIDERS.has(provider)) throw new Error("invalid entitlement provider");

  return db.prepare(
    `UPDATE entitlements SET revoked_at=?
     WHERE user_id=? AND entitlement=? AND provider=? AND revoked_at IS NULL`
  ).run(Date.now(), userId, entitlement, provider);
}

export function getActiveEntitlement(userId, entitlement = PORTUS_FULL_GAME) {
  if (!Number.isInteger(userId) || userId <= 0) return null;
  if (!VALID_ENTITLEMENTS.has(entitlement)) return null;

  return db.prepare(
    `SELECT entitlement, provider, external_id, granted_at
     FROM entitlements
     WHERE user_id=? AND entitlement=? AND revoked_at IS NULL
     ORDER BY granted_at DESC LIMIT 1`
  ).get(userId, entitlement) || null;
}

export function hasPermanentAccess(userId) {
  return Boolean(getActiveEntitlement(userId));
}
