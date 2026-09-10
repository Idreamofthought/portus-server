const SAVE_KEYS = new Set([
  "v", "captain", "res", "cap", "pop", "happiness", "boats", "coin", "research",
  "unlockedTechs", "techBonus", "military", "droughtTicksLeft", "taxRate", "scenarioId",
  "scenarioState", "grid", "buildings"
]);

const RESOURCE_KEYS = new Set([
  "wood", "stone", "clay", "pottery", "tools", "goldOre", "silverOre", "copperOre",
  "gold", "silver", "copper", "wheat", "olives", "chickpeas", "grapes", "fish",
  "deer", "bread", "scrolls", "flour", "oliveOil", "salt"
]);

const BUILDING_IDS = new Set([
  "house", "farmerhut", "fisherhut", "fields", "woodcutter", "quarry", "claypit",
  "pottery", "toolsmith", "foundry", "silvermine", "coppermine", "goldmine", "library",
  "market", "tradingpost", "taxoffice", "barracks", "docks", "boatbuilder", "granary",
  "warehouse", "well", "sewer"
]);

const TERRAIN_CODES = new Set(["grass", "forest", "mountain", "river", "sea", "sand"]);
const DEPOSIT_CODES = new Set(["clay", "salt"]);
const COLS = 30;
const ROWS = 20;
const MAX_NUMBER = 1e9;
const MAX_FAVOUR = 100;

function invalid() {
  return { ok: false, error: "invalid_save" };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value, { min = -MAX_NUMBER, max = MAX_NUMBER } = {}) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function exactKeys(value, keys) {
  return isPlainObject(value) && Object.keys(value).every((key) => keys.has(key)) && [...keys].every((key) => Object.hasOwn(value, key));
}

function validateNumberMap(value, keys, { min = 0, max = MAX_NUMBER } = {}) {
  return exactKeys(value, keys) && Object.values(value).every((entry) => finiteNumber(entry, { min, max }));
}

function validateGrid(grid) {
  if (!Array.isArray(grid) || grid.length !== ROWS) return false;
  return grid.every((row) => Array.isArray(row) && row.length === COLS && row.every((tile) => {
    if (!isPlainObject(tile) || !["terrain", "deposit"].every((key) => Object.hasOwn(tile, key))) return false;
    if (Object.keys(tile).some((key) => !["terrain", "deposit"].includes(key))) return false;
    return TERRAIN_CODES.has(tile.terrain) && (tile.deposit === null || DEPOSIT_CODES.has(tile.deposit));
  }));
}

function validateBuildings(buildings, grid) {
  if (!Array.isArray(buildings)) return false;
  const occupied = new Set();
  return buildings.every((building) => {
    if (!isPlainObject(building)) return false;
    const keys = Object.keys(building);
    if (!keys.every((key) => ["id", "x", "y", "crop"].includes(key))) return false;
    if (!["id", "x", "y"].every((key) => Object.hasOwn(building, key))) return false;
    if (!BUILDING_IDS.has(building.id) || !Number.isInteger(building.x) || !Number.isInteger(building.y)) return false;
    if (building.x < 0 || building.x >= COLS || building.y < 0 || building.y >= ROWS) return false;
    if (building.crop !== undefined && typeof building.crop !== "string") return false;
    if (building.crop !== undefined && building.crop.length > 32) return false;
    if (grid[building.y][building.x].terrain === "sea") return false;
    const position = `${building.x},${building.y}`;
    if (occupied.has(position)) return false;
    occupied.add(position);
    return true;
  });
}

export function validateSave(value) {
  if (!isPlainObject(value) || !exactKeys(value, SAVE_KEYS)) return invalid();
  if (value.v !== 1 || typeof value.captain !== "string" || value.captain.length > 24) return invalid();
  if (!validateNumberMap(value.res, RESOURCE_KEYS)) return invalid();
  if (!validateNumberMap(value.cap, new Set(["general", "food"]), { min: 0, max: MAX_NUMBER })) return invalid();
  if (!exactKeys(value.pop, new Set(["count", "capacity"])) || !finiteNumber(value.pop.count, { min: 0 }) || !finiteNumber(value.pop.capacity, { min: 0 })) return invalid();
  if (!finiteNumber(value.happiness, { min: 0, max: 100 }) || !finiteNumber(value.boats, { min: 0 }) || !finiteNumber(value.coin, { min: 0 })) return invalid();
  if (!finiteNumber(value.research, { min: 0 }) || !Array.isArray(value.unlockedTechs) || !value.unlockedTechs.every((id) => typeof id === "string" && id.length <= 64)) return invalid();
  if (!validateNumberMap(value.techBonus, new Set(["field", "quarry", "fish", "foundry", "trade"]), { min: 0, max: MAX_NUMBER })) return invalid();
  if (!exactKeys(value.military, new Set(["soldiers", "cap"])) || !finiteNumber(value.military.soldiers, { min: 0 }) || !finiteNumber(value.military.cap, { min: 0 })) return invalid();
  if (!finiteNumber(value.droughtTicksLeft, { min: 0 }) || !finiteNumber(value.taxRate, { min: 0, max: MAX_NUMBER })) return invalid();
  if (value.scenarioId !== null && typeof value.scenarioId !== "string") return invalid();
  if (!isPlainObject(value.scenarioState) || !Object.hasOwn(value.scenarioState, "disastersSurvived")) return invalid();
  if (Object.keys(value.scenarioState).some((key) => !["disastersSurvived", "completed", "failed"].includes(key))) return invalid();
  if (!finiteNumber(value.scenarioState.disastersSurvived, { min: 0 })) return invalid();
  if (value.scenarioState.completed !== undefined && typeof value.scenarioState.completed !== "boolean") return invalid();
  if (value.scenarioState.failed !== undefined && typeof value.scenarioState.failed !== "boolean") return invalid();
  if (!validateGrid(value.grid) || !validateBuildings(value.buildings, value.grid)) return invalid();
  return { ok: true };
}
