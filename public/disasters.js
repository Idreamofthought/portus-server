/* ============================================================
   DISASTERS MODULE — Portus
   Handles disaster definitions, chances, severity, triggering,
   twilight integration, favour influence, and UI notifications.
   ============================================================ */

import { reduceFavour } from "./favour.js";

/* ============================================================
   DISASTER DEFINITIONS
   ============================================================ */

export const DISASTERS = {
    drought: {
        id: "drought",
        name: "Drought",
        desc: "Fields dry, wells weaken, crops fail.",
        baseChance: 0.01,
        apply(state) {
            state.resources.food = Math.max(0, state.resources.food - 8);
            reduceFavour(state, 2);
        }
    },

    wildfire: {
    id: "wildfire",
    name: "Wildfire",
    desc: "Forest burns, wooden buildings damaged.",
    baseChance: 0.008,
    apply(state) {
        const grid = state.grid;
        if (!grid || !grid.length || !grid[0]) return;

        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[0].length; x++) {
                const tile = grid[y][x];
                if (tile.terrain === "forest" && Math.random() < 0.15) {
                    tile.terrain = "grass";
                }
            }
        }
        reduceFavour(state, 3);
    }
},


    blight: {
        id: "blight",
        name: "Crop Blight",
        desc: "Disease spreads through fields.",
        baseChance: 0.009,
        apply(state) {
            state.resources.food = Math.max(0, state.resources.food - 12);
            reduceFavour(state, 4);
        }
    },

   flood: {
    id: "flood",
    name: "Flood",
    desc: "Coastal and river buildings damaged.",
    baseChance: 0.006,
    apply(state) {
        const grid = state.grid;
        if (!grid || !grid.length || !grid[0]) return;

        for (let y = 0; y < grid.length; y++) {
            for (let x = 0; x < grid[0].length; x++) {
                const tile = grid[y][x];
                if ((tile.terrain === "river" || tile.terrain === "sea") && tile.building) {
                    tile.building = null;
                }
            }
        }
        reduceFavour(state, 3);
    }
},


    plague: {
        id: "plague",
        name: "Plague",
        desc: "Population suffers, happiness drops.",
        baseChance: 0.004,
        apply(state) {
            if (!state.population) state.population = { happiness: 50 };
            state.population.happiness = Math.max(0, state.population.happiness - 15);
            reduceFavour(state, 5);
        }
    }
};

/* ============================================================
   INITIAL DISASTER STATE
   ============================================================ */

export function initDisasters() {
    return {
        lastEvents: [],
        cooldown: 0,
        forceMajor: false
    };
}

/* ============================================================
   SEVERITY CALCULATION
   ============================================================ */

function computeSeverity(state) {
    const F = state.favour;

    const score = (F.value + F.chaosTolerance + F.destinyJudgement) / 3;

    if (state.disasters.forceMajor) {
        state.disasters.forceMajor = false;
        return "major";
    }

    if (score < 20) return "major";
    if (score < 50) return "medium";
    return "minor";
}

/* ============================================================
   CHANCE CALCULATION
   ============================================================ */

function disasterChance(state, id) {
    const base = DISASTERS[id].baseChance;

    const F = state.favour;

    // Lower favour → higher disaster chance
    const favourMod = (100 - F.value) / 100;

    // Twilight mode → double chance
    const twilightMod = F.twilightMode ? 2.0 : 1.0;

    return base * (1 + favourMod) * twilightMod;
}

/* ============================================================
   TRIGGER DISASTER
   ============================================================ */

function triggerOneDisaster(state, id) {
    const severity = computeSeverity(state);
    const def = DISASTERS[id];

    // Apply disaster effects
    def.apply(state);

    // Record event
    const event = {
        id,
        name: def.name,
        severity,
        tick: state.tick
    };

    state.disasters.lastEvents.push(event);

    // UI notification
    if (state.ui && state.ui.notifications) {
        state.ui.notifications.push({
            msg: `${def.name} (${severity})`,
            type: severity === "major" ? "danger" : "warning",
            time: Date.now()
        });
    }

    // Cooldown
    state.disasters.cooldown = severity === "major" ? 200 : 120;
}

/* ============================================================
   UPDATE DISASTERS (called every tick)
   ============================================================ */

export function triggerDisasters(state) {
    const D = state.disasters;

    // Cooldown active
    if (D.cooldown > 0) {
        D.cooldown--;
        return;
    }

    // Reset last events
    D.lastEvents = [];

    // Try each disaster
    for (const id in DISASTERS) {
        const chance = disasterChance(state, id);

        if (Math.random() < chance) {
            triggerOneDisaster(state, id);
        }
    }
}
