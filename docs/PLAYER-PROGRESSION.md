# Player guidance and research paths

This release addresses the first stage of the Breluce playtest feedback: players
need a next step, an easier building catalogue, and a reason to research.

## Guidance

The building sidebar carries one contextual suggestion under “The Gods suggest…”
or “The Gods warn…”. Advice is derived from the current settlement after a turn,
construction, demolition, research or save load. Food and workforce problems take
priority, followed by missing suppliers and the clay → pottery → scrolls → research
chain. A chosen research path becomes an ongoing ambition once a Library exists.

“Find” selects and reveals the building, or opens its required research. It never
builds or buys anything automatically. “Another idea” defers that suggestion for
24 turns (one minute at normal speed). The Guidance toggle hides suggestions;
turning it on or loading a settlement resets deferred ideas. The existing local
settlement-voices preference remains compatible. Guidance pauses during the marsh
lesson. Existing saves need no new fields.

## Building catalogue

All placeable buildings have one presentation group: Food, Raw materials,
Industry, Research, Army & defence, Spirituality, Housing & services, or
Trade & transport. Groups begin collapsed and retain their open state during
the visit. Search matches names, descriptions, goods, group names and required
research. Search temporarily expands matches; clearing it restores the groups.
Locked buildings lead to their required research. Upgrade-only buildings retain
their existing in-place upgrade workflow.

## Research

Six goal paths show their prerequisite discoveries, completion count and remaining
point cost. Discoveries show actual building unlocks and supply-chain notes. The
setup buttons let a player find the Claypit, Potter, Scribe and Library. Research
buttons explain missing points or prerequisites and only spend points when ready.

Six tier-four discoveries join existing branches: Canal Engineering, Trade
Networks, Master Craftspeople, Academy of Scholars, Defence Strategy and Sacred
City. They apply the existing yield, storage, trade, happiness and military-capacity
effects. They do not introduce tactical soldiers, health simulation or buildings
that the game does not yet support. Existing prerequisites and completed research
are preserved. The Confectionery description now matches its actual unlocks.

## Following stages

The playtest also calls for real transport reach, food reserves and a complete
market, fibre production for weaving, warned directional invasions with tactical
defence, rival settlements with peaceful trade, and district zoom with visible
deliveries. Those require changes to the economy, map and save contract and are
not implemented in this release. Their research unlocks should be added alongside
working mechanics rather than displayed as promises in the current tree.

## Validation

Run the unit suite and `npm run validate:structure`. On environments that prevent
the Node test runner from spawning child processes, run each test file in its own
Node invocation with `--test-isolation=none`; database tests must retain separate
processes. The progression tests cover urgent needs, supplier repair, the Library
bootstrap, goal prerequisites, all menu groups, and valid advice actions. Save
loading tests verify that valid imports reset deferred guidance and invalid imports
leave it intact. Check search, category toggles, research navigation and guidance
controls in a browser at desktop and narrow widths.
