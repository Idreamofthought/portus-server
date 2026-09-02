/* ============================================================
   HELPERS MODULE — Portus
   Shared utilities for map, buildings, and game logic.
   ============================================================ */

export function rnd(n) {
    return Math.floor(Math.random() * n);
}

export function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

export function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}
