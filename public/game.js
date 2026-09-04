/* ============================================================
   GAME ENGINE — Portus
   Initializes game state, map, and building placement.
   The main game loop is controlled from main.js.
   ============================================================ */
import { genMap } from "./map.js";


import { BUILDINGS } from "./buildings.js";
export function initGame() {
    const state = {
        tick: 0,
        grid: genMap(),

              
        ui: {
            selectedBuilding: null
        }
    };

    return state;
}



/* ============================================================
   PLACE BUILDING
   ============================================================ */

export function placeBuilding(state, gx, gy, buildingId) {
    const tile = state.grid[gy]?.[gx];
    if (!tile) return { ok: false, reason: "Invalid tile" };

    const def = BUILDINGS[buildingId];
    if (!def) return { ok: false, reason: "Unknown building" };

    // Terrain requirement
    if (def.requires.length > 0 && !def.requires.includes(tile.terrain)) {
        return { ok: false, reason: "Wrong terrain" };
    }

    // Tile occupied
    if (tile.building) {
        return { ok: false, reason: "Tile occupied" };
    }

    // Place building
    tile.building = {
        id: buildingId,
        progress: 0,
        complete: false
    };

    return { ok: true };
}

/* ============================================================
   GAME LOOP
   ============================================================ */

export function startGameLoop(state, renderCallback) {
    function loop() {
        state.tick++;

        // main.js handles system updates (resources, research, disasters, etc.)
        renderCallback(state.tick);

        requestAnimationFrame(loop);
    }

    loop();
}
