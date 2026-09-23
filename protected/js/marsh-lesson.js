import { connectedToStore } from './road-network.js';

export function marshTargets(cx,cy){
  return {
    sawmill:[cx-2,cy],
    quarry:[cx+2,cy],
    roads:[[cx-1,cy],[cx+1,cy],[cx,cy-1]],
    field:[cx,cy-3],
    mill:[cx,cy-2],
    storage:[cx,cy]
  };
}

export function marshPlacementAllowed(lesson,id,x,y){
  const target = lesson.phase==='wood' ? lesson.targets.sawmill :
    lesson.phase==='stone' ? lesson.targets.quarry : null;
  if(target) return id===(lesson.phase==='wood'?'sawmill':'quarry') &&
    x===target[0] && y===target[1];
  return lesson.phase==='roads' && id==='road' &&
    lesson.targets.roads.some(([rx,ry])=>rx===x && ry===y);
}

export function advanceMarshLesson(lesson,building,grid){
  if(lesson.phase==='wood' && building.id==='sawmill'){
    lesson.sawmill=building;
    lesson.phase='stone';
    return 'wood';
  }
  if(lesson.phase==='stone' && building.id==='quarry'){
    lesson.quarry=building;
    lesson.phase='roads';
    return 'stone';
  }
  if(lesson.phase==='roads' && building.id==='road'){
    const allRoads = lesson.targets.roads.every(([x,y])=>grid[y][x].building?.id==='road');
    if(allRoads && [lesson.sawmill,lesson.quarry,lesson.mill]
      .every(producer=>connectedToStore(grid,producer))){
      lesson.phase='flow';
      return 'flow';
    }
    return 'road';
  }
  return null;
}
