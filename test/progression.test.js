import test from 'node:test';
import assert from 'node:assert/strict';
import { settlementAdvice } from '../protected/js/progression.js';
import { BUILDINGS } from '../protected/js/buildings.js';
import { BUILDING_GROUPS, buildingGroup, matchesBuilding } from '../protected/js/building-navigation.js';
import { TECHS, RESEARCH_PATHS, researchPath, techName } from '../protected/js/research.js';
import { createResources } from '../protected/js/resources.js';

const town = (ids=[],overrides={})=>({buildings:ids.map(id=>({id})),res:{...createResources(),fish:80},pop:{count:30,capacity:40},...overrides});
const foundation=['fisherhut','sawmill','quarry'];

test('a new town gets food advice before optional expansion',()=>{
  const advice=settlementAdvice(town([],{res:createResources()}));
  assert.equal(advice[0].action.building,'fisherhut');
  assert.equal(advice[0].urgent,true);
  assert.ok(advice.some(item=>item.action.building==='sawmill'));
  assert.ok(advice.some(item=>item.action.building==='quarry'));
});

test('knowledge guidance advances on both new and loaded town snapshots',()=>{
  const stages=['claypit','potter','scribe','library'];
  for(let index=0;index<stages.length;index++){
    const state=town([...foundation,...stages.slice(0,index)]);
    const advice=settlementAdvice(state);
    assert.equal(advice[0].action.building,stages[index]);
    const before=JSON.stringify(state);
    assert.deepEqual(settlementAdvice(state),advice);
    assert.equal(JSON.stringify(state),before,'advice must not mutate a save');
  }
});

test('missing suppliers take priority over an unrelated new industry',()=>{
  const advice=settlementAdvice(town([...foundation,'scribe','library']));
  assert.equal(advice[0].action.building,'potter');
  assert.match(advice[0].text,/pottery/i);
});

test('food shortage with too many jobs directs players to workers rather than more food jobs',()=>{
  const buildings=[...foundation,'workshop','scribe','library'];
  const state=town(buildings,{res:createResources(),pop:{count:6,capacity:6},military:{soldiers:0}});
  assert.equal(settlementAdvice(state)[0].action.building,'house');
  state.military.soldiers=2;
  assert.equal(settlementAdvice(state)[0].action.panel,'armyPanel');
});

test('a newly built food producer is allowed to build reserves before adding more jobs',()=>{
  const advice=settlementAdvice(town(['fisherhut'],{res:createResources()}));
  assert.equal(advice[0].action.panel,'productionPanel');
  assert.equal(advice[0].urgent,true);
  assert.ok(!advice.some(item=>item.action.building==='fisherhut'));
});

test('selected research ambition points to the next missing prerequisite',()=>{
  const buildings=[...foundation,'claypit','potter','scribe','library'];
  const res={...createResources(),fish:80,pottery:20,scrolls:20};
  const state=town(buildings,{res,researchGoal:'trade'});
  assert.equal(settlementAdvice(state)[0].action.tech,'seafaring');
  state.unlockedTechs=new Set(['seafaring']);
  assert.equal(settlementAdvice(state)[0].action.tech,'navigation');
});

test('all buildings have one usable menu group and search finds goods and unlocks',()=>{
  const groupIds=new Set(BUILDING_GROUPS.map(group=>group.id));
  for(const building of BUILDINGS) assert.ok(groupIds.has(buildingGroup(building)),building.id);
  const get=id=>BUILDINGS.find(building=>building.id===id);
  assert.equal(buildingGroup(get('fisherhut')),'food');
  assert.equal(buildingGroup(get('school')),'research');
  assert.equal(buildingGroup(get('temple')),'spirituality');
  assert.equal(buildingGroup(get('floodbarrier')),'army');
  assert.ok(matchesBuilding(get('scribe'),'scrolls'));
  assert.ok(matchesBuilding(get('guardtower'),'fortification',techName));
  assert.ok(!matchesBuilding(get('house'),'scrolls'));
});

test('research paths resolve all prerequisites once, in dependency order',()=>{
  for(const path of RESEARCH_PATHS){
    for(const id of path.targets) assert.ok(TECHS.some(tech=>tech.id===id));
    const route=researchPath(path.targets);
    const seen=new Set();
    for(const tech of route){
      assert.ok(!seen.has(tech.id),`${path.id}: duplicate ${tech.id}`);
      for(const id of tech.requires) assert.ok(seen.has(id),`${path.id}: ${id} must precede ${tech.id}`);
      seen.add(tech.id);
    }
    assert.ok(route.some(tech=>tech.tier===4),`${path.id} needs a longer-term destination`);
  }
});

test('advice actions always target existing buildings, discoveries or game panels',()=>{
  const state=town(BUILDINGS.filter(b=>!b.upgradeOnly).map(b=>b.id),{res:createResources()});
  const advice=[...settlementAdvice(town()),...settlementAdvice(state)];
  for(const item of advice){
    if(item.action.building) assert.ok(BUILDINGS.some(building=>building.id===item.action.building));
    if(item.action.tech) assert.ok(TECHS.some(tech=>tech.id===item.action.tech));
    if(item.action.panel) assert.ok(['researchPanel','armyPanel','taxPanel','productionPanel'].includes(item.action.panel));
  }
  const ids=settlementAdvice(state).map(item=>item.id);
  assert.equal(new Set(ids).size,ids.length);
});
