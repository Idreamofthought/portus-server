import { FOOD_KEYS, GENERAL_KEYS, PRICES, totalFood } from './resources.js';

export const DEFAULT_MARKET_POLICY = Object.freeze({autoSell:true, foodReserveTurns:24, generalReserve:20});

export function completeTradeGoods(existing, descriptions={}){
  const known=new Map(existing.map(good=>[good.id,good]));
  return [...FOOD_KEYS,...GENERAL_KEYS].map(id=>known.get(id)||{
    id, label:descriptions[id]?.split(':')[0] || id.replace(/([A-Z])/g,' $1'),
    buyCost:Math.max(3,Math.ceil((PRICES[id]||1)*4)),
    sellValue:Math.max(1,Math.floor(PRICES[id]||1))
  });
}

export function foodReserve(population, policy){ return population*0.12*policy.foodReserveTurns; }
export function foodTurns(res,population){ return population>0 ? totalFood(res)/(population*0.12) : Infinity; }

export function sellableSurplus(res,id,population,policy){
  const stock=Math.max(0,res[id]||0);
  if(!FOOD_KEYS.includes(id)) return Math.max(0,stock-policy.generalReserve);
  return Math.max(0,Math.min(stock-30,totalFood(res)-foodReserve(population,policy)));
}

// Allocate the shared food reserve once across all foods in this market's turn.
export function automaticSales(res,population,policy,rate){
  if(!policy.autoSell || rate<=0) return [];
  const remaining={...res},sales=[];
  for(const id of [...GENERAL_KEYS,...FOOD_KEYS]){
    const amount=Math.min(rate,sellableSurplus(remaining,id,population,policy));
    if(amount<=0) continue;
    remaining[id]-=amount;
    sales.push({id,amount});
  }
  return sales;
}

export function saleQuote(res,id,amount,population,policy){
  const available=Math.floor(Math.max(0,res[id]||0));
  if(!Number.isSafeInteger(amount)||amount<=0||amount>available) return {ok:false,error:'Not enough stock for this sale.'};
  if(!FOOD_KEYS.includes(id)) return {ok:true,amount,warning:''};
  const remaining=Math.max(0,totalFood(res)-amount);
  const turns=population>0?remaining/(population*0.12):Infinity;
  const warning=remaining<foodReserve(population,policy) || (population>0 && turns<1)
    ? (remaining===0?'This sale empties your food stores. Your people will depend on the next harvest.':turns<1?'This sale leaves less than one turn of food without new production. Your people may go hungry.':`This sale leaves about ${Math.floor(turns)} turns of food without new production, below your chosen reserve.`)
    : '';
  return {ok:true,amount,remaining,turns,warning};
}

export function storageRoom(res,cap,id){
  const used=FOOD_KEYS.includes(id)?totalFood(res):GENERAL_KEYS.reduce((sum,key)=>sum+(res[key]||0),0);
  return Math.max(0,(FOOD_KEYS.includes(id)?cap.food:cap.general)-used);
}
