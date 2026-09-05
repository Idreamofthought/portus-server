/* ============================================================
   UI MODULE — Portus
   Handles building selection, panels, notifications, and UI state.
   ============================================================ */

import { BUILDINGS } from "./buildings.js";
import { Sound } from "./sound.js";

/* ============================================================
   INITIAL UI STATE
   ============================================================ */

export function setupUI(state) {
    state.ui = {
        selectedBuilding: null,
        panels: {
            resources: true,
            research: true,
            codex: true,
            warnings: true,
            disasters: false,
            favour: false
        },
        notifications: [],
        pendingNotifications: [],
        lastNotificationFlush: Date.now()
    };

    setupBuildingButtons(state);
    setupPanelButtons(state);
    setupAudioControls();
}

/* ============================================================
   BUILDING SELECTION BUTTONS
   ============================================================ */

function setupBuildingButtons(state) {
    const container = document.getElementById("buildings");
    if (!container) return;

    container.innerHTML = "";

    for (const def of BUILDINGS) {
        const id = def.id;

        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.id = id;
        btn.setAttribute("aria-pressed", "false");
        btn.textContent = def.name;

        btn.onclick = () => {
            state.ui.selectedBuilding = id;
            updateBuildingSelectionUI(state);
            pushNotification(state, `Selected: ${def.name}`, "info");
        };

        container.appendChild(btn);
    }
}

function updateBuildingSelectionUI(state) {
    const selected = state.ui.selectedBuilding;

    document.querySelectorAll("#buildings button").forEach((button) => {
        const isSelected = button.dataset.id === selected;
        button.classList.toggle("selected", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });
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
   AUDIO CONTROLS (JS VERSION — NO HTML)
   ============================================================ */

function setupAudioControls() {
    const container = document.getElementById("audio-controls");
    if (!container) return;

    container.innerHTML = "";

    const musicLabel = document.createElement("label");
    const musicToggle = document.createElement("input");
    musicToggle.type = "checkbox";
    musicToggle.id = "toggle-music";
    musicToggle.checked = true;
    musicToggle.onchange = (event) => {
        Sound.setMusicEnabled(event.target.checked);
    };
    musicLabel.appendChild(musicToggle);
    musicLabel.append(" Music");

    const sfxLabel = document.createElement("label");
    const sfxToggle = document.createElement("input");
    sfxToggle.type = "checkbox";
    sfxToggle.id = "toggle-sfx";
    sfxToggle.checked = true;
    sfxToggle.onchange = (event) => {
        Sound.enabled = event.target.checked;
    };
    sfxLabel.appendChild(sfxToggle);
    sfxLabel.append(" Sound");

    container.appendChild(musicLabel);
    container.appendChild(sfxLabel);
}

/* ============================================================
   NOTIFICATIONS
   ============================================================ */

export function pushNotification(state, msg, type = "info") {
    addNotification(state, msg, type);
}

export function queueNotification(state, msg, type = "info") {
    if (!state.ui) return;

    state.ui.pendingNotifications.push({ msg, type });
    flushQueuedNotifications(state);
}

function flushQueuedNotifications(state) {
    const ui = state.ui;
    if (!ui || !ui.pendingNotifications.length) return;

    const now = Date.now();
    if (now - ui.lastNotificationFlush < 5 * 60 * 1000) return;

    const messages = ui.pendingNotifications.map(notification => notification.msg);
    const types = ui.pendingNotifications.map(notification => notification.type);
    const type = types.includes("danger") ? "danger" : types[0];

    addNotification(
        state,
        messages.length === 1
            ? messages[0]
            : `${messages.length} developments: ${messages.join(" | ")}`,
        type
    );
    ui.pendingNotifications = [];
    ui.lastNotificationFlush = now;
}

function addNotification(state, msg, type) {
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
    flushQueuedNotifications(state);

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
   PANEL RENDERING
   ============================================================ */

export function renderUI(state) {
    updateBuildingSelectionUI(state);
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

    box.replaceChildren();
    for (const [label, value] of [['Wood', r.wood], ['Stone', r.stone], ['Food', r.food], ['Gold', r.gold]]) {
        const row = document.createElement('div');
        row.textContent = `${label}: ${value}`;
        box.appendChild(row);
    }
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
        const title = document.createElement("strong");
        title.textContent = entry.title;
        div.append(title, document.createElement("br"), document.createTextNode(entry.text));
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

    box.replaceChildren();
    const heading = document.createElement('h3');
    heading.textContent = 'Favour';
    box.appendChild(heading);
    for (const text of [
        `Favour: ${f.value}`,
        `Twilight: ${f.twilightMode ? 'Active' : 'Inactive'}`,
        `Progress: ${f.twilightProgress || 0}`
    ]) {
        const row = document.createElement('div');
        row.textContent = text;
        box.appendChild(row);
    }
}
