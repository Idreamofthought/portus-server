/* ============================================================
   FAVOUR MODULE — Portus
   Handles divine favour, twilight mode, blessings, penalties,
   and integration with disasters and research.
   ============================================================ */

import { queueNotification } from "./ui.js";

/* ============================================================
   INITIAL FAVOUR STATE
   ============================================================ */

export function initFavour() {
    return {
        value: 10,              // base favour
        chaosTolerance: 10,     // reduces disaster severity
        destinyJudgement: 10,   // affects blessings / penalties

        twilightMode: false,
        twilightProgress: 0,

        lastOfferingTime: 0,
        ritualCooldown: 0
    };
}

/* ============================================================
   ADD / REDUCE FAVOUR
   ============================================================ */

export function addFavour(state, amount) {
    state.favour.value += amount;
    if (state.favour.value > 100) state.favour.value = 100;
}

export function reduceFavour(state, amount) {
    state.favour.value -= amount;
    if (state.favour.value < 0) state.favour.value = 0;
}

/* ============================================================
   OFFERINGS (player action)
   ============================================================ */

export function performOffering(state) {
    const F = state.favour;

    // Offering cost
    if (state.resources.food < 5) {
        pushNotification(state, "Not enough food for offering", "warning");
        return false;
    }

    state.resources.food -= 5;
    addFavour(state, 5);

    F.lastOfferingTime = state.tick;

    pushNotification(state, "The gods accept your offering", "success");
    return true;
}

/* ============================================================
   RITUALS (stronger action)
   ============================================================ */

export function performRitual(state) {
    const F = state.favour;

    if (F.ritualCooldown > 0) {
        pushNotification(state, "Ritual is on cooldown", "warning");
        return false;
    }

    if (state.resources.wood < 20 || state.resources.stone < 10) {
        pushNotification(state, "Not enough resources for ritual", "warning");
        return false;
    }

    state.resources.wood -= 20;
    state.resources.stone -= 10;

    addFavour(state, 15);
    F.chaosTolerance += 5;
    F.destinyJudgement += 5;

    F.ritualCooldown = 300; // 300 ticks cooldown

    pushNotification(state, "A powerful ritual strengthens the world", "success");
    return true;
}

/* ============================================================
   TWILIGHT MODE
   ============================================================ */

export function enterTwilightMode(state) {
    const F = state.favour;

    if (F.twilightMode) return;

    F.twilightMode = true;
    F.twilightProgress = 0;

    pushNotification(state, "Twilight descends upon the world...", "danger");
}

export function exitTwilightMode(state) {
    const F = state.favour;

    if (!F.twilightMode) return;

    F.twilightMode = false;
    F.twilightProgress = 0;

    pushNotification(state, "The world returns to balance", "success");
}

/* ============================================================
   TWILIGHT TICK
   ============================================================ */

function twilightTick(state) {
    const F = state.favour;

    if (!F.twilightMode) return;

    F.twilightProgress += 0.5;

    // Twilight penalties
    reduceFavour(state, 0.1);

    if (F.twilightProgress >= 100) {
        pushNotification(state, "Twilight consumes the land!", "danger");
        // Trigger major disaster
        if (state.disasters) {
            state.disasters.forceMajor = true;
        }
        F.twilightProgress = 0;
    }
}

/* ============================================================
   BLESSINGS & PENALTIES
   ============================================================ */

function checkBlessings(state) {
    const F = state.favour;

    if (F.destinyJudgement > 80 && Math.random() < 0.01) {
        addFavour(state, 5);
        pushNotification(state, "A divine blessing improves your lands", "success");
    }
}

function checkPenalties(state) {
    const F = state.favour;

    if (F.value < 10 && Math.random() < 0.02) {
        reduceFavour(state, 2);
        pushNotification(state, "The gods are displeased...", "warning");
    }
}

/* ============================================================
   UPDATE FAVOUR (called every tick)
   ============================================================ */

export function updateFavour(state) {
    const F = state.favour;

    // Natural decay
    reduceFavour(state, 0.005);

    // Twilight check
    if (F.value <= 0 || F.destinyJudgement <= 0) {
        enterTwilightMode(state);
    }

    twilightTick(state);

    // Blessings / penalties
    checkBlessings(state);
    checkPenalties(state);

    // Ritual cooldown
    if (F.ritualCooldown > 0) F.ritualCooldown--;
}

/* ============================================================
   UI NOTIFICATION HELPER
   ============================================================ */

function pushNotification(state, msg, type = "info") {
    if (!state.ui || !state.ui.notifications) return;

    queueNotification(state, msg, type);
}
