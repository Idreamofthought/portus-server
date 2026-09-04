# Portus Modules

Portus keeps browser game systems in `public/` and server infrastructure at the repository root. The browser entry point is `public/main.js`.

## Browser Modules

### `public/main.js`

Application orchestrator. Creates the game state, initializes resources, research, favour, disasters, warnings, codex, UI, and sound, then owns the canvas render loop and pointer/camera input.

### `public/game.js`

Core game state and placement engine. Exports `initGame`, `placeBuilding`, and `startGameLoop`. Placement validates bounds, building IDs, terrain, and occupancy.

### `public/map.js`

Generates and queries the world grid. The current world is 50 columns by 33 rows with 24x24 tiles. Provides bounds, neighbor, terrain, deposit, and nearby-building helpers.

### `public/buildings.js`

Building catalogue and placement/effect helpers. Defines building IDs, names, categories, costs, workers, terrain rules, production, consumption, and special effects.

### `public/resources.js`

Initializes resources and provides resource reads, additions, consumption, cost checks, spending, and production updates.

### `public/research.js`

Defines technology entries, starts and advances research, completes unlocks, applies bonuses, and exposes research display data.

### `public/favour.js`

Models mystical influence. Handles favour changes, offerings, rituals, twilight mode, and periodic updates.

### `public/disasters.js`

Defines disaster types, initializes disaster state, and triggers random events that affect the settlement.

### `public/warnings.js`

Builds alerts from resource, environment, favour, and disaster conditions. Warnings also feed the notification UI.

### `public/codex.js`

Stores lore entries, unlocks codex records, filters by category, updates codex state, and renders codex content.

### `public/ui.js`

Builds the building toolbar, audio controls, panel controls, notifications, resource ledger, research, codex, warnings, disasters, and favour views.

### `public/sound.js`

Provides browser Web Audio for the quiet inharmonic ambient bed and building-specific placement tones. Ambient music starts after a user gesture to comply with autoplay policies.

### `public/sound-manager.js`

Legacy file-based sound manager retained for older integrations. New game audio uses `sound.js`.

### `public/time.js`

Contains the expanded time-state and tick implementation used by the older system path, including seasons, favour, production, disasters, and warnings.

### `public/helpers.js`

Small deterministic utilities: random values, clamping, array choice, and distance calculations.

### `public/app.js`

Same-origin browser API client. Fetches and caches CSRF tokens, sends credentials, and exposes JSON GET, POST, PUT, DELETE, and current-user helpers.

### Account and payment clients

`public/login.js`, `public/signup.js`, `public/reset-request.js`, `public/reset-password.js`, `public/change-password.js`, `public/settings.js`, and `public/purchase.js` connect the corresponding forms to the server API.

## Server Modules

### `server.js`

Express entry point. Configures security headers, CORS, cookies, JSON parsing, static mounts, page routes, account routes, access control, saves, payments, and webhooks.

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

## State Shape

The active game state is created by `initGame()` and extended by `main.js`:

```text
state
  tick
  grid
  ui
  resources
  research
  favour
  disasters
  warnings
  codex
```

Keep new game data inside this state object. Avoid module-level mutable gameplay state unless it is an intentional world-level cache.

## Extension Pattern

1. Create a focused module under `public/`.
2. Export initialization and update functions.
3. Initialize the system in `public/main.js`.
4. Add rendering in `public/ui.js` if the player needs to see it.
5. Keep placement and economy rules deterministic and testable outside the DOM where possible.
