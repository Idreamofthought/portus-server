# Windows desktop prototype

This is the first local desktop entry point for Portus. It is not yet a Steam
release build. The Steam edition is Windows-first and must remain playable
offline with local saves; a Portus account or internet connection is not
required.

Run `npm install` and `npm run desktop:dev` on a Windows development machine.
The Electron window serves the existing game assets from a loopback-only HTTP
server. The desktop entry bypasses the web hourly pass and sign-in UI without
changing the protected web routes. It starts the same town simulation and
offers **Save locally** and **Load local save** in the Save panel. The save is
stored as `portus-save.json` under Electron's persistent `userData` directory.
The manual save-code export/import still works.

The desktop prototype does not use web accounts, cloud saves, or paid access.
Artifact discoveries, archaeological fragments, and their Codex text run from
bundled game data and are included in the local save. The game can be played
without an internet connection. The browser edition continues to use its
existing server and payments.

Before a Steam upload, we need a Windows package with only the desktop assets,
a Windows play test (including restart/save/load and offline discoveries).
The packaged build will also need Steam installation and launch
configuration and a final content/asset audit.
