import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILDING_IDS, TECH_BONUS_KEYS, RESOURCE_KEYS, TERRAIN_CODES, DEPOSIT_CODES, SAVE_KEYS, COLS, ROWS } from "../save-validation.js";

// Guards against protected/js/game.js and save-validation.js drifting apart,
// which previously caused every cloud save to be silently rejected.
const gameJsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../protected/js/game.js");

function extractScript() {
  return fs.readFileSync(gameJsPath, "utf8");
}

// Splits an object-literal body on top-level commas only, so nested calls
// like grid.map(row=>row.map(t=>({terrain:t.terrain, deposit:t.deposit})))
// aren't mistaken for extra keys.
function splitTopLevel(str) {
  const parts = [];
  let depth = 0, current = '';
  for (const ch of str) {
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

test("protected/js/buildings.js ids match save-validation BUILDING_IDS", () => {
  const buildingsJsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../protected/js/buildings.js");
  const buildingsJs = fs.readFileSync(buildingsJsPath, "utf8");
  const buildingsMatch = buildingsJs.match(/export const BUILDINGS = \[([\s\S]*?)\n\];/);
  assert.ok(buildingsMatch, "expected a BUILDINGS array in protected/js/buildings.js");
  const ids = [...buildingsMatch[1].matchAll(/\{id:'([a-zA-Z0-9]+)'/g)].map((m) => m[1]);
  assert.ok(ids.length > 0, "expected at least one building id");
  assert.deepEqual(new Set(ids), BUILDING_IDS);
});

test("game.html techBonus keys match save-validation TECH_BONUS_KEYS", () => {
  const script = extractScript();
  const techBonusMatch = script.match(/const techBonus = \{ ([^}]*) \};/);
  assert.ok(techBonusMatch, "expected a techBonus object in game.html");
  const keys = [...techBonusMatch[1].matchAll(/(\w+):/g)].map((m) => m[1]);
  assert.ok(keys.length > 0, "expected at least one techBonus key");
  assert.deepEqual(new Set(keys), TECH_BONUS_KEYS);
});

test("protected/js/map.js grid dimensions match save-validation COLS/ROWS", () => {
  const mapJsPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../protected/js/map.js");
  const mapJs = fs.readFileSync(mapJsPath, "utf8");
  const dimsMatch = mapJs.match(/export const COLS = (\d+), ROWS = (\d+)/);
  assert.ok(dimsMatch, "expected a COLS/ROWS declaration in protected/js/map.js");
  assert.equal(Number(dimsMatch[1]), COLS);
  assert.equal(Number(dimsMatch[2]), ROWS);
});

test("protected/js/resources.js FOOD_KEYS/GENERAL_KEYS match save-validation RESOURCE_KEYS", async () => {
  const { FOOD_KEYS, GENERAL_KEYS } = await import("../protected/js/resources.js");
  assert.deepEqual(new Set([...FOOD_KEYS, ...GENERAL_KEYS]), RESOURCE_KEYS);
});

test("trade and production resources/buildings are defined and tracked in validation", async () => {
  const { RESOURCE_KEYS, BUILDING_IDS } = await import("../save-validation.js");
  assert.ok(RESOURCE_KEYS.has("marble"));
  assert.ok(RESOURCE_KEYS.has("tin"));
  assert.ok(RESOURCE_KEYS.has("honey"));
  assert.ok(RESOURCE_KEYS.has("wax"));
  assert.ok(BUILDING_IDS.has("tinmine"));
  assert.ok(BUILDING_IDS.has("marblequarry"));
  assert.ok(BUILDING_IDS.has("beekeeper"));
});

test("protected/js/presentation.js covers every resource/terrain/deposit key", async () => {
  const { RESOURCE_INFO, TERRAIN_COLOR, DEPOSIT_COLOR } = await import("../protected/js/presentation.js");
  for (const key of RESOURCE_KEYS) {
    assert.ok(Object.hasOwn(RESOURCE_INFO, key), `RESOURCE_INFO missing description for "${key}"`);
  }
  for (const terrain of TERRAIN_CODES) {
    assert.ok(Object.hasOwn(TERRAIN_COLOR, terrain), `TERRAIN_COLOR missing color for "${terrain}"`);
  }
  for (const deposit of DEPOSIT_CODES) {
    assert.ok(Object.hasOwn(DEPOSIT_COLOR, deposit), `DEPOSIT_COLOR missing color for "${deposit}"`);
  }
});

test("game.html getState() keys match save-validation SAVE_KEYS", () => {
  const script = extractScript();
  const getStateMatch = script.match(/function getState\(\)\{\s*return \{([\s\S]*?)\n  \};\n\}/);
  assert.ok(getStateMatch, "expected a getState() function in game.html");
  const keys = splitTopLevel(getStateMatch[1])
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(':')[0].trim());
  assert.ok(keys.length > 0, "expected at least one getState() key");
  assert.deepEqual(new Set(keys), SAVE_KEYS);
});

test("protected/js/research.js techBonus effects only use known TECH_BONUS_KEYS", async () => {
  const { TECHS } = await import("../protected/js/research.js");
  const techIds = new Set(TECHS.map((t) => t.id));
  for (const tech of TECHS) {
    for (const key of Object.keys(tech.effects?.techBonus || {})) {
      assert.ok(TECH_BONUS_KEYS.has(key), `${tech.id} references unknown techBonus key "${key}"`);
    }
    for (const reqId of tech.requires || []) {
      assert.ok(techIds.has(reqId), `${tech.id} requires unknown tech "${reqId}"`);
    }
  }
});
