import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {migrateSave,validateSave} from '../save-validation.js';
import {validSave} from './fixtures/valid-save.js';

const source=fs.readFileSync(new URL('../protected/js/game.js',import.meta.url),'utf8');
const start=source.indexOf('function applyState(s){');
const end=source.indexOf("document.getElementById('captainInput').oninput",start);
const loader=source.slice(start,end);
function harness(){
  const events=[];
  const context={migrateSave,validateSave,desktopMode:false,importedDiscoveries:null,
    res:{wood:123},FOOD_KEYS:['wheat'],GENERAL_KEYS:['wood'],remembered:new Set(),techBonus:{},grid:[],
    document:{getElementById:()=>({value:''})},dismissVoice:()=>events.push('dismiss'),
    showToast:message=>events.push(message),setGrid(g){context.grid=g;},
    render(){},renderRes(){},renderPanel(){},renderCodexPanel(){},updateWorldMood(){},playTone(){},logEvent(){}};
  vm.createContext(context);vm.runInContext(loader,context);
  return {context,events};
}

test('actual loader rejects malformed saves before changing any live state',()=>{
  const candidates=[
    {...validSave(),grid:[]},
    {...validSave(),buildings:[{id:'house',x:44,y:0}]},
    {...validSave(),buildings:[{id:'house',x:0,y:0},{id:'house',x:0,y:0}]},
    {...validSave(),res:{wood:-1}},
    {...validSave(),offlineDiscoveries:{unlocked:['../../server.js']}}
  ];
  for(const candidate of candidates){
    const {context,events}=harness();const original=context.res;
    assert.doesNotThrow(()=>context.applyState(candidate));
    assert.equal(context.res,original);assert.equal(context.res.wood,123);
    assert.equal(context.grid.length,0);assert.equal(context.importedDiscoveries,null);
    assert.deepEqual(events,['That save code looks invalid']);
  }
});

test('actual loader migrates valid older saves and preserves portable discoveries',()=>{
  const candidate=validSave();delete candidate.res.yoghurt;delete candidate.tickCount;
  candidate.offlineDiscoveries={rolls:['mining:1'],artifacts:['star_reader'],fragments:{old_tablet:1},unlocked:['artifacts/star-reader']};
  const {context,events}=harness();
  assert.doesNotThrow(()=>context.applyState(candidate));
  assert.equal(context.res.yoghurt,0);assert.equal(context.tickCount,0);
  assert.equal(context.grid.length,30);assert.equal(context.grid[0][0].building.id,'house');
  assert.equal(context.importedDiscoveries,candidate.offlineDiscoveries);
  assert.equal(events[0],'dismiss');
  // Execute the real export helper as well: browser exports retain desktop data.
  const portable=source.slice(source.indexOf('function getPortableState(){'),source.indexOf('function encodeState(s){'));
  context.getState=()=>validSave();vm.runInContext(portable,context);
  const exported=context.getPortableState();
  assert.deepEqual(exported.offlineDiscoveries,candidate.offlineDiscoveries);
  assert.equal(validateSave(exported).ok,true);
});

test('portable metadata is optional, validated and never disables strict settlement checks',()=>{
  const candidate=validSave();assert.equal(validateSave(candidate).ok,true);
  candidate.offlineDiscoveries={rolls:[],artifacts:[],fragments:{},unlocked:[]};
  assert.equal(validateSave(candidate).ok,true);
  candidate.unrecognised=true;assert.equal(validateSave(candidate).ok,false);
  delete candidate.unrecognised;candidate.offlineDiscoveries.fragments.unknown=-1;
  assert.equal(validateSave(candidate).ok,false);
});
