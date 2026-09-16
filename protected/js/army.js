// Raid tiers and resolution, extracted from protected/game.html.
// resolveRaid() is a pure function of (tier, ctx) so raid balance/logic is
// independently testable without game.html's DOM/state coupling.

export const RAID_TIERS = {
  small:{soldiers:3, enemy:[2,5], reward:[10,25]},
  medium:{soldiers:6, enemy:[5,10], reward:[25,60]},
  large:{soldiers:10, enemy:[9,16], reward:[60,140]},
};

export function resolveRaid(tier, ctx){
  const enemyStrength = tier.enemy[0] + ctx.rnd(tier.enemy[1]-tier.enemy[0]+1);
  if(tier.soldiers*ctx.raidBonus >= enemyStrength){
    const loot = tier.reward[0] + ctx.rnd(tier.reward[1]-tier.reward[0]+1);
    const losses = Math.floor(tier.soldiers*0.1*Math.random());
    return {
      success:true, loot, losses,
      message: `🗡️ Raid succeeded: +${loot} coin, lost ${losses} soldiers.`,
      toast: `Raid successful! +${loot} coin`,
    };
  }
  const losses = Math.floor(tier.soldiers*(0.4+Math.random()*0.4));
  return {
    success:false, loot:0, losses,
    message: `🗡️ Raid failed: lost ${losses} soldiers.`,
    toast: 'Raid failed — soldiers lost',
  };
}
