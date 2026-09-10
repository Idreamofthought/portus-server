- A Dreamlike City-Building Experience

Portus is a surreal, atmospheric city-building game where the player shapes a drifting settlement suspended between dream and memory. The game blends pixel-art terrain with soft, mystical UI elements to create a quiet and contemplative experience.

This repository contains the full Portus server, including the public game client, homepage, authentication, payments, protected game mode, dreamlike UI, and modular resource, research, favour, disaster, warning, and codex systems.

## Features

### Dreamlike UI

- Translucent panels and blurred glass effects
- Soft glowing borders and atmospheric resource ledger
- Serif typography and floating glyph-style buttons
- Portus wordmark and inharmonic ambient soundscape

### Pixel-Art World (24x24 Tiles)

- 24x24 terrain tiles on a 50x33 map
- Grass, forest, mountain, river, sea, sand, and resource deposits
- Camera movement by dragging and zoom controls
- Building placement with terrain validation and distinct placement sounds
- Dynamic rendering and resource update loop

### Game Systems

The game client and server currently expose these systems:

- **Resources** - wood, stone, food, and gold
- **Research** - research progress and unlocks
- **Favour** - mystical influence and twilight state
- **Disasters** - random events that challenge the settlement
- **Warnings** - prophetic messages and resource alerts
- **Codex** - lore and world knowledge

### Authentication and Payments

- Email signup and verification
- Login, logout, password reset, and account controls
- CSRF protection and rate limiting
- Stripe and PayPal checkout
- PayPal capture webhook with signature verification and duplicate protection
- Time-based access system and protected `/game` route

## Project Structure

`public/` is the live static client location mounted by Express. There is no root
`js/` client tree in the current repository.

```text
.
├── server.js, auth.js, middleware.js, email.js, resend.js
├── payments.js, products.js, database2.js
├── public/                         served frontend and game client
│   ├── *.html                      auth, payment, legal, and entry pages
│   ├── *.js                        page-specific client modules
│   ├── shared.css                  shared auth and account styles
│   ├── images/                     optimized site images
│   └── sounds/                     canonical sound assets
├── protected/                      server-routed game pages
│   ├── game.html
│   ├── codex.html
│   ├── lore.html
│   └── prologue.html
├── homepage/                       public site and writing tree
├── css/                            shared homepage and protected-page styles
├── lore/                           index for Portus worldbuilding sources
├── routes/                         authenticated player-state APIs
├── models/                         persistence helpers
├── migrations/                     explicit SQLite migrations
├── jest.config.js                  Jest integration-test configuration
├── test/                            unit, sandbox, and integration tests
│   └── integration/                 authenticated API and webhook coverage
├── API.md, MODULES.md, UI-GUIDE.md
├── MIGRATION-PLAN.md, WORLD-DESIGN.md
└── validate-structure.js           non-destructive layout checks
```

See [lore/README.md](lore/README.md) for the Portus content map and
[ROADMAP.md](ROADMAP.md) for planned work.

### Lore Structure

The lore index provides a stable home for the main worldbuilding strands:

```text
lore/
├── codex/
├── prologue/
├── world/
├── myths/
├── disasters/
└── fragments/
```

The current Portus source remains in `portus/` while these categories are
expanded and connected to the public site and in-game Codex.


## Running Locally

Install dependencies:

```bash
npm install
```

Copy `.env.example` to `.env` and supply real values. Never commit `.env`.

Start the server:

```bash
npm start
```

The server runs at `http://localhost:8080`. The game is available at `http://localhost:8080/portus/`.

For local development, set `NODE_ENV=development` and use an HTTP `SITE_URL`, such as `http://localhost:8080`.

## Testing

Run the default Node test suite:

```bash
npm test
```

Run the authenticated API and webhook integration suite with Jest:

```bash
npm run test:integration
```

The launch sandbox test is opt-in because it exercises the deployed-style
launch flow:

```bash
npm run test:launch-sandbox
```

Run the non-destructive repository structure check:

```bash
npm run validate:structure
```

## Deployment

Portus is deployed on Railway. The server exposes:

```text
/                    homepage
/public              public assets
/portus              game client, served from /public
/protected/game      paid game mode
```

Railway checks the `/health` endpoint and runs one replica in the configured
`us-east4-eqdc4a` region. Deployment settings are stored in `railway.json`.

The Portus client is mounted with:

```js
app.use("/portus", express.static(path.join(__dirname, "public")));
```

## PayPal Webhook

Create a webhook in the PayPal Developer Dashboard for the same app credentials used by the server. Set the URL to:

```text
https://www.idreamofthought.org/api/webhooks/paypal
```

Subscribe to `PAYMENT.CAPTURE.COMPLETED`, then copy the webhook ID into `PAYPAL_WEBHOOK_ID` in the deployment environment. The endpoint verifies PayPal's transmission signature, credits only matching pending orders, and safely ignores duplicate delivery events. For local testing, expose the server through an HTTPS tunnel and use that tunnel URL instead of `localhost`.

## Gameplay Overview

### Start

Enter a drifting dream-realm and begin shaping a settlement tile by tile.

### Build

Each building has placement rules, resource costs, and effects on the world. Invalid placements are rejected with gentle feedback. Successful construction plays a building-specific sound.

### Grow

Resources update continuously and appear in the floating ledger: wood, stone, food, and gold.

### Discover

The Codex reveals lore, research unlocks new abilities, warnings whisper prophetic hints, disasters challenge the settlement, and Favour influences mystical outcomes.

## Dreamlike UI Philosophy

The UI is soft, surreal, floating, translucent, quiet, and contemplative. It draws on mist, moonlight, blurred glass, drifting memories, and lucid dreams while the canvas remains pixel art.

## Before Production

1. Configure `JWT_SECRET`, Resend, Stripe, and PayPal credentials.
2. Register both payment webhooks.
3. Confirm final pricing, currency, and legal wording.
4. Replace draft legal and contact text.
5. Test signup, verification, login, purchase, game access, save/load, and expiry.
6. Migrate the legacy PayPal SDK to `@paypal/paypal-server-sdk`.

## Daydream Housekeeping Robot

This repository includes **Daydream**, a small GitHub-native housekeeping robot
built from configuration and workflows in `.github/`:

- `housekeeping.yml` syncs housekeeping labels, runs stale issue and pull-request
  handling each day, and runs a weekly repository structure audit with the
  existing `npm run validate:structure` script.
- `issue-triage.yml` keeps a `needs-triage` label on issues that do not yet have
  one of the main classification labels.
- `ISSUE_TEMPLATE/*.yml` auto-apply the default GitHub labels for bug reports,
  feature requests, and questions.
- `stale.yml` and `housekeeping.json` hold the main knobs for adjusting timing,
  synced labels, and triage behavior.

The defaults are intentionally conservative: blank issues remain allowed, stale
conversations get a warning before closing, draft pull requests are exempt, and
milestoned work is never auto-closed.

## Structure Validation

Run the non-destructive consistency check with:

```bash
npm run validate:structure
```

It checks required directories and reports any legacy paths that need review.
