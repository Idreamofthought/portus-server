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
backup automatically. Saving after recovery keeps the valid backup instead of
copying the damaged file over it. The manual save-code export/import still works.

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

## Steam preparation — 2 October 2026

Richard successfully tested launch, local save, restart/load and offline play
on his Windows PC on 1 October. Steamworks fee paid on 2 October; tax and
identity verification pending (Steamworks estimates 10–15 business days).
App ID and Windows depot ID are still needed. This does not constitute a
Steam installation test or final release approval.

### Prepare the upload

1. Build/download the Windows x64 ZIP and unpack the entire archive into a
   dedicated folder. Keep Electron and Chromium license notices with it.
2. Once Steamworks supplies the IDs, run from the repository root:
   `npm run steam:prepare -- <AppID> <WindowsDepotID> "C:/Portus/Windows"`.
   The helper checks the executable, app archive and license notices and
   writes SteamPipe scripts under `dist/steam/<AppID>/`. Automated tests verify
   that it creates a preview build first, maps the complete Windows folder and
   contains no `SetLive` instruction. It performs no upload.
3. In Steamworks, configure the Windows depot for Windows and 64-bit. Configure
   a Windows launch option with executable `Portus.exe` at the installation
   root, with no command-line arguments. Put the depot in the testing package.
4. Download the Steamworks SDK. Launch its ContentBuilder `steamcmd.exe`, then
   log in interactively using a build account with the required permissions.
   Do not put passwords in repository files or shell commands.
5. Run `run_app_build <absolute-path-to-app_build_AppID_preview.vdf>` first.
   Inspect the generated mapping/log output. Then run the non-preview script
   to upload the candidate. Neither generated script contains `SetLive`.
6. Select the uploaded build on a private test branch in Steamworks. Install
   through Steam and check launch, tutorial, saving, restart, offline play,
   discoveries and sound controls. Test an update preserves the local save.

Upload reference: https://partner.steamgames.com/doc/sdk/uploading
Store draft and capture brief: [STEAM-STORE.md](STEAM-STORE.md).
