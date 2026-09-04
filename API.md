# Portus API

The API is same-origin and served by `server.js`. JSON endpoints use cookie-based authentication. Mutating requests require a CSRF token unless noted otherwise.

## Base URL

Local: `http://localhost:8080`

Production: `https://www.idreamofthought.org`

## Authentication and CSRF

1. Call `GET /api/csrf-token` to receive a CSRF cookie and token.
2. Send the token in the `X-CSRF-Token` header for `POST`, `PUT`, and `DELETE` requests.
3. Authentication is maintained with the `auth` HTTP-only cookie.

The browser client in `public/app.js` handles these requirements automatically.

## Public Routes

### `GET /api/csrf-token`

Returns a token used for mutating requests.

```json
{"csrfToken":"..."}
```

### `GET /api/products`

Returns the configured commercial catalogue.

```json
{"products":[{"id":"...","label":"...","minutes":60,"amount":"2.00","currency":"USD"}]}
```

### `POST /api/signup`

Creates an account and starts email verification.

Body:

```json
{"email":"player@example.com","password":"at-least-8-characters"}
```

### `POST /api/login`

Authenticates a verified account.

Body:

```json
{"email":"player@example.com","password":"..."}
```

### `POST /api/request-password-reset`

Requests a password reset email.

Body:

```json
{"email":"player@example.com"}
```

### `POST /api/reset-password`

Completes a password reset.

Body:

```json
{"token":"...","newPassword":"at-least-8-characters"}
```

### `GET /verify-email?token=...`

Consumes an email verification token and renders the verification result page.

## Account Routes

All routes in this section require authentication unless stated otherwise.

### `GET /api/me`

Returns the current account profile.

### `POST /api/logout`

Revokes the current session.

### `POST /api/change-password`

Changes the authenticated user's password.

Body:

```json
{"currentPassword":"...","newPassword":"..."}
```

### `POST /api/delete-account`

Deletes the authenticated account and related data.

Body:

```json
{"password":"..."}
```

## Access and Save Routes

### `GET /api/access`

Returns remaining paid play time and whether the account can play.

### `POST /api/access/heartbeat`

Keeps an active game session alive and consumes server-authoritative play time.

### `POST /api/access/stop`

Stops the active play session without logging out.

### `POST /api/save`

Stores the authenticated player's game state. The server rejects payloads larger than the configured save limit.

Body: JSON game state.

### `GET /api/save`

Returns the latest saved game state for the authenticated player.

## Payment Routes

Payment routes use the configured Stripe and PayPal credentials. Checkout requires a verified, authenticated account and CSRF protection.

### `POST /api/checkout/paypal`

Creates a PayPal order.

Body:

```json
{"productId":"..."}
```

Returns the PayPal approval URL and order ID.

### `POST /api/checkout/paypal/capture`

Captures an approved PayPal order for the authenticated owner.

Body:

```json
{"orderId":"..."}
```

### `POST /api/checkout/stripe`

Creates a Stripe Checkout session.

Body:

```json
{"productId":"..."}
```

### `POST /api/webhooks/paypal`

Receives PayPal `PAYMENT.CAPTURE.COMPLETED` events. This endpoint has no browser CSRF requirement. It verifies the PayPal transmission signature using `PAYPAL_WEBHOOK_ID`, matches the pending order, validates the captured amount, and records the event id to prevent duplicate crediting.

Configure the production URL as:

```text
https://www.idreamofthought.org/api/webhooks/paypal
```

### `POST /api/webhooks/stripe`

Receives Stripe webhook events as a raw request body. It validates `STRIPE_WEBHOOK_SECRET` and credits paid `checkout.session.completed` events.

## Error Shape

Errors normally use an HTTP error status with a JSON body:

```json
{"error":"description"}
```

Clients should treat non-2xx responses as failures and display a user-safe message.

## Security Notes

- Do not expose `.env` or payment secrets.
- Keep webhook endpoints public, but rely on provider signature verification.
- Do not bypass CSRF checks for browser mutations.
- Keep payment event IDs unique and preserve idempotent crediting.
