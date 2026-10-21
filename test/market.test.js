import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_MARKET_POLICY, completeTradeGoods, automaticSales, saleQuote, sellableSurplus, storageRoom, foodReserve } from '../protected/js/market.js';
import { createResources, FOOD_KEYS, GENERAL_KEYS, totalFood } from '../protected/js/resources.js';
import { validateSave, migrateSave } from '../save-validation.js';
import { validSave } from './fixtures/valid-save.js';

test('the trade catalogue covers every tracked resource once, including fish',()=>{
  const legacy={id:'wood',label:'Wood',buyCost:4,sellValue:1};
  const goods=completeTradeGoods([legacy]);
  assert.deepEqual(new Set(goods.map(good=>good.id)),new Set([...FOOD_KEYS,...GENERAL_KEYS]));
  assert.equal(goods.length,new Set(goods.map(good=>good.id)).size);
  assert.equal(goods.find(good=>good.id==='wood'),legacy);
  assert.ok(goods.some(good=>good.id==='fish'));
  for(const good of goods) assert.ok(good.buyCost>good.sellValue);
});

test('automatic sales share one population-sized food reserve across foods and markets',()=>{
  const res={...createResources(),fish:200,wheat:200};
  const policy={...DEFAULT_MARKET_POLICY,foodReserveTurns:48};
  const before=structuredClone(res);
  for(let market=0;market<10;market++){
    for(const sale of automaticSales(res,60,policy,100)) res[sale.id]-=sale.amount;
  }
  assert.ok(totalFood(res)>=foodReserve(60,policy)-1e-9);
  assert.ok(res.fish>=30 && res.wheat>=30);
  assert.ok(totalFood(res)<totalFood(before));
});

test('pausing automatic sales prevents every sale and does not mutate stock',()=>{
  const res={...createResources(),fish:100,tools:100};
  const before=structuredClone(res);
  assert.deepEqual(automaticSales(res,6,{...DEFAULT_MARKET_POLICY,autoSell:false},2),[]);
  automaticSales(res,6,DEFAULT_MARKET_POLICY,2);
  assert.deepEqual(res,before);
});

test('manual quotes warn before eating into reserves or emptying the food store',()=>{
  const res={...createResources(),fish:20,wood:60};
  assert.match(saleQuote(res,'fish',20,6,DEFAULT_MARKET_POLICY).warning,/empties your food stores/);
  assert.ok(saleQuote(res,'fish',10,6,DEFAULT_MARKET_POLICY).warning);
  assert.equal(saleQuote(res,'wood',60,6,DEFAULT_MARKET_POLICY).warning,'');
  assert.equal(res.fish,20,'a warning must not sell the food');
  assert.equal(saleQuote(res,'fish',21,6,DEFAULT_MARKET_POLICY).ok,false);
  assert.equal(saleQuote(res,'fish',-1,6,DEFAULT_MARKET_POLICY).ok,false);
  assert.equal(saleQuote(res,'fish',NaN,6,DEFAULT_MARKET_POLICY).ok,false);
  assert.match(saleQuote({...res,fish:2},'fish',1,10,{...DEFAULT_MARKET_POLICY,foodReserveTurns:0}).warning,/less than one turn/);
});

test('surplus sales respect both per-good buffers and the collective reserve',()=>{
  const res={...createResources(),fish:100};
  assert.equal(sellableSurplus(res,'fish',6,DEFAULT_MARKET_POLICY),70);
  assert.equal(sellableSurplus(res,'fish',50,DEFAULT_MARKET_POLICY),0);
  assert.equal(sellableSurplus(res,'wood',6,DEFAULT_MARKET_POLICY),40);
});

test('purchases check the correct shared storage pool',()=>{
  const res={...createResources(),fish:145};
  assert.equal(storageRoom(res,{food:150,general:100},'fish'),5);
  assert.equal(storageRoom(res,{food:150,general:100},'pottery'),0);
  assert.equal(storageRoom(res,{food:100,general:100},'fish'),0);
});

test('older saves receive safe defaults and market policy survives save validation',()=>{
  const old=validSave();
  assert.equal(validateSave(old).ok,true);
  const updated=migrateSave(old);
  assert.deepEqual(updated.marketPolicy,DEFAULT_MARKET_POLICY);
  assert.equal(Object.hasOwn(old,'marketPolicy'),false);
  updated.marketPolicy={autoSell:false,foodReserveTurns:96,generalReserve:20};
  assert.equal(validateSave(updated).ok,true);
  assert.deepEqual(migrateSave(updated).marketPolicy,updated.marketPolicy);
  for(const policy of [null,{}, {...DEFAULT_MARKET_POLICY,foodReserveTurns:-1}, {...DEFAULT_MARKET_POLICY,autoSell:'false'}, {...DEFAULT_MARKET_POLICY,generalReserve:Infinity}]){
    assert.equal(validateSave({...old,marketPolicy:policy}).ok,false);
  }
});
