# Lore Index

This is the navigation point for Portus worldbuilding. The source material remains
in its existing domain folders so the game content and narrative books keep their
stable paths.

## Portus canon

- [Narrative lore books](../portus/lore/book1_lie_of_the_land.md): the ordered story and world books.
- [Codex entries](../portus/codex/artifacts/README.md): unlockable knowledge grouped by subject.
- [Quests](../portus/quests/): progression chains and rewards.
- [Items](../portus/items/README.md): artifact and item definitions.
- [Events](../portus/events/README.md): encounters, disasters, and relic rules.
- [NPC dialogue](../portus/npc_dialogue/README.md): reusable character and encounter dialogue.
- [Artifact category reference](../docs/ARTIFACT-CATEGORIES.md): the seven category lore notes and intended effects.

## Runtime connection

The discovery catalog in [`data/discovery_catalog.js`](../data/discovery_catalog.js)
contains the allowlisted Codex entry IDs. Authenticated players receive unlocked
content through `/api/discoveries`; the game renders it in the Codex panel.

Keep new Codex IDs aligned across the catalog, the corresponding Markdown file,
and the discovery migration data. Do not expose arbitrary filesystem paths through
an API endpoint.

## Public writing

The public creative writing source is indexed separately in [site/README.md](../site/README.md) and
served from the existing [homepage writing index](../homepage/writing/index.html) and
[public writing index](../public/writing/index.html) surfaces. It is related
to Portus thematically but is not part of the game's unlockable Codex canon.
