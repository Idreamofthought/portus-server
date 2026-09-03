/* ============================================================
   UI MODULE — Portus
   Full version: resource bar, notifications, Codex, panels,
   disaster/warning display, favour bars, twilight UI, research UI.
   ============================================================ */

/* ---------------- INITIAL STATE ---------------- */

export function initUIState() {
    return {
        notifications: [],
        codex: {},
        panels: {
            resources: true,
            research: false,
            codex: false,
            favour: false,
            warnings: false,
            disasters: false
        },
        lastTickData: null
    };
}

/* ---------------- NOTIFICATIONS ---------------- */

export function pushNotification(ui, msg, type = "info") {
    ui.notifications.push({
        msg,
        type,
        time: Date.now()
    });

    if (ui.notifications.length > 40) {
        ui.notifications.shift();
    }
}

export function renderNotifications(ui) {
    return ui.notifications.slice(-6);
}

/* ---------------- RESOURCE BAR ---------------- */

export function renderResourceBar(state) {
    const out = [];

    for (const [name, amount] of Object.entries(state.resources.resources)) {
        const cap = state.resources.capacity[name];
        out.push({
            name,
            amount,
            cap,
            percent: Math.min(100, (amount / cap) * 100)
        });
    }

    return out;
}

/* ---------------- FAVOUR PANEL ---------------- */

export function renderFavourPanel(favourState) {
    return {
        time: favourState.timeFavour,
        chaos: favourState.chaosTolerance,
        destiny: favourState.destinyJudgement,
        twilight: favourState.twilightMode,
        twilightProgress: favourState.twilightProgress
    };
}

/* ---------------- WARNINGS PANEL ---------------- */

export function renderWarningsPanel(warningsState) {
    return warningsState.lastWarnings.map(w => ({
        id: w.id,
        message: w.message,
        severity: w.severity
    }));
}

/* ---------------- DISASTERS PANEL ---------------- */

export function renderDisastersPanel(disasterState) {
    return disasterState.lastDisasters.map(d => ({
        id: d.id,
        name: d.name,
        severity: d.severity,
        tick: d.tick
    }));
}

/* ---------------- RESEARCH PANEL ---------------- */

export function renderResearchPanel(researchState, techDefs) {
    const out = [];

    for (const t of techDefs) {
        out.push({
            id: t.id,
            name: t.name,
            desc: t.desc,
            cost: t.cost,
            unlocked: researchState.unlockedTechs.has(t.id),
            affordable: researchState.research >= t.cost
        });
    }

    return out;
}

/* ---------------- CODEX ---------------- */

export function initCodexEntries(ui) {
    ui.codex = {
        drought: { title: "Drought", unlocked: false, text: "Fields dry, wells weaken." },
        wildfire: { title: "Wildfire", unlocked: false, text: "Forest burns, chaos rises." },
        blight: { title: "Blight", unlocked: false, text: "Disease spreads through crops." },
        flood: { title: "Flood", unlocked: false, text: "Rivers overflow, buildings damaged." },
        plague: { title: "Plague", unlocked: false, text: "Population suffers, destiny falters." },
        forest_thin: { title: "Forest Thinning", unlocked: false, text: "The forest weakens." },
        fish_scarce: { title: "Fish Scarcity", unlocked: false, text: "The sea grows silent." },
        quarry_hollow: { title: "Quarry Hollow", unlocked: false, text: "Stone veins weaken." },
        crop_weak: { title: "Crop Weakness", unlocked: false, text: "Fields lose vitality." },
        livestock_risk: { title: "Livestock Risk", unlocked: false, text: "Illness may spread." },
        storm_approach: { title: "Storm Approaches", unlocked: false, text: "Clouds gather." },
        fire_risk: { title: "Fire Risk", unlocked: false, text: "Flames threaten the city." }
    };
}

export function unlockCodexEntry(ui, id) {
    if (ui.codex[id]) {
        ui.codex[id].unlocked = true;
    }
}

export function renderCodex(ui) {
    const out = [];

    for (const [id, entry] of Object.entries(ui.codex)) {
        if (entry.unlocked) {
            out.push({
                id,
                title: entry.title,
                text: entry.text
            });
        }
    }

    return out;
}

/* ---------------- PANEL TOGGLE ---------------- */

export function togglePanel(ui, panelName) {
    if (!ui.panels[panelName]) {
        ui.panels[panelName] = true;
    } else {
        ui.panels[panelName] = false;
    }
}

/* ---------------- MAIN UI TICK ---------------- */

export function uiTick(ui, tickData) {
    ui.lastTickData = tickData;

    for (const w of tickData.warnings) {
        pushNotification(ui, w.message, "warning");
        unlockCodexEntry(ui, w.id);
    }

    for (const d of tickData.disasters) {
        pushNotification(ui, d.name + " (" + d.severity + ")", "disaster");
        unlockCodexEntry(ui, d.id);
    }

    if (tickData.favour.blessings.length > 0) {
        for (const b of tickData.favour.blessings) {
            pushNotification(ui, b, "blessing");
        }
    }

    if (tickData.favour.penalties.length > 0) {
        for (const p of tickData.favour.penalties) {
            pushNotification(ui, p, "penalty");
        }
    }

    return {
        notifications: renderNotifications(ui),
        resources: renderResourceBar(tickData.state),
        favour: renderFavourPanel(tickData.state.favourState),
        warnings: renderWarningsPanel(tickData.state.warningsState),
        disasters: renderDisastersPanel(tickData.state.disasterState),
        codex: renderCodex(ui)
    };
                    }
