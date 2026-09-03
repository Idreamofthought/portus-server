/* ============================================================
   WARNINGS MODULE — Portus
   Full version: resource monitoring, forest/fish/quarry/crop
   warnings, livestock, storm, fire, Codex unlocks, favour
   influence, disaster influence, seasonal influence.
   ============================================================ */

import {
    reduceChaosTolerance,
    reduceTimeFavour,
    reduceDestinyJudgement,
    addChaosTolerance,
    addTimeFavour,
    addDestinyJudgement,
    unlockCodex
} from "./favour.js";

/* ---------------- INITIAL STATE ---------------- */

export function initWarningsState() {
    return {
        lastWarnings: [],
        cooldowns: {},       // { warningId: ticksLeft }
        intensity: {},       // { warningId: severity }
        history: []          // log of warnings
    };
}

/* ---------------- INTERNAL HELPERS ---------------- */

function pushWarning(state, id, message, severity) {
    state.lastWarnings.push({ id, message, severity });

    state.history.push({
        id,
        message,
        severity,
        tick: state.tickCount || 0
    });

    state.cooldowns[id] = 80; // prevent spam
    state.intensity[id] = severity;

    unlockCodex(state.favourState, id);
}

function canWarn(state, id) {
    return !state.cooldowns[id] || state.cooldowns[id] <= 0;
}

function tickCooldowns(state) {
    for (const id of Object.keys(state.cooldowns)) {
        state.cooldowns[id] = Math.max(0, state.cooldowns[id] - 1);
    }
}

/* ============================================================
   FOREST WARNING
   ============================================================ */

export function checkForestWarning(state, grid, res) {
    let forestTiles = 0;
    let totalTiles = 0;

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            totalTiles++;
            if (grid[y][x].terrain === "forest") forestTiles++;
        }
    }

    const ratio = forestTiles / totalTiles;

    if (ratio < 0.08 && canWarn(state, "forest_thin")) {
        pushWarning(
            state,
            "forest_thin",
            "🌲 The forest thins. Time urges caution.",
            "medium"
        );

        reduceChaosTolerance(state.favourState, 3);
        reduceTimeFavour(state.favourState, 1);
    }
}

/* ============================================================
   FISH WARNING
   ============================================================ */

export function checkFishWarning(state, grid, res) {
    if (res.fish < 10 && canWarn(state, "fish_scarce")) {
        pushWarning(
            state,
            "fish_scarce",
            "🐟 Fish grow scarce. Chaos stirs beneath the waves.",
            "medium"
        );

        reduceTimeFavour(state.favourState, 2);
        reduceChaosTolerance(state.favourState, 2);
    }
}

/* ============================================================
   QUARRY WARNING
   ============================================================ */

export function checkQuarryWarning(state, grid, res) {
    if (res.stone < 15 && canWarn(state, "quarry_hollow")) {
        pushWarning(
            state,
            "quarry_hollow",
            "⛏️ The quarry echoes hollow. Destiny watches.",
            "medium"
        );

        reduceDestinyJudgement(state.favourState, 3);
    }
}

/* ============================================================
   CROP WARNING
   ============================================================ */

export function checkCropWarning(state, grid, res) {
    const foodTotal =
        res.wheat + res.olives + res.grapes + res.chickpeas + res.bread;

    if (foodTotal < 25 && canWarn(state, "crop_weak")) {
        pushWarning(
            state,
            "crop_weak",
            "🌾 The fields weaken. Time grows impatient.",
            "medium"
        );

        reduceTimeFavour(state.favourState, 3);
    }
}

/* ============================================================
   LIVESTOCK WARNING
   ============================================================ */

export function checkLivestockWarning(state, grid, res) {
    if (res.deer > 40 && canWarn(state, "livestock_risk")) {
        pushWarning(
            state,
            "livestock_risk",
            "🐑 Livestock grow restless. Illness may spread.",
            "medium"
        );

        reduceChaosTolerance(state.favourState, 2);
    }
}

/* ============================================================
   STORM WARNING
   ============================================================ */

export function checkStormWarning(state, season) {
    if (season === "winter" &&
        state.favourState.timeFavour < 30 &&
        canWarn(state, "storm_approach")) {

        pushWarning(
            state,
            "storm_approach",
            "⛈️ A storm approaches.",
            "major"
        );

        reduceTimeFavour(state.favourState, 4);
        reduceDestinyJudgement(state.favourState, 2);
    }
}

/* ============================================================
   FIRE WARNING
   ============================================================ */

export function checkFireWarning(state, grid) {
    let woodBuildings = 0;
    let totalBuildings = 0;

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const b = grid[y][x].building;
            if (!b) continue;
            totalBuildings++;

            const def = state.buildingDefs[b.id];
            if (!def) continue;

            if (def.cost.wood) woodBuildings++;
        }
    }

    const ratio = woodBuildings / Math.max(1, totalBuildings);

    if (ratio > 0.6 &&
        state.favourState.chaosTolerance < 30 &&
        canWarn(state, "fire_risk")) {

        pushWarning(
            state,
            "fire_risk",
            "🔥 Fire risk rises. Chaos trembles.",
            "major"
        );

        reduceChaosTolerance(state.favourState, 5);
        reduceTimeFavour(state.favourState, 2);
    }
}

/* ============================================================
   MAIN WARNING TICK
   ============================================================ */

export function warningsTick(state, grid, res, season) {
    state.lastWarnings = [];

    tickCooldowns(state);

    checkForestWarning(state, grid, res);
    checkFishWarning(state, grid, res);
    checkQuarryWarning(state, grid, res);
    checkCropWarning(state, grid, res);
    checkLivestockWarning(state, grid, res);
    checkStormWarning(state, season);
    checkFireWarning(state, grid);

    return state.lastWarnings;
}
