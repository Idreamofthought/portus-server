# Railway Deployment Checklist

## Configuration

- [ ] Set `NODE_ENV=production`, `PORT`, `SITE_URL`, and a long random `JWT_SECRET`.
- [ ] Set `EMAIL_FROM` and `RESEND_API_KEY`; confirm the sender domain is verified in Resend.
- [ ] Set live Stripe `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- [ ] Set live PayPal `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID`.
- [ ] Keep all secret values only in Railway variables; do not commit them.

## Provider Configuration

- [ ] Add Stripe webhook endpoint `https://<railway-domain>/api/webhooks/stripe` for `checkout.session.completed`.
- [ ] Add PayPal webhook endpoint `https://<railway-domain>/api/webhooks/paypal` for `PAYMENT.CAPTURE.COMPLETED`.
- [ ] Update `SITE_URL` to the canonical HTTPS domain after attaching it.

## Release Checks

- [ ] Run `npm test` and `npm run check` before deployment.
- [ ] Verify `GET /health` returns `{ "ok": true }` over the deployed HTTPS domain.
- [ ] Import `postman/Portus-Launch-Sandbox.postman_collection.json` and run the non-payment requests against a verified test account.
- [ ] Complete one Stripe test checkout and one PayPal sandbox checkout in their hosted provider UIs.
- [ ] Confirm each provider webhook arrives once and replay it using the provider dashboard; verify no second entitlement is credited.
- [ ] Open `/signup.html`, `/login.html`, `/game`, and `/purchase.html` on a mobile viewport.
- [ ] Check Railway logs for webhook signature failures, email delivery errors, and unhandled server errors.