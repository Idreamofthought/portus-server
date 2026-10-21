# Link continuity review — 14 October 2026

A local instance of the actual Express app was crawled using a temporary test database. Internal anchor, image, script, stylesheet and media references were followed from the home page, Tree, writing catalogue, start page, contact and game hub. Legacy redirects were followed; external hosts, API operations and token-verification links were not crawled.

Before repairs: 617 unique internal paths, 361 HTML responses, 210 redirects and four 404s. One was the historical `/game.html` address; three were archived Firefox screenshots pointing to temporary files on the original author's computer. Some archived source links also accidentally pointed to Blogger's editor instead of the web address displayed in their text.

After repairs: 614 unique internal paths, 361 HTML responses, 211 redirects, zero 404s and no crawl queue remaining. The count falls because unavailable temporary screenshot files are no longer requested.

The independent game's migration preview was checked separately: 42 internal paths, 29 HTML responses, four redirects and zero 404s. Its links to the writing site were treated as external links, not as missing local routes.

The writing archive renderer replaces known missing temporary screenshots with an explicit unavailable-image note. It repairs Blogger editor destinations only when the anchor visibly states a complete HTTP(S) source URL; otherwise it preserves the words without inventing a destination. The original article source files remain unchanged. Historical claims, wording and publication dates were not revised.

`/game.html` now permanently redirects to `/game`, which continues to enforce authentication and access checks. This also repairs old inbound bookmarks and links in WordPress copies.

Tests execute the real archive article route and the legacy game redirect, check that the source file remains unchanged, and verify that unauthenticated game requests still redirect to sign-up. Full local Node suite: 88 passed, zero failures, one skipped launch sandbox test.

Limits: this is a server-rendered internal-link and asset check. It does not validate every external source, JavaScript-generated link, fragment anchor, CSS image URL, protected account workflow or the truth of historical articles.
