# Portus 2.0 — cleaned build

This is the first consolidation pass over the uploaded Portus project.

## What changed

- `server.js` is now the application entry point rather than the place where every subsystem lives.
- Authentication/session logic moved to `auth.js`.
- Security middleware and rate limits moved to `middleware.js`.
- SQLite schema/migrations moved to `database.js`.
- Email sending moved to `email.js` + `resend.js`.
- Stripe and PayPal payment logic moved to `payments.js`.
- The server owns the commercial catalogue in `products.js`.
- All public frontend API calls use `public/app.js`.
- The duplicate/unfinished auth helper scripts were removed from the build.
- The protected game remains in `protected/game.html` so it cannot be fetched through `express.static`.
- The game's old Railway API references were removed.
- The game now uses CSRF-protected same-origin API calls.
- Paid time is represented in seconds and consumed by server-authoritative heartbeats.
- Password change and account deletion endpoints were added because the uploaded frontend called them but the uploaded server did not define them.
- Stripe checkout/webhook handling was added because the uploaded game had a Stripe button but no corresponding server endpoint in the supplied server code.
- PayPal remains compatible with the payment flow in the uploaded project; its SDK is still the legacy package and should be migrated separately after this cleanup.

## Canonical files

| File | Action | Purpose |
|---|---|---|
| `server.js` | rewritten | HTTP routes and startup |
| `database.js` | new | schema, compatibility migration, cleanup |
| `auth.js` | new | sessions, cookies, password hashing |
| `middleware.js` | new | CSRF, access gates, rate limits |
| `products.js` | new | one source of truth for passes |
| `payments.js` | new | Stripe + PayPal |
| `email.js` | new | verification/reset email delivery |
| `resend.js` | keep | Resend client |
| `public/app.js` | rewritten | single frontend API client |
| `public/login.*` | keep/rewrite | login |
| `public/signup.*` | keep/rewrite | signup |
| `public/reset-request.*` | keep/rewrite | password reset request |
| `public/reset-password.*` | canonical | password reset |
| `public/change-password.*` | canonical | password change |
| `public/settings.*` | canonical | account controls |
| `public/purchase.*` | rewritten | product selection/payment |
| `public/verify-email.html` | simplified | informational result page |
| `public/portus.html` | simplified | Portus entry point |
| `protected/game.html` | preserve + infrastructure patch | town builder |
| `public/auto-pause.js` | deleted | merged into game access heartbeat |
| `public/login-status.js` | deleted | redundant |
| `public/logout.js` | deleted | merged into settings/game |
| `public/paid-time.js` | deleted | merged into access handling |
| `public/portus-gate.js` | deleted | server gate is authoritative |
| `public/portus.js` | deleted | old API/game client |
| `public/reset-apply.*` | deleted | duplicate reset flow |

## Current commercial catalogue

The uploaded backend was the only internally consistent source for pricing, so this build uses:

- 1 hour — 2.00 USD
- 3 hours — 5.00 USD
- 24 hours — 20.00 USD

The frontend's conflicting EUR catalogue was not silently mixed into the backend. Change `products.js` when the final commercial pricing/currency is decided.

## Environment

Copy `.env.example` to `.env` and supply real values. Never commit `.env`.

## Run

```bash
npm install
npm start
```

For local development set `NODE_ENV=development` and use an HTTP `SITE_URL`, for example `http://localhost:8080`.

## Before production

1. Configure `JWT_SECRET`, Resend, Stripe and PayPal credentials.
2. Register both payment webhooks.
3. Decide final currency/pricing and legal wording.
4. Replace draft legal/contact text.
5. Test signup → verification → login → purchase → game → save/load → expiry.
6. Migrate the legacy PayPal SDK to `@paypal/paypal-server-sdk`.
7. Split `protected/game.html` into game modules after the infrastructure is stable.
