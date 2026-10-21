// Random "god message" blessings, extracted from protected/game.html.
// grant(ctx) applies the reward via an explicit ctx instead of closing over
// game.html's globals, matching the pattern used by quests.js.

export const GOD_MESSAGES = [
  { text:'The gods of the shore remember your settlement. Fishers find a small catch.', grant:(ctx)=>ctx.addRes('fish', 3) },
  { text:'A quiet blessing passes through the storehouses. Your grain is protected.', grant:(ctx)=>ctx.addRes('wheat', 3) },
  { text:'The old stones answer your work. A little stone rises from the earth.', grant:(ctx)=>ctx.addRes('stone', 3) },
  { text:'A thought from beyond the harbour settles into the library.', grant:(ctx)=>ctx.addResearch(2) },
];
