/* ============================================================
   RESOURCES MODULE — Portus
   Full version: storage, production, consumption, depletion,
   seasonal modifiers, building multipliers, favour influence.
   ============================================================ */

import { RESOURCE_TYPES } from "./resources_types.js"; // your registry
import { buildingProduces, buildingConsumes } from "./buildings.js";

/* ---------------- INITIAL STATE ---------------- */

export function initResourceState() {
    const res = {};
    const cap = {};
    const dep = {};

    for (const name of Object.keys(RESOURCE_TYPES)) {
        res[name] = 0;
        cap[name] = 100;
        dep[name] = 100;
    }

    return {
        resources: res,
        capacity: cap,
        depletion: dep,
        productionLog: [],
        consumptionLog: []
    };
}

/* ---------------- INTERNAL HELPERS ---------------- */

function addResource(state, name, amount) {
    const cap = state.capacity[name] || 999999;
    state.resources[name] = Math.min(cap, state.resources[name] + amount);
}

function consumeResource(state, name, amount) {
    if (state.resources[name] < amount) return false;
    state.resources[name] -= amount;
    return true;
}

function applyDepletion(state, name, amount) {
    state.depletion[name] = Math.max(0, state.depletion[name] - amount);
}

function regenDepletion(state, name, amount) {
    state.depletion[name] = Math.min(100, state.depletion[name] + amount);
}

/* ---------------- PRODUCTION TICK ---------------- */

export function applyProductionTick(state, grid, res) {
    const log = [];

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const b = grid[y][x].building;
            if (!b) continue;

            const def = state.buildingDefs[b.id];
            if (!def) continue;

            const prod = buildingProduces(def);
            if (!prod) continue;

            for (const [name, base] of Object.entries(prod)) {
                const dep = state.depletion[name] || 100;
                const depFactor = dep / 100;

                const season = state.time.season;
                let seasonFactor = 1;
                if (season === "winter") seasonFactor = 0.6;
                if (season === "summer") seasonFactor = 1.2;

                const favour = state.favourState;
                const chaosFactor = 1 - (100 - favour.chaosTolerance) / 300;

                const amount = base * depFactor * seasonFactor * chaosFactor;

                addResource(state, name, amount);

                log.push({
                    building: b.id,
                    resource: name,
                    amount: amount
                });

                applyDepletion(state, name, amount * 0.05);
            }
        }
    }

    state.productionLog = log;
    return log;
}

/* ---------------- CONSUMPTION TICK ---------------- */

export function applyConsumptionTick(state, grid, res) {
    const log = [];

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const b = grid[y][x].building;
            if (!b) continue;

            const def = state.buildingDefs[b.id];
            if (!def) continue;

            const cons = buildingConsumes(def);
            if (!cons) continue;

            let ok = true;

            for (const [name, amount] of Object.entries(cons)) {
                if (state.resources[name] < amount) {
                    ok = false;
                    break;
                }
            }

            if (!ok) continue;

            for (const [name, amount] of Object.entries(cons)) {
                consumeResource(state, name, amount);
                log.push({
                    building: b.id,
                    resource: name,
                    amount: amount
                });
            }
        }
    }

    state.consumptionLog = log;
    return log;
}

/* ---------------- STORAGE CAPACITY ---------------- */

export function increaseCapacity(state, name, amount) {
    state.capacity[name] += amount;
}

export function increaseGeneralCapacity(state, amount) {
    for (const key of Object.keys(state.capacity)) {
        state.capacity[key] += amount;
    }
}

/* ---------------- DEPLETION REGEN ---------------- */

export function regenTick(state) {
    for (const name of Object.keys(state.depletion)) {
        const type = RESOURCE_TYPES[name];
        if (!type) continue;

        if (type.renewable) {
            regenDepletion(state, name, 0.2);
        }
    }
}

/* ---------------- MAIN RESOURCE TICK ---------------- */

export function resourceTick(state, grid) {
    const prod = applyProductionTick(state, grid, state.resources);
    const cons = applyConsumptionTick(state, grid, state.resources);
    regenTick(state);

    return {
        production: prod,
        consumption: cons,
        depletion: state.depletion
    };
}
