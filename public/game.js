/* ============================================================
   GAME ENGINE — Portus
   Initializes game state, map, and building placement.
   The main game loop is controlled from main.js.
   ============================================================ */
import { genMap } from "./map.js";
import { BLD_BY_ID } from "./buildings.js";

export function placeBuilding(state, gx, gy, buildingId) {

    if (gy < 0 || gy >= state.grid.length ||
        gx < 0 || gx >= state.grid[0].length) {
        return { ok: false, reason: "Invalid tile" };
    }

    const tile = state.grid[gy][gx];
    if (!tile) return { ok: false, reason: "Invalid tile" };

    const def = BLD_BY_ID[buildingId];
    if (!def) return { ok: false, reason: "Unknown building" };

    if (!def.valid(state.grid, gx, gy)) {
        return { ok: false, reason: "Wrong terrain" };
    }

    if (tile.building) {
        return { ok: false, reason: "Tile occupied" };
    }

    tile.building = {
        id: buildingId,
        progress: 0,
        complete: false
    };

    return { ok: true };
}




/* ============================================================
   PLACE BUILDING
   ============================================================ */
/* ============================================================
   PLACE BUILDING
   ============================================================ */
export function placeBuilding(state, gx, gy, buildingId) {

    // Prevent out-of-bounds placement
    if (gy < 0 || gy >= state.grid.length ||
        gx < 0 || gx >= state.grid[0].length) {
        return { ok: false, reason: "Invalid tile" };
    }

    const tile = state.grid[gy][gx];
    if (!tile) return { ok: false, reason: "Invalid tile" };

    const def = BLD_BY_ID[buildingId];
    if (!def) return { ok: false, reason: "Unknown building" };

    if (!def.valid(state.grid, gx, gy)) {
        return { ok: false, reason: "Wrong terrain" };
    }

    if (tile.building) {
        return { ok: false, reason: "Tile occupied" };
    }

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
