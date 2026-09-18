// Quest definitions, extracted from protected/game.html.
// check()/reward() take an explicit ctx object rather than closing over
// game.html's globals, so this module has no dependency on game state shape
// beyond what's passed in at the call site.

export const QUESTS = [
  {id:'first-home', name:'Build a House', desc:'Place your first home.', rewardText:'+20 wood',
    check: (ctx) => ctx.placedBuildings.some(b=>b.id==='house'),
    reward: (ctx) => { ctx.addRes('wood', 20); }},
  {id:'gather-wood', name:'Gather 20 Wood', desc:'Gather or receive 20 wood for the growing town.', rewardText:'+5 stone',
    check: (ctx) => ctx.res.wood >= 20,
    reward: (ctx) => { ctx.addRes('stone', 5); }},
  {id:'farmstead', name:"Place a Farmer's Hut", desc:'Give the settlement a place to tend its fields.', rewardText:'+10 research',
    check: (ctx) => ctx.placedBuildings.some(b=>b.id==='farmerhut'),
    reward: (ctx) => { ctx.addResearch(10); }},
  {id:'fisherman', name:"Place a Fisherman's Hut", desc:'Build beside the river or sea and bring in the first catch.', rewardText:'+10 wood',
    check: (ctx) => ctx.placedBuildings.some(b=>b.id==='fisherhut'),
    reward: (ctx) => { ctx.addRes('wood', 10); }},
  {id:'first-research', name:'Unlock Research', desc:'Spend research points to understand one new technique.', rewardText:'+15 wood',
    check: (ctx) => ctx.unlockedTechs.size >= 1,
    reward: (ctx) => { ctx.addRes('wood', 15); }},
];
