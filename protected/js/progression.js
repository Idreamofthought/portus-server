import { BUILDINGS, BLD_BY_ID } from './buildings.js';
import { FOOD_KEYS } from './resources.js';
import { settlementVoice } from './settlement-voices.js';
import { RESEARCH_PATHS, researchPath } from './research.js';

// Ordered advice is recomputed from the current town, including loaded saves.
// It never grants goods, changes buildings or spends the player's research.
export function settlementAdvice({buildings=[], res={}, pop={count:6,capacity:10}, military={soldiers:0}, happiness=55, cap={food:150,general:150}, unlockedTechs=new Set(), researchGoal=''}){
  const built = new Set(buildings.map(b=>b.id));
  const food = FOOD_KEYS.reduce((sum,key)=>sum+(res[key]||0),0);
  const workers = buildings.reduce((sum,b)=>sum+(BLD_BY_ID[b.id]?.workers||0),0);
  const civilians = Math.max(0,pop.count-military.soldiers);
  const advice = [];
  const add = (id,title,text,action,urgent=false)=>advice.push({id,title,text,action,urgent});
  const build = (id,title,text,urgent=false)=>add(`build-${id}`,title,text,{building:id},urgent);
  const hasFood = buildings.some(b=>BLD_BY_ID[b.id]?.isField || Object.keys(BLD_BY_ID[b.id]?.produce||{}).some(key=>FOOD_KEYS.includes(key)));

  if(food < pop.count*0.12*8){
    if(workers>civilians && hasFood){
      if(pop.count>=pop.capacity && military.soldiers===0) build('house','Food needs more workers',`Your food reserve is low and ${workers} jobs share ${civilians} workers. A House makes room for more people; keep food and happiness available while they arrive.`,true);
      else add('hungry-workers','Food is running short',`Your food reserve is low and ${workers} jobs share ${civilians} civilian workers. ${military.soldiers>0?'Disbanding soldiers returns them to food production.':'Keep food available and happiness above 45% to attract people. Pause expansion while the town recovers.'}`,{panel:military.soldiers>0?'armyPanel':'productionPanel'},true);
    } else if(hasFood){
      add('food-reserve','Protect the food supply','Your food reserve is low. Check your existing food producers and their inputs before expanding. Each citizen eats 0.12 food per turn; keep enough workers on food production.',{panel:'productionPanel'},true);
    } else {
      build('fisherhut',food===0?'Your people need food':'Protect the food supply',
        'Place a Fisherman’s Hut on grass or sand beside water. It produces food without research; fields become available through Agriculture.',true);
    }
  }
  if(!built.has('sawmill')) build('sawmill','Secure your timber','Place a Woodcutter beside a forest. Renewing your timber supply keeps construction moving.');
  if(!built.has('quarry')) build('quarry','Lay stone foundations','Place a Quarry on a mountain tile. Stone supplies homes, workshops and roads.');
  if(!hasFood) build('fisherhut','Feed the settlement','A Fisherman’s Hut beside water provides food while you develop agriculture.');
  if(workers>civilians){
    if(military.soldiers>0) add('workers-army','Your workers are stretched',`${military.soldiers} citizens are enlisted. Disbanding soldiers returns them to civilian work, but reduces your defence.`,{panel:'armyPanel'});
    if(pop.count>=pop.capacity) build('house','Make room for workers',`${workers} jobs share ${civilians} civilian workers. Build a House, then maintain food and happiness above 45% to attract more people.`);
    else if(happiness<=45) add('workers-happiness','Help the town recover','There is room for more people, but happiness must rise above 45% before they arrive. Keep food available and reduce taxes if you are collecting them.',{panel:'taxPanel'});
    else add('workers-wait','Let the town grow',`There is room for ${pop.capacity-pop.count} more people. Keep food available and happiness above 45%; new citizens arrive gradually.`,{panel:'productionPanel'});
  }
  if(food>=cap.food*0.85) build('granary','Keep the harvest','Food storage is nearly full. A Granary adds 250 food capacity before the next harvest.');

  // Repair missing suppliers before encouraging another downstream workshop.
  for(const building of buildings){
    const def = BLD_BY_ID[building.id];
    for(const key of Object.keys(def?.consume||{})){
      if((res[key]||0)>0) continue;
      const supplier = BUILDINGS.find(b=>!b.upgradeOnly && b.produce?.[key] && !built.has(b.id));
      if(supplier) build(supplier.id,`Supply the ${def.name}`,`${def.name} needs ${key}. ${supplier.name} supplies it. ${supplier.desc||'Keep this supply available for production.'}`);
    }
  }
  if(!built.has('claypit')) build('claypit','Begin the path to knowledge','A Claypit on a clay deposit supplies a Potter. Pottery supports a Scribe, whose scrolls feed a Library.');
  else if(!built.has('potter')) build('potter','Shape clay into pottery','A Potter turns clay into pottery. You will need six pottery to establish a Scribe’s House.');
  else if(!built.has('scribe')) build('scribe','Give the town a scribe','A Scribe’s House consumes pottery and produces scrolls. A Library turns those scrolls into research.');
  else if(!built.has('library')) build('library','Open a library','A Library consumes scrolls from your Scribe and produces research points. Choose a research path to give the town a new ambition.');
  else {
    const path=RESEARCH_PATHS.find(path=>path.id===researchGoal);
    const next=path && researchPath(path.targets).find(tech=>!unlockedTechs.has(tech.id));
    if(next) add(`research-${next.id}`,`Develop ${path.name.toLowerCase()}`,`${next.name} is next on your chosen path: ${next.desc}. Keep your Scribe supplied with pottery and your Library supplied with scrolls.`,{tech:next.id});
    else add('research-path',path?'Choose another ambition':'Choose the town’s next ambition',path?'You have completed this research path. Explore another branch to develop the town further.':'Research can improve food, industry, trade, defence or spiritual life. Choose a path to see prerequisites and what each discovery makes possible.',{panel:'researchPanel'});
  }

  for(const building of buildings){
    const voice = settlementVoice(building.id, [...built], building.crop);
    if(voice) build(voice.next,voice.title,voice.text);
  }
  if(!built.has('market')) build('market','Make use of surplus','A Market lets you trade every good and automatically sell surplus. Set a food reserve in Trade and keep materials for your next buildings.');
  if(!built.has('barracks')) build('barracks','Prepare a town guard','Barracks make room for soldiers. Recruits cost tools and leave civilian jobs, so grow your workforce before enlisting.');
  if(!unlockedTechs.has('irrigation') && built.has('library')) add('research-farming','Diversify the food supply','Agriculture unlocks Fields. Follow the Food & farming path to improve yields and food storage.',{tech:'irrigation'});
  if(!built.has('temple')) build('temple','Make a place for devotion','A Small Temple lifts happiness. First secure refined gold for construction and candles for its shrine.');

  // Multiple chain checks may point to the same supplier; show it only once.
  return advice.filter((item,index)=>advice.findIndex(other=>other.id===item.id)===index);
}
