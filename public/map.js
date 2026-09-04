/* ============================================================
   MAP MODULE — Portus
   Full extraction: terrain, deposits, proximity helpers,
   and map generation.
   ============================================================ */

import { rnd, clamp } from "./helpers.js";

/* ---------------- CONSTANTS ---------------- */

export const COLS = 30;
export const ROWS = 20;
export const TS = 30;

/* ---------------- MAP STATE ---------------- */

export let grid = []; // grid[y][x] = { terrain, deposit, building }

/* ---------------- BASIC HELPERS ---------------- */

export function inBounds(x, y) {
    return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

export function neighbors(x, y, r = 1) {
    const out = [];
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (inBounds(nx, ny)) out.push(grid[ny][nx]);
        }
    }
    return out;
}

export function nearTerrain(x, y, list, r = 1) {
    if (list.includes(grid[y][x].terrain)) return true;
    return neighbors(x, y, r).some(t => list.includes(t.terrain));
}

export function nearDeposit(x, y, dep, r = 1) {
    if (grid[y][x].deposit === dep) return true;
    return neighbors(x, y, r).some(t => t.deposit === dep);
}

export function nearBuilding(x, y, id, r = 1) {
    if (grid[y][x].building && grid[y][x].building.id === id) return true;
    return neighbors(x, y, r).some(t => t.building && t.building.id === id);
}

/* ---------------- MAP GENERATION ---------------- */

export function genMap() {
    grid = [];

    // Base grass
    for (let y = 0; y < ROWS; y++) {
        const row = [];
        for (let x = 0; x < COLS; x++) {
            row.push({ terrain: "grass", deposit: null, building: null });
        }
        grid.push(row);
    }

    // Sea along bottom
    for (let x = 0; x < COLS; x++) {
        let depth = 3 + rnd(2) - (Math.sin(x / 4) * 1.2 | 0);
        for (let y = ROWS - 1; y >= ROWS - Math.max(2, depth); y--) {
            if (y >= 0) grid[y][x].terrain = "sea";
        }
    }

    // Beach fringe
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x].terrain === "grass" &&
                y + 1 < ROWS &&
                grid[y + 1][x].terrain === "sea") {
                grid[y][x].terrain = "sand";
            }
        }
    }

    // Mountains cluster
    const mcx = 4, mcy = 3;
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let d = Math.hypot(x - mcx, y - mcy);
            if (d < 3.2 + Math.random() * 1.3) {
                grid[y][x].terrain = "mountain";
            }
        }
    }

    // Ore deposits
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (grid[y][x].terrain === "mountain") {
                let r = Math.random();
                if (r < 0.09) grid[y][x].deposit = "gold";
                else if (r < 0.20) grid[y][x].deposit = "silver";
                else if (r < 0.36) grid[y][x].deposit = "copper";
            }
        }
    }

    // River
    let rx = mcx + 3, ry = mcy + 2;
    while (ry < ROWS && grid[ry][rx] && grid[ry][rx].terrain !== "sea") {
        for (let dx = -1; dx <= 1; dx++) {
            let xx = rx + dx;
            if (xx >= 0 && xx < COLS && grid[ry][xx].terrain !== "mountain") {
                grid[ry][xx].terrain = "river";
            }
        }
        ry += 1;
        rx += (rnd(3) - 1);
        rx = clamp(rx, 2, COLS - 3);
    }

    // Forest patches
    for (let i = 0; i < 6; i++) {
        let fx = 6 + rnd(COLS - 10), fy = 2 + rnd(ROWS - 6);
        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                let d = Math.hypot(x - fx, y - fy);
                if (d < 1.6 + Math.random() * 1.4 &&
                    grid[y][x].terrain === "grass" &&
                    Math.random() < 0.7) {
                    grid[y][x].terrain = "forest";
                }
            }
        }
    }

    // Clay deposits
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            let t = grid[y][x].terrain;
            if ((t === "grass" || t === "sand") &&return grid;
                nearTerrain(x, y, ["river", "sea"], 1) &&
                Math.random() < 0.22) {
                grid[y][x].deposit = "clay";
            }
        }
    }

    // Salt flats
for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
        let t = grid[y][x].terrain;
        if (t === "sand" &&
            !grid[y][x].deposit &&
            nearTerrain(x, y, ["sea"], 1) &&
            Math.random() < 0.18) {
            grid[y][x].deposit = "salt";
        }
    }
}

return grid;   // ⭐ MUST be here, outside all loops
}              // ⭐ This closes the genMap() function

