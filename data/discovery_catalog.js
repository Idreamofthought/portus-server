export const ACTIVITY_DISCOVERY_CHANCES = Object.freeze({
  turn: 0.02,
  fishing: 0.04,
  mining: 0.05,
  farming: 0.03,
  clay_pit: 0.04
});

export const ARTIFACTS = Object.freeze([
  { id: "star-reader", title: "Star Reader", category: "celestial_instruments", codexEntry: "artifacts/star-reader" },
  { id: "ash-bowl", title: "Ash Bowl", category: "ritual_implements", codexEntry: "artifacts/ash-bowl" },
  { id: "obsidian-chisel", title: "Obsidian Chisel", category: "tools_of_the_ancients", codexEntry: "artifacts/obsidian-chisel" },
  { id: "tide-seal", title: "Tide Seal", category: "tokens_of_authority", codexEntry: "artifacts/tide-seal" },
  { id: "memory-urn", title: "Memory Urn", category: "mystic_containers", codexEntry: "artifacts/memory-urn" },
  { id: "antler-charm", title: "Antler Charm", category: "beast_marked_relics", codexEntry: "artifacts/antler-charm" },
  { id: "drowned-bell", title: "Drowned Bell", category: "echoes_of_the_deep", codexEntry: "artifacts/drowned-bell" }
]);

export const ARCHAEOLOGICAL_FINDS = Object.freeze([
  { id: "broken-calendar-stone", title: "Broken Calendar Stone", fragments: 5, codexEntry: "cycles/lore_of_time" },
  { id: "shattered-river-idol", title: "Shattered River Idol", fragments: 4, codexEntry: "disasters/shattered-river-idol" },
  { id: "lost-engineers-kit", title: "Lost Engineer's Kit", fragments: 6, codexEntry: "geology/lost-engineers-kit" },
  { id: "whispering-mask", title: "Whispering Mask", fragments: 3, codexEntry: "rituals/whispering-mask" },
  { id: "first-navigators-map", title: "First Navigator's Map", fragments: 7, codexEntry: "sky/first-navigators-map" }
]);

export const RARITY_WEIGHTS = Object.freeze([
  { id: "common", weight: 55 },
  { id: "uncommon", weight: 28 },
  { id: "rare", weight: 12 },
  { id: "epic", weight: 4 },
  { id: "legendary", weight: 1 }
]);