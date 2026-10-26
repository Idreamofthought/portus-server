# Site Content

This directory is the canonical source/archive area for public writing and related assets. **It is not the live website's publish directory.**

## What Railway is serving

The Railway production project `game/` has a live service named `Idreamofthought writing`, with the custom domains `idreamofthought.org` and `www.idreamofthought.org`. Railway reported its latest deployment as `SUCCESS` on 2026-10-25.

The site's server routes serve pages from `homepage/` (for example, `/tree/` is served from `homepage/tree/index.html`; the `/portus/` route is served from `homepage/portus/index.html`). The homepage in `homepage/index.html` is the I Dream of Thought site. This is the production-facing content tree.

## Publishing a new piece

Adding a Markdown file under `site/writing/essays/` preserves the text in GitHub but **does not, by itself, publish it on idreamofthought.org**. A piece must also be integrated into the live site's supported page/catalogue structure under `homepage/` (including any relevant writing index, tree/leaf data, and navigation), and the relevant deployment must be verified.

Do not describe a piece as published merely because its Markdown file exists in this directory or because Railway has a successful deployment. Confirm that the live URL renders the piece.

## Current distinction

- `site/writing/essays/`: canonical Markdown source/archive for essays.
- `homepage/`: current production-facing site pages and content.
- Railway production status: the writing service and custom domains are live; the last observed deployment succeeded on 2026-10-25. This confirms deployment health, not that every file in `site/` is published.
