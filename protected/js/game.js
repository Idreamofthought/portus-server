import { COLS, ROWS, TS, grid, setGrid, rnd, genMap, inBounds, neighbors, nearTerrain, nearBuilding, nearDeposit } from '/game-assets/map.js';
import { BUILDINGS, BLD_BY_ID, CATS } from '/game-assets/buildings.js';
import { TECHS, techName, techRequirementsMet } from '/game-assets/research.js';
import { FOOD_KEYS, GENERAL_KEYS, PRICES, createResources, totalFood as totalFoodOf, addResTo, canAffordFrom, payFrom } from '/game-assets/resources.js';
import { QUESTS } from '/game-assets/quests.js';
import { SCENARIOS } from '/game-assets/scenarios.js';
import { pickDisaster } from '/game-assets/disasters.js';
import { RAID_TIERS, resolveRaid } from '/game-assets/army.js';
import { GOD_MESSAGES } from '/game-assets/blessings.js';
import { pickChoiceEvent } from '/game-assets/events.js';
import { TERRAIN_COLOR, DEPOSIT_COLOR, RESOURCE_INFO } from '/game-assets/presentation.js';
import { createPortusMusic } from '/music.js';

let selectedCrop = 'wheat';
const TRADE_GOODS = [
  { id: 'marble', label: 'Marble', buyCost: 12, sellValue: 4 },
  { id: 'tin', label: 'Tin', buyCost: 10, sellValue: 3 },
  { id: 'bronze', label: 'Bronze', buyCost: 15, sellValue: 5 },
  { id: 'honey', label: 'Honey', buyCost: 8, sellValue: 3 },
  { id: 'wax', label: 'Wax', buyCost: 9, sellValue: 3 },
  { id: 'candles', label: 'Candles', buyCost: 11, sellValue: 4 },
  { id: 'cheese', label: 'Cheese', buyCost: 9, sellValue: 3 },
  { id: 'jam', label: 'Jam', buyCost: 10, sellValue: 3 },
  { id: 'quilts', label: 'Quilts', buyCost: 16, sellValue: 6 },
  { id: 'leatherGoods', label: 'Leather Goods', buyCost: 20, sellValue: 7 },
  { id: 'statues', label: 'Bronze Statues', buyCost: 26, sellValue: 9 },
  { id: 'wine', label: 'Wine', buyCost: 14, sellValue: 5 },
  { id: 'beer', label: 'Beer', buyCost: 9, sellValue: 3 },
  { id: 'mead', label: 'Mead', buyCost: 13, sellValue: 4 }
];

/* ---------------- TRADE DEMAND ---------------- */
// buy = base*(1 + demand*X), sell = base*(1 + demand*Y). X > Y and buyCost >
// sellValue keep the post's margin positive at every demand level.
const DEMAND_BUY_SENSITIVITY = 0.8;
const DEMAND_SELL_SENSITIVITY = 0.35;
const tradeDemand = Object.fromEntries(TRADE_GOODS.map(g=>[g.id, 0.3 + Math.random()*0.4]));

function clampDemand(value){ return Math.max(0, Math.min(1, value)); }

function driftTradeDemand(){
  TRADE_GOODS.forEach(good=>{
    const wobble = (Math.random()-0.5)*0.09;
    const meanReversion = (0.5 - tradeDemand[good.id])*0.03;
    tradeDemand[good.id] = clampDemand(tradeDemand[good.id] + wobble + meanReversion);
  });
}

function buyPriceOf(good){
  return Math.max(1, Math.round(good.buyCost * (1 + tradeDemand[good.id]*DEMAND_BUY_SENSITIVITY)));
}
function sellPriceOf(good){
  return Math.max(1, Math.round(good.sellValue * (1 + tradeDemand[good.id]*DEMAND_SELL_SENSITIVITY)));
}
function demandLabel(good){
  const d = tradeDemand[good.id];
  if(d < 0.25) return ['Glut', 'd-glut'];
  if(d < 0.5) return ['Steady', 'd-steady'];
  if(d < 0.75) return ['Wanted', 'd-wanted'];
  return ['Scarce', 'd-scarce'];
}

/* ---------------- RESOURCES ---------------- */
// FOOD_KEYS/GENERAL_KEYS/PRICES and the helper logic live in
// protected/js/resources.js; these wrappers bind that logic to the local
// mutable res/cap so existing call sites don't need to change.
let res = createResources();
let cap = { general:150, food:150 };
let pop = { count:6, capacity:10 };
let happiness = 55;
let boats = 0;
let tickCount = 0;
let coin = 20;       // trade currency, not subject to storage cap
let research = 0;    // banked research points, spent on techs
let codexEntries = [];
let military = { soldiers:0, cap:0 };
let droughtTicksLeft = 0;
// Seasonal protections won from choice events; runtime-only, not saved.
let famineGuardTicks = 0;
let fireGuardTicks = 0;
let floodGuardTicks = 0;
let divineFavourTicks = 0;
let choiceEventOpen = false;
let captainName = '';
let eventLog = [];
let discoveryRollInFlight = false;
let taxRate = 0;      // coin per citizen per tick
let scenarioId = null;
let techHappinessBonus = 0;
let questsCompleted = new Set();
let buildingPops = [];
let previousResourceValues = {};

const audioState = { context: null };
function playTone(kind){
  try{
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if(!AudioContext) return;
    audioState.context ||= new AudioContext();
    const oscillator = audioState.context.createOscillator();
    const gain = audioState.context.createGain();
    const settings = {click:[440,0.035], build:[220,0.12], gather:[660,0.08]}[kind] || [440,0.05];
    oscillator.frequency.value = settings[0];
    oscillator.type = kind === 'build' ? 'triangle' : 'sine';
    gain.gain.setValueAtTime(0.045, audioState.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioState.context.currentTime + settings[1]);
    oscillator.connect(gain).connect(audioState.context.destination);
    oscillator.start();
    oscillator.stop(audioState.context.currentTime + settings[1]);
  } catch(e){ /* Audio is enhancement only. */ }
}

/* ---- Research / Tech tree ---- */
// Tech definitions live in protected/js/research.js; techBonus/cap/military/
// techHappinessBonus stay local mutable state, applied via applyTechEffects().
const techBonus = { field:1, quarry:1, fish:1, foundry:1, trade:1, wood:1, clay:1, raid:1, research:1 };
let unlockedTechs = new Set();

function applyTechEffects(tech){
  const eff = tech.effects || {};
  if(eff.techBonus) Object.entries(eff.techBonus).forEach(([k,mult])=> techBonus[k]*=mult);
  if(eff.cap) Object.entries(eff.cap).forEach(([k,amt])=> cap[k]+=amt);
  if(eff.military) Object.entries(eff.military).forEach(([k,amt])=> military[k]+=amt);
  if(eff.techHappinessBonus) techHappinessBonus += eff.techHappinessBonus;
}

function totalFood(){ return totalFoodOf(res); }
function addRes(key, amt){ addResTo(res, cap, key, amt); }
function canAfford(cost){ return canAffordFrom(res, cost); }
function pay(cost){ payFrom(res, cost); }

/* ---------------- BUILDINGS ---------------- */
// Catalogue lives in protected/js/buildings.js; imported at the top of this script.

let placedBuildings = []; // {id, x, y, crop?}
let selectedBuild = null;


/* ---------------- ECONOMY TICK ---------------- */
function totalWorkersNeeded(){
  return placedBuildings.reduce((s,b)=>s + (BLD_BY_ID[b.id].workers||0), 0);
}

function tick(){
  tickCount++;
  const needed = totalWorkersNeeded();
  const civilianPop = Math.max(0, pop.count - military.soldiers);
  const laborRatio = needed>0 ? Math.min(1, civilianPop/needed) : 1;

  let tradeIncome = 0;

  placedBuildings.forEach(b=>{
    const def = BLD_BY_ID[b.id];
    const roadBoost = nearBuilding(b.x,b.y,'road',1) ? 1.15 : 1;
    if(def.isField){
      let farmBoost = nearBuilding(b.x,b.y,'farmerhut',2) ? 1.2 : 1;
      let wellBoost = nearBuilding(b.x,b.y,'well',2) ? 1.15 : 1;
      let droughtPenalty = droughtTicksLeft>0 ? 0.3 : 1;
      addRes(b.crop || 'wheat', 1.4 * laborRatio * farmBoost * wellBoost * roadBoost * techBonus.field * droughtPenalty);
      return;
    }
    if(def.special==='foundry'){
      const pairs=[['goldOre','gold'],['silverOre','silver'],['copperOre','copper']];
      for(const [ore,bar] of pairs){
        let amt = Math.min(1*laborRatio, res[ore]);
        if(amt>0){ res[ore]-=amt; addRes(bar, amt*0.8*techBonus.foundry*roadBoost); }
      }
      const bronzeAmt = Math.min(1*laborRatio, res.tin, res.copper);
      if(bronzeAmt > 0){
        res.tin -= bronzeAmt;
        res.copper -= bronzeAmt;
        addRes('bronze', bronzeAmt * 0.8 * techBonus.foundry * roadBoost);
      }
      return;
    }
    if(def.special==='boat'){
      if(res.wood>=1){ res.wood -= 1*laborRatio; boats += 0.1*laborRatio; }
      return;
    }
    if(def.special==='library'){
      let amt = Math.min(1*laborRatio, res.scrolls);
      let schoolBoost = placedBuildings.some(x=>x.id==='school') ? 1.2 : 1;
      if(amt>0){ res.scrolls -= amt; research += amt*0.7*schoolBoost*techBonus.research; }
      return;
    }
    if(def.special==='taxoffice'){
      tradeIncome += taxRate * pop.count * laborRatio;
      return;
    }
    if(def.special==='mint'){
      const amt = Math.min(1*laborRatio, res.silver, res.copper);
      if(amt>0){ res.silver -= amt; res.copper -= amt; tradeIncome += amt*6*techBonus.trade; }
      return;
    }
    if(def.special==='dairy'){
      // Player picks a single product from the recipe panel (defaults to the
      // first option so an unconfigured Dairy still produces something).
      const chosen = b.recipe || (def.recipes && def.recipes[0].id) || 'cheese';
      const yieldMult = {butter:0.4, cheese:0.4, cream:0.35, yoghurt:0.45}[chosen] ?? 0.4;
      const amt = Math.min(1.2*laborRatio, res.milk);
      if(amt>0){ res.milk -= amt; addRes(chosen, amt*yieldMult*roadBoost); }
      return;
    }
    if(def.special==='bakery'){
      // Bread is always baked first from available flour.
      const breadAmt = Math.min(1.5*laborRatio, res.flour);
      if(breadAmt>0){ res.flour -= breadAmt; addRes('bread', breadAmt*0.85*roadBoost); }
      // Any flour left over goes toward the single cake recipe the player
      // picked from the recipe panel (defaults to the first cake so an
      // unconfigured Baker still uses surplus flour instead of wasting it).
      const chosenCake = b.recipe || (def.recipes && def.recipes[0].id);
      const recipe = def.recipes && def.recipes.find(r=>r.id===chosenCake);
      if(recipe){
        const cakeAmt = Math.min(0.6*laborRatio, res.flour, res[recipe.needs]);
        if(cakeAmt>0){
          res.flour -= cakeAmt;
          res[recipe.needs] -= cakeAmt;
          addRes(recipe.id, cakeAmt*0.8*roadBoost);
        }
      }
      return;
    }
    if(def.special==='market'){
      GENERAL_KEYS.concat(FOOD_KEYS).forEach(k=>{
        let buffer = FOOD_KEYS.includes(k) ? 30 : 20;
        let surplus = res[k] - buffer;
        if(surplus > 0){
          let sold = Math.min(surplus, 2*laborRatio);
          res[k] -= sold;
          tradeIncome += sold * (PRICES[k]||0.5) * techBonus.trade;
        }
      });
      return;
    }
    if(def.special==='caravan'){
      tradeIncome += 1.2 * laborRatio * techBonus.trade * (1 + pop.count*0.02);
      return;
    }
    if(def.consume){
      const ok = Object.entries(def.consume).every(([k,v])=>res[k] >= v*laborRatio);
      if(!ok) return;
      Object.entries(def.consume).forEach(([k,v])=> res[k]=Math.max(0,res[k]-v*laborRatio));
    }
    if(def.produce){
      Object.entries(def.produce).forEach(([k,v])=>{
        let mult = 1;
        if(k==='fish') mult = techBonus.fish;
        else if(k==='stone' && def.id==='quarry') mult = techBonus.quarry;
        else if(k==='wood' && def.id==='sawmill') mult = techBonus.wood;
        else if(k==='clay' && def.id==='claypit') mult = techBonus.clay;
        addRes(k, v*laborRatio*mult*roadBoost);
      });
    }
  });

  coin += tradeIncome;

  // docks bonus from boats
  let dockCount = placedBuildings.filter(b=>b.id==='docks').length;
  if(dockCount>0 && boats>0) addRes('fish', Math.min(boats,5)*0.3*techBonus.fish);

  // food consumption
  let need = pop.count * 0.12;
  let have = totalFood();
  if(have >= need){
    let ratio = need/have;
    FOOD_KEYS.forEach(k=> res[k] = Math.max(0,res[k]-res[k]*ratio));
    happiness = Math.min(100, happiness + 0.15);
    if(pop.count < pop.capacity && happiness>45 && Math.random()<0.06) pop.count++;
  } else {
    FOOD_KEYS.forEach(k=> res[k]=0);
    happiness = Math.max(0, happiness - 1.2);
    if(Math.random()<0.05 && pop.count>1) pop.count--;
  }

  // happiness from services
  let bonus = placedBuildings.reduce((s,b)=> s + (BLD_BY_ID[b.id].happinessBonus||0), 0);
  let comfortBonus = Math.min(6, res.quilts*0.06) + Math.min(6, res.leatherGoods*0.05) +
    Math.min(6, res.statues*0.08) +
    Math.min(6, (res.wine+res.beer+res.mead)*0.05) +
    Math.min(8, (res.honeyCake+res.fruitCake+res.dairyCake)*0.04);
  let taxPenalty = taxRate * 400;
  let target = Math.min(100, Math.max(0, 40 + bonus + comfortBonus + techHappinessBonus - taxPenalty));
  happiness += (target-happiness)*0.02;
  happiness = Math.max(0, Math.min(100, happiness));

  if(droughtTicksLeft>0) droughtTicksLeft--;
  driftTradeDemand();
  if(famineGuardTicks>0) famineGuardTicks--;
  if(fireGuardTicks>0) fireGuardTicks--;
  if(floodGuardTicks>0) floodGuardTicks--;
  if(divineFavourTicks>0) divineFavourTicks--;
  maybeSendGodMessage();
  maybeRollDiscovery();
  maybeTriggerDisaster();
  maybeTriggerChoiceEvent();
  checkScenario();
  checkQuests();

  render();
  renderRes();
}
// tick interval is started by grantAccess() once a paid session begins

/* ---------------- CANVAS RENDER ---------------- */
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let canvasScale = 1;
let minimapDirty = true;

function resizeCanvas(){
  canvasScale = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = COLS*TS*canvasScale;
  canvas.height = ROWS*TS*canvasScale;
  canvas.style.width = `${COLS*TS}px`;
  canvas.style.height = `${ROWS*TS}px`;
  ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
  minimapDirty = true;
  render();
}

const BUILDING_COLORS = {
  Housing: ['#f3d9a6', '#a85d3b'],
  Production: ['#e8c879', '#8b5a36'],
  Mining: ['#c9c3b5', '#665f56'],
  Infrastructure: ['#b9d0c2', '#3f766e'],
  Knowledge: ['#d6c4df', '#684b78'],
  Trade: ['#e0b56d', '#87502e'],
  Military: ['#d79b8c', '#7e3931'],
  Storage: ['#d3b88e', '#765439'],
  Services: ['#e1b7a5', '#8a493c']
};

function drawBuildingIllustration(building, def, x, y){
  const left = x*TS + 3;
  const top = y*TS + 3;
  const width = TS - 6;
  const height = TS - 6;
  if(building.id === 'road'){
    const roadAt = (roadX, roadY) => inBounds(roadX, roadY) && grid[roadY][roadX].building?.id === 'road';
    const connectsNorth = roadAt(x, y-1);
    const connectsSouth = roadAt(x, y+1);
    const connectsWest = roadAt(x-1, y);
    const connectsEast = roadAt(x+1, y);
    const roadWidth = 6;
    ctx.fillStyle = '#76513a';
    if(connectsNorth || connectsSouth){
      ctx.fillRect(x*TS+9, y*TS+2, 6, TS-4);
    }
    if(connectsWest || connectsEast || !(connectsNorth || connectsSouth)){
      ctx.fillRect(x*TS+2, y*TS+9, TS-4, roadWidth);
    }
    ctx.fillStyle = 'rgba(255,228,171,0.45)';
    if(connectsWest || connectsEast || !(connectsNorth || connectsSouth)){
      ctx.fillRect(x*TS+5, y*TS+11, TS-10, 2);
    }
    if(connectsNorth || connectsSouth){
      ctx.fillRect(x*TS+11, y*TS+5, 2, TS-10);
    }
    return;
  }
  if(building.id === 'fields'){
    ctx.fillStyle = '#8b9f52';
    ctx.fillRect(left, top, width, height);
    ctx.strokeStyle = '#d6bd63';
    ctx.lineWidth = 1;
    for(let row=5; row<TS-3; row+=5){
      ctx.beginPath();
      ctx.moveTo(left+2, y*TS+row);
      ctx.lineTo(left+width-2, y*TS+row-2);
      ctx.stroke();
    }
    ctx.fillStyle = '#f5e4a1';
    ctx.fillRect(left+4, top+3, 2, 3);
    ctx.fillRect(left+width-6, top+height-6, 2, 3);
    return;
  }
  if(building.id === 'wall'){
    ctx.fillStyle = '#9a9186';
    ctx.fillRect(x*TS+2, y*TS+7, TS-4, TS-14);
    ctx.fillStyle = '#6d655c';
    for(let bx=3; bx<TS-4; bx+=6) ctx.fillRect(x*TS+bx, y*TS+7, 4, 2);
    return;
  }
  if(building.id === 'moat'){
    ctx.fillStyle = '#3f8fa3';
    ctx.fillRect(x*TS+2, y*TS+6, TS-4, TS-12);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(x*TS+4, y*TS+9, TS-8, 2);
    return;
  }
  if(building.id === 'trap'){
    ctx.fillStyle = '#4a3a29';
    ctx.beginPath(); ctx.arc(x*TS+TS/2, y*TS+TS/2, 6, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#c9b183'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x*TS+TS/2, y*TS+TS/2, 6, 0, Math.PI*2); ctx.stroke();
    return;
  }
  const [wall, roof] = BUILDING_COLORS[def.cat] || ['#e3d2ad', '#76513a'];
  ctx.fillStyle = 'rgba(35,28,22,0.24)';
  ctx.fillRect(left+2, top+3, width-1, height-1);
  ctx.fillStyle = wall;
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(left, top+4, width, height-4, 3);
  else ctx.rect(left, top+4, width, height-4);
  ctx.fill();
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(left-1, top+6);
  ctx.lineTo(left+width/2, top);
  ctx.lineTo(left+width+1, top+6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5c4030';
  ctx.fillRect(left+width/2-2, top+height-6, 4, 6);
  ctx.fillStyle = '#dff1e5';
  ctx.fillRect(left+4, top+height-8, 3, 3);
  ctx.fillRect(left+width-7, top+height-8, 3, 3);
  if(['quarry','marblequarry','goldmine','silvermine','coppermine','tinmine','saltmine'].includes(building.id)){
    ctx.fillStyle = '#5b554c';
    ctx.beginPath();
    ctx.moveTo(left+width-5, top+2); ctx.lineTo(left+width+1, top+9); ctx.lineTo(left+width-8, top+9);
    ctx.closePath(); ctx.fill();
  } else if(['docks','fisherhut','boatbuilder'].includes(building.id)){
    ctx.strokeStyle = '#3f8fa3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(left+2, top+height-3); ctx.lineTo(left+width-2, top+height-3); ctx.stroke();
  } else if(building.id === 'well'){
    ctx.fillStyle = '#3f8fa3';
    ctx.beginPath(); ctx.arc(left+width/2, top+height/2+1, 4, 0, Math.PI*2); ctx.fill();
  } else if(['temple','library','school','scribe'].includes(building.id)){
    ctx.fillStyle = '#f4ecdd';
    ctx.fillRect(left+width/2-1, top+2, 2, 5);
    ctx.fillRect(left+width/2-4, top+4, 8, 2);
  }
  if(building.id === 'sawmill'){
    ctx.fillStyle = '#6b432d';
    ctx.fillRect(left+1, top+height-4, 6, 2);
    ctx.fillRect(left+2, top+height-7, 6, 2);
    ctx.strokeStyle = '#d8c08c'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(left+width-4, top+height-5, 3, 0, Math.PI*2); ctx.stroke();
  } else if(building.id === 'hunterlodge'){
    ctx.strokeStyle = '#f0d6a3'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left+width-5, top+5); ctx.lineTo(left+width-7, top+2); ctx.lineTo(left+width-8, top+5);
    ctx.moveTo(left+width-5, top+5); ctx.lineTo(left+width-3, top+2); ctx.lineTo(left+width-2, top+5);
    ctx.stroke();
  } else if(building.id === 'beekeeper'){
    ctx.fillStyle = '#e0b52f';
    ctx.fillRect(left+1, top+height-6, 4, 4);
    ctx.fillRect(left+6, top+height-5, 4, 3);
  } else if(['workshop','blacksmith','foundry'].includes(building.id)){
    ctx.fillStyle = '#8b5a36';
    ctx.fillRect(left+width-6, top+1, 4, 7);
    ctx.fillStyle = 'rgba(244,236,221,0.65)';
    ctx.fillRect(left+width-5, top, 2, 2);
  } else if(['stockage','granary'].includes(building.id)){
    ctx.fillStyle = '#a87843';
    ctx.fillRect(left+1, top+height-6, 4, 4);
    ctx.strokeStyle = '#f1d59a'; ctx.lineWidth = 1;
    ctx.strokeRect(left+2, top+height-5, 2, 2);
  } else if(['market','tradingpost','mint','taxoffice'].includes(building.id)){
    ctx.fillStyle = '#b84f31';
    ctx.fillRect(left+1, top+5, 4, 2);
    ctx.fillRect(left+2, top+7, 2, 2);
  } else if(['police','fire','doctor','dentist','bar'].includes(building.id)){
    ctx.fillStyle = '#f4ecdd';
    ctx.fillRect(left+width-5, top+2, 2, 6);
    ctx.fillRect(left+width-7, top+4, 6, 2);
  } else if(building.id === 'barracks'){
    ctx.fillStyle = '#7e3931';
    ctx.fillRect(left+1, top+2, 2, 7);
    ctx.fillStyle = '#e8dcc8';
    ctx.fillRect(left+3, top+2, 4, 3);
  } else if(building.id === 'guardtower'){
    ctx.fillStyle = '#7a736a';
    ctx.fillRect(left+width/2-4, top-2, 8, 9);
    ctx.fillStyle = '#4f4942';
    for(let bx=0; bx<8; bx+=3) ctx.fillRect(left+width/2-4+bx, top-2, 2, 2);
  } else if(building.id === 'fort'){
    ctx.fillStyle = '#6f6860';
    ctx.fillRect(left-1, top+1, width+2, 7);
    ctx.fillStyle = '#3f3a34';
    for(let bx=0; bx<width+2; bx+=4) ctx.fillRect(left-1+bx, top+1, 2, 3);
    ctx.fillStyle = '#b84f31';
    ctx.fillRect(left+width/2-1, top-4, 2, 5);
  } else if(building.id === 'armourer'){
    ctx.fillStyle = '#8a8f99';
    ctx.fillRect(left+1, top+3, 5, 6);
    ctx.fillStyle = '#d8dde4';
    ctx.fillRect(left+2, top+4, 3, 2);
  } else if(['templegrand','templemonument'].includes(building.id)){
    ctx.fillStyle = '#f4ecdd';
    ctx.fillRect(left+1, top+4, 2, height-6);
    ctx.fillRect(left+width-3, top+4, 2, height-6);
    ctx.fillRect(left+width/2-1, top+4, 2, height-6);
  }
}

function render(){
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    let t = grid[y][x];
    ctx.fillStyle = TERRAIN_COLOR[t.terrain];
    ctx.fillRect(x*TS,y*TS,TS,TS);
    if(t.terrain==='sea' || t.terrain==='river'){
      ctx.fillStyle='rgba(255,255,255,0.06)';
      if((x+y)%3===0) ctx.fillRect(x*TS+4,y*TS+TS/2-1,TS-8,2);
    }
    if(t.terrain==='forest'){
      ctx.fillStyle='rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.arc(x*TS+TS/2,y*TS+TS/2,TS*0.28,0,7); ctx.fill();
    }
    if(t.deposit){
      ctx.fillStyle = DEPOSIT_COLOR[t.deposit];
      ctx.beginPath(); ctx.arc(x*TS+TS-8, y*TS+8, 4.5, 0, 7); ctx.fill();
    }
    ctx.strokeStyle='rgba(0,0,0,0.06)'; ctx.strokeRect(x*TS,y*TS,TS,TS);

    if(t.building){
      const def = BLD_BY_ID[t.building.id];
      const pop = buildingPops.find(p=>p.x===x && p.y===y);
      const scale = pop ? Math.min(1, (performance.now()-pop.startedAt)/240) : 1;
      ctx.save();
      ctx.translate(x*TS+TS/2, y*TS+TS/2);
      ctx.scale(scale, scale);
      ctx.translate(-(x*TS+TS/2), -(y*TS+TS/2));
      const isRoad = t.building.id === 'road';
      drawBuildingIllustration(t.building, def, x, y);
      ctx.restore();
    }
  }
  // Eligible-tile shading sits under the cursor layers so it can't wash them out.
  if(selectedBuild && selectedBuild !== 'demolish'){
    const selectedDef = BLD_BY_ID[selectedBuild];
    if(selectedDef){
      for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
        if(grid[y][x].building) continue;
        if(!selectedDef.valid(x,y)) continue;
        ctx.fillStyle = 'rgba(120,200,120,0.18)';
        ctx.fillRect(x*TS,y*TS,TS,TS);
      }
    }
  }
  if(hoverTile && inBounds(hoverTile.x, hoverTile.y)){
    const {x,y} = hoverTile;
    ctx.fillStyle = selectedBuild ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)';
    ctx.fillRect(x*TS,y*TS,TS,TS);
    ctx.strokeStyle = 'rgba(255,244,190,0.9)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x*TS+1,y*TS+1,TS-2,TS-2);
    ctx.lineWidth = 1;
  }
  if(selectedBuild && hoverTile){
    const {x,y} = hoverTile;
    if(selectedBuild === 'demolish'){
      const hasBuilding = inBounds(x,y) && grid[y][x].building;
      ctx.fillStyle = hasBuilding ? 'rgba(220,80,60,0.55)' : 'rgba(120,120,120,0.35)';
      ctx.fillRect(x*TS,y*TS,TS,TS);
    } else {
      const def = BLD_BY_ID[selectedBuild];
      if(def){
        const ok = inBounds(x,y) && !grid[y][x].building && def.valid(x,y) && canAfford(def.cost);
        ctx.fillStyle = ok ? 'rgba(120,200,120,0.45)' : 'rgba(220,80,60,0.45)';
        ctx.fillRect(x*TS,y*TS,TS,TS);
      }
    }
  }
  if(minimapDirty) renderMinimap();
}

function renderMinimap(){
  const mini = document.getElementById('minimap');
  if(!mini || !grid.length) return;
  const miniCtx = mini.getContext('2d');
  const tileWidth = mini.width / COLS;
  const tileHeight = mini.height / ROWS;
  for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){
    const tile = grid[y][x];
    miniCtx.fillStyle = TERRAIN_COLOR[tile.terrain];
    miniCtx.fillRect(x*tileWidth,y*tileHeight,Math.ceil(tileWidth),Math.ceil(tileHeight));
    if(tile.deposit){
      miniCtx.fillStyle = DEPOSIT_COLOR[tile.deposit];
      miniCtx.fillRect(x*tileWidth,y*tileHeight,Math.max(1,tileWidth),Math.max(1,tileHeight));
    }
    if(tile.building){
      miniCtx.fillStyle = tile.building.id === 'road' ? '#6f4e30' : '#fff4d6';
      miniCtx.fillRect(x*tileWidth,y*tileHeight,Math.max(2,tileWidth),Math.max(2,tileHeight));
    }
  }
  minimapDirty = false;
}

/* ---------------- UI: RESOURCE BAR ---------------- */
const RES_DISPLAY = [
  ['wood','🪵'],['stone','🪨'],['clay','🧱'],['pottery','🏺'],['tools','🔧'],
  ['goldOre','🟡'],['silverOre','⚪'],['copperOre','🟠'],['gold','💰'],['silver','🥈'],['copper','🥉'],['bronze','🟠'],
  ['wheat','🌾'],['flour','🌾➡️'],['bread','🍞'],['olives','🫒'],['oliveOil','🛢️'],
  ['chickpeas','🌱'],['grapes','🍇'],['barley','🌿'],['salt','🧂'],['fish','🐟'],['deer','🦌'],['scrolls','📜'],
  ['marble','🪨'],['tin','🧲'],['honey','🍯'],['wax','�'],
  ['sugarcane','🎋'],['fruit','🍏'],['feathers','🪶'],['hide','🪲'],['leather','👝'],
  ['butter','🧈'],['cheese','🧀'],['cream','🍶'],['yoghurt','🥣'],['jam','🫙'],['candles','🕯️'],
  ['quilts','🛏️'],['leatherGoods','👜'],['statues','🗿'],['meat','🥩'],['milk','🥛'],['eggs','🥚'],
  ['honeyCake','🍰'],['fruitCake','🎂'],['dairyCake','🧁'],
  ['wine','🍷'],['beer','🍺'],['mead','🍯']
];
function renderRes(){
  const bar = document.getElementById('resbar');
  bar.replaceChildren();
  const coinPill=document.createElement('div');
  coinPill.className='res coin';
  coinPill.textContent = `🪙 ${Math.floor(coin)}`;
  bar.appendChild(coinPill);
  RES_DISPLAY.forEach(([k,ic])=>{
    const v = res[k];
    if(v<0.05 && !['wood','stone'].includes(k)) return;
    const d=document.createElement('div');
    d.className='res';
    if(v > (previousResourceValues[k] ?? v)){
      d.classList.add('resourceUp');
      playTone('gather');
      setTimeout(()=>d.classList.remove('resourceUp'), 550);
    }
    previousResourceValues[k] = v;
    d.title = RESOURCE_INFO[k] || k;
    d.setAttribute('aria-label', `${RESOURCE_INFO[k] || k}: ${Math.floor(v)}`);
    d.textContent = `${ic} ${Math.floor(v)}`;
    d.onclick = ()=> showToast(RESOURCE_INFO[k] || k);
    bar.appendChild(d);
  });
  document.getElementById('popline').textContent = `👥 Population ${pop.count}/${pop.capacity}`;
  document.getElementById('timeline').textContent =
    `🙂 ${Math.round(happiness)}%  ·  🛶 ${Math.floor(boats)}  ·  📜 ${Math.floor(research)}`;
  document.getElementById('tickline').textContent =
    `Storage cap: general ${cap.general} · food ${cap.food}`;
  renderResearchPanel();
  renderCodexPanel();
  renderQuestsPanel();
  updateArmyPanel();
  renderGoalsPanel();
  updateTaxPanel();
  renderTradePanel();
}

/* ---------------- UI: BUILD PANEL ---------------- */
function renderPanel(){
  const list = document.getElementById('buildingList');
  if(!list){
    console.error('Portus: buildingList missing');
    return;
  }
  list.innerHTML='';

  // Add Demolish button at the top
  const toolLabel = document.createElement('div');
  toolLabel.className = 'catlabel';
  toolLabel.textContent = 'Tools';
  list.appendChild(toolLabel);

  const demoBtn = document.createElement('button');
  demoBtn.className = 'bldbtn demolish';
  demoBtn.dataset.id = 'demolish';
  demoBtn.innerHTML = `
    <span class="ic" aria-label="Demolish icon">🔨</span>
    <span class="info">
      Demolish Building
      <div class="cost">Refunds 100% resources</div>
    </span>
  `;
  demoBtn.onclick = () => selectBuild('demolish');
  list.appendChild(demoBtn);

  CATS.forEach(cat=>{
    const label=document.createElement('div');
    label.className='catlabel'; label.textContent=cat;
    list.appendChild(label);
    BUILDINGS.filter(b=>b.cat===cat).forEach(b=>{
      const btn=document.createElement('button');
      const locked = b.requiresTech && !unlockedTechs.has(b.requiresTech);
      btn.className='bldbtn'+(locked?' locked':''); btn.dataset.id=b.id;
      const costStr = Object.entries(b.cost).map(([k,v])=>`${v} ${k}`).join(', ');
      const desc = b.desc || '';
      const unlockNote = locked ? `Requires ${techName(b.requiresTech)}` : '';
      btn.innerHTML =
        `<span class="ic" aria-label="${b.name} icon">${b.ic}</span>
         <span class="info">
           ${b.name}
           <div class="cost">${unlockNote || costStr}</div>
         </span>`;
      if(desc) btn.title = desc;
      btn.onclick = ()=> locked ? showToast(`Research ${techName(b.requiresTech)} first`) : selectBuild(b.id);
      list.appendChild(btn);
    });
  });

}

function updateBuildPreview(id){
  const titleEl = document.getElementById('buildPreviewTitle');
  const bodyEl = document.getElementById('buildPreviewBody');
  if(!id){
    titleEl.textContent = 'No building selected';
    bodyEl.textContent = 'Tap a building on the right, then tap the map to place it.';
    return;
  }
  if(id === 'demolish'){
    titleEl.textContent = '🔨 Demolish Building';
    bodyEl.textContent = 'Refunds 100% of the cost. Tap any building on the map to demolish it.';
    return;
  }
  const def = BLD_BY_ID[id];
  titleEl.textContent = `${def.ic} ${def.name}`;
  const costStr = Object.entries(def.cost).map(([k,v])=>`${v} ${k}`).join(', ');
  const extra = def.desc ? ` — ${def.desc}` : '';
  bodyEl.textContent = `Cost: ${costStr}${extra}`;
}

function selectBuild(id){
  selectedBuild = (selectedBuild===id) ? null : id;
  document.querySelectorAll('.bldbtn').forEach(el=> el.classList.toggle('selected', el.dataset.id===selectedBuild));
  document.getElementById('cancelBtn').style.display = selectedBuild ? 'block':'none';
  document.getElementById('cropbar').style.display = selectedBuild==='fields' ? 'flex':'none';
  updateBuildPreview(selectedBuild);
  const legend = document.getElementById('legend');
  if(selectedBuild==='fields') legend.textContent = '👉 Pick a crop above, then tap the map to plant';
  else if(selectedBuild==='demolish') legend.textContent = '👉 Tap any building on the map to demolish it';
  else if(selectedBuild) legend.textContent = `Tap the map to place ${BLD_BY_ID[selectedBuild].name}`;
  else legend.textContent = 'Tap a building, then tap the map to place it';
  render();
  if(id) playTone('click');
}
document.getElementById('cancelBtn').onclick = ()=> selectBuild(null);
document.querySelectorAll('#cropbar button').forEach(b=>{
  b.onclick = ()=>{
    selectedCrop=b.dataset.crop;
    document.querySelectorAll('#cropbar button').forEach(x=>x.classList.toggle('active', x===b));
  };
});

/* ---------------- MAP INTERACTION ---------------- */
let hoverTile = null;
function tileFromEvent(e){
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  const x = Math.floor((clientX-rect.left)/TS);
  const y = Math.floor((clientY-rect.top)/TS);
  return {x,y};
}
function updateBuildingTooltip(e){
  const tooltip = document.getElementById('buildingTooltip');
  const tile = tileFromEvent(e);
  const building = inBounds(tile.x, tile.y) && grid[tile.y][tile.x].building;
  if(!tooltip || !building){
    if(tooltip) tooltip.classList.remove('show');
    return;
  }
  const def = BLD_BY_ID[building.id];
  let label = `${def ? def.ic : ''} ${def ? def.name : building.id}`.trim();
  if(def && def.recipes){
    const activeId = building.recipe || def.recipes[0].id;
    const recipe = def.recipes.find(r=>r.id===activeId);
    if(recipe) label += ` — making ${recipe.name} (tap to change)`;
  }
  tooltip.textContent = label;
  tooltip.classList.add('show');
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  tooltip.style.left = `${Math.min(clientX+12, window.innerWidth-tooltip.offsetWidth-8)}px`;
  tooltip.style.top = `${Math.min(clientY+12, window.innerHeight-tooltip.offsetHeight-8)}px`;
}
canvas.addEventListener('mousemove', e=>{ hoverTile=tileFromEvent(e); updateBuildingTooltip(e); render(); });
canvas.addEventListener('mouseleave', ()=> document.getElementById('buildingTooltip').classList.remove('show'));
let lastTouchActionTime = 0;
canvas.addEventListener('click', e=>{
  // Ignore the synthetic "ghost click" the browser fires ~300-500ms after a
  // real touch tap already handled by touchend below — otherwise mobile
  // taps double-fire (place twice, or open-then-close the trade panel).
  if(Date.now() - lastTouchActionTime < 500) return;
  const tile = tileFromEvent(e);
  if(!selectedBuild){
    handleBuildingTap(tile);
    return;
  }
  placeAt(tile);
});
let touchStartX = 0;
let touchStartY = 0;
let touchMoved = false;

canvas.addEventListener('touchstart', e=>{
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchMoved = false;
  hoverTile = tileFromEvent(e);
  updateBuildingTooltip(e);
  render();
}, {passive:true});
canvas.addEventListener('touchmove', e=>{
  const touch = e.touches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if(Math.hypot(dx, dy) > 10){
    touchMoved = true;
  }
}, {passive:true});
canvas.addEventListener('touchend', e=>{
  lastTouchActionTime = Date.now();
  if(touchMoved || !hoverTile) return;
  if(selectedBuild){
    placeAt(hoverTile);
  } else {
    handleBuildingTap(hoverTile);
  }
}, {passive:true});

// Tapping a placed building with no build tool selected opens whatever panel
// applies to it: the Trading Post's trade panel, or a recipe picker for any
// building with a `recipes` list (currently the Baker and the Dairy).
function handleBuildingTap(tile){
  if(!inBounds(tile.x, tile.y)) return;
  const building = grid[tile.y][tile.x].building;
  if(!building) return;
  const def = BLD_BY_ID[building.id];
  if(building.id === 'tradingpost'){
    openPanel('tradePanel');
    playTone('click');
  } else if(def && def.recipes){
    openRecipePanel(building);
    playTone('click');
  }
}
document.getElementById('minimap').addEventListener('click', e=>{
  const rect = e.currentTarget.getBoundingClientRect();
  const relX = (e.clientX-rect.left)/rect.width;
  const relY = (e.clientY-rect.top)/rect.height;
  const wrap = document.getElementById('mapwrap');
  wrap.scrollTo({
    left: Math.max(0, relX*canvas.clientWidth - wrap.clientWidth/2),
    top: Math.max(0, relY*canvas.clientHeight - wrap.clientHeight/2),
    behavior:'smooth'
  });
});

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> t.classList.remove('show'), 1600);
}

function demolishAt(x, y){
  const tile = grid[y][x];
  if(!tile.building){ showToast('No building here to demolish'); return; }
  const b = tile.building;
  const def = BLD_BY_ID[b.id];
  if(def && def.cost){
    Object.entries(def.cost).forEach(([k,v])=> {
      if(k === 'coin'){
        coin += v;
      } else {
        addRes(k, v);
      }
    });
  }
  removeBuilding(b);
  minimapDirty = true;
  showToast(`Demolished ${def ? def.name : b.id} and refunded resources`);
  render(); renderRes();
}

function placeAt({x,y}){
  if(!selectedBuild) return;
  if(!inBounds(x,y)) return;
  if(selectedBuild === 'demolish'){
    demolishAt(x, y);
    return;
  }
  const def = BLD_BY_ID[selectedBuild];
  const tile = grid[y][x];
  if(tile.building){ showToast('Tile already occupied'); return; }
  if(!def.valid(x,y)){ showToast(`Can't place ${def.name} here`); return; }
  if(!canAfford(def.cost)){ showToast('Not enough resources'); return; }
  pay(def.cost);
  const b = {id:def.id, x, y};
  if(def.isField) b.crop = selectedCrop;
  tile.building = b;
  placedBuildings.push(b);
  buildingPops.push({x,y,startedAt:performance.now()});
  minimapDirty = true;
  const animatePlacement = ()=>{
    render();
    if(performance.now() - buildingPops[buildingPops.length - 1].startedAt < 260){
      requestAnimationFrame(animatePlacement);
    } else {
      buildingPops = buildingPops.filter(p=>p.x!==x || p.y!==y);
      render();
    }
  };
  requestAnimationFrame(animatePlacement);
  if(def.popCap) pop.capacity += def.popCap;
  if(def.militaryCap) military.cap += def.militaryCap;
  if(def.capBonus){
    if(def.capBonus.general) cap.general += def.capBonus.general;
    if(def.capBonus.food) cap.food += def.capBonus.food;
  }
  showToast(`Built ${def.name}`);
  playTone('build');
  const guide = document.getElementById('firstActionGuide');
  if(def.id === 'house' && guide){
    guide.textContent = 'Your first home is placed. Now gather wood and shape the town.';
    guide.classList.add('complete');
    document.querySelectorAll('.bldbtn').forEach(btn=>btn.classList.remove('guided'));
  }
  render(); renderRes();
}

/* ---------------- MENU PANELS ---------------- */
function closeAllPanels(){
  document.querySelectorAll('.sidepanel').forEach(p=>p.classList.remove('open'));
  document.querySelectorAll('.menuBtn').forEach(b=>b.classList.remove('active'));
}
function openPanel(panelId){
  const panel = document.getElementById(panelId);
  if(!panel) return;
  closeAllPanels();
  panel.classList.add('open');
  const btn = document.querySelector(`.menuBtn[data-panel="${panelId}"]`);
  if(btn) btn.classList.add('active');
  if(panelId === 'tradePanel') renderTradePanel();
}

// Which placed building instance the open recipePanel is currently editing.
let recipePanelBuilding = null;
function openRecipePanel(building){
  recipePanelBuilding = building;
  closeAllPanels();
  document.getElementById('recipePanel').classList.add('open');
  renderRecipePanel();
}
function renderRecipePanel(){
  const b = recipePanelBuilding;
  const list = document.getElementById('recipeList');
  const title = document.getElementById('recipePanelTitle');
  if(!b || !list) return;
  const def = BLD_BY_ID[b.id];
  if(!def || !def.recipes){ closeAllPanels(); return; }
  title.textContent = `${def.ic} ${def.name}`;
  list.replaceChildren();
  if(def.id === 'baker'){
    const note = document.createElement('p');
    note.className = 'pnote';
    note.textContent = 'Bread is always baked first. Pick which cake to bake with any flour left over.';
    list.appendChild(note);
  } else {
    const note = document.createElement('p');
    note.className = 'pnote';
    note.textContent = 'Pick which product to churn from incoming milk.';
    list.appendChild(note);
  }
  const activeId = b.recipe || def.recipes[0].id;
  def.recipes.forEach(r=>{
    const btn = document.createElement('button');
    btn.className = 'actionbtn' + (r.id===activeId ? ' active' : '');
    const stockNote = r.needs ? `<span class="recipe-stock"> — needs ${Math.floor(res[r.needs]||0)} ${r.needs} in stock</span>` : '';
    btn.innerHTML = `${r.ic||''} ${r.name}${stockNote}`;
    btn.onclick = ()=>{
      b.recipe = r.id;
      showToast(`${def.name} will now make ${r.name}`);
      renderRecipePanel();
    };
    list.appendChild(btn);
  });
}
document.querySelectorAll('.menuBtn').forEach(btn=>{
  btn.onclick = ()=>{
    playTone('click');
    const panelId = btn.dataset.panel;
    const panel = document.getElementById(panelId);
    const isOpen = panel.classList.contains('open');
    if(isOpen) closeAllPanels();
    else openPanel(panelId);
  };
});
document.querySelectorAll('.closeP').forEach(btn=>{
  btn.onclick = ()=> closeAllPanels();
});

function renderResearchPanel(){
  document.getElementById('rpCount').textContent = Math.floor(research);
  const list = document.getElementById('researchList');
  list.innerHTML='';
  [1,2,3].forEach(tierNum=>{
    const tierTechs = TECHS.filter(t=>t.tier===tierNum);
    if(!tierTechs.length) return;
    const label=document.createElement('div');
    label.className='catlabel'; label.textContent=`Tier ${tierNum}`;
    list.appendChild(label);
    tierTechs.forEach(t=>{
      const done = unlockedTechs.has(t.id);
      const reqMet = techRequirementsMet(t, unlockedTechs);
      const row=document.createElement('div');
      row.className='tech'+(done?' done':'');
      const reqLine = (!done && t.requires && t.requires.length)
        ? `<div class="tdesc">Requires: ${t.requires.map(techName).join(', ')}</div>` : '';
      const scrollCostNote = res.scrolls > 0 ? ' (1 scroll if available)' : '';
      row.innerHTML =
        `<div class="tname">${t.name}</div>
         <div class="tdesc">${t.desc}</div>
         ${reqLine}
         <button ${done||!reqMet? 'disabled':''}>${done? '✓ Researched' : 'Unlock — '+t.cost+' pts'+scrollCostNote}</button>`;
      if(!done && reqMet){
        row.querySelector('button').onclick = ()=>{
          if(research < t.cost){
            showToast('Not enough research points');
            return;
          }
          research -= t.cost;
          if(res.scrolls > 0){
            res.scrolls -= 1;
            showToast(`Researched ${t.name} using 1 scroll`);
          } else {
            showToast(`Researched ${t.name}`);
          }
          unlockedTechs.add(t.id);
          applyTechEffects(t);
          renderPanel();
          renderRes();
        };
      }
      list.appendChild(row);
    });
  });
}

function renderCodexPanel(){
  const list = document.getElementById('codexList');
  if(!list) return;
  list.replaceChildren();
  if(!codexEntries.length){
    const empty = document.createElement('p');
    empty.className = 'pnote';
    empty.textContent = 'No Codex entries unlocked yet.';
    list.appendChild(empty);
    return;
  }
  codexEntries.forEach(entry=>{
    const article = document.createElement('article');
    article.className = 'codexEntry';
    const title = document.createElement('h3');
    title.className = 'codexTitle';
    title.textContent = entry.title;
    article.appendChild(title);
    if(entry.content){
      const text = document.createElement('pre');
      text.className = 'codexText';
      text.textContent = entry.content;
      article.appendChild(text);
    } else {
      const unavailable = document.createElement('p');
      unavailable.className = 'pnote';
      unavailable.textContent = 'This entry has been discovered but its field notes are not available yet.';
      article.appendChild(unavailable);
    }
    list.appendChild(article);
  });
}

function renderTradePanel(){
  const list = document.getElementById('tradeList');
  if(!list) return;
  list.replaceChildren();
  const hasTradingPost = placedBuildings.some((b)=>b.id==='tradingpost');
  if(!hasTradingPost){
    const empty = document.createElement('p');
    empty.className = 'pnote';
    empty.textContent = 'Build a Trading Post to buy and sell rare goods.';
    list.appendChild(empty);
    return;
  }

  const legend = document.createElement('div');
  legend.className = 'trade-legend';
  legend.innerHTML = '<span>Good</span><span>Stock</span><span>Buy</span><span>Sell</span>';
  list.appendChild(legend);

  TRADE_GOODS.forEach((good)=>{
    const row = document.createElement('div');
    row.className = 'trade-row';
    const stock = Math.floor(res[good.id] || 0);
    const buyPrice = buyPriceOf(good);
    const sellPrice = sellPriceOf(good);
    const [demandText, demandClass] = demandLabel(good);
    row.innerHTML = `
      <span class="good">${good.label}<small class="${demandClass}">${demandText}</small></span>
      <span class="stock">${stock}</span>
      <button class="actionbtn secondary trade-buy" data-good="${good.id}">${buyPrice}🪙</button>
      <button class="actionbtn trade-sell" data-good="${good.id}">+${sellPrice}🪙</button>
    `;
    row.querySelector('.trade-buy').onclick = ()=>{
      const price = buyPriceOf(good);
      if(coin < price){ showToast('Not enough coin'); return; }
      coin -= price;
      addRes(good.id, 1);
      tradeDemand[good.id] = clampDemand(tradeDemand[good.id] + 0.06);
      showToast(`Bought ${good.label} for ${price} coin`);
      renderRes();
    };
    row.querySelector('.trade-sell').onclick = ()=>{
      if((res[good.id] || 0) < 1){ showToast(`No ${good.label} to sell`); return; }
      const price = sellPriceOf(good);
      res[good.id] -= 1;
      coin += price;
      tradeDemand[good.id] = clampDemand(tradeDemand[good.id] - 0.05);
      showToast(`Sold ${good.label} for ${price} coin`);
      renderRes();
    };
    list.appendChild(row);
  });
}

/* ---------------- PAYWALL / SESSION ---------------- */
let accessExpiresAt = 0;
let tickInterval = null;
let sessionInterval = null;
let currentUser = null; // {email, captainName}
let hasFreeAccess = false;

let csrfPromise = null;
async function getCsrf(){
  if(!csrfPromise) csrfPromise = fetch('/api/csrf-token',{credentials:'include'}).then(r=>r.json()).then(d=>d.csrfToken);
  return csrfPromise;
}
async function api(path, opts={}){
  const method=(opts.method||'GET').toUpperCase();
  const headers=Object.assign({'Content-Type':'application/json'},opts.headers||{});
  if(method!=='GET' && method!=='HEAD') headers['X-CSRF-Token']=await getCsrf();
  const res=await fetch(path,Object.assign({credentials:'include',headers},opts));
  let data={}; try{data=await res.json();}catch(e){}
  if(!res.ok) throw new Error(data.error||'request failed');
  return data;
}

function showAuthBox(msg){
  document.getElementById('authBox').style.display = 'block';
  document.getElementById('payBox').style.display = 'none';
  document.getElementById('authMsg').textContent = msg || '';
}
function showPayBox(){
  document.getElementById('authBox').style.display = 'none';
  document.getElementById('payBox').style.display = 'block';
  document.getElementById('whoami').textContent = `Signed in as ${currentUser.email}`;
  const payCardBtn = document.getElementById('payCardBtn');
  const payPaypalBtn = document.getElementById('payPaypalBtn');
  if(hasFreeAccess){
    document.getElementById('verifyBanner').style.display = 'none';
    payCardBtn.style.display = 'none';
    payPaypalBtn.style.display = 'none';
    return;
  }
  payCardBtn.style.display = '';
  payPaypalBtn.style.display = '';
  const verified = !!currentUser.emailVerified;
  document.getElementById('verifyBanner').style.display = verified ? 'none' : 'block';
  payCardBtn.disabled = !verified;
  payPaypalBtn.disabled = !verified;
  payCardBtn.style.opacity = verified ? '1' : '0.5';
  payPaypalBtn.style.opacity = verified ? '1' : '0.5';
}

async function refreshFromServer(){
  selectBuild(null);
  try{
    const me = await api('/api/me');
    currentUser = me;
    if(me.captainName){
      captainName = me.captainName;
      document.getElementById('captainInput').value = captainName;
    }
    const s = await api('/api/access');
    hasFreeAccess = !!s.freeAccess;
    showPayBox();
    if(s.canPlay){
      const discoveries = await api('/api/discoveries');
      codexEntries = discoveries.codexEntries || [];
      renderCodexPanel();
    }
    if(hasFreeAccess){
      accessExpiresAt = Infinity;
      startPlaying();
      return;
    }
    accessExpiresAt = s.accessExpiresAt || 0;
    if(s.canPlay){
      const heartbeat = await api('/api/access/heartbeat',{method:'POST'});
      hasFreeAccess = !!heartbeat.freeAccess;
      if(hasFreeAccess){
        accessExpiresAt = Infinity;
        startPlaying();
        return;
      }
      accessExpiresAt = Date.now()+((heartbeat.remainingSeconds || 0)*1000);
      startPlaying();
    }
    else pausePlaying();
  } catch(e){
    currentUser = null;
    hasFreeAccess = false;
    showAuthBox();
  }
}

function startPlaying(){
  document.getElementById('paywall').style.display = 'none';
  if(!tickInterval) tickInterval = setInterval(tick, 2500);
  if(!sessionInterval) sessionInterval = setInterval(checkSession, 1000);
  heartbeatAccess();
  checkSession();
}
function pausePlaying(){
  if(hasFreeAccess){
    document.getElementById('paywall').style.display = 'none';
    document.getElementById('timeline').textContent = '';
    return;
  }
  clearInterval(tickInterval); tickInterval = null;
  clearInterval(sessionInterval); sessionInterval = null;
  document.getElementById('timeline').textContent = '';
  document.getElementById('paywall').style.display = 'flex';
  document.getElementById('pwTitle').textContent = accessExpiresAt ? "🏛️ Your hour's up" : '🏛️ Portus Pass';
  document.getElementById('pwDesc').textContent = accessExpiresAt ? 'Buy another hour to keep building.' : 'Sign in, then buy a Portus pass to play.';
  if(currentUser) showPayBox(); else showAuthBox();
}

async function heartbeatAccess(){
  if(!currentUser) return;
  try{
    const a=await api('/api/access/heartbeat',{method:'POST'});
    hasFreeAccess = !!a.freeAccess;
    if(hasFreeAccess){
      accessExpiresAt = Infinity;
      document.getElementById('timeline').textContent = '';
      return;
    }
    accessExpiresAt = Date.now()+((a.remainingSeconds || 0)*1000);
    if(!a.canPlay) pausePlaying();
  }
  catch(e){ console.warn('access heartbeat failed',e); }
}

function checkSession(){
  if(hasFreeAccess){
    document.getElementById('timeline').textContent = '';
    return;
  }
  const msLeft = accessExpiresAt - Date.now();
  if(msLeft <= 0){ pausePlaying(); return; }
  const mins = Math.floor(msLeft/60000), secs = Math.floor((msLeft%60000)/1000);
  document.getElementById('timeline').textContent = `⏳ ${mins}:${secs.toString().padStart(2,'0')} left`;
}
setInterval(()=>{ if(currentUser) heartbeatAccess(); }, 10000);

document.getElementById('signupBtn').onclick = async ()=>{
  try{
    await api('/api/signup', {method:'POST', body: JSON.stringify({
      email: document.getElementById('authEmail').value,
      password: document.getElementById('authPassword').value,
      captainName: captainName || ''
    })});
    await refreshFromServer();
    showToast('Account created — check your email to verify it');
  } catch(e){ showAuthBox(e.message); }
};
document.getElementById('loginBtn').onclick = async ()=>{
  try{
    await api('/api/login', {method:'POST', body: JSON.stringify({
      email: document.getElementById('authEmail').value,
      password: document.getElementById('authPassword').value
    })});
    await refreshFromServer();
  } catch(e){ showAuthBox(e.message); }
};
document.getElementById('logoutBtn').onclick = async ()=>{
  await api('/api/access/stop', {method:'POST'}).catch(()=>{});
  await api('/api/logout', {method:'POST'});
  currentUser = null; accessExpiresAt = 0; hasFreeAccess = false;
  pausePlaying();
};
document.getElementById('payCardBtn').onclick = async ()=>{
  try{ const {url} = await api('/api/checkout/stripe', {method:'POST', body: JSON.stringify({productId:'hour'})}); window.location.href = url; }
  catch(e){ showToast(e.message); }
};
document.getElementById('payPaypalBtn').onclick = async ()=>{
  try{ const {url} = await api('/api/checkout/paypal', {method:'POST', body: JSON.stringify({productId:'hour'})}); window.location.href = url; }
  catch(e){ showToast(e.message); }
};
document.getElementById('resendBtn').onclick = async ()=>{
  try{
    const r = await api('/api/resend-verification', {method:'POST'});
    showToast(r.alreadyVerified ? 'Already verified!' : 'Verification email sent — check your inbox');
  } catch(e){ showToast(e.message); }
};
document.getElementById('forgotBtn').onclick = ()=>{ location.href='/reset-request.html'; };

const paymentParams = new URLSearchParams(window.location.search);
const paidParam = paymentParams.get('paid');
if(paymentParams.get('provider') === 'paypal' && paymentParams.get('status') === 'return' && paymentParams.get('token')){
  api('/api/checkout/paypal/capture', {
    method:'POST',
    body: JSON.stringify({orderId: paymentParams.get('token')})
  }).then(()=>{
    history.replaceState({}, '', '/game');
    refreshFromServer();
    showToast('PayPal payment confirmed — your time has been added.');
  }).catch(e=> showToast(e.message));
}
if(paidParam === 'stripe' || paidParam === 'paypal') showToast('Payment received — welcome back!');
else if(paidParam === 'error') showToast('Payment could not be confirmed — please try again');

const verifyParam = new URLSearchParams(window.location.search).get('verify');
if(verifyParam === 'success') showToast('Email verified — you can now buy a pass!');
else if(verifyParam === 'invalid') showToast('That verification link is invalid or expired — resend a new one below');
else if(verifyParam === 'missing') showToast('Verification link was incomplete');

/* ---------------- DISASTERS ---------------- */
function logEvent(msg){
  eventLog.unshift(`[${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}] ${msg}`);
  eventLog = eventLog.slice(0,20);
  renderChronicle();
}

function maybeSendGodMessage(){
  if(tickCount === 0 || tickCount % 24 !== 0 || Math.random() > 0.7) return;
  const blessing = GOD_MESSAGES[rnd(GOD_MESSAGES.length)];
  blessing.grant({ addRes, addResearch: (n)=>{ research += n; } });
  logEvent(`✨ ${blessing.text}`);
  showToast(`✨ ${blessing.text}`);
}

function discoveryActivity(){
  if(placedBuildings.some(b=>['docks','fisherhut'].includes(b.id))) return 'fishing';
  if(placedBuildings.some(b=>['quarry','mine','goldmine','silvermine','coppermine'].includes(b.id))) return 'mining';
  if(placedBuildings.some(b=>b.id==='fields')) return 'farming';
  if(placedBuildings.some(b=>b.id==='claypit')) return 'clay_pit';
  return 'turn';
}

async function maybeRollDiscovery(){
  if(!currentUser || discoveryRollInFlight || tickCount === 0 || tickCount % 12 !== 0) return;
  discoveryRollInFlight = true;
  try{
    const result = await api('/api/discoveries/roll', {
      method:'POST',
      body: JSON.stringify({ activity: discoveryActivity(), turnNumber: Math.floor(tickCount / 12) })
    });
    if(result.discovery){
      const discovery = result.discovery;
      const detail = discovery.type === 'archaeological_find' && !discovery.assembled
        ? `fragment ${discovery.fragmentIndex}/${discovery.fragmentCount}`
        : 'Codex entry unlocked';
      const message = `🔎 Discovery: ${discovery.title} — ${detail}.`;
      logEvent(message);
      showToast(message);
      const discoveries = await api('/api/discoveries');
      codexEntries = discoveries.codexEntries || [];
      renderCodexPanel();
    }
  } catch(e){
    console.warn('discovery roll failed', e);
  } finally {
    discoveryRollInFlight = false;
  }
}

function renderChronicle(){
  const el = document.getElementById('chronicle');
  if(!el) return;
  el.replaceChildren();
  for(const event of (eventLog.length ? eventLog : ['Quiet so far…'])){
    const row = document.createElement('div');
    row.textContent = event;
    el.appendChild(row);
  }
}

function nearTerrainOfBuilding(b, terrain){
  return grid[b.y][b.x].terrain===terrain || nearTerrain(b.x,b.y,[terrain],1);
}

function removeBuilding(b){
  const def = BLD_BY_ID[b.id];
  grid[b.y][b.x].building = null;
  placedBuildings = placedBuildings.filter(x=>x!==b);
  if(def.popCap) pop.capacity = Math.max(0, pop.capacity-def.popCap);
  if(def.militaryCap) military.cap = Math.max(0, military.cap-def.militaryCap);
  if(def.capBonus){
    if(def.capBonus.general) cap.general = Math.max(100, cap.general-def.capBonus.general);
    if(def.capBonus.food) cap.food = Math.max(100, cap.food-def.capBonus.food);
  }
}

function damageRandomBuildings(count, filterFn){
  let candidates = filterFn ? placedBuildings.filter(filterFn) : placedBuildings.slice();
  let destroyed = 0;
  for(let i=0;i<count && candidates.length>0;i++){
    const idx = rnd(candidates.length);
    const b = candidates.splice(idx,1)[0];
    removeBuilding(b);
    destroyed++;
  }
  return destroyed;
}

function totalDefense(){
  return placedBuildings.reduce((s,b)=> s + (BLD_BY_ID[b.id].defense||0), 0);
}

// Armed and armoured soldiers fight harder than bare levies.
function armyStrength(){
  const armedRatio = military.soldiers>0
    ? Math.min(1, (res.weapons + res.armour) / (military.soldiers*2))
    : 0;
  return military.soldiers * (1 + armedRatio*0.5);
}

function resolveInvasion(){
  const enemyStrength = 4 + rnd(10) + Math.floor(coin/40);
  const defense = totalDefense();
  const myStrength = armyStrength() + defense;
  if(myStrength*techBonus.raid >= enemyStrength && myStrength>0){
    const lost = Math.floor(military.soldiers*0.1*Math.random());
    military.soldiers -= lost;
    res.weapons = Math.max(0, res.weapons - lost);
    res.armour = Math.max(0, res.armour - lost);
    const loot = 5+rnd(15);
    coin += loot;
    const wallNote = defense>0 ? ` Your defences (${defense}) held firm.` : '';
    return `⚔️ Raiders attacked but your defence of ${Math.round(myStrength)} repelled them!${wallNote} Lost ${lost} soldiers, seized ${loot} coin.`;
  } else {
    const mitigation = defense>0 ? Math.min(0.7, defense/25) : 0;
    const hit = damageRandomBuildings(Math.max(0, Math.round((1+rnd(3))*(1-mitigation))));
    const goldLoss = Math.min(coin, Math.round((10+rnd(30))*(1-mitigation)));
    coin -= goldLoss;
    military.soldiers = Math.floor(military.soldiers*0.5);
    happiness = Math.max(0, happiness-12*(1-mitigation));
    return `⚔️ Invasion! Your defences were overwhelmed — ${hit} building(s) destroyed, ${Math.floor(goldLoss)} coin looted.`;
  }
}

// DISASTER_TYPES/pickDisaster live in protected/js/disasters.js; this ctx
// wires their stateless resolve() logic to game.html's mutable state.
function disasterCtx(){
  return {
    rnd, damageRandomBuildings, nearTerrainOfBuilding, resolveInvasion,
    sewerRelief: placedBuildings.some(b=>b.id==='sewer') ? 0.7 : 1,
    hasMountainBuild: placedBuildings.some(b=>nearTerrainOfBuilding(b,'mountain')),
    hasCoastalBuild: placedBuildings.some(b=>['docks','fisherhut','boatbuilder'].includes(b.id)),
    hasRiverBuild: placedBuildings.some(b=>nearTerrainOfBuilding(b,'river')),
    hasFields: placedBuildings.some(b=>BLD_BY_ID[b.id].isField),
    droughtTicksLeft, coin,
    addHappiness: (delta)=>{ happiness = Math.max(0, happiness+delta); },
    reducePop: (n)=>{ pop.count = Math.max(1, pop.count-n); },
    reduceBoats: (n)=>{ boats = Math.max(0, boats-n); },
    waterlogStores: ()=>{ res.wheat *= 0.6; res.wood *= 0.8; res.clay *= 0.8; },
    startDrought: (ticks)=>{ droughtTicksLeft = ticks; },
  };
}

function triggerDisaster(disaster, ctx){
  const msg = disaster.resolve(ctx);
  logEvent(msg);
  showToast(msg);
  if(happiness >= 20) scenarioState.disastersSurvived = (scenarioState.disastersSurvived||0) + 1;
  else scenarioState.disastersSurvived = 0;
}

function maybeTriggerDisaster(){
  const ctx = disasterCtx();
  const disaster = pickDisaster(ctx);
  if(!disaster) return;
  // Guards won from choice events hold off the matching disaster.
  if(disaster.id === 'flood' && floodGuardTicks > 0) return;
  if(disaster.id === 'drought' && famineGuardTicks > 0) return;
  if(divineFavourTicks > 0 && Math.random() < 0.5){
    logEvent('🕯️ The gods turned aside a misfortune.');
    return;
  }
  triggerDisaster(disaster, ctx);
}

/* ---------------- PLAYER CHOICE EVENTS ---------------- */
function choiceEventCtx(){
  return {
    rnd, coin,
    totalFood: totalFood(),
    buildingCount: placedBuildings.length,
    hasRiverBuild: placedBuildings.some(b=>nearTerrainOfBuilding(b,'river')),
    hasTemple: placedBuildings.some(b=>['temple','templegrand','templemonument'].includes(b.id)),
    chance: (p)=> Math.random() < p,
    nearRiver: (b)=> nearTerrainOfBuilding(b,'river'),
    damageBuildings: (n, filterFn)=> damageRandomBuildings(n, filterFn),
    addHappiness: (delta)=>{ happiness = Math.max(0, Math.min(100, happiness+delta)); },
    reducePop: (n)=>{ pop.count = Math.max(1, pop.count-n); },
    scaleFood: (mult)=> FOOD_KEYS.forEach(k=> res[k] *= mult),
    waterlogStores: ()=>{ res.wheat *= 0.6; res.wood *= 0.8; res.clay *= 0.8; },
    payWood: (n)=>{ res.wood = Math.max(0, res.wood-n); },
    payStone: (n)=>{ res.stone = Math.max(0, res.stone-n); },
    payCoin: (n)=>{ if(coin < n) return false; coin -= n; return true; },
    stealCoin: (n)=>{ const taken = Math.min(coin, n); coin -= taken; return Math.floor(taken); },
    addSoldiers: (n)=>{ military.cap += n; military.soldiers += n; },
    setFamineGuard: (t)=>{ famineGuardTicks = t; },
    setFireGuard: (t)=>{ fireGuardTicks = t; },
    setFloodGuard: (t)=>{ floodGuardTicks = t; },
    setDivineFavour: (t)=>{ divineFavourTicks = t; },
  };
}

function maybeTriggerChoiceEvent(){
  if(choiceEventOpen || tickCount < 8) return;
  const ctx = choiceEventCtx();
  const event = pickChoiceEvent(ctx);
  if(event) showChoiceEvent(event);
}

function showChoiceEvent(event){
  const overlay = document.getElementById('eventOverlay');
  const choicesEl = document.getElementById('eventChoices');
  if(!overlay || !choicesEl) return;
  choiceEventOpen = true;
  document.getElementById('eventTitle').textContent = event.title;
  document.getElementById('eventText').textContent = event.text;
  choicesEl.replaceChildren();
  event.choices.forEach(choice=>{
    const btn = document.createElement('button');
    btn.className = 'eventChoice';
    btn.type = 'button';
    const label = document.createElement('b');
    label.textContent = choice.label;
    const detail = document.createElement('small');
    detail.textContent = choice.detail;
    btn.append(label, detail);
    btn.onclick = ()=>{
      const message = choice.resolve(choiceEventCtx());
      overlay.classList.remove('show');
      choiceEventOpen = false;
      logEvent(message);
      showToast(message);
      playTone('click');
      render(); renderRes();
    };
    choicesEl.appendChild(btn);
  });
  overlay.classList.add('show');
  playTone('gather');
}

/* ---------------- ARMY UI ---------------- */
function updateArmyPanel(){
  document.getElementById('soldierCount').textContent = military.soldiers;
  document.getElementById('soldierCap').textContent = military.cap;
  const defenseEl = document.getElementById('defenseValue');
  if(defenseEl) defenseEl.textContent = totalDefense();
  renderChronicle();
}
document.getElementById('recruitBtn').onclick = ()=>{
  if(military.soldiers >= military.cap){ showToast('Build more Barracks first'); return; }
  if(pop.count <= military.soldiers){ showToast('Not enough population to spare'); return; }
  if(!canAfford({tools:4})){ showToast('Not enough tools'); return; }
  pay({tools:4});
  military.soldiers++;
  showToast('Soldier recruited');
  updateArmyPanel();
};
document.getElementById('disbandBtn').onclick = ()=>{
  if(military.soldiers<=0){ showToast('No soldiers to disband'); return; }
  military.soldiers--;
  showToast('Soldier returned to civic life');
  updateArmyPanel();
};
document.querySelectorAll('.actionbtn.raid').forEach(btn=>{
  btn.onclick = ()=>{
    const tier = RAID_TIERS[btn.dataset.tier];
    if(military.soldiers < tier.soldiers){ showToast('Not enough soldiers for this raid'); return; }
    const armedBonus = armyStrength() > military.soldiers ? 1.15 : 1;
    const result = resolveRaid(tier, { rnd, raidBonus: techBonus.raid * armedBonus });
    coin += result.loot;
    military.soldiers -= result.losses;
    logEvent(result.message);
    showToast(result.toast);
    updateArmyPanel(); renderRes();
  };
});

/* ---------------- QUESTS ---------------- */
// Quest definitions live in protected/js/quests.js; this builds the ctx
// they check/reward against and applies rewards to local state.
function questCtx(){
  return {
    placedBuildings, BLD_BY_ID, res, unlockedTechs, scenarioState,
    addRes,
    addCoin: (n)=>{ coin += n; },
    addResearch: (n)=>{ research += n; },
    addTechHappiness: (n)=>{ techHappinessBonus += n; },
  };
}

function checkQuests(){
  const ctx = questCtx();
  QUESTS.forEach((q,idx)=>{
    if(questsCompleted.has(q.id)) return;
    if(q.check(ctx)){
      questsCompleted.add(q.id);
      q.reward(ctx);
      logEvent(`🧭 Quest complete: ${q.name} — ${q.rewardText}`);
      showToast(`🧭 Quest complete: ${q.name}`);
      rollQuestDiscovery(idx);
    }
  });
}

async function rollQuestDiscovery(questIndex){
  if(!currentUser) return;
  try{
    const result = await api('/api/discoveries/roll', {
      method:'POST',
      body: JSON.stringify({ activity: 'quest', turnNumber: questIndex })
    });
    if(result.discovery){
      const message = `🔎 Your quest uncovered: ${result.discovery.title}.`;
      logEvent(message);
      showToast(message);
      const discoveries = await api('/api/discoveries');
      codexEntries = discoveries.codexEntries || [];
      renderCodexPanel();
    }
  } catch(e){ console.warn('quest discovery roll failed', e); }
}

function renderQuestsPanel(){
  const list = document.getElementById('questsList');
  if(!list) return;
  list.replaceChildren();
  QUESTS.forEach(q=>{
    const done = questsCompleted.has(q.id);
    const row=document.createElement('div');
    row.className='tech'+(done?' done':'');
    row.innerHTML =
      `<div class="tname">${q.name}${done?' ✓':''}</div>
       <div class="tdesc">${q.desc}</div>
       <div class="tdesc">Reward: ${q.rewardText}</div>`;
    list.appendChild(row);
  });
}

/* ---------------- SCENARIOS / GOALS ---------------- */
// Scenario definitions live in protected/js/scenarios.js.
let scenarioState = { disastersSurvived:0, failed:false };

function scenarioCtx(){
  return { pop, coin, placedBuildings, scenarioState };
}

function checkScenario(){
  if(!scenarioId) return;
  const sc = SCENARIOS.find(s=>s.id===scenarioId);
  if(!sc) return;
  const val = sc.progress(scenarioCtx());
  if(val >= sc.target && !scenarioState.completed){
    scenarioState.completed = true;
    logEvent(`🎯 Goal complete: ${sc.name}!`);
    showToast(`🎯 Goal complete — ${sc.name}!`);
  }
}
function renderGoalsPanel(){
  const list = document.getElementById('scenarioList');
  if(!list) return;
  list.innerHTML = '';
  const ctx = scenarioCtx();
  SCENARIOS.forEach(sc=>{
    const active = scenarioId===sc.id;
    const val = sc.progress(ctx);
    const pct = Math.min(100, Math.round((val/sc.target)*100));
    const row = document.createElement('div');
    row.className = 'tech' + (active && scenarioState.completed ? ' done' : '');
    row.innerHTML =
      `<div class="tname">${sc.ic} ${sc.name}${active?' (tracking)':''}</div>
       <div class="tdesc">${sc.desc}</div>
       <div class="tdesc">${sc.format(val)} — ${pct}%</div>
       <button>${active ? (scenarioState.completed?'✓ Complete':'Tracking') : 'Track this goal'}</button>`;
    if(!active){
      row.querySelector('button').onclick = ()=>{
        scenarioId = sc.id;
        scenarioState = { disastersSurvived:0, completed:false };
        showToast(`Now tracking: ${sc.name}`);
        renderGoalsPanel();
      };
    } else {
      row.querySelector('button').disabled = true;
    }
    list.appendChild(row);
  });
}

/* ---------------- TAXES ---------------- */
function updateTaxPanel(){
  const hasOffice = placedBuildings.some(b=>b.id==='taxoffice');
  document.getElementById('taxNote').style.display = hasOffice ? 'none' : 'block';
  document.getElementById('taxButtons').style.display = hasOffice ? 'block' : 'none';
  document.querySelectorAll('.actionbtn.taxrate').forEach(btn=>{
    btn.classList.toggle('secondary', Number(btn.dataset.rate) !== taxRate);
  });
}
document.querySelectorAll('.actionbtn.taxrate').forEach(btn=>{
  btn.onclick = ()=>{
    taxRate = Number(btn.dataset.rate);
    showToast(`Tax rate set — ${btn.textContent.split('—')[0].trim()}`);
    updateTaxPanel();
  };
});

/* ---------------- SAVE / LOAD ---------------- */
function getState(){
  return {
    v:1,
    captain: captainName,
    res, cap, pop, happiness, boats, coin, research,
    unlockedTechs: Array.from(unlockedTechs),
    techBonus, techHappinessBonus,
    questsCompleted: Array.from(questsCompleted),
    military,
    droughtTicksLeft,
    taxRate, scenarioId, scenarioState,
    grid: grid.map(row=>row.map(t=>({terrain:t.terrain, deposit:t.deposit}))),
    buildings: placedBuildings.map(b=>({id:b.id, x:b.x, y:b.y, crop:b.crop||undefined, recipe:b.recipe||undefined})),
  };
}
function encodeState(s){
  return btoa(unescape(encodeURIComponent(JSON.stringify(s))));
}
function decodeState(code){
  try { return JSON.parse(decodeURIComponent(escape(atob(code.trim())))); }
  catch(e){ return null; }
}
function applyState(s){
  if(!s || s.v!==1 || !s.grid || !s.buildings){ showToast('That save code looks invalid'); return; }
  // Saves predating a resource omit its key entirely; zero-fill so the arithmetic
  // below can't turn into NaN.
  const zeroedResources = Object.fromEntries([...FOOD_KEYS, ...GENERAL_KEYS].map(k=>[k,0]));
  res = { ...zeroedResources, ...s.res };
  cap = s.cap; pop = s.pop; happiness = s.happiness; boats = s.boats;
  coin = s.coin; research = s.research; droughtTicksLeft = s.droughtTicksLeft||0;
  unlockedTechs = new Set(s.unlockedTechs||[]);
  Object.assign(techBonus, s.techBonus||{});
  techHappinessBonus = s.techHappinessBonus || 0;
  questsCompleted = new Set(s.questsCompleted||[]);
  military = s.military || {soldiers:0,cap:0};
  taxRate = s.taxRate || 0;
  scenarioId = s.scenarioId || null;
  scenarioState = s.scenarioState || { disastersSurvived:0, completed:false };
  captainName = s.captain||'';
  document.getElementById('captainInput').value = captainName;
  setGrid(s.grid.map(row=>row.map(t=>({terrain:t.terrain, deposit:t.deposit, building:null}))));
  placedBuildings = [];
  s.buildings.forEach(b=>{
    const bld = {id:b.id, x:b.x, y:b.y};
    if(b.crop) bld.crop = b.crop;
    if(b.recipe) bld.recipe = b.recipe;
    grid[b.y][b.x].building = bld;
    placedBuildings.push(bld);
  });
  minimapDirty = true;
  render(); renderRes(); renderPanel();
  showToast(`Game Loaded. Welcome back${captainName? ', '+captainName:''}`);
  playTone('click');
  logEvent('📜 City loaded from a save code.');
}

document.getElementById('captainInput').oninput = e=> captainName = e.target.value;
document.getElementById('genSaveBtn').onclick = ()=>{
  const code = encodeState(getState());
  document.getElementById('saveOut').value = code;
  showToast('Game Saved. Save code generated — copy it now');
  playTone('click');
};
document.getElementById('loadBtn').onclick = ()=>{
  const code = document.getElementById('loadIn').value;
  if(!code.trim()){ showToast('Paste a save code first'); return; }
  const state = decodeState(code);
  applyState(state);
};
document.getElementById('cloudSaveBtn').onclick = async ()=>{
  if(!currentUser){ showToast('Log in first to save to your account'); return; }
  try{
    const state = getState();
    await api('/api/save', {
      method:'POST',
      body: JSON.stringify({ state: JSON.stringify(state), captain: state.captain })
    });
    showToast('Game Saved.');
    playTone('click');
  } catch(e){ showToast(e.message); }
};
document.getElementById('cloudLoadBtn').onclick = async ()=>{
  if(!currentUser){ showToast('Log in first to load from your account'); return; }
  try{
    const {state} = await api('/api/save');
    if(!state){ showToast('No cloud save found yet'); return; }
    applyState(state);
    showToast('Game Loaded.');
  } catch(e){ showToast(e.message); }
};

/* ---------------- INIT ---------------- */
function fitCanvas(){
  // keep canvas native size; container scrolls
}
genMap();
resizeCanvas();
renderPanel();
renderRes();
fitCanvas();
window.addEventListener('resize', resizeCanvas, {passive:true});

refreshFromServer();

/* tutorial overlay: show once on first load */
(function(){
  const overlay = document.getElementById('tutorialOverlay');
  const btn = document.getElementById('tutorialCloseBtn');
  const showTutorial = ()=>{
    overlay.style.display = 'flex';
    btn.onclick = ()=>{
      overlay.style.display = 'none';
      showToast('Tap a building, then tap the map to begin.');
    };
  };

  /* starting difficulty: seed a few buildings depending on the chosen level */
  const STARTER_SETS = { 1:['house','fields','sawmill'], 2:['house'], 3:[] };
  function seedStarterBuildings(level){
    const starters = STARTER_SETS[level] || [];
    if(!starters.length) return;
    const cx = Math.floor(COLS/2), cy = Math.floor(ROWS/2);
    const spots = [];
    for(let r=0; r<8 && spots.length<starters.length*3; r++){
      for(let dy=-r; dy<=r; dy++){
        for(let dx=-r; dx<=r; dx++){
          const x=cx+dx, y=cy+dy;
          if(inBounds(x,y) && !grid[y][x].building && !spots.some(s=>s.x===x&&s.y===y)) spots.push({x,y});
        }
      }
    }
    starters.forEach(id=>{
      const def = BLD_BY_ID[id];
      const spotIdx = spots.findIndex(s=> !grid[s.y][s.x].building && def.valid(s.x,s.y));
      if(spotIdx===-1) return;
      const {x,y} = spots[spotIdx];
      const b = {id, x, y};
      if(def.isField) b.crop = 'wheat';
      grid[y][x].building = b;
      placedBuildings.push(b);
    });
    minimapDirty = true;
    render(); renderRes();
  }

  const lOverlay = document.getElementById('levelOverlay');
  const levelRememberKey = 'portus_level_choice';
  const levelRememberBox = document.getElementById('levelRemember');
  const showLevelSelect = ()=>{
    const remembered = localStorage.getItem(levelRememberKey);
    if(remembered){
      seedStarterBuildings(Number(remembered));
      showTutorial();
      return;
    }
    lOverlay.style.display = 'flex';
    document.querySelectorAll('.levelOption').forEach(opt=>{
      opt.onclick = ()=>{
        if(levelRememberBox.checked) localStorage.setItem(levelRememberKey, opt.dataset.level);
        seedStarterBuildings(Number(opt.dataset.level));
        lOverlay.style.display = 'none';
        showTutorial();
      };
    });
  };

  /* info bubbles: important notices, each dismissible independently */
  const bubbles = [
    {
      id:'terms',
      title:'Before you begin',
      html:'By playing Portus you agree to the <a href="/terms.html" target="_blank" style="color:#2b6777;">Terms of Service</a> and <a href="/privacy.html" target="_blank" style="color:#2b6777;">Privacy Policy</a>.',
      checkLabel:'I agree to the terms',
      require:true
    },
    {
      id:'sawmill-first',
      title:'Getting started',
      html:'Building a <b>Woodcutter</b> is the essential first step, followed by a <b>Quarry</b> — without them your production chain stalls and the game will block further progress.',
      checkLabel:"I've read this — don't show again",
      require:false
    },
    {
      id:'gods-resources',
      title:'A word of caution',
      html:'The gods may grant you resources from time to time as favour — but don\'t count on it.',
      checkLabel:"I've read this — don't show again",
      require:false
    }
  ];

  const bOverlay = document.getElementById('bubbleOverlay');
  const bTitle = document.getElementById('bubbleTitle');
  const bText = document.getElementById('bubbleText');
  const bProgress = document.getElementById('bubbleProgress');
  const bCheck = document.getElementById('bubbleDontShow');
  const bCheckLabel = document.getElementById('bubbleCheckLabel');
  const bNextBtn = document.getElementById('bubbleNextBtn');

  const dismissedKey = id => `portus_bubble_${id}_dismissed`;
  const pending = bubbles.filter(b => localStorage.getItem(dismissedKey(b.id)) !== 'true');

  const runQueue = (index)=>{
    if(index >= pending.length){
      bOverlay.style.display = 'none';
      showLevelSelect();
      return;
    }
    const b = pending[index];
    bTitle.textContent = b.title;
    bText.innerHTML = b.html;
    bCheckLabel.textContent = b.checkLabel;
    bProgress.textContent = `${index + 1} of ${pending.length}`;
    bCheck.checked = false;
    bNextBtn.disabled = b.require;
    bNextBtn.textContent = index === pending.length - 1 ? 'Got it — continue' : 'Next';

    bCheck.onchange = ()=>{
      if(b.require) bNextBtn.disabled = !bCheck.checked;
    };
    bNextBtn.onclick = ()=>{
      if(bCheck.checked) localStorage.setItem(dismissedKey(b.id), 'true');
      runQueue(index + 1);
    };
    bOverlay.style.display = 'flex';
  };

  if(pending.length){
    runQueue(0);
  } else {
    showLevelSelect();
  }
})();

const titleOverlay = document.getElementById('titleOverlay');
const closeTitle = ()=>{
  titleOverlay.style.display = 'none';
  playTone('click');
};
document.getElementById('newGameBtn').onclick = closeTitle;
document.getElementById('continueBtn').onclick = closeTitle;
document.getElementById('titleCodexBtn').onclick = ()=>{
  closeTitle();
  document.querySelector('[data-panel="codexPanel"]').click();
};
document.getElementById('creditsBtn').onclick = ()=>{
  document.getElementById('creditsPanel').hidden = false;
  playTone('click');
};
document.getElementById('creditsCloseBtn').onclick = ()=>{
  document.getElementById('creditsPanel').hidden = true;
  playTone('click');
};
createPortusMusic(document.getElementById('musicBtn'));
createPortusMusic(document.getElementById('musicToggle'));
titleOverlay.style.display = 'flex';

setTimeout(()=>{
  const houseButton = document.querySelector('.bldbtn[data-id="house"]');
  const guide = document.getElementById('firstActionGuide');
  if(houseButton && guide && !placedBuildings.some(b=>b.id==='house')){
    houseButton.classList.add('guided');
    guide.textContent = 'Portus. A town by the sea. Your people await your guidance. Select House, then choose a tile. Place your first home.';
  }
}, 500);
