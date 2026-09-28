import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDiscoveryState,rollOfflineDiscovery,FOUNDATION_CODEX_ENTRIES}
  from '../desktop/discoveries.js';

test('offline artifact rolls unlock Codex text once and survive saved state',()=>{
  const state=emptyDiscoveryState();
  const artifact=rollOfflineDiscovery(state,'quest',1,()=>0);
  assert.equal(artifact.type,'artifact');
  assert.equal(state.unlocked.length,1);
  assert.equal(rollOfflineDiscovery(state,'quest',1,()=>0),null);
  assert.deepEqual(JSON.parse(JSON.stringify(state)),state);
  assert.ok(FOUNDATION_CODEX_ENTRIES.length>0);
});

test('archaeological fragments unlock their entry only on assembly',()=>{
  const state=emptyDiscoveryState();
  for(let index=1;index<=5;index++){
    const result=rollOfflineDiscovery(state,'quest',index,()=>0.99);
    // A high roll misses the quest chance; force success then choose a find.
    assert.equal(result,null);
  }
  const values=[0,0.9,0];
  for(let index=1;index<=5;index++){
    let position=0;
    const result=rollOfflineDiscovery(state,'quest',index+10,()=>values[position++%values.length]);
    assert.equal(result.fragmentIndex,index);
    assert.equal(result.assembled,index===5);
  }
  assert.equal(state.unlocked.length,1);
  assert.equal(state.fragments['broken-calendar-stone'],5);
});
