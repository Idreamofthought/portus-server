import test from 'node:test';
import assert from 'node:assert/strict';
import { connectedToStore, roadProductionBoost } from '../protected/js/road-network.js';

function town(){
  return Array.from({length:5},()=>Array.from({length:7},()=>({building:null})));
}
function place(grid,id,x,y){
  const building={id,x,y};
  grid[y][x].building=building;
  return building;
}

test('a producer gains a modest bonus near a road and a larger one only with a route to storage',()=>{
  const grid=town();
  const mill=place(grid,'mill',1,2);
  place(grid,'road',2,2);
  assert.equal(roadProductionBoost(grid,mill),1.15);
  place(grid,'road',3,2);
  place(grid,'stockage',4,2);
  assert.equal(roadProductionBoost(grid,mill),1.2);
  assert.equal(connectedToStore(grid,mill),true);
  grid[2][3].building=null;
  assert.equal(roadProductionBoost(grid,mill),1.15);
});

test('diagonal contact gives the nearby bonus but cannot make a transport route',()=>{
  const grid=town();
  const potter=place(grid,'potter',1,1);
  place(grid,'road',2,2);
  place(grid,'stockage',3,2);
  assert.equal(roadProductionBoost(grid,potter),1.15);
  assert.equal(connectedToStore(grid,potter),false);
});
