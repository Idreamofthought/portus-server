// Player-choice events, presented as a modal with two options.
// Each choice's resolve(ctx) applies effects and returns a narrative message;
// ctx supplies the stateful helpers so this module stays pure data.

export const CHOICE_EVENTS = [
  {
    id: 'granary-rats',
    title: 'Rats in the Granary',
    text: 'Rats have been found in the winter stores. The granary keeper wants to burn the spoiled sacks; others say to sort the grain by hand.',
    eligible: (ctx) => ctx.totalFood > 20,
    chance: () => 0.02,
    choices: [
      {
        label: 'Burn the spoiled stores',
        detail: 'Lose some food now, prevent famine later',
        resolve: (ctx) => {
          ctx.scaleFood(0.85);
          ctx.setFamineGuard(60);
          return '🔥 The spoiled sacks were burned. The stores are clean, and famine is held off.';
        }
      },
      {
        label: 'Sort the grain by hand',
        detail: 'Keep the food, but risk a famine',
        resolve: (ctx) => {
          if (ctx.chance(0.5)) {
            ctx.addHappiness(-8);
            ctx.scaleFood(0.5);
            return '🐀 The rats spread. Much of the harvest was lost to rot.';
          }
          ctx.addHappiness(4);
          return '🌾 Careful hands saved the harvest. The people are grateful.';
        }
      }
    ]
  },
  {
    id: 'dry-season-fire',
    title: 'A Dry Season',
    text: 'The timber roofs are tinder-dry. The fire warden asks to tear down the oldest thatch before a spark finds it.',
    eligible: (ctx) => ctx.buildingCount >= 6,
    chance: () => 0.018,
    choices: [
      {
        label: 'Tear down the old thatch',
        detail: 'Costs wood, prevents fire',
        resolve: (ctx) => {
          ctx.payWood(15);
          ctx.setFireGuard(60);
          return '🪵 The driest roofs were stripped and replaced. The town is safe from fire for now.';
        }
      },
      {
        label: 'Leave it and hope for rain',
        detail: 'Costs nothing, risks a fire',
        resolve: (ctx) => {
          if (ctx.chance(0.45)) {
            const hit = ctx.damageBuildings(1 + ctx.rnd(2));
            ctx.addHappiness(-10);
            return `🔥 Fire swept the old quarter — ${hit} building(s) burned down.`;
          }
          return '🌧️ The rains came early. The roofs held.';
        }
      }
    ]
  },
  {
    id: 'river-swell',
    title: 'The River Swells',
    text: 'Meltwater is rising fast against the banks. Labourers could be pulled off their work to raise an earthen dike.',
    eligible: (ctx) => ctx.hasRiverBuild,
    chance: () => 0.018,
    choices: [
      {
        label: 'Raise a dike',
        detail: 'Costs stone, prevents flooding',
        resolve: (ctx) => {
          ctx.payStone(20);
          ctx.setFloodGuard(60);
          return '🧱 The dike holds the river back. The low quarters are safe.';
        }
      },
      {
        label: 'Carry on as normal',
        detail: 'Costs nothing, risks a flood',
        resolve: (ctx) => {
          if (ctx.chance(0.45)) {
            const hit = ctx.damageBuildings(1 + ctx.rnd(2), (b) => ctx.nearRiver(b));
            ctx.waterlogStores();
            ctx.addHappiness(-8);
            return `🌧️ The river broke its banks — ${hit} building(s) damaged and stores waterlogged.`;
          }
          return '🌤️ The waters fell back. No harm done.';
        }
      }
    ]
  },
  {
    id: 'angry-gods',
    title: 'An Ill Omen',
    text: 'The priests report a bull born with two heads. They ask for a costly offering to turn away the anger of the gods.',
    eligible: (ctx) => ctx.hasTemple,
    chance: () => 0.015,
    choices: [
      {
        label: 'Make the offering',
        detail: 'Costs coin, earns divine favour',
        resolve: (ctx) => {
          const paid = ctx.payCoin(25);
          if (!paid) {
            ctx.addHappiness(-6);
            return '🏛️ You had no coin for the offering. The priests despair.';
          }
          ctx.addHappiness(10);
          ctx.setDivineFavour(80);
          return '🕯️ The offering was made. A calm settles over the town.';
        }
      },
      {
        label: 'Dismiss the omen',
        detail: 'Costs nothing, risks divine anger',
        resolve: (ctx) => {
          if (ctx.chance(0.4)) {
            ctx.addHappiness(-14);
            ctx.reducePop(1);
            return '⛈️ The gods were not mocked. Sickness took one of your people.';
          }
          ctx.addHappiness(3);
          return '🌤️ Nothing came of it. The people shrug at the priests.';
        }
      }
    ]
  },
  {
    id: 'mercenary-offer',
    title: 'Mercenaries at the Gate',
    text: 'A band of sellswords offers to garrison your walls through the season — for a price.',
    eligible: (ctx) => ctx.coin >= 40,
    chance: () => 0.015,
    choices: [
      {
        label: 'Hire them',
        detail: 'Costs 40 coin, adds soldiers',
        resolve: (ctx) => {
          const paid = ctx.payCoin(40);
          if (!paid) return '🪙 You could not meet their price. They moved on.';
          ctx.addSoldiers(3);
          return '⚔️ Three hardened sellswords now stand on your walls.';
        }
      },
      {
        label: 'Send them away',
        detail: 'Costs nothing, they may turn hostile',
        resolve: (ctx) => {
          if (ctx.chance(0.3)) {
            const loss = ctx.stealCoin(20);
            return `🗡️ Spurned, the mercenaries raided outlying stores — ${loss} coin taken.`;
          }
          return '🚪 The sellswords moved on without trouble.';
        }
      }
    ]
  }
];

export function pickChoiceEvent(ctx) {
  for (const event of CHOICE_EVENTS) {
    if (event.eligible(ctx) && Math.random() < event.chance(ctx)) return event;
  }
  return null;
}
