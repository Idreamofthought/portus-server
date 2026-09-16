import { COLS, ROWS, TS, grid, setGrid, rnd, genMap, inBounds, neighbors, nearTerrain, nearBuilding, nearDeposit } from '/game-assets/map.js';
import { BUILDINGS, BLD_BY_ID, CATS } from '/game-assets/buildings.js';
import { TECHS, techName, techRequirementsMet } from '/game-assets/research.js';
import { FOOD_KEYS, GENERAL_KEYS, PRICES, createResources, totalFood as totalFoodOf, addResTo, canAffordFrom, payFrom } from '/game-assets/resources.js';
import { QUESTS } from '/game-assets/quests.js';
import { SCENARIOS } from '/game-assets/scenarios.js';
import { pickDisaster } from '/game-assets/disasters.js';
import { RAID_TIERS, resolveRaid } from '/game-assets/army.js';
import { GOD_MESSAGES } from '/game-assets/blessings.js';
import { TERRAIN_COLOR, DEPOSIT_COLOR, RESOURCE_INFO } from '/game-assets/presentation.js';

let selectedCrop = 'wheat';

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
let captainName = '';
let eventLog = [];
let discoveryRollInFlight = false;
let taxRate = 0;      // coin per citizen per tick
let scenarioId = null;
let techHappinessBonus = 0;
let questsCompleted = new Set();

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
      let ok = Object.entries(def.consume).every(([k,v])=>res[k] >= v*laborRatio*0.4);
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
  let taxPenalty = taxRate * 400;
  let target = Math.min(100, Math.max(0, 40 + bonus + techHappinessBonus - taxPenalty));
  happiness += (target-happiness)*0.02;
  happiness = Math.max(0, Math.min(100, happiness));

  if(droughtTicksLeft>0) droughtTicksLeft--;
  maybeSendGodMessage();
  maybeRollDiscovery();
  maybeTriggerDisaster();
  checkScenario();
  checkQuests();

  render();
  renderRes();
}
// tick interval is started by grantAccess() once a paid session begins

/* ---------------- CANVAS RENDER ---------------- */
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = COLS*TS;
canvas.height = ROWS*TS;

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
      const isRoad = t.building.id === 'road';
      ctx.fillStyle=isRoad ? 'rgba(111,78,48,0.9)' : 'rgba(255,250,240,0.85)';
      ctx.beginPath();
      if(isRoad) ctx.fillRect(x*TS+7,y*TS+11,TS-14,8);
      else if(ctx.roundRect) ctx.roundRect(x*TS+2,y*TS+2,TS-4,TS-4,4);
      else ctx.rect(x*TS+2,y*TS+2,TS-4,TS-4);
      if(!isRoad) ctx.fill();
      ctx.font = (isRoad ? 13 : TS-10)+'px serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(def.ic, x*TS+TS/2, y*TS+TS/2+1);
      if(def.isField){
        const cropIcon = {wheat:'🌾',olives:'🫒',chickpeas:'🌱',grapes:'🍇'}[t.building.crop||'wheat'];
        ctx.font = '9px serif';
        ctx.fillText(cropIcon, x*TS+TS-8, y*TS+8);
      }
    }
  }
  if(selectedBuild && hoverTile){
    const {x,y} = hoverTile;
    const def = BLD_BY_ID[selectedBuild];
    const ok = inBounds(x,y) && !grid[y][x].building && def.valid(x,y) && canAfford(def.cost);
    ctx.fillStyle = ok ? 'rgba(120,200,120,0.45)' : 'rgba(220,80,60,0.45)';
    ctx.fillRect(x*TS,y*TS,TS,TS);
  }
  renderMinimap();
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
}

/* ---------------- UI: RESOURCE BAR ---------------- */
const RES_DISPLAY = [
  ['wood','🪵'],['stone','🪨'],['clay','🧱'],['pottery','🏺'],['tools','🔧'],
  ['goldOre','🟡'],['silverOre','⚪'],['copperOre','🟠'],
  ['gold','💰'],['silver','🥈'],['copper','🥉'],
  ['wheat','🌾'],['flour','🌾➡️'],['bread','🍞'],['olives','🫒'],['oliveOil','🛢️'],
  ['chickpeas','🌱'],['grapes','🍇'],['salt','🧂'],['fish','🐟'],['deer','🦌'],['scrolls','📜'],
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
}

/* ---------------- UI: BUILD PANEL ---------------- */
function renderPanel(){
  const list = document.getElementById('buildingList');
  if(!list){
    console.error('Portus: buildingList missing');
    return;
  }
  list.innerHTML='';
  CATS.forEach(cat=>{
    const label=document.createElement('div');
    label.className='catlabel'; label.textContent=cat;
    list.appendChild(label);
    BUILDINGS.filter(b=>b.cat===cat).forEach(b=>{
      const btn=document.createElement('button');
      btn.className='bldbtn'; btn.dataset.id=b.id;
      const costStr = Object.entries(b.cost).map(([k,v])=>`${v} ${k}`).join(', ');
      const desc = b.desc || '';
      btn.innerHTML =
        `<span class="ic" aria-label="${b.name} icon">${b.ic}</span>
         <span class="info">
           ${b.name}
           <div class="cost">${costStr}</div>
         </span>`;
      if(desc) btn.title = desc;
      btn.onclick = ()=> selectBuild(b.id);
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
  else if(selectedBuild) legend.textContent = `Tap the map to place ${BLD_BY_ID[selectedBuild].name}`;
  else legend.textContent = 'Tap a building, then tap the map to place it';
  render();
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
canvas.addEventListener('mousemove', e=>{ hoverTile=tileFromEvent(e); render(); });
canvas.addEventListener('click', e=> placeAt(tileFromEvent(e)));
canvas.addEventListener('touchstart', e=>{
  hoverTile = tileFromEvent(e);
  render();
}, {passive:true});
canvas.addEventListener('touchend', e=>{
  if(hoverTile) placeAt(hoverTile);
}, {passive:true});
document.getElementById('minimap').addEventListener('click', e=>{
  const rect = e.currentTarget.getBoundingClientRect();
  const relX = (e.clientX-rect.left)/rect.width;
  const relY = (e.clientY-rect.top)/rect.height;
  const wrap = document.getElementById('mapwrap');
  wrap.scrollTo({
    left: Math.max(0, relX*canvas.width - wrap.clientWidth/2),
    top: Math.max(0, relY*canvas.height - wrap.clientHeight/2),
    behavior:'smooth'
  });
});

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=> t.classList.remove('show'), 1600);
}

function placeAt({x,y}){
  if(!selectedBuild) return;
  if(!inBounds(x,y)) return;
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
  if(def.popCap) pop.capacity += def.popCap;
  if(def.militaryCap) military.cap += def.militaryCap;
  if(def.capBonus){
    if(def.capBonus.general) cap.general += def.capBonus.general;
    if(def.capBonus.food) cap.food += def.capBonus.food;
  }
  showToast(`Built ${def.name}`);
  render(); renderRes();
}

/* ---------------- MENU PANELS ---------------- */
document.querySelectorAll('.menuBtn').forEach(btn=>{
  btn.onclick = ()=>{
    const panelId = btn.dataset.panel;
    const panel = document.getElementById(panelId);
    const isOpen = panel.classList.contains('open');
    document.querySelectorAll('.sidepanel').forEach(p=>p.classList.remove('open'));
    document.querySelectorAll('.menuBtn').forEach(b=>b.classList.remove('active'));
    if(!isOpen){ panel.classList.add('open'); btn.classList.add('active'); }
  };
});
document.querySelectorAll('.closeP').forEach(btn=>{
  btn.onclick = ()=>{
    btn.closest('.sidepanel').classList.remove('open');
    document.querySelectorAll('.menuBtn').forEach(b=>b.classList.remove('active'));
  };
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
      row.innerHTML =
        `<div class="tname">${t.name}</div>
         <div class="tdesc">${t.desc}</div>
         ${reqLine}
         <button ${done||!reqMet? 'disabled':''}>${done? '✓ Researched' : 'Unlock — '+t.cost+' pts'}</button>`;
      if(!done && reqMet){
        row.querySelector('button').onclick = ()=>{
          if(research >= t.cost){
            research -= t.cost;
            unlockedTechs.add(t.id);
            applyTechEffects(t);
            showToast(`Researched ${t.name}`);
            renderRes();
          } else {
            showToast('Not enough research points');
          }
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

function resolveInvasion(){
  const enemyStrength = 4 + rnd(10) + Math.floor(coin/40);
  const myStrength = military.soldiers;
  if(myStrength*techBonus.raid >= enemyStrength && myStrength>0){
    const lost = Math.floor(myStrength*0.1*Math.random());
    military.soldiers -= lost;
    const loot = 5+rnd(15);
    coin += loot;
    return `⚔️ Raiders attacked but your army of ${myStrength} repelled them! Lost ${lost} soldiers, seized ${loot} coin in captured supplies.`;
  } else {
    const hit = damageRandomBuildings(1+rnd(3));
    const goldLoss = Math.min(coin, 10+rnd(30));
    coin -= goldLoss;
    const lost = military.soldiers;
    military.soldiers = Math.floor(military.soldiers*0.5);
    happiness = Math.max(0, happiness-12);
    return `⚔️ Invasion! Your defenses were overwhelmed — ${hit} building(s) destroyed, ${Math.floor(goldLoss)} coin looted.`;
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
  if(disaster) triggerDisaster(disaster, ctx);
}

/* ---------------- ARMY UI ---------------- */
function updateArmyPanel(){
  document.getElementById('soldierCount').textContent = military.soldiers;
  document.getElementById('soldierCap').textContent = military.cap;
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
    const result = resolveRaid(tier, { rnd, raidBonus: techBonus.raid });
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
    buildings: placedBuildings.map(b=>({id:b.id, x:b.x, y:b.y, crop:b.crop||undefined})),
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
  res = s.res; cap = s.cap; pop = s.pop; happiness = s.happiness; boats = s.boats;
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
    grid[b.y][b.x].building = bld;
    placedBuildings.push(bld);
  });
  render(); renderRes(); renderPanel();
  showToast(`Welcome back${captainName? ', '+captainName:''} — city loaded`);
  logEvent('📜 City loaded from a save code.');
}

document.getElementById('captainInput').oninput = e=> captainName = e.target.value;
document.getElementById('genSaveBtn').onclick = ()=>{
  const code = encodeState(getState());
  document.getElementById('saveOut').value = code;
  showToast('Save code generated — copy it now');
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
    await api('/api/save', {method:'POST', body: JSON.stringify(getState())});
    showToast('City saved to your account');
  } catch(e){ showToast(e.message); }
};
document.getElementById('cloudLoadBtn').onclick = async ()=>{
  if(!currentUser){ showToast('Log in first to load from your account'); return; }
  try{
    const {state} = await api('/api/save');
    if(!state){ showToast('No cloud save found yet'); return; }
    applyState(state);
  } catch(e){ showToast(e.message); }
};

/* ---------------- INIT ---------------- */
function fitCanvas(){
  // keep canvas native size; container scrolls
}
genMap();
renderPanel();
render();
renderRes();
fitCanvas();

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
      html:'Building a <b>Sawmill</b> is the essential first step, followed by a <b>Stone Quarry</b> — without them your production chain stalls and the game will block further progress.',
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
