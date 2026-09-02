/* ============================================================
   TIME MODULE — Portus
   Full version: global tick, seasons, day counter, twilight
   integration, favour tick, disaster tick, warnings tick,
   production/consumption tick, research tick.
   ============================================================ */

import { favourTick } from "./favour.js";
import { disastersTick } from "./disasters.js";
import { warningsTick } from "./warnings.js";
import { applyProductionTick, applyConsumptionTick } from "./resources.js";

/* ---------------- INITIAL STATE ---------------- */

export function initTimeState() {
    return {
        tick: 0,
        day: 1,
        season: "spring",
        seasonLength: 120,   // ticks per season
        nextSeasonTick: 120,
        twilightActive: false
    };
}

/* ---------------- SEASON LOGIC ---------------- */

function updateSeason(timeState) {
    if (timeState.tick >= timeState.nextSeasonTick) {
        const order = ["spring", "summer", "autumn", "winter"];
        const idx = order.indexOf(timeState.season);
        const next = order[(idx + 1) % order.length];

        timeState.season = next;
        timeState.nextSeasonTick += timeState.seasonLength;
    }
}

/* ---------------- TWILIGHT MODE ---------------- */

function updateTwilight(timeState, favourState) {
    if (favourState.twilightMode && !timeState.twilightActive) {
        timeState.twilightActive = true;
    }

    if (!favourState.twilightMode && timeState.twilightActive) {
        timeState.twilightActive = false;
    }
}

/* ---------------- MAIN TICK ---------------- */

export function gameTick(state) {
    state.time.tick += 1;

    if (state.time.tick % 10 === 0) {
        state.time.day += 1;
    }

    updateSeason(state.time);
    updateTwilight(state.time, state.favourState);

    const season = state.time.season;

    const prod = applyProductionTick(state, state.grid, state.res);
    const cons = applyConsumptionTick(state, state.grid, state.res);

    const fav = favourTick(state.favourState, state.res, season);

    const dis = disastersTick(state.disasterState, state.grid, state.res, season);

    const warn = warningsTick(state.warningsState, state.grid, state.res, season);

    return {
        production: prod,
        consumption: cons,
        favour: fav,
        disasters: dis,
        warnings: warn,
        season: season,
        day: state.time.day
    };
}
