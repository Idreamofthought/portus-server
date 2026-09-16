// Presentation lookup tables (terrain/deposit colors, resource descriptions),
// extracted from protected/game.html. Pure data, no rendering logic.

export const TERRAIN_COLOR = {
  sea:'#2b6777', river:'#3f8fa3', sand:'#e8dcc8', grass:'#8fa15e',
  forest:'#4c6b3f', mountain:'#8c8577'
};

export const DEPOSIT_COLOR = { gold:'#d4a017', silver:'#c9c9c9', copper:'#b5651d', clay:'#8a4a1c', salt:'#f2f2f2' };

export const RESOURCE_INFO = {
  wood:'Wood: basic building material, produced by the Woodcutter.',
  stone:'Stone: durable building material, produced by the Quarry.',
  clay:'Clay: raw material for pottery and some buildings.',
  pottery:'Pottery: crafted goods used by Scribes and for storage.',
  tools:'Tools: crafted equipment used by advanced buildings.',
  goldOre:'Gold ore: mined raw metal for the Foundry.',
  silverOre:'Silver ore: mined raw metal for the Foundry.',
  copperOre:'Copper ore: mined raw metal for the Foundry.',
  gold:'Gold: valuable refined metal and trade wealth.',
  silver:'Silver: refined metal used for trade.',
  copper:'Copper: refined metal used for trade.',
  wheat:'Wheat: staple crop, milled into flour.',
  flour:'Flour: milled wheat used to bake bread.',
  bread:'Bread: food made from flour for the settlement.',
  olives:'Olives: crop used to make olive oil.',
  oliveOil:'Olive oil: valuable food and trade good.',
  chickpeas:'Chickpeas: nourishing crop for the settlement.',
  grapes:'Grapes: crop used for food and trade.',
  salt:'Salt: coastal resource used in trade and preservation.',
  fish:'Fish: food gathered from the coast and rivers.',
  deer:'Deer: food gathered from nearby woodland.',
  scrolls:'Scrolls: knowledge goods used by the Library.'
};
