import test from 'node:test';
import assert from 'node:assert/strict';
import { marshTargets, marshPlacementAllowed, advanceMarshLesson } from '../protected/js/marsh-lesson.js';

function practice(){
  const grid=Array.from({length:9},()=>Array.from({length:9},()=>({building:null})));
  const targets=marshTargets(4,4);
  const mill={id:'mill',x:targets.mill[0],y:targets.mill[1]};
  const store={id:'stockage',x:targets.storage[0],y:targets.storage[1]};
  grid[mill.y][mill.x].building=mill;
  grid[store.y][store.x].building=store;
  return {grid,lesson:{targets,mill,phase:'wood'}};
}
function put(grid,id,[x,y]){
  const building={id,x,y};
  grid[y][x].building=building;
  return building;
}

test('the practice lesson teaches terrain first, then all three roads to storage',()=>{
  const {grid,lesson}=practice();
  assert.equal(marshPlacementAllowed(lesson,'road',3,4),false);
  assert.equal(marshPlacementAllowed(lesson,'sawmill',2,4),true);
  assert.equal(advanceMarshLesson(lesson,put(grid,'sawmill',lesson.targets.sawmill),grid),'wood');
  assert.equal(marshPlacementAllowed(lesson,'quarry',6,4),true);
  assert.equal(advanceMarshLesson(lesson,put(grid,'quarry',lesson.targets.quarry),grid),'stone');
  assert.equal(lesson.phase,'roads');
  for(const [index,slot] of lesson.targets.roads.entries()){
    assert.equal(marshPlacementAllowed(lesson,'road',...slot),true);
    const result=advanceMarshLesson(lesson,put(grid,'road',slot),grid);
    assert.equal(result,index===2?'flow':'road');
  }
  assert.equal(lesson.phase,'flow');
  assert.equal(marshPlacementAllowed(lesson,'road',3,4),false);
});

test('the lesson does not finish when a road link is missing',()=>{
  const {grid,lesson}=practice();
  advanceMarshLesson(lesson,put(grid,'sawmill',lesson.targets.sawmill),grid);
  advanceMarshLesson(lesson,put(grid,'quarry',lesson.targets.quarry),grid);
  for(const slot of lesson.targets.roads.slice(0,2))
    advanceMarshLesson(lesson,put(grid,'road',slot),grid);
  assert.equal(lesson.phase,'roads');
});
