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
  {id:'dairyfarming', name:'Dairy Farming', desc:'Unlocks the Dairy', cost:18, tier:3, requires:['animalhusbandry'], effects:{}},
  {id:'tanning', name:'Tanning & Weaving', desc:'Unlocks the Tanner, Leatherworker, and Quilt Maker', cost:20, tier:3, requires:['animalhusbandry'], effects:{}},
  {id:'confectionery', name:'Confectionery', desc:'Unlocks the Candlemaker and bakery cake recipes', cost:22, tier:3, requires:['orcharding'], effects:{}},
];

export function techName(id){
  const tech = TECHS.find(t=>t.id===id);
  return tech ? tech.name : id;
}

export function techRequirementsMet(tech, unlockedTechs){
  return (tech.requires||[]).every(id=>unlockedTechs.has(id));
}
