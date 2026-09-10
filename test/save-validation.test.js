import test from "node:test";
import assert from "node:assert/strict";
import { validateSave } from "../save-validation.js";

const resourceKeys = [
  "wood", "stone", "clay", "pottery", "tools", "goldOre", "silverOre", "copperOre",
  "gold", "silver", "copper", "wheat", "olives", "chickpeas", "grapes", "fish",
  "deer", "bread", "scrolls", "flour", "oliveOil", "salt"
];

function validSave() {
  return {
    v: 1,
    captain: "Captain",
    res: Object.fromEntries(resourceKeys.map((key) => [key, 0])),
    cap: { general: 150, food: 150 },
    pop: { count: 6, capacity: 10 },
    happiness: 55,
    boats: 0,
    coin: 20,
    research: 0,
    unlockedTechs: [],
    techBonus: { field: 1, quarry: 1, fish: 1, foundry: 1, trade: 1 },
    military: { soldiers: 0, cap: 0 },
    droughtTicksLeft: 0,
    taxRate: 0,
    scenarioId: null,
    scenarioState: { disastersSurvived: 0, failed: false },
    grid: Array.from({ length: 20 }, () => Array.from({ length: 30 }, () => ({ terrain: "grass", deposit: null }))),
    buildings: [{ id: "house", x: 0, y: 0 }]
  };
}

test("accepts a valid current game save", () => {
  assert.deepEqual(validateSave(validSave()), { ok: true });
});

test("accepts a completed scenario save", () => {
  const save = validSave();
  save.scenarioState.completed = true;
  assert.deepEqual(validateSave(save), { ok: true });
});

test("rejects unknown top-level fields", () => {
  const save = validSave();
  save.cheat = true;
  assert.deepEqual(validateSave(save), { ok: false, error: "invalid_save" });
});

test("rejects malformed arrays and nulls", () => {
  const save = validSave();
  save.buildings = {};
  assert.equal(validateSave(save).ok, false);
  save.buildings = [{ id: "house", x: 0, y: 0, crop: null }];
  assert.equal(validateSave(save).ok, false);
});

test("rejects negative and non-finite numbers", () => {
  const negative = validSave();
  negative.res.wood = -1;
  assert.equal(validateSave(negative).ok, false);
  const infinite = validSave();
  infinite.coin = Infinity;
  assert.equal(validateSave(infinite).ok, false);
});

test("rejects invalid grid shape and terrain", () => {
  const wrongShape = validSave();
  wrongShape.grid.pop();
  assert.equal(validateSave(wrongShape).ok, false);
  const wrongTerrain = validSave();
  wrongTerrain.grid[0][0].terrain = "lava";
  assert.equal(validateSave(wrongTerrain).ok, false);
});

test("rejects unknown, out-of-bounds, sea, and overlapping buildings", () => {
  const unknown = validSave();
  unknown.buildings[0].id = "fake";
  assert.equal(validateSave(unknown).ok, false);
  const outOfBounds = validSave();
  outOfBounds.buildings[0].x = 30;
  assert.equal(validateSave(outOfBounds).ok, false);
  const sea = validSave();
  sea.grid[0][0].terrain = "sea";
  assert.equal(validateSave(sea).ok, false);
  const overlap = validSave();
  overlap.buildings.push({ id: "house", x: 0, y: 0 });
  assert.equal(validateSave(overlap).ok, false);
});
