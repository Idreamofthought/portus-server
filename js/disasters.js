/* ============================================================
   DISASTERS MODULE — Portus
   Full version: disaster catalogue, triggers, severity scaling,
   integration with favour.js, warnings.js, seasonal influence,
   twilight acceleration, Codex unlocks.
   ============================================================ */

import {
    reduceChaosTolerance,
    reduceTimeFavour,
    reduceDestinyJudgement,
    disasterInfluence,
    unlockCodex
} from "./favour.js";

/* ---------------- INITIAL STATE ---------------- */

export function initDisasterState() {
    return {
        lastDisasters: [],
        cooldown: 0,
        history: [],
        seasonModifier: {
            spring: 0.8,
            summer: 1.2,
            autumn: 1.0,
            winter: 1.4
        }
    };
}

/* ---------------- DISASTER CATALOGUE ---------------- */

export const DISASTERS = {
    drought: {
        id: "drought",
        name: "Drought",
        desc: "Fields dry, wells weaken, crops fail.",
        baseChance: 0.015,
        apply: (state, grid, res) => {
            reduceTimeFavour(state.favourState, 4);
            reduceChaosTolerance(state.favourState, 2);
            res.wheat = Math.max(0, res.wheat - 6);
            res.olives = Math.max(0, res.olives - 4);
        }
    },

    wildfire: {
        id: "wildfire",
        name: "Wildfire",
        desc: "Forest burns, wooden buildings damaged.",
        baseChance: 0.012,
        apply: (state, grid, res) => {
            reduceChaosTolerance(state.favourState, 6);
            reduceTimeFavour(state.favourState, 3);

            for (let y = 0; y < grid.length; y++) {
                for (let x = 0; x < grid[0].length; x++) {
                    if (grid[y][x].terrain === "forest" && Math.random() < 0.25) {
                        grid[y][x].terrain = "grass";
                    }
                }
            }
        }
    },

    blight: {
        id: "blight",
        name: "Crop Blight",
        desc: "Disease spreads through fields.",
        baseChance: 0.014,
        apply: (state, grid, res) => {
            reduceTimeFavour(state.favourState, 5);
            reduceDestinyJudgement(state.favourState, 3);
            res.wheat = Math.max(0, res.wheat - 8);
            res.grapes = Math.max(0, res.grapes - 5);
        }
    },

    flood: {
        id: "flood",
        name: "Flood",
        desc: "Coastal and river buildings damaged.",
        baseChance: 0.010,
        apply: (state, grid, res) => {
            reduceChaosTolerance(state.favourState, 4);
            reduceDestinyJudgement(state.favourState, 2);

            for (let y = 0; y < grid.length; y++) {
                for (let x = 0; x < grid[0].length; x++) {
                    const t = grid[y][x].terrain;
                    if ((t === "river" || t === "sea") && grid[y][x].building) {
                        grid[y][x].building = null;
                    }
                }
            }
        }
    },

    plague: {
        id: "plague",
        name: "Plague",
        desc: "Population suffers, happiness drops.",
        baseChance: 0.008,
        apply: (state, grid, res) => {
            reduceChaosTolerance(state.favourState, 8);
            reduceDestinyJudgement(state.favourState, 6);
            state.pop.happiness = Math.max(0, state.pop.happiness - 12);
        }
    }
};

/* ---------------- INTERNAL HELPERS ---------------- */

function pushDisaster(state, id, severity) {
    const d = DISASTERS[id];
    const entry = {
        id,
        name: d.name,
        severity,
        tick: state.tickCount || 0
    };

    state.lastDisasters.push(entry);
    state.history.push(entry);

    unlockCodex(state.favourState, id);
}

function computeSeverity(state) {
    const time = state.favourState.timeFavour;
    const chaos = state.favourState.chaosTolerance;
    const destiny = state.favourState.destinyJudgement;

    if (time < 20 || chaos < 20 || destiny < 20) return "major";
    if (time < 40 || chaos < 40 || destiny < 40) return "medium";
    return "minor";
}

function disasterChance(state, season, id) {
    const d = DISASTERS[id];
    const base = d.baseChance;
    const seasonMod = state.seasonModifier[season] || 1.0;

    const time = state.favourState.timeFavour;
    const chaos = state.favourState.chaosTolerance;
    const destiny = state.favourState.destinyJudgement;

    const favourMod = (100 - (time + chaos + destiny) / 3) / 100;

    return base * seasonMod * (1 + favourMod);
}

/* ---------------- MAIN DISASTER TICK ---------------- */

export function disastersTick(state, grid, res, season) {
    state.lastDisasters = [];

    if (state.cooldown > 0) {
        state.cooldown -= 1;
        return [];
    }

    for (const id of Object.keys(DISASTERS)) {
        const chance = disasterChance(state, season, id);

        if (Math.random() < chance) {
            const severity = computeSeverity(state);

            pushDisaster(state, id, severity);

            const d = DISASTERS[id];
            d.apply(state, grid, res);

            disasterInfluence(state.favourState, severity);

            if (severity === "major") {
                state.favourState.twilightProgress += 4;
            }

            state.cooldown = 120;
        }
    }

    return state.lastDisasters;
                          }
