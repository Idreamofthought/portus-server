# Creative Tree Migration Plan

The creative tree is served from `homepage/tree` and is available at `/tree/`.

## Current structure

- `homepage/tree/index.html` is the tree homepage.
- `homepage/tree/branches/` contains one page per branch.
- `homepage/tree/leaves/<branch>/index.html` contains each branch's leaf index.
- `homepage/tree/css/tree.css` contains the shared visual system.
- `homepage/tree/js/tree.js` provides small progressive enhancements without making the pages depend on JavaScript.

## Content workflow

1. Add or update a branch page in `homepage/tree/branches/`.
2. Add the matching leaf index under `homepage/tree/leaves/<branch>/`.
3. Add individual leaf pages beside that index when a subject becomes substantial enough to stand alone.
4. Register new branches in `homepage/tree/index.html` and the writing archive navigation.
5. Link back to `/tree/` and the relevant branch from every leaf.
6. Use the existing shared CSS classes before adding a branch-specific stylesheet.

## Migration phases

### Phase 1: foundations

- Keep the current static HTML structure and shared tree stylesheet.
- Preserve existing writing URLs while adding links to the tree.
- Keep external creator and PayPal links explicit and permission-aware.

### Phase 2: content

- Replace placeholder leaf indexes with real entries as material is ready.
- Add creator profiles only after receiving a preferred link, description, and permission to list them.
- Add supporter names only with permission; anonymous thanks remain available by default.

### Phase 3: optional data layer

- If the number of leaves becomes difficult to maintain by hand, move branch and leaf metadata into a small JSON document.
- Generate the static pages at build time so the public site remains fast and resilient without JavaScript.
- Keep the current URLs stable during any migration.

### Phase 4: validation

- Check every branch and leaf link after content changes.
- Verify mobile layout at a narrow viewport.
- Run `git diff --check` before publishing.
- Confirm that payment links remain separate from authenticated Portus time purchases.
