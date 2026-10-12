import {partById,tuneCost,tunePart,rankCapFor} from './progression.js';
export const MATERIAL_PACKS=[
 {id:'handful',name:'ПАКЕТ С БОЛТАМИ',amount:20,price:1500,currency:'cash'},
 {id:'box',name:'ЗАПАС МЕХАНИКА',amount:80,price:5600,currency:'cash'},
 {id:'pallet',name:'ПАЛЕТА С РАЗБОРКИ',amount:240,price:15600,currency:'cash'},
];
export const MATERIAL_TOPUP_PRICE=90;
export function rubleTuneQuote(s,id){const p=partById(id),owned=s.inventory[id];if(!p||!owned||owned.rank>=rankCapFor(s,id))return null;const cost=tuneCost(s,id),missing=Math.max(0,cost.scrap-s.scrap);return {...cost,missing,total:cost.cash+missing*MATERIAL_TOPUP_PRICE};}
export function tuneWithRubles(s,id){const q=rubleTuneQuote(s,id);if(!q||!Number.isFinite(s.cash)||s.cash<q.total)return false;const cash=s.cash,scrap=s.scrap;s.cash-=q.missing*MATERIAL_TOPUP_PRICE;s.scrap+=q.missing;if(tunePart(s,id))return true;s.cash=cash;s.scrap=scrap;return false;}
