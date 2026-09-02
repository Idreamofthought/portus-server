/* ============================================================
   BUILDINGS MODULE — Portus
   Full extraction: catalogue, categories, placement validation,
   building effects, and helper accessors.
   ============================================================ */

import { nearTerrain, nearDeposit, nearBuilding, inBounds } from "./map.js";

/* ---------------- BUILDING CATALOGUE ---------------- */

export const BUILDINGS = [

    {id:'house', name:"House", ic:'🏠', cat:'Housing',
     cost:{wood:20,stone:10}, workers:0, popCap:4,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain)},

    {id:'farmerhut', name:"Farmer's Hut", ic:'🧑‍🌾', cat:'Housing',
     cost:{wood:20}, workers:2, popCap:2,
     valid:(grid,x,y)=>grid[y][x].terrain==='grass',
     desc:'Boosts nearby fields'},

    {id:'fisherhut', name:"Fisherman's Hut", ic:'🎣', cat:'Housing',
     cost:{wood:20}, workers:2, popCap:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain)
                       && nearTerrain(x,y,['sea','river'],1),
     produce:{fish:1.6}},

    {id:'fields', name:"Field", ic:'🌾', cat:'Production',
     cost:{wood:10}, workers:2, isField:true,
     valid:(grid,x,y)=>grid[y][x].terrain==='grass'},

    {id:'quarry', name:"Quarry", ic:'⛏️', cat:'Production',
     cost:{wood:30}, workers:2,
     valid:(grid,x,y)=>grid[y][x].terrain==='mountain',
     produce:{stone:2.2}},

    {id:'claypit', name:"Claypit", ic:'🕳️', cat:'Production',
     cost:{wood:20}, workers:2,
     valid:(grid,x,y)=>grid[y][x].deposit==='clay',
     produce:{clay:2}},

    {id:'potter', name:"Potter", ic:'🏺', cat:'Production',
     cost:{wood:30,stone:10}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     consume:{clay:2}, produce:{pottery:1.6}},

    {id:'sawmill', name:"Sawmill", ic:'🪚', cat:'Production',
     cost:{wood:20}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain)
                       && nearTerrain(x,y,['forest'],1),
     produce:{wood:3}},

    {id:'workshop', name:"Workshop", ic:'🔨', cat:'Production',
     cost:{wood:40,stone:20}, workers:3,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     consume:{wood:1.5,stone:1}, produce:{tools:1.6}},

    {id:'blacksmith', name:"Blacksmith", ic:'⚒️', cat:'Production',
     cost:{wood:30,stone:30}, workers:3,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     consume:{copper:1,wood:1}, produce:{tools:2}},

    {id:'foundry', name:"Foundry", ic:'🔥', cat:'Production',
     cost:{stone:50,wood:20}, workers:3,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     special:'foundry'},

    {id:'hunterlodge', name:"Hunter's Lodge", ic:'🏹', cat:'Production',
     cost:{wood:25}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain)
                       && nearTerrain(x,y,['forest'],1),
     produce:{deer:1.5}},

    {id:'docks', name:"Docks", ic:'⚓', cat:'Production',
     cost:{wood:40}, workers:2,
     valid:(grid,x,y)=>grid[y][x].terrain==='sand'
                       && nearTerrain(x,y,['sea','river'],1),
     produce:{fish:2}},

    {id:'boatbuilder', name:"Boat Builder", ic:'🛶', cat:'Production',
     cost:{wood:60,stone:20}, workers:3,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain)
                       && nearBuilding(x,y,'docks',2),
     consume:{wood:5}, special:'boat'},

    {id:'goldmine', name:"Gold Mine", ic:'🟡', cat:'Mining',
     cost:{wood:40,stone:30}, workers:3,
     valid:(grid,x,y)=>grid[y][x].deposit==='gold',
     produce:{goldOre:1.2}},

    {id:'silvermine', name:"Silver Mine", ic:'⚪', cat:'Mining',
     cost:{wood:40,stone:30}, workers:3,
     valid:(grid,x,y)=>grid[y][x].deposit==='silver',
     produce:{silverOre:1.4}},

    {id:'coppermine', name:"Copper Mine", ic:'🟠', cat:'Mining',
     cost:{wood:40,stone:30}, workers:3,
     valid:(grid,x,y)=>grid[y][x].deposit==='copper',
     produce:{copperOre:1.6}},

    {id:'saltmine', name:"Salt Flats", ic:'🧂', cat:'Mining',
     cost:{wood:35,stone:25}, workers:3,
     valid:(grid,x,y)=>grid[y][x].deposit==='salt',
     produce:{salt:1.3}},

    {id:'mill', name:"Mill", ic:'⚙️', cat:'Production',
     cost:{wood:35,stone:15}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     consume:{wheat:2}, produce:{flour:1.6}},

    {id:'baker', name:"Baker", ic:'🍞', cat:'Production',
     cost:{wood:25,stone:10}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     consume:{flour:1.5}, produce:{bread:1.3}},

    {id:'oliveoilmill', name:"Olive Press", ic:'🛢️', cat:'Production',
     cost:{wood:30,stone:15}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     consume:{olives:2}, produce:{oliveOil:1.4}},

    {id:'stockage', name:"Storage Yard", ic:'📦', cat:'Storage',
     cost:{wood:50,stone:30}, workers:1,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     capBonus:{general:200}},

    {id:'granary', name:"Granary", ic:'🏛️', cat:'Storage',
     cost:{wood:40,stone:20}, workers:1,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     capBonus:{food:250}},

    {id:'road', name:"Road", ic:'🛤️', cat:'Infrastructure',
     cost:{stone:5}, workers:0,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     desc:'Buildings next to a road produce 15% more'},

    {id:'well', name:"Well", ic:'💧', cat:'Infrastructure',
     cost:{stone:15}, workers:1,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain)
                       && nearTerrain(x,y,['river','sea'],3),
     happinessBonus:4, desc:'Irrigates nearby fields, +happiness'},

    {id:'sewer', name:"Sewer", ic:'♻️', cat:'Infrastructure',
     cost:{stone:25,tools:5}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     happinessBonus:5, desc:'Softens disaster impact, +happiness'},

    {id:'police', name:"Police Post", ic:'🛡️', cat:'Services',
     cost:{wood:30,stone:20}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     happinessBonus:6},

    {id:'fire', name:"Fire Post", ic:'🧯', cat:'Services',
     cost:{wood:30,stone:20}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     happinessBonus:5},

    {id:'doctor', name:"Doctor's House", ic:'⚕️', cat:'Services',
     cost:{wood:30,stone:30}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     happinessBonus:7},

    {id:'dentist', name:"Dentist", ic:'🦷', cat:'Services',
     cost:{wood:30,stone:20,tools:10}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     happinessBonus:6},

    {id:'school', name:"School", ic:'🏫', cat:'Services',
     cost:{wood:40,stone:20}, workers:3,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     happinessBonus:5,
     desc:'Boosts nearby Library research by 20%'},

    {id:'bar', name:"Bar", ic:'🍺', cat:'Services',
     cost:{wood:25,stone:10}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     happinessBonus:8},

    {id:'temple', name:"Temple", ic:'⛩️', cat:'Services',
     cost:{stone:50,gold:6}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     happinessBonus:12},

    {id:'scribe', name:"Scribe's House", ic:'✒️', cat:'Knowledge',
     cost:{wood:25,pottery:6}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     consume:{pottery:0.6}, produce:{scrolls:1.2}},

    {id:'library', name:"Library", ic:'📚', cat:'Knowledge',
     cost:{wood:40,stone:20,tools:5}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     consume:{scrolls:1}, special:'library', happinessBonus:4},

    {id:'market', name:"Market", ic:'🛒', cat:'Trade',
     cost:{wood:30,stone:10}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     special:'market'},

    {id:'tradingpost', name:"Trading Post", ic:'🐫', cat:'Trade',
     cost:{wood:50,stone:20,tools:5}, workers:3,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain)
                       && nearTerrain(x,y,['sea','river'],2),
     special:'caravan'},

    {id:'taxoffice', name:"Tax Office", ic:'🏦', cat:'Trade',
     cost:{wood:40,stone:25}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     special:'taxoffice',
     desc:'Unlocks the Taxes panel'},

    {id:'barracks', name:"Barracks", ic:'🏹', cat:'Military',
     cost:{wood:40,stone:20,tools:10}, workers:2,
     valid:(grid,x,y)=>['grass','sand'].includes(grid[y][x].terrain),
     militaryCap:6},

];

/* ---------------- INDEXES ---------------- */

export const BLD_BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));

export const CATS = [
    'Housing','Production','Mining','Infrastructure',
    'Knowledge','Trade','Military','Storage','Services'
];

/* ---------------- ACCESSORS ---------------- */

export function getBuildingDefinition(id) {
    return BLD_BY_ID[id] || null;
}

export function getBuildingsByCategory(cat) {
    return BUILDINGS.filter(b => b.cat === cat);
}

/* ---------------- VALIDATION ---------------- */

export function canPlaceBuilding(grid, x, y, id) {
    const def = BLD_BY_ID[id];
    if (!def) return false;
    if (!inBounds(x, y)) return false;
    if (grid[y][x].building) return false;
    return def.valid(grid, x, y);
}

/* ---------------- EFFECTS ---------------- */

export function applyBuildingEffects(state, def) {
    if (def.popCap) state.pop.capacity += def.popCap;
    if (def.militaryCap) state.military.cap += def.militaryCap;

    if (def.capBonus) {
        if (def.capBonus.general) state.cap.general += def.capBonus.general;
        if (def.capBonus.food) state.cap.food += def.capBonus.food;
    }
}

/* ---------------- PLACEMENT ---------------- */

export function buildBuilding(state, grid, x, y, id, crop = null) {
    const def = BLD_BY_ID[id];
    if (!def) return null;

    const b = { id, x, y };
    if (def.isField) b.crop = crop;

    grid[y][x].building = b;
    state.placedBuildings.push(b);

    applyBuildingEffects(state, def);

    return b;
}

/* ---------------- PRODUCTION / CONSUMPTION ---------------- */

export function buildingProduces(def) {
    return def.produce || null;
}

export function buildingConsumes(def) {
    return def.consume || null;
     }
