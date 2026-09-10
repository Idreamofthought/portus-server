# Launch Sandbox Testing

This guide uses the routes implemented by the current server. Browser mutations need both the authentication cookie and `X-CSRF-Token`, obtained from `GET /api/csrf-token`.

## Automated Smoke Test

Create a verified sandbox account, then run:

```bash
LAUNCH_TEST_BASE_URL=https://www.idreamofthought.org \
LAUNCH_TEST_EMAIL=verified-test-account@example.com \
LAUNCH_TEST_PASSWORD='replace-me' \
npm run test:launch-sandbox
```

The command checks health, products, login, session access, CSRF, and invalid-save handling. It does not create external provider objects by default. Add `RUN_PAYMENT_SANDBOX=1` to create Stripe and PayPal checkout sessions. Complete and capture those orders in the provider-hosted flows.

## Postman

Import `postman/Portus-Launch-Sandbox.postman_collection.json`, set its variables, then run requests in order. Enable cookie persistence in Postman so the `auth` and CSRF cookies received by the collection are sent back.

## Webhook Validation

Use the provider dashboards or CLIs to deliver signed events to these exact URLs:

```text
/api/webhooks/stripe
/api/webhooks/paypal
```

Stripe events must be generated or re-signed after every payload change. PayPal events must carry valid PayPal transmission headers. Editing a saved JSON payload while retaining an old signature only tests signature rejection, returning `{"error":"invalid webhook"}` for Stripe or `{"error":"invalid signature"}` for PayPal.

For idempotency, replay the same valid completed-payment event through the provider. Successful webhook responses use `{ "ok": true }`; inspect the account entitlement or `payment_events` data to verify it was credited only once. Unknown PayPal orders return `{ "ok": true, "unknownOrder": true }`.

The webhook handlers intentionally return generic errors for failed amount, currency, or product validation. Therefore, verify those negative cases by ensuring the payment is not credited, rather than expecting provider-specific public error codes.

## Manual Browser Checks

Test `/signup.html`, `/login.html`, `/game`, and `/purchase.html` on a mobile viewport. Confirm scrolling, forms, buttons, authentication redirects, save/load, hosted payment redirects, and return handling.