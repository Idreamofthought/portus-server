/* ============================================================
   RESOURCES MODULE — Portus
   Handles storage, production, consumption, and tick updates.
   ============================================================ */

import { BLD_BY_ID } from "./buildings.js";

/* ============================================================
   INITIAL RESOURCE STATE
   ============================================================ */

export function initResources() {
    return {
        wood: 20,
        stone: 10,
        food: 15,
        gold: 0
    };
}

/* ============================================================
   GET RESOURCE
   ============================================================ */

export function getResource(state, name) {
    return state.resources[name] || 0;
}

/* ============================================================
   ADD RESOURCE
   ============================================================ */

export function addResource(state, name, amount) {
    if (!state.resources[name] && state.resources[name] !== 0) return;
    state.resources[name] += amount;
}

/* ============================================================
   CONSUME RESOURCE
   ============================================================ */

export function consumeResource(state, name, amount) {
    if (getResource(state, name) < amount) return false;
    state.resources[name] -= amount;
    return true;
}

/* ============================================================
   CHECK MULTIPLE COSTS
   ============================================================ */

export function hasResources(state, cost) {
    for (const key in cost) {
        if (getResource(state, key) < cost[key]) return false;
    }
    return true;
}

export function spendResources(state, cost) {
    for (const key in cost) {
        state.resources[key] -= cost[key];
    }
}

/* ============================================================
   PRODUCTION TICK
   ============================================================ */
export function updateResources(state) {
    const grid = state.grid;
    if (!grid || !grid.length || !grid[0]) return;

    // Loop through all tiles
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const tile = grid[y][x];
            if (!tile.building) continue;

            const def = BLD_BY_ID[tile.building.id];
            if (!def) continue;

            // Building production
            if (def.produce) {
                for (const res in def.produce) {
                    addResource(state, res, def.produce[res]);
                }
            }
        }
    }
}
