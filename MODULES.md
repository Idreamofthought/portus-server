# Portus Modules

The live browser game is served from a single file: `protected/game.html`.
It contains the map generator, building catalogue, economy tick, research
tree, quests, disasters, and save/load logic inline in one script, plus the
paywall/auth UI that talks to the server API. There is no separate
client-side module split in production — `protected/game.html` is the
source of truth for gameplay logic.

## Server Modules

### `server.js`

Express entry point. Configures security headers, CORS, cookies, JSON parsing, static mounts, page routes, account routes, access control, saves, payments, and webhooks. Serves `protected/game.html` at `/game` behind auth/paywall middleware.

### `auth.js`

Normalizes credentials, hashes passwords and tokens, issues and verifies sessions, and revokes sessions.

### `middleware.js`

Defines CSRF validation, authentication gates, paid/verified access gates, and rate limiters.

### `payments.js`

Creates and captures PayPal orders, creates Stripe Checkout sessions, verifies payment webhooks, and credits purchases idempotently.

### `products.js`

Single source of truth for purchasable time passes and their amounts, currencies, and durations.

### `database2.js`

Opens the SQLite database, applies the database schema/migrations, and cleans up expired sessions or tokens.

### `email.js` and `resend.js`

Construct verification and reset messages and send them through the configured Resend client.

### `data/discovery_catalog.js`

Shared artifact/archaeological-find catalogue and per-activity discovery odds, used by the `/api/discoveries*` routes in `server.js`.

## Client Account/Payment Pages

`public/login.js`, `public/signup.js`, `public/reset-request.js`, `public/reset-password.js`, `public/change-password.js`, `public/settings.js`, and `public/purchase.js` connect the corresponding forms to the server API via `public/app.js`.

### `public/app.js`

Same-origin browser API client. Fetches and caches CSRF tokens, sends credentials, and exposes JSON GET, POST, PUT, DELETE, and current-user helpers.

## State Shape

The client game state in `protected/game.html` is a set of module-level variables (`res`, `cap`, `pop`, `happiness`, `boats`, `coin`, `research`, `unlockedTechs`, `techBonus`, `military`, `taxRate`, `scenarioId`, `questsCompleted`, `grid`, `placedBuildings`, ...). `getState()`/`applyState()` serialize and restore this for offline save codes and cloud saves.

## Historical Note

Earlier drafts of this document described a modular client split (`public/main.js`, `game.js`, `map.js`, `buildings.js`, `resources.js`, `research.js`, `favour.js`, `disasters.js`, `warnings.js`, `codex.js`, `ui.js`, `sound.js`, `sound-manager.js`, `helpers.js`, `time.js`) and a set of Express routes under `routes/` (`buildings.js`, `disasters.js`, `favour.js`, `research.js`, `resources.js`, `time.js`, `warnings.js`). None of those client files exist, and the routes were empty stubs never imported by `server.js` — they have been removed. If that modular architecture is revived, update this file to match what actually exists.


Keep new game data inside this state object. Avoid module-level mutable gameplay state unless it is an intentional world-level cache.

## Extension Pattern

1. Create a focused module under `public/`.
2. Export initialization and update functions.
3. Initialize the system in `public/main.js`.
4. Add rendering in `public/ui.js` if the player needs to see it.
5. Keep placement and economy rules deterministic and testable outside the DOM where possible.
