// Quest definitions, extracted from protected/game.html.
// check()/reward() take an explicit ctx object rather than closing over
// game.html's globals, so this module has no dependency on game state shape
// beyond what's passed in at the call site.

export const QUESTS = [
  {id:'roots', name:'Roots in the Soil', desc:'Build a House and a Field.', rewardText:'+20 wood',
    check: (ctx) => ctx.placedBuildings.some(b=>b.id==='house') && ctx.placedBuildings.some(b=>b.id==='fields'),
    reward: (ctx) => { ctx.addRes('wood', 20); }},
  {id:'millers-chain', name:"The Miller's Chain", desc:'Build a Mill and a Baker to turn wheat into bread.', rewardText:'+10 research',
    check: (ctx) => ctx.placedBuildings.some(b=>b.id==='mill') && ctx.placedBuildings.some(b=>b.id==='baker'),
    reward: (ctx) => { ctx.addResearch(10); }},
  {id:'seven-wanderers', name:'Seven Wanderers', desc:'Maintain buildings from 7 distinct categories at once.', rewardText:'+15 coin, +3 happiness',
    check: (ctx) => new Set(ctx.placedBuildings.map(b=>ctx.BLD_BY_ID[b.id].cat)).size >= 7,
    reward: (ctx) => { ctx.addCoin(15); ctx.addTechHappiness(3); }},
  {id:'divisible-hour', name:'The Divisible Hour', desc:'Store at least 60 of three different resources at once.', rewardText:'+15 research',
    check: (ctx) => Object.values(ctx.res).filter(v=>v>=60).length >= 3,
    reward: (ctx) => { ctx.addResearch(15); }},
  {id:'measure-that-bends', name:'A Measure That Bends', desc:'Research at least two technologies, then survive a disaster.', rewardText:'+20 coin, +5 research',
    check: (ctx) => ctx.unlockedTechs.size >= 2 && ctx.scenarioState.disastersSurvived >= 1,
    reward: (ctx) => { ctx.addCoin(20); ctx.addResearch(5); }},
];
