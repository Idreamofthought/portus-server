/* ============================================================
   RESEARCH MODULE — Portus
   Handles tech definitions, progress, unlocking, and tick updates.
   ============================================================ */

/* ---------------- TECH DEFINITIONS ---------------- */

export const TECHS = [
    {
        id: "agriculture",
        name: "Agriculture",
        desc: "Unlocks Farms. +10% food production.",
        cost: { wood: 20, food: 10 },
        unlocksBuildings: ["farm"],
        apply(state) {
            state.research.bonus.food += 0.10;
        }
    },

    {
        id: "masonry",
        name: "Masonry",
        desc: "Unlocks Quarry. +10% stone production.",
        cost: { wood: 10, stone: 20 },
        unlocksBuildings: ["quarry"],
        apply(state) {
            state.research.bonus.stone += 0.10;
        }
    },

    {
        id: "forestry",
        name: "Forestry",
        desc: "Unlocks Lumberyard. +10% wood production.",
        cost: { wood: 30 },
        unlocksBuildings: ["lumberyard"],
        apply(state) {
            state.research.bonus.wood += 0.10;
        }
    }
];

/* ---------------- INDEX ---------------- */

export const TECH_BY_ID = Object.fromEntries(TECHS.map(t => [t.id, t]));

/* ============================================================
   INITIAL RESEARCH STATE
   ============================================================ */

export function initResearch() {
    return {
        points: 0,
        current: null,          // tech ID being researched
        progress: 0,            // 0 → cost
        unlocked: [],           // completed tech IDs
        bonus: {                // production bonuses
            wood: 0,
            stone: 0,
            food: 0
        }
    };
}

/* ============================================================
   START RESEARCH
   ============================================================ */

export function startResearch(state, techId) {
    const tech = TECH_BY_ID[techId];
    if (!tech) return false;

    if (state.research.unlocked.includes(techId)) return false;

    state.research.current = techId;
    state.research.progress = 0;

    return true;
}

/* ============================================================
   RESEARCH TICK
   ============================================================ */

export function updateResearch(state) {
    const R = state.research;

    // No active research
    if (!R.current) return;

    const tech = TECH_BY_ID[R.current];
    if (!tech) return;

    // Gain research points per tick
    R.points += 1;

    // Apply favour bonus (if favour.js exists)
    if (state.favour) {
        R.points += state.favour.value * 0.01;
    }

    // Progress increases with points
    R.progress += R.points * 0.05;

    // Completed?
    const totalCost = Object.values(tech.cost).reduce((a, b) => a + b, 0);

    if (R.progress >= totalCost) {
        completeResearch(state, tech.id);
    }
}

/* ============================================================
   COMPLETE RESEARCH
   ============================================================ */

export function completeResearch(state, techId) {
    const tech = TECH_BY_ID[techId];
    if (!tech) return;

    const R = state.research;

    // Mark as unlocked
    R.unlocked.push(techId);

    // Apply bonuses
    tech.apply(state);

    // Unlock buildings
    if (!state.buildingsUnlocked) state.buildingsUnlocked = [];
    for (const b of tech.unlocksBuildings) {
        state.buildingsUnlocked.push(b);
    }

    // Notify UI
    if (state.ui && state.ui.notifications) {
        state.ui.notifications.push({
            msg: `Research completed: ${tech.name}`,
            type: "success",
            time: Date.now()
        });
    }

    // Reset current research
    R.current = null;
    R.progress = 0;
    R.points = 0;
}

/* ============================================================
   LIST AVAILABLE TECHS
   ============================================================ */

export function listAvailableTechs(state) {
    return TECHS.filter(t => !state.research.unlocked.includes(t.id));
}

/* ============================================================
   UI DISPLAY INFO
   ============================================================ */

export function getResearchDisplayInfo(state) {
    const R = state.research;

    return TECHS.map(t => ({
        id: t.id,
        name: t.name,
        desc: t.desc,
        cost: t.cost,
        unlocked: R.unlocked.includes(t.id),
        researching: R.current === t.id,
        progress: R.current === t.id ? R.progress : 0
    }));
}
