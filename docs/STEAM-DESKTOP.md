# Windows desktop prototype

This is the first local desktop entry point for Portus. It is not yet a Steam
release build.

Run `npm install` and `npm run desktop:dev` on a Windows development machine.
The Electron window serves the existing game assets from a loopback-only HTTP
server. The desktop entry bypasses the web hourly pass and sign-in UI without
changing the protected web routes. It starts the same town simulation and
offers **Save locally** and **Load local save** in the Save panel. The save is
stored as `portus-save.json` under Electron's persistent `userData` directory.
The manual save-code export/import still works.

The current desktop prototype does not use web accounts, cloud saves, paid
access, or the server-driven archaeological discovery rolls. The game can be
played without an internet connection. The browser edition continues to use
its existing server and payments.

Before a Steam upload, we need a Windows package with only the desktop assets,
a Windows play test (including restart/save/load and offline play), a decision
about optional account sync, and a review of which Codex discoveries should
run locally. The packaged build will also need Steam installation and launch
configuration and a final content/asset audit.
