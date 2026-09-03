/* ============================================================
   CODEX MODULE — Portus
   Handles lore entries, categories, unlocking, and UI display.
   ============================================================ */

/* ============================================================
   CODEX ENTRIES
   ============================================================ */

export const CODEX_ENTRIES = {
    drought: {
        id: "drought",
        title: "Drought",
        text: "Fields dry, wells weaken, and the land cries for rain.",
        category: "Disasters"
    },

    wildfire: {
        id: "wildfire",
        title: "Wildfire",
        text: "Forest burns, wooden homes tremble, and chaos rises.",
        category: "Disasters"
    },

    blight: {
        id: "blight",
        title: "Crop Blight",
        text: "Disease spreads through fields, weakening the harvest.",
        category: "Disasters"
    },

    flood: {
        id: "flood",
        title: "Flood",
        text: "Rivers overflow, coastal buildings suffer, and destiny shifts.",
        category: "Disasters"
    },

    plague: {
        id: "plague",
        title: "Plague",
        text: "Illness spreads among the people, lowering happiness.",
        category: "Disasters"
    },

    forest_thin: {
        id: "forest_thin",
        title: "Forest Thinning",
        text: "The forest weakens. Time urges caution.",
        category: "Warnings"
    },

    fish_scarce: {
        id: "fish_scarce",
        title: "Fish Scarcity",
        text: "The sea grows silent. Chaos stirs beneath the waves.",
        category: "Warnings"
    },

    quarry_hollow: {
        id: "quarry_hollow",
        title: "Quarry Hollow",
        text: "Stone veins weaken. Destiny watches.",
        category: "Warnings"
    },

    crop_weak: {
        id: "crop_weak",
        title: "Crop Weakness",
        text: "Fields lose vitality. Time grows impatient.",
        category: "Warnings"
    },

    livestock_risk: {
        id: "livestock_risk",
        title: "Livestock Risk",
        text: "Illness may spread among the herds.",
        category: "Warnings"
    },

    storm_approach: {
        id: "storm_approach",
        title: "Storm Approaches",
        text: "Clouds gather. A storm approaches.",
        category: "Warnings"
    },

    fire_risk: {
        id: "fire_risk",
        title: "Fire Risk",
        text: "Flames threaten the city. Chaos trembles.",
        category: "Warnings"
    },

    time_favour: {
        id: "time_favour",
        title: "Time Favour",
        text: "The stability of the world’s timeline. When low, twilight approaches.",
        category: "Favour"
    },

    chaos_tolerance: {
        id: "chaos_tolerance",
        title: "Chaos Tolerance",
        text: "The world’s ability to absorb disorder. When low, disasters intensify.",
        category: "Favour"
    },

    destiny_judgement: {
        id: "destiny_judgement",
        title: "Destiny Judgement",
        text: "The gods’ opinion of your city. When low, judgement falls.",
        category: "Favour"
    },

    twilight_mode: {
        id: "twilight_mode",
        title: "Twilight Mode",
        text: "A darkened state where Time thins, Chaos rises, and Destiny falters.",
        category: "Favour"
    }
};

/* ============================================================
   INITIAL STATE
   ============================================================ */

export function initCodex() {
    const codex = {};

    for (const id in CODEX_ENTRIES) {
        codex[id] = {
            ...CODEX_ENTRIES[id],
            unlocked: false
        };
    }

    return codex;
}

/* ============================================================
   UNLOCK ENTRY
   ============================================================ */

export function unlockCodex(state, id) {
    if (!state.codex[id]) return;
    state.codex[id].unlocked = true;
}

/* ============================================================
   CATEGORY FILTER
   ============================================================ */

export function getCodexByCategory(state, category) {
    const out = [];

    for (const id in state.codex) {
        const entry = state.codex[id];
        if (entry.category === category && entry.unlocked) {
            out.push(entry);
        }
    }

    return out;
}

/* ============================================================
   AUTO-UNLOCK BASED ON GAME EVENTS
   ============================================================ */

export function codexTick(state) {
    const warnings = state.warnings.alerts;
    const disasters = state.disasters.lastEvents;

    // Unlock warnings
    for (const w of warnings) {
        const id = w.id || w.message?.toLowerCase().replace(/\s+/g, "_");
        if (state.codex[id]) {
            unlockCodex(state, id);
        }
    }

    // Unlock disasters
    for (const d of disasters) {
        if (state.codex[d.id]) {
            unlockCodex(state, d.id);
        }
    }

    // Unlock favour entries
    unlockCodex(state, "time_favour");
    unlockCodex(state, "chaos_tolerance");
    unlockCodex(state, "destiny_judgement");

    if (state.favour.twilightMode) {
        unlockCodex(state, "twilight_mode");
    }
}

/* ============================================================
   RENDER FOR UI
   ============================================================ */

export function renderCodex(state) {
    const out = [];

    for (const id in state.codex) {
        const entry = state.codex[id];
        if (entry.unlocked) {
            out.push(entry);
        }
    }

    return out;
}
