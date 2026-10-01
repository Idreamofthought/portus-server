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
Before replacing it, Portus preserves the previous valid save as
`portus-save.json.backup`; if the main file is damaged, Portus loads that
backup automatically. The manual save-code export/import still works.

Run `npm run desktop:package:win` to produce
`dist/desktop/Portus-2.0.0-windows-x64.zip`. The build is deliberately staged
from an allowlist: it includes the desktop runtime, game assets and Codex, but
not the web server, payments, database or their dependencies. The Windows
workflow builds the same archive, checks its contents, launches `Portus.exe`
for a smoke test, and retains the archive as a downloadable test artifact.

The desktop prototype does not use web accounts, cloud saves, or paid access.
Artifact discoveries, archaeological fragments, and their Codex text run from
bundled game data and are included in the local save. The game can be played
without an internet connection. The browser edition continues to use its
existing server and payments.

The Windows executable now uses the dark green and gold Portus tree-seed mark
from the website favicon. A 1024px source PNG and a multi-resolution Windows
ICO are kept with the desktop runtime for later store and launcher assets.

Before a Steam upload, the test archive needs a hands-on Windows play test
(including restart/save/load and offline discoveries), Steam installation and
launch configuration, and a final content/asset audit.
