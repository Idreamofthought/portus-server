# Portus Launch

## Final pre-launch checklist

- [ ] Railway is deploying the current `main` commit and reports healthy.
- [ ] `NODE_ENV=production` is set.
- [ ] `JWT_SECRET` is long, random, and unique to production.
- [ ] `SITE_URL=https://www.idreamofthought.org` is set.
- [ ] `RESEND_API_KEY` is present and active.
- [ ] `EMAIL_FROM` uses a sender address on a Resend-verified domain.
- [ ] Resend domain DNS records are verified.
- [ ] A Railway volume is mounted at `/data` when using `DATABASE_PATH=/data/portus2.db`.
- Production startup now rejects a missing or relative `DATABASE_PATH`; verify the Railway variable and volume together, then restart and confirm the app is healthy.
- Keep the service at exactly one replica in every configured Railway region. SQLite uses one local file and cannot safely coordinate writes across replicas.
- [ ] Homepage, signup, login, verification, password reset, and logout have been tested.
- [ ] A fresh account receives a verification email and the link completes verification.
- [ ] Payment providers and webhook URLs are configured before charging real users.
- [ ] Stripe Checkout succeeds with Managed Payments disabled for the current custom price flow.
- [ ] `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_WEBHOOK_ID` are from the same PayPal Live app; production uses the PayPal live endpoint.
- [ ] Railway logs show no startup, database, CSRF, or email errors.
- [ ] The production domain serves HTTPS and redirects are correct.
- [ ] A backup or recovery path exists for the production SQLite database.

## Deliberate launch trade-offs

- `/api/save` is intentionally client-authoritative: the server authenticates the player, requires CSRF protection, and limits saves to 512 KB, but does not validate game resources, buildings, research, favour, warnings, or disasters. This is acceptable for the current slow, single-player game. Do not add leaderboards or scarcity-sensitive purchases without moving those rules server-side.
- The CSP still permits `script-src 'unsafe-inline'` because `protected/game.html` contains inline scripts. Tighten it after those scripts are extracted, as tracked in `ROADMAP.md`.
- Consumed or abandoned payment-order records and processed webhook IDs are pruned after one year by the daily cleanup job. Keep the retention window longer than the provider's expected webhook replay window if payment operations change.

## Soft-launch strategy

1. Invite 5 to 10 trusted testers with the signup link and ask them to test account creation, verification, login, the first gameplay session, and mobile layout.
2. Keep the invitation window open for 24 to 48 hours while monitoring Railway logs, Resend delivery, database growth, and payment configuration.
3. Ask testers for three things only: the first confusing moment, the first broken moment, and the moment that made them want to continue.
4. Fix blockers before widening access. Keep non-blocking polish in a short follow-up list.
5. Open the site publicly with the homepage banner and announcement below.
6. Continue daily checks for the first week: signup success, verification delivery, error rates, database persistence, and payment webhooks.

## Public launch announcement

**Portus is live.**

Enter a drifting city suspended between dream and memory. Gather resources, shape a settlement by the sea, and discover the lore that waits beneath the surface.

Portus is a quiet, contemplative browser game from I Dream of Thought, built for slow decisions, strange discoveries, and towns that become their own small myths.

Start here: https://www.idreamofthought.org/signup.html

## Release notes

`v2.0.0` brings the Portus production launch, account verification and password recovery email delivery, the expanded Great Tree with serrated placeholder leaves across every branch, and the first public launch surface on the homepage.