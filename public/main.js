/* ============================================================
   MAIN MODULE — Portus
   Player controller + game orchestration
   ============================================================ */

import { initGame, startGameLoop, placeBuilding } from "./game.js";

import { initResources, updateResources } from "./resources.js";
import { initResearch, updateResearch } from "./research.js";
import { initFavour, updateFavour } from "./favour.js";
import { initDisasters, triggerDisasters } from "./disasters.js";
import { initWarnings, updateWarnings } from "./warnings.js";
import { initCodex } from "./codex.js";
import { setupUI } from "./ui.js";

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

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

/* ============================================================
   CAMERA
   ============================================================ */

let camX = 0;
let camY = 0;
let zoom = 1.0;

/* ============================================================
   RENDER MAP
   ============================================================ */

function drawTile(x, y, terrain) {
    if (terrain === "grass") ctx.fillStyle = "#2b5d2b";
    else if (terrain === "forest") ctx.fillStyle = "#1f3d1f";
    else if (terrain === "sea") ctx.fillStyle = "#1a3d5c";
    else if (terrain === "river") ctx.fillStyle = "#2a5f8a";
    else ctx.fillStyle = "#444";

    ctx.fillRect(x, y, 16, 16);
}

function drawBuilding(x, y, building) {
    ctx.fillStyle = "#d9c27a";
    ctx.fillRect(x + 3, y + 3, 10, 10);
}

function renderMap() {
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(camX, camY);

    const grid = state.grid;

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const px = x * 16;
            const py = y * 16;

            drawTile(px, py, grid[y][x].terrain);

            if (grid[y][x].building) {
                drawBuilding(px, py, grid[y][x].building);
            }
        }
    }

    ctx.restore();
}

/* ============================================================
   INPUT: CLICK (place building)
   ============================================================ */

canvas.addEventListener("click", (ev) => {
    const rect = canvas.getBoundingClientRect();
    const cx = (ev.clientX - rect.left) / zoom - camX;
    const cy = (ev.clientY - rect.top) / zoom - camY;

    const gx = Math.floor(cx / 16);
    const gy = Math.floor(cy / 16);

    const buildingToPlace = state.ui.selectedBuilding;

    if (buildingToPlace) {
        const result = placeBuilding(state, gx, gy, buildingToPlace);

        if (!result.ok) {
            console.log("Cannot place:", result.reason);
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
    updateSystems(state);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderMap();
});
