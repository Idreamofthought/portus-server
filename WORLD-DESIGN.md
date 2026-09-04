# Portus World Design

Portus is a settlement remembered into existence. It is not a conventional conquest game: the player's work is to give shape to a place that is incomplete, fragile, and quietly alive.

## Design Pillars

### Memory Before Mastery
Buildings and systems should suggest meaning before they suggest optimization. A house is shelter, a field is care, a road is connection, and a codex entry is something the world has chosen to remember.

### Gentle Pressure
Disasters and warnings create decisions without turning the experience into panic. Problems should be legible, recoverable, and connected to the player's prior choices.

### Every Place Has a Texture
The 24x24 tile grid is small enough to read at a glance but large enough to support districts, coastlines, resource pockets, and meaningful spacing. Terrain should affect what can be built and how a place feels.

### The World Answers Back
Favour, codex discoveries, warnings, ambient sound, and building effects make the settlement feel responsive. Feedback should be symbolic as well as numerical.

## Current World

The playable map is 50 columns by 33 rows with 24x24 tiles. The generator currently creates grassland, forest, mountains, sand, rivers, sea, and resource deposits.

The player can place buildings when the selected building's terrain rule is satisfied and the tile is empty. Buildings may also require proximity to water, forest, or another building.

## Terrain Language

- **Grass:** Stable ground for homes, services, and most production.
- **Forest:** A living resource and a spatial constraint for woodland industries.
- **Mountain:** A hard boundary and the natural home of quarries.
- **Sand:** A threshold between land and water, suitable for coastal activity.
- **River:** A source of access, fishing, irrigation, and future travel.
- **Sea:** A distant edge that supports docks and coastal stories.
- **Deposits:** Localized opportunities for clay, gold, silver, copper, and salt.

Future terrain types should add a clear visual and mechanical relationship, not merely another color.

## Buildings

Buildings belong to categories such as Housing, Production, Mining, Infrastructure, Services, Knowledge, Trade, Military, and Storage. Each building should define:

- A stable ID
- A readable name and glyph
- A category
- Construction costs
- Worker requirements
- A placement rule
- Production, consumption, capacity, or happiness effects
- Optional special behavior
- A short world-facing description

New buildings should fill a meaningful role or create a new adjacency decision. Avoid adding variants that only change a number.

## Economy

The current resource vocabulary is wood, stone, food, and gold. Future chains can add intermediate materials such as clay, pottery, tools, flour, bread, olives, oil, scrolls, fish, and ore, but each addition should answer three questions:

1. What human need or memory does it represent?
2. What new decision does it create?
3. How does it affect the settlement's rhythm?

Production should remain understandable through the resource ledger and building descriptions.

## Research and Favour

Research represents deliberate understanding: it unlocks abilities and improves production. Favour represents attention from the dream-realm: it may unlock rituals, alter risks, or reveal hidden context.

Keep the systems distinct:

- Research is planned and cumulative.
- Favour is relational and reactive.
- Research should reward investment.
- Favour should respond to how the settlement is shaped.

Twilight mode is an opportunity for a different ruleset, not simply a darker color palette. It may change warnings, costs, available rituals, or the meaning of disasters.

## Disasters and Warnings

Disasters are disturbances in the dream: storms of doubt, fires of anger, floods of fear, blights, and changes in the ground. Warnings are the quieter layer that gives the player time to interpret and respond.

A good event should include:

- A readable signal before escalation when appropriate
- A localized effect
- A recovery path
- A codex or narrative consequence
- A reason connected to the current settlement

Avoid random punishment with no readable cause or response.

## Codex and Narrative

The Codex is the dreamer's journal. Entries should be short, evocative, and anchored to something the player encountered. Unlocking lore should feel like recognition rather than a generic achievement.

Future narrative can use:

- Settlement milestones
- Repeated building patterns
- Seasonal changes
- Disaster aftermath
- Favour thresholds
- Named places and districts
- Visions triggered by unusual choices

## Sound and Atmosphere

Ambient sound should remain sparse and inharmonic: low drones, distant bells, soft wind, and brief tonal events. Sound confirms state changes but never becomes a reward treadmill. Player controls must be able to mute ambience and effects independently.

## Future Expansion Areas

- District identities and named places
- Terrain modifiers and elevation
- Resource production chains
- More rituals and twilight rules
- Seasonal dream events
- Story arcs and visions
- Long-form progression in protected mode
- Shared dream-realms and cooperative building

Every expansion should strengthen memory, place, and consequence while preserving the calm pace of the core experience.
