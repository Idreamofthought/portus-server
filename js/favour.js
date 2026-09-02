/* ============================================================
   FAVOUR MODULE — Portus
   Expanded version: Time, Chaos, Destiny, Twilight Mode,
   Blessings, Penalties, Rituals, Offerings, Codex unlocks,
   Disaster influence, Seasonal influence, Payment hooks.
   ============================================================ */

/* ---------------- INITIAL STATE ---------------- */

export function initFavourState() {
    return {
        timeFavour: 40,        // 0–100
        chaosTolerance: 40,    // 0–100
        destinyJudgement: 40,  // 0–100

        twilightMode: false,
        twilightProgress: 0,   // 0–100

        ritualCooldowns: {},   // { ritualId: ticksLeft }
        lastOfferingTick: 0,

        codexUnlocks: new Set()
    };
}

/* ---------------- BASIC MODIFIERS ---------------- */

export function addTimeFavour(state, amt) {
    state.timeFavour = Math.min(100, state.timeFavour + amt);
}

export function reduceTimeFavour(state, amt) {
    state.timeFavour = Math.max(0, state.timeFavour - amt);
}

export function addChaosTolerance(state, amt) {
    state.chaosTolerance = Math.min(100, state.chaosTolerance + amt);
}

export function reduceChaosTolerance(state, amt) {
    state.chaosTolerance = Math.max(0, state.chaosTolerance - amt);
}

export function addDestinyJudgement(state, amt) {
    state.destinyJudgement = Math.min(100, state.destinyJudgement + amt);
}

export function reduceDestinyJudgement(state, amt) {
    state.destinyJudgement = Math.max(0, state.destinyJudgement - amt);
}

/* ---------------- OFFERINGS ---------------- */

export function performOffering(state, res, offering) {
    // offering = { cost:{}, effects:{time:?, chaos:?, destiny:?} }

    // Check cost
    for (const [k, v] of Object.entries(offering.cost)) {
        if ((res[k] || 0) < v) return false;
    }

    // Pay cost
    for (const [k, v] of Object.entries(offering.cost)) {
        res[k] -= v;
    }

    // Apply effects
    if (offering.effects.time) addTimeFavour(state, offering.effects.time);
    if (offering.effects.chaos) addChaosTolerance(state, offering.effects.chaos);
    if (offering.effects.destiny) addDestinyJudgement(state, offering.effects.destiny);

    state.lastOfferingTick = state.tickCount || 0;

    return true;
}

/* ---------------- RITUALS ---------------- */

export const RITUALS = {
    "ritual_light": {
        name: "Ritual of Light",
        desc: "Restore Time and soften Chaos.",
        cooldown: 300,
        effects: { time: 8, chaos: 5, destiny: 0 },
        cost: { scrolls: 4, pottery: 2 }
    },

    "ritual_order": {
        name: "Ritual of Order",
        desc: "Reduce Chaos and increase Destiny.",
        cooldown: 400,
        effects: { time: 0, chaos: 10, destiny: 6 },
        cost: { tools: 3, pottery: 3 }
    },

    "ritual_fate": {
        name: "Ritual of Fate",
        desc: "Increase Destiny and Time.",
        cooldown: 500,
        effects: { time: 6, chaos: 0, destiny: 12 },
        cost: { gold: 2, scrolls: 3 }
    }
};

export function canPerformRitual(state, ritualId) {
    const r = RITUALS[ritualId];
    if (!r) return false;

    const cd = state.ritualCooldowns[ritualId] || 0;
    return cd <= 0;
}

export function performRitual(state, res, ritualId) {
    const r = RITUALS[ritualId];
    if (!r) return false;

    if (!canPerformRitual(state, ritualId)) return false;

    // Check cost
    for (const [k, v] of Object.entries(r.cost)) {
        if ((res[k] || 0) < v) return false;
    }

    // Pay cost
    for (const [k, v] of Object.entries(r.cost)) {
        res[k] -= v;
    }

    // Apply effects
    if (r.effects.time) addTimeFavour(state, r.effects.time);
    if (r.effects.chaos) addChaosTolerance(state, r.effects.chaos);
    if (r.effects.destiny) addDestinyJudgement(state, r.effects.destiny);

    // Set cooldown
    state.ritualCooldowns[ritualId] = r.cooldown;

    return true;
}

/* ---------------- COOLDOWN TICK ---------------- */

export function favourTickCooldowns(state) {
    for (const id of Object.keys(state.ritualCooldowns)) {
        state.ritualCooldowns[id] = Math.max(0, state.ritualCooldowns[id] - 1);
    }
}

/* ---------------- BLESSINGS ---------------- */

export function checkBlessings(state, res) {
    const out = [];

    if (state.destinyJudgement > 80) {
        // Small blessing: random resource
        const keys = ["wheat","fish","wood","stone","tools"];
        const k = keys[Math.floor(Math.random() * keys.length)];
        res[k] += 2;
        out.push(`Blessing of Destiny: +2 ${k}`);
    }

    if (state.timeFavour > 85 && !state.twilightMode) {
        out.push("Blessing of Time: production stability increased");
    }

    if (state.chaosTolerance > 75) {
        out.push("Blessing of Order: disasters softened");
    }

    return out;
}

/* ---------------- PENALTIES ---------------- */

export function checkPenalties(state) {
    const out = [];

    if (state.timeFavour < 15) {
        out.push("Time is thinning. Twilight approaches.");
        state.twilightProgress += 1.5;
    }

    if (state.chaosTolerance < 20) {
        out.push("Chaos stirs. Disasters intensify.");
    }

    if (state.destinyJudgement < 20) {
        out.push("The gods judge your city harshly.");
        state.twilightProgress += 1;
    }

    return out;
}

/* ---------------- TWILIGHT MODE ---------------- */

export function enterTwilightMode(state) {
    state.twilightMode = true;
    state.twilightProgress = 100;
}

export function exitTwilightMode(state) {
    state.twilightMode = false;
    state.twilightProgress = 0;
    state.timeFavour = Math.max(20, state.timeFavour);
}

export function twilightTick(state) {
    if (!state.twilightMode) return;

    // Twilight drains Time and Destiny
    reduceTimeFavour(state, 0.5);
    reduceDestinyJudgement(state, 0.3);

    // Twilight increases Chaos
    addChaosTolerance(state, 0.2);

    // Twilight slowly ends if Time is restored
    if (state.timeFavour > 40) {
        exitTwilightMode(state);
    }
}

/* ---------------- DISASTER INFLUENCE ---------------- */

export function disasterInfluence(state, disasterSeverity) {
    // disasterSeverity = "minor" | "medium" | "major"

    if (disasterSeverity === "minor") {
        reduceChaosTolerance(state, 2);
        reduceDestinyJudgement(state, 1);
    }

    if (disasterSeverity === "medium") {
        reduceChaosTolerance(state, 5);
        reduceDestinyJudgement(state, 3);
        reduceTimeFavour(state, 2);
    }

    if (disasterSeverity === "major") {
        reduceChaosTolerance(state, 10);
        reduceDestinyJudgement(state, 6);
        reduceTimeFavour(state, 6);
        state.twilightProgress += 4;
    }
}

/* ---------------- SEASONAL INFLUENCE ---------------- */

export function seasonalInfluence(state, season) {
    // season = "spring" | "summer" | "autumn" | "winter"

    if (season === "spring") {
        addDestinyJudgement(state, 2);
    }

    if (season === "summer") {
        addTimeFavour(state, 2);
    }

    if (season === "autumn") {
        reduceChaosTolerance(state, 2);
    }

    if (season === "winter") {
        reduceTimeFavour(state, 3);
        reduceDestinyJudgement(state, 2);
    }
}

/* ---------------- CODEX UNLOCKS ---------------- */

export function unlockCodex(state, entryId) {
    state.codexUnlocks.add(entryId);
}

export function hasCodexEntry(state, entryId) {
    return state.codexUnlocks.has(entryId);
}

/* ---------------- MAIN FAVOUR TICK ---------------- */

export function favourTick(state, res, season) {
    // Cooldowns
    favourTickCooldowns(state);

    // Seasonal influence
    seasonalInfluence(state, season);

    // Blessings
    const blessings = checkBlessings(state, res);

    // Penalties
    const penalties = checkPenalties(state);

    // Twilight
    twilightTick(state);

    return { blessings, penalties };
}
