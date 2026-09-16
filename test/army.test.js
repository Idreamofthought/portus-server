import test from "node:test";
import assert from "node:assert/strict";
import { RAID_TIERS, resolveRaid } from "../protected/js/army.js";

test("resolveRaid succeeds when soldiers*raidBonus beats the enemy roll", () => {
  const ctx = { rnd: () => 0, raidBonus: 1 }; // rnd()=>0 picks the lowest enemy strength in range
  const result = resolveRaid(RAID_TIERS.small, ctx);
  assert.equal(result.success, true);
  assert.ok(result.loot >= RAID_TIERS.small.reward[0]);
});

test("resolveRaid fails when raidBonus can't overcome a maxed-out enemy roll", () => {
  const tier = RAID_TIERS.small;
  const ctx = { rnd: (n) => n - 1, raidBonus: 0.01 }; // forces max enemy strength, near-zero raid bonus
  const result = resolveRaid(tier, ctx);
  assert.equal(result.success, false);
  assert.equal(result.loot, 0);
});

test("every raid tier resolves to a non-empty message either way", () => {
  for (const tier of Object.values(RAID_TIERS)) {
    for (const raidBonus of [0.01, 10]) {
      const result = resolveRaid(tier, { rnd: () => 0, raidBonus });
      assert.equal(typeof result.message, "string");
      assert.ok(result.message.length > 0);
      assert.ok(result.losses >= 0);
    }
  }
});
