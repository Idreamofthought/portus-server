import test from "node:test";
import assert from "node:assert/strict";
import { migrateSave, validateSave, RESOURCE_KEYS, TECH_BONUS_KEYS } from "../save-validation.js";

// The resource set as it existed before the economy expansion.
const LEGACY_RESOURCE_KEYS = [
  "wood", "stone", "clay", "pottery", "tools", "goldOre", "silverOre", "copperOre",
  "gold", "silver", "copper", "wheat", "olives", "chickpeas", "grapes", "fish",
  "deer", "bread", "scrolls", "flour", "oliveOil", "salt", "marble", "tin", "bronze", "honey", "wax"
];

function legacySave() {
  return {
    v: 1,
    captain: "Captain",
    res: Object.fromEntries(LEGACY_RESOURCE_KEYS.map((key) => [key, 5])),
    cap: { general: 150, food: 150 },
    pop: { count: 6, capacity: 10 },
    happiness: 55,
    boats: 0,
    coin: 20,
    research: 0,
    unlockedTechs: [],
    techBonus: { field: 1, quarry: 1, fish: 1, foundry: 1, trade: 1, wood: 1, clay: 1, raid: 1, research: 1 },
    techHappinessBonus: 0,
    questsCompleted: [],
    military: { soldiers: 0, cap: 0 },
    droughtTicksLeft: 0,
    taxRate: 0,
    scenarioId: null,
    scenarioState: { disastersSurvived: 0, failed: false },
    grid: Array.from({ length: 30 }, () => Array.from({ length: 44 }, () => ({ terrain: "grass", deposit: null }))),
    buildings: [{ id: "house", x: 0, y: 0 }]
  };
}

test("a pre-expansion save is rejected before migration", () => {
  assert.deepEqual(validateSave(legacySave()), { ok: false, error: "invalid_save" });
});

test("a pre-expansion save validates after migration", () => {
  assert.deepEqual(validateSave(migrateSave(legacySave())), { ok: true });
});

test("migration fills every missing resource key with zero", () => {
  const migrated = migrateSave(legacySave());
  for (const key of RESOURCE_KEYS) {
    assert.ok(Object.hasOwn(migrated.res, key), `missing resource key "${key}"`);
    assert.ok(Number.isFinite(migrated.res[key]), `resource "${key}" is not finite`);
  }
  assert.equal(migrated.res.wine, 0);
  assert.equal(migrated.res.barley, 0);
});

test("migration preserves existing resource amounts", () => {
  const migrated = migrateSave(legacySave());
  for (const key of LEGACY_RESOURCE_KEYS) {
    assert.equal(migrated.res[key], 5, `resource "${key}" was overwritten`);
  }
});

test("missing tech bonuses default to 1 so production is not zeroed", () => {
  const save = legacySave();
  delete save.techBonus.trade;
  const migrated = migrateSave(save);
  assert.equal(migrated.techBonus.trade, 1);
  for (const key of TECH_BONUS_KEYS) {
    assert.notEqual(migrated.techBonus[key], 0, `tech bonus "${key}" must never default to 0`);
  }
});

test("migration does not mutate the input save", () => {
  const original = legacySave();
  migrateSave(original);
  assert.equal(Object.hasOwn(original.res, "wine"), false);
});

test("migration repairs absent keys but never rewrites invalid values", () => {
  const save = legacySave();
  save.res.wood = Number.NaN;
  const migrated = migrateSave(save);
  assert.ok(Number.isNaN(migrated.res.wood), "an invalid value must be left for validation to reject");
  assert.deepEqual(validateSave(migrated), { ok: false, error: "invalid_save" });
});

test("migration leaves a fully current save unchanged", () => {
  const current = migrateSave(legacySave());
  assert.deepEqual(migrateSave(current), current);
});

test("migration tolerates malformed input without throwing", () => {
  assert.equal(migrateSave(null), null);
  assert.equal(migrateSave("nope"), "nope");
  assert.deepEqual(migrateSave({}), {});
});
