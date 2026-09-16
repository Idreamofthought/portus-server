import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BUILDING_IDS, TECH_BONUS_KEYS, COLS, ROWS } from "../save-validation.js";

// Guards against protected/game.html and save-validation.js drifting apart,
// which previously caused every cloud save to be silently rejected.
const gameHtmlPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../protected/game.html");
const gameHtml = fs.readFileSync(gameHtmlPath, "utf8");

function extractScript() {
  const match = gameHtml.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(match, "expected the inline module <script> in protected/game.html");
  return match[1];
}

test("game.html building ids match save-validation BUILDING_IDS", () => {
  const script = extractScript();
  const buildingsMatch = script.match(/const BUILDINGS = \[([\s\S]*?)\n\];/);
  assert.ok(buildingsMatch, "expected a BUILDINGS array in game.html");
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
