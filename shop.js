import {MATERIAL_PACKS} from './soft-economy.js';
import {crateById,grantCrate,crateCount} from './crates.js';
import {PARTS,partById,addPart} from './progression.js';
import {PAINT_OFFERS,ownsPaint} from './paints.js';
import {track} from './analytics.js';
export const PART_OFFERS=PARTS.filter(p=>p.rarity>0).map(p=>({id:p.id,currency:p.rarity===3?'hard':'cash',cashPrice:p.rarity===3?160000:null,price:p.rarity===3?420:p.rarity===2?26000:9000}));
export function buy(s,kind,id,payment=null){const outcome=buyInner(s,kind,id,payment);if(outcome?.ok)track('buy',{kind,id,payment:payment||'default'});return outcome;}
function buyInner(s,kind,id,payment){
 const offer=kind==='materials'?MATERIAL_PACKS.find(p=>p.id===id):kind==='crate'?crateById(id):kind==='part'?PART_OFFERS.find(p=>p.id===id):kind==='paint'?PAINT_OFFERS.find(p=>p.id===id)&&{...PAINT_OFFERS.find(p=>p.id===id),currency:'cash'}:null;
 if(!offer)return {ok:false,error:'Нет такого товара'};
 const currency=payment||offer.currency,price=currency===offer.currency?offer.price:currency==='cash'?offer.cashPrice:null;
 if(!['cash','hard'].includes(currency)||!Number.isFinite(price)||price<=0)return {ok:false,error:'Этот способ оплаты недоступен'};
 if(kind==='part'&&s.inventory[id])return {ok:false,error:'Эта деталь уже есть'};
 if(kind==='paint'&&ownsPaint(s,id))return {ok:false,error:'Эта краска уже есть'};
 if(kind==='crate'&&crateCount(s,id)>=10000)return {ok:false,error:'Склад заполнен'};
 if(kind==='materials'&&s.scrap+offer.amount>1e7)return {ok:false,error:'Склад материалов заполнен'};
 if(!Number.isFinite(s[currency])||s[currency]<price)return {ok:false,error:'Не хватает '+(currency==='hard'?'баксов':'рублей')};
 s[currency]-=price;
 if(kind==='materials'){s.scrap+=offer.amount;return {ok:true,kind,id,amount:offer.amount};}
 if(kind==='crate'){grantCrate(s,id,'Покупка в магазине');return {ok:true,kind,id};}
 if(kind==='paint'){s.ownedPaints.push(id);return {ok:true,kind,id};}
 return {ok:true,kind,id,drop:addPart(s,partById(id).id)};
}
