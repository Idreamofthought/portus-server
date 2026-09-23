// Roads use cardinal connections for transport, while nearby producers
// receive the existing eight-neighbour adjacency bonus.
const DEPOTS = new Set(['stockage', 'granary', 'market', 'tradingpost']);

export function roadNeighbours(grid, x, y){
  return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]
    .filter(([nx,ny])=>ny>=0 && ny<grid.length && nx>=0 && nx<grid[ny].length);
}

export function connectedToStore(grid, building){
  const queue = roadNeighbours(grid,building.x,building.y)
    .filter(([x,y])=>grid[y][x].building?.id==='road');
  const seen = new Set();
  while(queue.length){
    const [x,y] = queue.shift(), key = `${x},${y}`;
    if(seen.has(key)) continue;
    seen.add(key);
    for(const [nx,ny] of roadNeighbours(grid,x,y)){
      const id = grid[ny][nx].building?.id;
      if(DEPOTS.has(id)) return true;
      if(id==='road' && !seen.has(`${nx},${ny}`)) queue.push([nx,ny]);
    }
  }
  return false;
}

export function roadProductionBoost(grid, building){
  const nearRoad = [-1,0,1].some(dy=>[-1,0,1].some(dx=>
    (dx!==0 || dy!==0) && grid[building.y+dy]?.[building.x+dx]?.building?.id==='road'));
  return nearRoad ? connectedToStore(grid,building) ? 1.2 : 1.15 : 1;
}
