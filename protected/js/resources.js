// Resource state helpers, extracted from protected/game.html.
// Pure functions taking res/cap explicitly (rather than closing over
// game.html's globals) so this module has no dependency on game state shape
// beyond the objects passed in.

export const FOOD_KEYS = ['wheat','olives','chickpeas','grapes','fish','deer','bread'];
export const GENERAL_KEYS = ['wood','stone','clay','pottery','tools','goldOre','silverOre','copperOre','gold','silver','copper','scrolls','flour','oliveOil','salt'];

export const PRICES = {
  wood:0.4, stone:0.5, clay:0.4, pottery:1.4, tools:2, scrolls:1.8,
  goldOre:3, silverOre:2, copperOre:1.4, gold:8, silver:5, copper:3,
  wheat:0.7, olives:1.1, chickpeas:0.9, grapes:1.0, fish:0.7, deer:1.3, bread:1.6,
  flour:1.1, oliveOil:2.4, salt:1.8
};

export function createResources(){
  return {
    wood:60, stone:30, clay:0, pottery:0, tools:10,
    goldOre:0, silverOre:0, copperOre:0, gold:0, silver:0, copper:0,
    wheat:0, olives:0, chickpeas:0, grapes:0, fish:0, deer:0, bread:0, scrolls:0,
    flour:0, oliveOil:0, salt:0
  };
}

export function totalFood(res){ return FOOD_KEYS.reduce((s,k)=>s+res[k],0); }

export function addResTo(res, cap, key, amt){
  if(FOOD_KEYS.includes(key)){
    let room = cap.food - totalFood(res);
    res[key] += Math.max(0, Math.min(amt, room));
  } else {
    let room = cap.general - GENERAL_KEYS.reduce((s,k)=>s+res[k],0) + res[key];
    res[key] = Math.min(res[key]+amt, cap.general);
  }
}

export function canAffordFrom(res, cost){
  return Object.entries(cost).every(([k,v]) => (res[k]||0) >= v);
}

export function payFrom(res, cost){
  Object.entries(cost).forEach(([k,v]) => res[k] -= v);
}
