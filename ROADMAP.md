# Roadmap

## Near term

- Expand the player-facing Codex with the remaining artifact, disaster, geology, ritual, and sky entries.
- Add focused tests for payment webhooks, entitlement checks, and Codex allowlisting.
- Run the provider sandbox checks in `API.md`: Stripe Checkout plus webhook replay, then PayPal order, capture, and webhook replay. Keep provider credentials out of the repository.
- Keep the public Portus preview current as new game systems become playable.
- Add browser smoke coverage for panel rendering, save/load, and protected-route startup (see Game modularization plan, step 4).

## Save validation

- `/api/save` validates the current client save contract in `save-validation.js` before persistence.
- Unknown fields, malformed arrays, non-finite or negative values, invalid terrain, invalid building IDs, out-of-bounds placement, sea placement, and overlapping buildings return `{"error":"invalid_save"}`.
- `npm test` covers the validator. Add authenticated HTTP route tests when the test harness gains a request helper.

## CSP tightening plan

1. **Done.** Inline event handlers and inline game code moved out of `protected/game.html` and every other page with one (the newsletter popup, the `/portus` paywall banner) into external files under `homepage/js/`, `homepage/portus/js/`, and `protected/js/`.
2. **Done.** `script-src` no longer carries `unsafe-inline` — it's `'self' https://plausible.io`. This was the priority: `script-src` is the XSS-executable vector.
3. **Intentionally not done, by decision.** `style-src` keeps `unsafe-inline`. Extracting the 4 inline `<style>` blocks was done, but ~399 inline `style="..."` attributes remain across 24 files, almost all of them `/writing` prose/opinion content pages rather than app surface. CSS-based data exfiltration via attribute selectors is a real but narrow, low-severity attack class compared to arbitrary script execution — not worth an editorial sweep across two dozen content files for the residual risk. Revisit only if those templates get consolidated for some other reason and the inline styles become classes as a side effect.
4. Deploy with `CSP_REPORT_ONLY=1` in staging first (switches the header to `Content-Security-Policy-Report-Only`, same policy, nothing blocked) to confirm zero unexpected violations — this is also how to get real confirmation that `application/ld+json` blocks aren't affected by the `script-src` change, since that can't be verified with curl. Then unset it to enforce in production.

## Game modularization plan

1. **Done.** Inline game code extracted out of `protected/game.html` into `protected/js/game.js`, state names and save format unchanged.
2. **Done.** Pure definitions and validation split from rendering: `army.js`, `blessings.js`, `buildings.js`, `disasters.js`, `map.js`, `presentation.js`, `quests.js`, `research.js`, `resources.js`, `scenarios.js` under `protected/js/`.
3. **Done.** Implicit globals replaced with explicit ES module imports; stateful modules (`quests.js`, `disasters.js`, `scenarios.js`, `blessings.js`) take an explicit `ctx` object at the call site instead of closing over `game.html`'s state.
4. **Not started.** Browser smoke coverage for panel rendering, save/load, and protected-route startup. `test/integration/save.spec.js` covers save/load at the API level, but nothing exercises the client panels or game boot in a browser yet. Do this before changing gameplay rules.

## Medium term

- Make the writing and lore indexes easier to maintain without changing public URLs.
- Add a lightweight public content search across writing and Portus lore.
- Improve mobile and accessibility checks for the homepage, writing pages, and game panels.

## Long term

- Evaluate separating the public site, Portus application, and lore source into independent repositories only if their release and deployment needs diverge.
- Preserve stable URLs and a single documented source of truth before attempting any repository split.
