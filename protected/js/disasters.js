// Disaster type definitions, extracted from protected/game.html.
// resolve(ctx) applies effects and returns a narrative message; ctx supplies
// the stateful helpers (damageRandomBuildings, rnd, etc.) that still live in
// game.html, so this module stays free of game-state coupling.

export const DISASTER_TYPES = [
  {id:'earthquake', eligible:(ctx)=>ctx.tickCount>=240, chance:()=>0.0012,
    resolve:(ctx)=>{
      const roll = ctx.rnd(100);
      const severity = roll < 65 ? {name:'Tremor', damage:1, fear:3}
        : roll < 92 ? {name:'Earthquake', damage:2, fear:8}
        : {name:'Major earthquake', damage:4, fear:14};
      const hit = ctx.damageRandomBuildings(severity.damage);
      ctx.addHappiness(-severity.fear*ctx.sewerRelief);
      return `🌍 ${severity.name}! ${hit} building(s) collapsed.`;
    }},
  {id:'volcano', eligible:(ctx)=>ctx.tickCount>=600 && ctx.hasMountainBuild, chance:()=>0.0006,
    resolve:(ctx)=>{
      const hit = ctx.damageRandomBuildings(2+ctx.rnd(2), b=>ctx.nearTerrainOfBuilding(b,'mountain'));
      const popLoss = ctx.rnd(2);
      ctx.reducePop(popLoss);
      ctx.addHappiness(-15*ctx.sewerRelief);
      return `🌋 The mountain erupted! ${hit} building(s) destroyed${popLoss? `, ${popLoss} lives lost`:''}.`;
    }},
  {id:'tsunami', eligible:(ctx)=>ctx.hasCoastalBuild, chance:()=>0.0008,
    resolve:(ctx)=>{
      const hit = ctx.damageRandomBuildings(2+ctx.rnd(2), b=>['docks','fisherhut','boatbuilder'].includes(b.id));
      ctx.reduceBoats(2);
      ctx.addHappiness(-10*ctx.sewerRelief);
      return `🌊 Tsunami struck the coast! ${hit} coastal building(s) destroyed.`;
    }},
  {id:'flood', eligible:(ctx)=>ctx.hasRiverBuild, chance:()=>0.0009,
    resolve:(ctx)=>{
      const hit = ctx.damageRandomBuildings(1+ctx.rnd(2), b=>ctx.nearTerrainOfBuilding(b,'river'));
      ctx.waterlogStores();
      ctx.addHappiness(-6*ctx.sewerRelief);
      return `🌧️ The river burst its banks! ${hit} building(s) damaged, stores waterlogged.`;
    }},
  {id:'drought', eligible:(ctx)=>ctx.hasFields && ctx.droughtTicksLeft<=0, chance:()=>0.001,
    resolve:(ctx)=>{
      ctx.startDrought(40);
      ctx.addHappiness(-5*ctx.sewerRelief);
      return `☀️ Drought has set in — field yields will suffer until it breaks.`;
    }},
  {id:'invasion', eligible:()=>true, chance:(ctx)=>0.0009 + Math.min(0.002, ctx.coin/60000),
    resolve:(ctx)=>ctx.resolveInvasion()},
];

// Mirrors the original early-return order: rolls are checked in sequence and
// the first eligible disaster whose independent roll succeeds is triggered.
export function pickDisaster(ctx){
  for(const disaster of DISASTER_TYPES){
    if(disaster.eligible(ctx) && Math.random() < disaster.chance(ctx)) return disaster;
  }
  return null;
}
