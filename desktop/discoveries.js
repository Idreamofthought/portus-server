import {ACTIVITY_DISCOVERY_CHANCES, ARTIFACTS, ARCHAEOLOGICAL_FINDS,
  FOUNDATION_CODEX_ENTRIES, RARITY_WEIGHTS} from '../data/discovery_catalog.js';

export {FOUNDATION_CODEX_ENTRIES};

export function emptyDiscoveryState(){
  return {rolls:[],artifacts:[],fragments:{},unlocked:[]};
}

export function rollOfflineDiscovery(state,activity,turnNumber,random=Math.random){
  const chance=ACTIVITY_DISCOVERY_CHANCES[activity];
  if(chance===undefined || !Number.isSafeInteger(turnNumber) || turnNumber<0)
    throw new Error('Invalid discovery roll');
  const key=`${activity}:${turnNumber}`;
  if(state.rolls.includes(key)) return null;
  state.rolls.push(key);
  if(random()>=chance) return null;

  const artifactCandidates=ARTIFACTS.filter(item=>!state.artifacts.includes(item.id));
  const findCandidates=ARCHAEOLOGICAL_FINDS.filter(item=>(state.fragments[item.id]||0)<item.fragments);
  const preferArtifact=random()<0.7;
  const chooseArtifact=preferArtifact ? artifactCandidates.length>0 : findCandidates.length===0;
  if(chooseArtifact && artifactCandidates.length){
    const item=artifactCandidates[Math.floor(random()*artifactCandidates.length)];
    state.artifacts.push(item.id);
    let rarityRoll=random()*100;
    const rarity=RARITY_WEIGHTS.find(entry=>(rarityRoll-=entry.weight)<0)?.id || 'common';
    if(!state.unlocked.includes(item.codexEntry)) state.unlocked.push(item.codexEntry);
    return {type:'artifact',id:item.id,title:item.title,category:item.category,rarity};
  }
  if(findCandidates.length){
    const item=findCandidates[Math.floor(random()*findCandidates.length)];
    const fragmentIndex=(state.fragments[item.id]||0)+1;
    state.fragments[item.id]=fragmentIndex;
    const assembled=fragmentIndex===item.fragments;
    if(assembled && !state.unlocked.includes(item.codexEntry)) state.unlocked.push(item.codexEntry);
    return {type:'archaeological_find',id:item.id,title:item.title,
      fragmentIndex,fragmentCount:item.fragments,assembled};
  }
  return null;
}
