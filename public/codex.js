/* ============================================================
   CODEX MODULE — Portus
   Full version: dynamic unlocks, categories, entries, UI sync,
   integration with favour, warnings, disasters, research.
   ============================================================ */

/* ---------------- INITIAL STATE ---------------- */

export function initCodexState() {
    return {
        entries: {},
        unlocked: new Set()
    };
}

/* ---------------- ENTRY REGISTRY ---------------- */

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

/* ---------------- INITIALIZATION ---------------- */

export function loadCodexEntries(codexState) {
    codexState.entries = { ...CODEX_ENTRIES };
}

/* ---------------- UNLOCK ---------------- */

export function unlockCodex(codexState, id) {
    if (codexState.entries[id]) {
        codexState.unlocked.add(id);
    }
}

/* ---------------- CHECK ---------------- */

export function hasCodex(codexState, id) {
    return codexState.unlocked.has(id);
}

/* ---------------- RENDER ---------------- */

export function renderCodex(codexState) {
    const out = [];

    for (const id of codexState.unlocked) {
        const entry = codexState.entries[id];
        if (!entry) continue;

        out.push({
            id: entry.id,
            title: entry.title,
            text: entry.text,
            category: entry.category
        });
    }

    return out;
}

/* ---------------- CATEGORY FILTER ---------------- */

export function renderCodexByCategory(codexState, category) {
    const out = [];

    for (const id of codexState.unlocked) {
        const entry = codexState.entries[id];
        if (!entry) continue;

        if (entry.category === category) {
            out.push({
                id: entry.id,
                title: entry.title,
                text: entry.text
            });
        }
    }

    return out;
}

/* ---------------- MAIN CODEX TICK ---------------- */

export function codexTick(codexState, tickData) {
    for (const w of tickData.warnings) {
        unlockCodex(codexState, w.id);
    }

    for (const d of tickData.disasters) {
        unlockCodex(codexState, d.id);
    }

    if (tickData.favour) {
        unlockCodex(codexState, "time_favour");
        unlockCodex(codexState, "chaos_tolerance");
        unlockCodex(codexState, "destiny_judgement");

        if (tickData.favour.twilight) {
            unlockCodex(codexState, "twilight_mode");
        }
    }

    return renderCodex(codexState);
}
