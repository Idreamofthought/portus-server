// Research/tech tree data, extracted from protected/game.html.
// Effects are declarative (multiplicative techBonus keys, additive cap/military/
// happiness amounts) rather than closures, so this module has no dependency on
// game.html's mutable state — the caller applies the effects itself.

export const TECHS = [
  // Tier 1 — Foundations (no prerequisites)
  {id:'woodcraft', name:'Improved Tools', desc:'+10% woodcutter output', cost:8, tier:1, requires:[], effects:{techBonus:{wood:1.1}}},
  {id:'masonry', name:'Stoneworking', desc:'+25% quarry output', cost:8, tier:1, requires:[], effects:{techBonus:{quarry:1.25}}},
  {id:'irrigation', name:'Agriculture', desc:'+25% field yield', cost:8, tier:1, requires:[], effects:{techBonus:{field:1.25}}},
  {id:'metallurgy', name:'Basic Metallurgy', desc:'+25% foundry refining', cost:10, tier:1, requires:[], effects:{techBonus:{foundry:1.25}}},
  {id:'seafaring', name:'Seafaring', desc:'+25% fish catch', cost:10, tier:1, requires:[], effects:{techBonus:{fish:1.25}}},
  {id:'claycraft', name:'Claycraft', desc:'+25% claypit output', cost:8, tier:1, requires:[], effects:{techBonus:{clay:1.25}}},
  {id:'scholarship', name:'Scholarship', desc:'+25% research from Libraries', cost:10, tier:1, requires:[], effects:{techBonus:{research:1.25}}},
  // Tier 2 — requires one Tier 1 tech
  {id:'navigation', name:'Navigation', desc:'+20% trade income', cost:16, tier:2, requires:['seafaring'], effects:{techBonus:{trade:1.2}}},
  {id:'croprotation', name:'Crop Rotation', desc:'+80 food storage capacity', cost:18, tier:2, requires:['irrigation'], effects:{cap:{food:80}}},
  {id:'carpentry', name:'Carpentry', desc:'+60 general storage capacity', cost:18, tier:2, requires:['woodcraft'], effects:{cap:{general:60}}},
  {id:'fortification', name:'Fortification', desc:'+3 military capacity', cost:18, tier:2, requires:['masonry'], effects:{military:{cap:3}}},
  {id:'philosophy', name:'Philosophy', desc:'+6 happiness', cost:16, tier:2, requires:['scholarship'], effects:{techHappinessBonus:6}},
  // Tier 3 — requires one Tier 2 tech
  {id:'engineering', name:'Engineering', desc:'+40 general storage, +15% quarry', cost:26, tier:3, requires:['metallurgy'], effects:{cap:{general:40}, techBonus:{quarry:1.15}}},
  {id:'maritimetrade', name:'Maritime Trade', desc:'+30% trade income', cost:28, tier:3, requires:['navigation'], effects:{techBonus:{trade:1.3}}},
  {id:'granaryscience', name:'Granary Science', desc:'+120 food storage, +15% field yield', cost:30, tier:3, requires:['croprotation'], effects:{cap:{food:120}, techBonus:{field:1.15}}},
  {id:'siegecraft', name:'Siege Craft', desc:'+20% raid strength, +4 military capacity', cost:28, tier:3, requires:['fortification'], effects:{techBonus:{raid:1.2}, military:{cap:4}}},
  {id:'greatlibrary', name:'Great Library', desc:'+30% research, +10 happiness', cost:32, tier:3, requires:['philosophy'], effects:{techBonus:{research:1.3}, techHappinessBonus:10}},
  // Animal, orchard, and craft chains
  {id:'animalhusbandry', name:'Animal Husbandry', desc:'Unlocks pastures and the Butcher', cost:16, tier:2, requires:[], effects:{}},
  {id:'orcharding', name:'Orcharding', desc:'Unlocks Orchards and the Jam Maker', cost:14, tier:2, requires:['irrigation'], effects:{}},
  {id:'brewing', name:'Brewing & Viticulture', desc:'Unlocks the Winery, Brewery, and Meadery', cost:18, tier:2, requires:['irrigation'], effects:{}},
  {id:'dairyfarming', name:'Dairy Farming', desc:'Unlocks the Dairy', cost:18, tier:3, requires:['animalhusbandry'], effects:{}},
  {id:'tanning', name:'Tanning & Weaving', desc:'Unlocks the Tanner, Leatherworker, and Quilt Maker', cost:20, tier:3, requires:['animalhusbandry'], effects:{}},
  {id:'confectionery', name:'Confectionery', desc:'Unlocks the Candlemaker and Sugar House', cost:22, tier:3, requires:['orcharding'], effects:{}},
  // Defence and monuments
  {id:'armscrafting', name:'Arms Crafting', desc:'Unlocks the Armourer', cost:20, tier:3, requires:['metallurgy'], effects:{}},
  {id:'castlebuilding', name:'Castle Building', desc:'Unlocks the Fort', cost:34, tier:3, requires:['fortification'], effects:{}},
  {id:'monumentalarchitecture', name:'Monumental Architecture', desc:'Unlocks Grand and Monumental Temples', cost:30, tier:3, requires:['masonry'], effects:{}},
  // Tier 4 joins branches so established towns have longer-term ambitions.
  {id:'canalengineering', name:'Canal Engineering', desc:'+20% field yield and +100 food storage', cost:44, tier:4, requires:['engineering','granaryscience'], effects:{techBonus:{field:1.2},cap:{food:100}}},
  {id:'tradenetworks', name:'Trade Networks', desc:'+20% trade income and +100 general storage', cost:46, tier:4, requires:['maritimetrade','carpentry'], effects:{techBonus:{trade:1.2},cap:{general:100}}},
  {id:'mastercraft', name:'Master Craftspeople', desc:'+20% foundry refining and +15% woodcutter output', cost:46, tier:4, requires:['engineering','tanning'], effects:{techBonus:{foundry:1.2,wood:1.15}}},
  {id:'academy', name:'Academy of Scholars', desc:'+25% Library research and +4 happiness', cost:48, tier:4, requires:['greatlibrary','engineering'], effects:{techBonus:{research:1.25},techHappinessBonus:4}},
  {id:'defencestrategy', name:'Defence Strategy', desc:'+6 military capacity and +15% raid strength', cost:50, tier:4, requires:['siegecraft','castlebuilding'], effects:{military:{cap:6},techBonus:{raid:1.15}}},
  {id:'sacredcity', name:'Sacred City', desc:'+8 happiness and +50 general storage', cost:48, tier:4, requires:['monumentalarchitecture','philosophy'], effects:{techHappinessBonus:8,cap:{general:50}}},
];

export function techName(id){
  const tech = TECHS.find(t=>t.id===id);
  return tech ? tech.name : id;
}

export function techRequirementsMet(tech, unlockedTechs){
  return (tech.requires||[]).every(id=>unlockedTechs.has(id));
}

export const RESEARCH_PATHS = [
  {id:'food',name:'Food & farming',targets:['canalengineering','dairyfarming','confectionery'],why:'Grow more food, preserve harvests and develop dairy and sweet foods.'},
  {id:'industry',name:'Industry & crafts',targets:['mastercraft','armscrafting'],why:'Refine metals, work hides and equip your workshops and soldiers.'},
  {id:'trade',name:'Trade & sailing',targets:['tradenetworks'],why:'Improve trade income and make room for goods.'},
  {id:'research',name:'Knowledge & learning',targets:['academy'],why:'Increase research from Libraries and improve civic happiness.'},
  {id:'army',name:'Army & defence',targets:['defencestrategy','armscrafting','engineering'],why:'Unlock walls, towers, equipment, forts and greater military capacity.'},
  {id:'spirituality',name:'Spirituality',targets:['sacredcity','confectionery'],why:'Support candle production, build larger temples and lift civic happiness.'}
];

export const TECH_PURPOSE = {
  woodcraft:'Useful once a Woodcutter is supplying timber.',
  masonry:'Improves your Quarry and leads to walls, towers and larger temples.',
  irrigation:'Unlocks Fields: choose wheat, olives, chickpeas, grapes, barley or sugarcane.',
  metallurgy:'Unlocks the Blacksmith and Bronzesmith; a Foundry needs mined ore.',
  seafaring:'Improves fish from Fisherman’s Huts and Docks, then leads to better trade.',
  claycraft:'Improves clay supply for pottery, scribes and research.',
  scholarship:'Needs an operating Library supplied with scrolls from a Scribe.',
  animalhusbandry:'Pastures supply meat, milk and hides; Chicken Coops also supply feathers. The Butcher needs game and salt.',
  orcharding:'Orchards supply fruit. Jam also needs sugar from a Sugar House, unlocked by Confectionery.',
  brewing:'Fields supply grapes and barley; Beekeepers supply honey for mead.',
  dairyfarming:'Supply milk from Cow or Goat Pastures; cheese also needs salt.',
  tanning:'Hides → Tanner → Leatherworker. Chicken feathers → Quilt Maker.',
  confectionery:'Beekeeper wax → Candlemaker → Temple. Field sugarcane → Sugar House → Jam Maker or cake recipes.',
  armscrafting:'Supply bronze from a Foundry and tools to forge weapons and armour.',
  fortification:'Unlocks Walls and Guard Towers; keep stone and tools available.',
  castlebuilding:'Forts need substantial stone, timber, tools and workers.',
  monumentalarchitecture:'Larger temples need marble, refined gold and a steady candle supply.',
  engineering:'Unlocks Flood Defences and Moats; place them near water.',
  siegecraft:'Unlocks Traps and improves raids; it does not create troops automatically.'
};

// Prerequisites appear before descendants; shared requirements appear once.
export function researchPath(targets){
  const result = [], seen = new Set();
  function visit(id){
    if(seen.has(id)) return;
    seen.add(id);
    const tech = TECHS.find(t=>t.id===id);
    if(!tech) return;
    (tech.requires||[]).forEach(visit);
    result.push(tech);
  }
  targets.forEach(visit);
  return result;
}
