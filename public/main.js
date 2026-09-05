/* ============================================================
   MAIN MODULE — Portus
   Player controller + game orchestration
   ============================================================ */

import { initGame, startGameLoop, placeBuilding } from "./game.js";
import { COLS, ROWS, TS } from "./map.js";

import { initResources, updateResources } from "./resources.js";
import { initResearch, updateResearch } from "./research.js";
import { initFavour, updateFavour } from "./favour.js";
import { initDisasters, triggerDisasters } from "./disasters.js";
import { initWarnings, updateWarnings } from "./warnings.js";
import { initCodex } from "./codex.js";
import { setupUI, renderUI } from "./ui.js";
import { Sound } from "./sound.js";
Sound.init();




/* ============================================================
   INITIALIZE GAME STATE
   ============================================================ */

const state = initGame();

/* ============================================================
   INITIALIZE ALL GAME SYSTEMS
   ============================================================ */

function initSystems(state) {
    state.resources = initResources();
    state.research = initResearch();
    state.favour = initFavour();
    state.disasters = initDisasters();
    state.warnings = initWarnings();
    state.codex = initCodex();

    setupUI(state);
}

function updateSystems(state) {
    updateResources(state);
    updateResearch(state);
    updateFavour(state);
    triggerDisasters(state);
    updateWarnings(state);
}

initSystems(state);

/* ============================================================
   CANVAS SETUP
   ============================================================ */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const minimap = document.getElementById("minimap");
const minimapCtx = minimap.getContext("2d");

canvas.width = COLS * TS;
canvas.height = ROWS * TS;

/* ============================================================
   CAMERA
   ============================================================ */
/* ============================================================
   CAMERA
   ============================================================ */

let camX = 0;
let camY = 0;
let zoom = 1;




/* ============================================================
   RENDER MAP
   ============================================================ */

function drawTile(x, y, terrain) {
    if (terrain === "grass") ctx.fillStyle = "#2b5d2b";
    else if (terrain === "forest") ctx.fillStyle = "#1f3d1f";
    else if (terrain === "sea") ctx.fillStyle = "#1a3d5c";
    else if (terrain === "river") ctx.fillStyle = "#2a5f8a";
    else ctx.fillStyle = "#444";

    ctx.fillRect(x, y, TS, TS);
}

function drawBuilding(x, y, building) {
    ctx.fillStyle = "#d9c27a";
    ctx.fillRect(x + 4, y + 4, TS - 8, TS - 8);
}

function renderMap() {
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(camX, camY);

    const grid = state.grid;

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const px = x * TS;
            const py = y * TS;

            drawTile(px, py, grid[y][x].terrain);

            if (grid[y][x].building) {
                drawBuilding(px, py, grid[y][x].building);
            }
        }
    }

    ctx.restore();
}

function renderMinimap() {
    const mapWidth = COLS * TS;
    const mapHeight = ROWS * TS;
    const scaleX = minimap.width / mapWidth;
    const scaleY = minimap.height / mapHeight;

    minimapCtx.clearRect(0, 0, minimap.width, minimap.height);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const tile = state.grid[y][x];
            minimapCtx.fillStyle = tile.terrain === "grass" ? "#2b5d2b"
                : tile.terrain === "forest" ? "#1f3d1f"
                    : tile.terrain === "sea" ? "#1a3d5c"
                        : tile.terrain === "river" ? "#2a5f8a" : "#806f5b";
            minimapCtx.fillRect(x * TS * scaleX, y * TS * scaleY, TS * scaleX + 0.5, TS * scaleY + 0.5);

            if (tile.building) {
                minimapCtx.fillStyle = "#f1d47b";
                minimapCtx.fillRect(x * TS * scaleX, y * TS * scaleY, Math.max(2, TS * scaleX), Math.max(2, TS * scaleY));
            }
        }
    }

    const viewWidth = Math.min(mapWidth, canvas.width / zoom);
    const viewHeight = Math.min(mapHeight, canvas.height / zoom);
    minimapCtx.strokeStyle = "#fff3c4";
    minimapCtx.lineWidth = 1.5;
    minimapCtx.strokeRect(
        Math.max(0, -camX) * scaleX,
        Math.max(0, -camY) * scaleY,
        viewWidth * scaleX,
        viewHeight * scaleY
    );
}

minimap.addEventListener("click", (event) => {
    const rect = minimap.getBoundingClientRect();
    const worldX = ((event.clientX - rect.left) / rect.width) * COLS * TS;
    const worldY = ((event.clientY - rect.top) / rect.height) * ROWS * TS;
    camX = canvas.width / (2 * zoom) - worldX;
    camY = canvas.height / (2 * zoom) - worldY;
});

/* ============================================================
   INPUT: CLICK (place building)
   ============================================================ */

canvas.addEventListener("click", (ev) => {
    const rect = canvas.getBoundingClientRect();

    // Undo zoom
    const mx = (ev.clientX - rect.left) / zoom;
    const my = (ev.clientY - rect.top) / zoom;

    // Undo camera translation
    const worldX = mx - camX;
    const worldY = my - camY;

    // Convert to tile coordinates
    const gx = Math.floor(worldX / TS);
    const gy = Math.floor(worldY / TS);

    const buildingToPlace = state.ui.selectedBuilding;

    if (buildingToPlace) {
        const result = placeBuilding(state, gx, gy, buildingToPlace);

        if (!result.ok) {
            console.log("Cannot place:", result.reason);
        } else {
            Sound.playBuilding(buildingToPlace);
        }
    }
});

/* ============================================================
   INPUT: ZOOM
   ============================================================ */

canvas.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    const delta = ev.deltaY > 0 ? -0.1 : 0.1;
    zoom = Math.max(0.5, Math.min(3.0, zoom + delta));
});

/* ============================================================
   INPUT: DRAG (camera movement)
   ============================================================ */

let dragging = false;
let lastX = 0;
let lastY = 0;

canvas.addEventListener("mousedown", (ev) => {
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
});

canvas.addEventListener("mouseup", () => {
    dragging = false;
});

canvas.addEventListener("mousemove", (ev) => {
    if (!dragging) return;

    const dx = (ev.clientX - lastX) / zoom;
    const dy = (ev.clientY - lastY) / zoom;

    camX += dx;
    camY += dy;

    lastX = ev.clientX;
    lastY = ev.clientY;
});

/* ============================================================
   GAME LOOP
   ============================================================ */

startGameLoop(state, (frame) => {
    if (frame !== null) {
        updateSystems(state);
    }
    renderUI(state);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderMap();
    renderMinimap();
});
