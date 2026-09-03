/* ============================================================
   WARNINGS MODULE — Portus
   Detects low resources, environmental risks, favour issues,
   and sends alerts to the UI.
   ============================================================ */

/* ============================================================
   INITIAL WARNING STATE
   ============================================================ */

export function initWarnings() {
    return {
        alerts: [],
        cooldown: 0
    };
}

/* ============================================================
   PUSH WARNING
   ============================================================ */

function pushWarning(state, message, severity = "low") {
    const W = state.warnings;

    W.alerts.push({
        message,
        severity,
        tick: state.tick
    });

    if (W.alerts.length > 20) {
        W.alerts.shift();
    }

    // UI notification
    if (state.ui && state.ui.notifications) {
        state.ui.notifications.push({
            msg: message,
            type: severity === "high" ? "danger" : "warning",
            time: Date.now()
        });
    }
}

/* ============================================================
   RESOURCE WARNINGS
   ============================================================ */

function checkResourceWarnings(state) {
    const R = state.resources;

    if (R.wood < 5) {
        pushWarning(state, "Wood reserves critically low", "high");
    } else if (R.wood < 15) {
        pushWarning(state, "Wood reserves running low");
    }

    if (R.stone < 5) {
        pushWarning(state, "Stone reserves critically low", "high");
    } else if (R.stone < 15) {
        pushWarning(state, "Stone reserves running low");
    }

    if (R.food < 5) {
        pushWarning(state, "Food reserves critically low", "high");
    } else if (R.food < 15) {
        pushWarning(state, "Food reserves running low");
    }
}

/* ============================================================
   FAVOUR WARNINGS
   ============================================================ */

function checkFavourWarnings(state) {
    const F = state.favour;

    if (F.value < 5) {
        pushWarning(state, "The gods are nearly silent", "high");
    } else if (F.value < 15) {
        pushWarning(state, "Divine favour is weakening");
    }

    if (F.twilightMode) {
        pushWarning(state, "Twilight spreads across the land", "high");
    }
}

/* ============================================================
   ENVIRONMENT WARNINGS
   ============================================================ */

function checkEnvironmentWarnings(state) {
    const grid = state.grid;

    let forestCount = 0;
    let seaCount = 0;

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const tile = grid[y][x];

            if (tile.terrain === "forest") forestCount++;
            if (tile.terrain === "sea" || tile.terrain === "river") seaCount++;
        }
    }

    if (forestCount < 20) {
        pushWarning(state, "Forests thinning — risk of ecological collapse");
    }

    if (seaCount > 80) {
        pushWarning(state, "Coastal flooding risk increasing");
    }
}

/* ============================================================
   DISASTER WARNINGS
   ============================================================ */

function checkDisasterWarnings(state) {
    const D = state.disasters;

    if (D.cooldown === 0) return;

    if (D.cooldown < 30) {
        pushWarning(state, "Disaster activity rising", "high");
    }
}

/* ============================================================
   UPDATE WARNINGS (called every tick)
   ============================================================ */

export function updateWarnings(state) {
    const W = state.warnings;

    // Cooldown to avoid spam
    if (W.cooldown > 0) {
        W.cooldown--;
        return;
    }

    // Clear old alerts
    W.alerts = [];

    // Run checks
    checkResourceWarnings(state);
    checkFavourWarnings(state);
    checkEnvironmentWarnings(state);
    checkDisasterWarnings(state);

    // Set cooldown
    W.cooldown = 60; // one warning cycle per 60 ticks
}
