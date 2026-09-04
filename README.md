# Portus - A Dreamlike City-Building Experience

Portus is a surreal, atmospheric city-building game where the player shapes a drifting settlement suspended between dream and memory. The game blends pixel-art terrain with soft, mystical UI elements to create a quiet and contemplative experience.

This repository contains the full Portus server, including the public game client, homepage, authentication, payments, protected game mode, dreamlike UI, and modular resource, research, favour, disaster, warning, and codex systems.

## Features

### Dreamlike UI

- Translucent panels and blurred glass effects
- Soft glowing borders and atmospheric resource ledger
- Serif typography and floating glyph-style buttons
- Portus wordmark and inharmonic ambient soundscape

### Pixel-Art World

- 24px terrain tiles on a 50x33 map
- Grass, forest, mountain, river, sea, sand, and resource deposits
- Camera movement by dragging and zoom controls
- Building placement with terrain validation and distinct placement sounds
- Dynamic rendering and resource update loop

### Game Systems

Each system is modular and initialized through `public/main.js`:

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

```text
/homepage
	index.html
	about.html
	contact.html
	portus-info.html

/public
	index.html             game entry point
	main.js                game orchestration
	game.js                placement and loop
	ui.js                  HUD and panels
	resources.js           resource state and production
	research.js            research system
	favour.js              favour system
	disasters.js           disaster system
	warnings.js            warning system
	codex.js               lore system
	sound.js               ambient and placement audio
	/css/game.css          dreamlike UI styles

/protected
	game.html              paid game mode

server.js                 HTTP routes and startup
auth.js                   sessions and password hashing
middleware.js             security middleware and access gates
payments.js               Stripe and PayPal logic
products.js               commercial catalogue
database2.js              SQLite access and migrations
resend.js                 email delivery


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

## Deployment

Portus is deployed on Railway. The server exposes:

```text
/                    homepage
/public              public assets
/portus              game client, served from /public
/protected/game      paid game mode
```

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
