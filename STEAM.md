# Portus: Steam-first platform plan

Portus will use the browser release to validate the game before a Steam build.
The Steam edition is a distribution target for the same game, not a fork.

## Product decision

- Keep the web game live as the first playable release and feedback channel.
- Prefer desktop/Steam over a smartphone edition because the map, panels and
  slower city-building loop benefit from a larger screen and pointer controls.
- Sell the eventual Steam edition as a one-time purchase. Do not reproduce the
  web time-pass catalogue inside Steam.
- Keep prices and store SDKs outside the game simulation.

## Repository boundary

Remain in one repository until a Steam packaging project actually exists. Move
towards these internal boundaries incrementally:

```text
apps/
  website/       I Dream of Thought pages
  game-web/      browser renderer and input
  api/           accounts, cloud saves and entitlements
packages/
  game-core/     state transitions and rules without DOM or store APIs
  game-data/     buildings, resources, research, events and scenarios
  lore/          canonical narrative content
platforms/
  steam/         desktop shell and Steam integration (future)
```

Moving every current file at once would create routing and deployment risk.
New game rules should be written as pure modules, and existing rules should be
extracted from `protected/js/game.js` when they are next changed.

## Access model

The API now stores platform-neutral `portus_full_game` entitlements. A future
Steam ownership verifier grants that entitlement with provider `steam`. The
game asks only whether the user can play; it never handles Steam receipts,
Stripe sessions, PayPal orders or prices.

Steam ownership verification is deliberately not implemented until the Steam
App ID and partner credentials exist. Never trust a client-supplied Steam ID or
"purchase successful" flag. Verify ownership server-side using Steamworks
before granting an entitlement.

## Release gates

### Web soft launch

1. Complete the production checklist in `LAUNCH.md`.
2. Run a free closed test with 5–10 players.
3. Record only essential events: game start, tutorial completion, first
   building, first save, session completion and return visit.
4. Fix progression, onboarding, mobile-desktop layout and save blockers.
5. Open a public browser beta with a meaningful free path.

### Steam prototype

Start only after browser sessions show that players complete onboarding and
return to the game. The prototype must provide:

- desktop windowing and fullscreen support;
- mouse, keyboard and readable scaling at common desktop resolutions;
- local saves that work offline;
- optional cloud-save account linking;
- a Steam demo build separated from the paid app entitlement;
- Steamworks ownership verification and no web checkout inside the client.

### Steam release

- one-time store purchase;
- tested save migration from the browser save schema;
- achievements only after the underlying progression is stable;
- store assets, trailer, accessibility notes and supported-platform matrix;
- Windows first unless testing demonstrates reliable macOS/Linux builds.

## Decisions deliberately deferred

- Steam App ID and SDK wrapper;
- Electron versus another desktop shell;
- final Steam price;
- achievements and workshop support;
- a separate repository.

These choices require evidence from the browser beta or access to Steamworks.
