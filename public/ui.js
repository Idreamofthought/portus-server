/* ============================================================
   UI MODULE — Portus
   Handles building selection, panels, notifications, and UI state.
   ============================================================ */

import { BUILDINGS } from "./buildings.js";

/* ============================================================
   INITIAL UI STATE
   ============================================================ */

export function setupUI(state) {
    state.ui = {
        selectedBuilding: null,
        panels: {
            resources: true,
            research: false,
            codex: false,
            warnings: false,
            disasters: false,
            favour: false
        },
        notifications: []
    };

    setupBuildingButtons(state);
    setupPanelButtons(state);
}

/* ============================================================
   BUILDING SELECTION BUTTONS
   ============================================================ */

function setupBuildingButtons(state) {
    const container = document.getElementById("buildings");

    if (!container) return;

    container.innerHTML = "";

    for (const id in BUILDINGS) {
        const def = BUILDINGS[id];

        const btn = document.createElement("button");
        btn.textContent = def.name;

        btn.onclick = () => {
            state.ui.selectedBuilding = id;
            pushNotification(state, `Selected: ${def.name}`, "info");
        };

        container.appendChild(btn);
    }
}

/* ============================================================
   PANEL BUTTONS
   ============================================================ */

function setupPanelButtons(state) {
    const panels = [
        "resources",
        "research",
        "codex",
        "warnings",
        "disasters",
        "favour"
    ];

    for (const p of panels) {
        const btn = document.getElementById(`panel-${p}`);
        if (!btn) continue;

        btn.onclick = () => {
            state.ui.panels[p] = !state.ui.panels[p];
        };
    }
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */

export function pushNotification(state, msg, type = "info") {
    state.ui.notifications.push({
        msg,
        type,
        time: Date.now()
    });

    if (state.ui.notifications.length > 40) {
        state.ui.notifications.shift();
    }
}

export function renderNotifications(state) {
    const box = document.getElementById("notifications");
    if (!box) return;

    box.innerHTML = "";

    const recent = state.ui.notifications.slice(-6);

    for (const n of recent) {
        const div = document.createElement("div");
        div.className = `note note-${n.type}`;
        div.textContent = n.msg;
        box.appendChild(div);
    }
}
/* ============================================================
   SOUND TOGGLE INTERFACE
   ============================================================ */
<div id="audio-controls">
    <label>
        <input type="checkbox" id="toggle-music" checked>
        Music
    </label>
    <label>
        <input type="checkbox" id="toggle-sfx" checked>
        Sound
    </label>
</div>

/* ============================================================
   PANEL RENDERING
   ============================================================ */

export function renderUI(state) {
    renderNotifications(state);
    renderResourcePanel(state);
    renderResearchPanel(state);
    renderCodexPanel(state);
    renderWarningsPanel(state);
    renderDisastersPanel(state);
    renderFavourPanel(state);
}

/* ============================================================
   RESOURCES PANEL
   ============================================================ */

function renderResourcePanel(state) {
    if (!state.ui.panels.resources) return;

    const box = document.getElementById("panel-resources-box");
    if (!box) return;

    const r = state.resources;

    box.innerHTML = `
        <div>Wood: ${r.wood}</div>
        <div>Stone: ${r.stone}</div>
        <div>Food: ${r.food}</div>
    `;
}

/* ============================================================
   RESEARCH PANEL
   ============================================================ */

function renderResearchPanel(state) {
    if (!state.ui.panels.research) return;

    const box = document.getElementById("panel-research-box");
    if (!box) return;

    const unlocked = state.research.unlocked;

    box.innerHTML = "<h3>Research</h3>";

    for (const tech of unlocked) {
        const div = document.createElement("div");
        div.textContent = tech;
        box.appendChild(div);
    }
}

/* ============================================================
   CODEX PANEL
   ============================================================ */

function renderCodexPanel(state) {
    if (!state.ui.panels.codex) return;

    const box = document.getElementById("panel-codex-box");
    if (!box) return;

    box.innerHTML = "<h3>Codex</h3>";

    for (const id in state.codex) {
        const entry = state.codex[id];
        if (!entry.unlocked) continue;

        const div = document.createElement("div");
        div.innerHTML = `<strong>${entry.title}</strong><br>${entry.text}`;
        box.appendChild(div);
    }
}

/* ============================================================
   WARNINGS PANEL
   ============================================================ */

function renderWarningsPanel(state) {
    if (!state.ui.panels.warnings) return;

    const box = document.getElementById("panel-warnings-box");
    if (!box) return;

    box.innerHTML = "<h3>Warnings</h3>";

    for (const w of state.warnings.alerts) {
        const div = document.createElement("div");
        div.textContent = `${w.message} (${w.severity})`;
        box.appendChild(div);
    }
}

/* ============================================================
   DISASTERS PANEL
   ============================================================ */

function renderDisastersPanel(state) {
    if (!state.ui.panels.disasters) return;

    const box = document.getElementById("panel-disasters-box");
    if (!box) return;

    box.innerHTML = "<h3>Disasters</h3>";

    for (const d of state.disasters.lastEvents || []) {
        const div = document.createElement("div");
        div.textContent = `${d.name} — severity ${d.severity}`;
        box.appendChild(div);
    }
}

/* ============================================================
   FAVOUR PANEL
   ============================================================ */

function renderFavourPanel(state) {
    if (!state.ui.panels.favour) return;

    const box = document.getElementById("panel-favour-box");
    if (!box) return;

    const f = state.favour;

    box.innerHTML = `
        <h3>Favour</h3>
        <div>Favour: ${f.value}</div>
        <div>Twilight: ${f.twilightMode ? "Active" : "Inactive"}</div>
        <div>Progress: ${f.twilightProgress || 0}</div>
    `;
}
