// Presentation lookup tables (terrain/deposit colors, resource descriptions),
// extracted from protected/game.html. Pure data, no rendering logic.

export const TERRAIN_COLOR = {
  sea:'#2b6777', river:'#3f8fa3', sand:'#e8dcc8', grass:'#8fa15e',
  forest:'#4c6b3f', mountain:'#8c8577'
};

export const DEPOSIT_COLOR = { gold:'#d4a017', silver:'#c9c9c9', copper:'#b5651d', clay:'#8a4a1c', salt:'#f2f2f2', marble:'#e3d7bb', tin:'#7a8ea0' };

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
  scrolls:'Scrolls: knowledge goods used by the Library and scholarly work.',
  marble:'Marble: fine stone prized in prestigious buildings and statues.',
  tin:'Tin: smelted metal used in alloys and trade routes.',
  bronze:'Bronze: alloyed metal used for statuary and durable civic works.',
  honey:'Honey: a sweet trade good gathered by beekeepers.',
  wax:'Wax: a valuable crafting material, refined into candles.',
  sugarcane:'Sugarcane: a sweet crop grown in fields, used by the Jam Maker.',
  feathers:'Feathers: gathered from chickens, used by the Quilt Maker.',
  hide:'Hide: raw animal skin, tanned into leather.',
  leather:'Leather: tanned hide used by the Leatherworker.',
  butter:'Butter: churned from milk at the Dairy.',
  cheese:'Cheese: churned from milk, prized for cakes and trade.',
  cream:'Cream: churned from milk at the Dairy.',
  jam:'Jam: preserved fruit and sugarcane, used by the Baker.',
  candles:'Candles: rendered from wax, burned in Temples and traded.',
  quilts:'Quilts: warm bedding crafted from feathers.',
  leatherGoods:'Leather goods: crafted wares made from leather.',
  meat:'Meat: raised on pastures and processed by the Butcher.',
  milk:'Milk: gathered from cows and goats.',
  eggs:'Eggs: gathered from chickens, used by the Baker.',
  fruit:'Fruit: grown in orchards, used for jam and cakes.',
  honeyCake:'Honey Cake: a baked treat that lifts the town\'s spirits.',
  fruitCake:'Fruit Cake: a baked treat that lifts the town\'s spirits.',
  dairyCake:'Dairy Cake: a baked treat that lifts the town\'s spirits.'
};
