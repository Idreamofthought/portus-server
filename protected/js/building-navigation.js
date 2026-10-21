// Presentation groups leave the saved building catalogue and economy unchanged.
export const BUILDING_GROUPS = [
  {id:'food', name:'Food', icon:'🌾'},
  {id:'raw', name:'Raw materials', icon:'⛏️'},
  {id:'industry', name:'Industry', icon:'⚒️'},
  {id:'research', name:'Research', icon:'📚'},
  {id:'army', name:'Army & defence', icon:'🛡️'},
  {id:'spirituality', name:'Spirituality', icon:'⛩️'},
  {id:'housing', name:'Housing & services', icon:'🏠'},
  {id:'trade', name:'Trade & transport', icon:'🛒'}
];

const OVERRIDES = {
  food: ['farmerhut','fisherhut','fields','hunterlodge','docks','beekeeper','orchard','pigpasture','cowpasture','goatpasture','chickencoop','granary'],
  raw: ['sawmill','quarry','claypit'],
  research: ['scribe','library','school'],
  army: ['floodbarrier'],
  spirituality: ['temple','templegrand','templemonument','statue','undertaker','graveyard'],
  trade: ['road','boatbuilder','stockage']
};
const GROUP_BY_ID = Object.fromEntries(Object.entries(OVERRIDES).flatMap(([group, ids])=>ids.map(id=>[id,group])));
const GROUP_BY_CATEGORY = {Housing:'housing', Production:'industry', Mining:'raw', Infrastructure:'housing', Knowledge:'research', Trade:'trade', Military:'army', Storage:'trade', Services:'housing'};

export function buildingGroup(building){
  return GROUP_BY_ID[building.id] || GROUP_BY_CATEGORY[building.cat];
}

export function matchesBuilding(building, query, techName = id=>id){
  const group = BUILDING_GROUPS.find(group=>group.id===buildingGroup(building));
  const text = [building.name, building.desc, group?.name, building.requiresTech && techName(building.requiresTech),
    ...Object.keys(building.consume||{}), ...Object.keys(building.produce||{})].join(' ').toLowerCase();
  return query.toLowerCase().trim().split(/\s+/).every(word=>text.includes(word));
}
