/* ============================================================
   RESEARCH MODULE — Portus
   Full extraction: tech catalogue, unlock logic, cost validation,
   application of bonuses, and state integration.
   ============================================================ */

/* ---------------- TECH CATALOGUE ---------------- */

export const TECHS = [

    {
        id: 'irrigation',
        name: 'Irrigation',
        desc: '+25% field yield',
        cost: 8,
        apply: (state) => { state.techBonus.field *= 1.25; }
    },

    {
        id: 'masonry',
        name: 'Masonry',
        desc: '+25% quarry output',
        cost: 8,
        apply: (state) => { state.techBonus.quarry *= 1.25; }
    },

    {
        id: 'seafaring',
        name: 'Seafaring',
        desc: '+25% fish catch',
        cost: 10,
        apply: (state) => { state.techBonus.fish *= 1.25; }
    },

    {
        id: 'metallurgy',
        name: 'Metallurgy',
        desc: '+25% foundry refining',
        cost: 14,
        apply: (state) => { state.techBonus.foundry *= 1.25; }
    },

    {
        id: 'currency',
        name: 'Currency',
        desc: '+30% trade income from markets',
        cost: 16,
        apply: (state) => { state.techBonus.trade *= 1.3; }
    }

];

/* ---------------- INDEX ---------------- */

export const TECH_BY_ID = Object.fromEntries(TECHS.map(t => [t.id, t]));

/* ---------------- STATE INITIALIZATION ---------------- */

export function initResearchState() {
    return {
        research: 0,              // banked research points
        unlockedTechs: new Set(), // unlocked tech IDs
        techBonus: {              // production multipliers
            field: 1,
            quarry: 1,
            fish: 1,
            foundry: 1,
            trade: 1
        }
    };
}

/* ---------------- ACCESSORS ---------------- */

export function getTechDefinition(id) {
    return TECH_BY_ID[id] || null;
}

export function listAvailableTechs(state) {
    return TECHS.filter(t => !state.unlockedTechs.has(t.id));
}

export function listUnlockedTechs(state) {
    return TECHS.filter(t => state.unlockedTechs.has(t.id));
}

/* ---------------- VALIDATION ---------------- */

export function canResearch(state, id) {
    const tech = TECH_BY_ID[id];
    if (!tech) return false;
    if (state.unlockedTechs.has(id)) return false;
    return state.research >= tech.cost;
}

/* ---------------- UNLOCK ---------------- */

export function unlockTech(state, id) {
    const tech = TECH_BY_ID[id];
    if (!tech) return false;

    if (!canResearch(state, id)) return false;

    // Pay research points
    state.research -= tech.cost;

    // Unlock
    state.unlockedTechs.add(id);

    // Apply effect
    tech.apply(state);

    return true;
}

/* ---------------- RESEARCH POINTS ---------------- */

export function addResearchPoints(state, amount) {
    state.research += amount;
}

/* ---------------- UI HELPERS ---------------- */

export function getTechDisplayInfo(state) {
    return TECHS.map(t => ({
        id: t.id,
        name: t.name,
        desc: t.desc,
        cost: t.cost,
        unlocked: state.unlockedTechs.has(t.id),
        affordable: state.research >= t.cost
    }));
}
