# Roadmap

## Near term

- Expand the player-facing Codex with the remaining artifact, disaster, geology, ritual, and sky entries.
- Add focused tests for payment webhooks, entitlement checks, and Codex allowlisting.
- Run the provider sandbox checks in `API.md`: Stripe Checkout plus webhook replay, then PayPal order, capture, and webhook replay. Keep provider credentials out of the repository.
- Replace the remaining inline game styles and scripts where practical so the security policy can be tightened.
- Keep the public Portus preview current as new game systems become playable.

## Save validation

- `/api/save` validates the current client save contract in `save-validation.js` before persistence.
- Unknown fields, malformed arrays, non-finite or negative values, invalid terrain, invalid building IDs, out-of-bounds placement, sea placement, and overlapping buildings return `{"error":"invalid_save"}`.
- `npm test` covers the validator. Add authenticated HTTP route tests when the test harness gains a request helper.

## CSP tightening plan

1. Move inline event handlers and inline game styles out of `protected/game.html` into external files.
2. Keep the existing self-hosted asset boundary and remove `unsafe-inline` from `script-src` first.
3. Remove `unsafe-inline` from `style-src` after the remaining inline styles are extracted.
4. Add a report-only policy in staging, inspect violations, then enforce the policy in production.

## Game modularization plan

1. Extract the inline game code into `protected/game.js` without changing state names or save format.
2. Split pure definitions and validation from rendering: buildings, research, map rules, save encoding, and UI panels.
3. Replace implicit globals with explicit module imports and a small game-state object.
4. Add browser smoke coverage for panel rendering, save/load, and protected-route startup before changing gameplay rules.

## Medium term

- Make the writing and lore indexes easier to maintain without changing public URLs.
- Add a lightweight public content search across writing and Portus lore.
- Improve mobile and accessibility checks for the homepage, writing pages, and game panels.

## Long term

- Evaluate separating the public site, Portus application, and lore source into independent repositories only if their release and deployment needs diverge.
- Preserve stable URLs and a single documented source of truth before attempting any repository split.
