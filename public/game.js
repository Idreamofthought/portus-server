/* ============================================================
   GAME MODULE — Portus
   Full orchestrator: state assembly, grid, modules, tick loop,
   save/load, building placement, resource/favour/disaster/warning
   integration, UI sync.
   ============================================================ */

import { initMap, generateMap } from "./map.js";
import { initHelpers } from "./helpers.js";
import { BUILDINGS, BLD_BY_ID, canPlaceBuilding, buildBuilding } from "./buildings.js";
import { initResourceState, resourceTick } from "./resources.js";
import { initResearchState } from "./research.js";
import { initFavourState } from "./favour.js";
import { initWarningsState } from "./warnings.js";
import { initDisasterState } from "./disasters.js";
import { initTimeState, gameTick } from "./time.js";
import { initUIState, uiTick } from "./ui.js";
import { initCodexState, loadCodexEntries, codexTick } from "./codex.js";

/* ---------------- GLOBAL GAME STATE ---------------- */

export function initGame() {
    const state = {};

    state.grid = generateMap(60, 60);
    state.helpers = initHelpers();
    state.resources = initResourceState();
    state.researchState = initResearchState();
    state.favourState = initFavourState();
    state.warningsState = initWarningsState();
    state.disasterState = initDisasterState();
    state.time = initTimeState();
    state.ui = initUIState();
    state.codex = initCodexState();

    loadCodexEntries(state.codex);

    state.buildingDefs = BLD_BY_ID;
    state.placedBuildings = [];

    return state;
}

/* ---------------- BUILDING PLACEMENT ---------------- */

export function placeBuilding(state, x, y, id, crop = null) {
    if (!canPlaceBuilding(state.grid, x, y, id)) {
        return { ok: false, reason: "invalid_location" };
    }

    const def = BLD_BY_ID[id];
    if (!def) {
        return { ok: false, reason: "unknown_building" };
    }

    for (const [k, v] of Object.entries(def.cost || {})) {
        if ((state.resources.resources[k] || 0) < v) {
            return { ok: false, reason: "not_enough_resources" };
        }
    }

    for (const [k, v] of Object.entries(def.cost || {})) {
        state.resources.resources[k] -= v;
    }

    const b = buildBuilding(state, state.grid, x, y, id, crop);

    return { ok: true, building: b };
}

/* ---------------- SAVE / LOAD ---------------- */

export function saveGame(state) {
    const data = JSON.stringify(state);
    localStorage.setItem("portus_save", data);
}

export function loadGame() {
    const data = localStorage.getItem("portus_save");
    if (!data) return null;
    return JSON.parse(data);
}

/* ---------------- MAIN LOOP ---------------- */

export function tick(state) {
    const tickData = gameTick(state);

    const resData = resourceTick(state, state.grid);

    const codexData = codexTick(state.codex, tickData);

    const uiData = uiTick(state.ui, {
        warnings: tickData.warnings,
        disasters: tickData.disasters,
        favour: tickData.favour,
        state: state
    });

    return {
        tick: state.time.tick,
        day: state.time.day,
        season: state.time.season,
        resources: resData,
        favour: tickData.favour,
        warnings: tickData.warnings,
        disasters: tickData.disasters,
        codex: codexData,
        ui: uiData
    };
}

/* ---------------- GAME STARTER ---------------- */

export function startGameLoop(state, callback) {
    function loop() {
        const frame = tick(state);
        callback(frame);
        requestAnimationFrame(loop);
    }
    loop();
}
