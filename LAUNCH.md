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
- [ ] Homepage, signup, login, verification, password reset, and logout have been tested.
- [ ] A fresh account receives a verification email and the link completes verification.
- [ ] Payment providers and webhook URLs are configured before charging real users.
- [ ] Railway logs show no startup, database, CSRF, or email errors.
- [ ] The production domain serves HTTPS and redirects are correct.
- [ ] A backup or recovery path exists for the production SQLite database.

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