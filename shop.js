import {MATERIAL_PACKS} from './soft-economy.js';
import {crateById,grantCrate,crateCount} from './crates.js';
import {PARTS,partById,addPart} from './progression.js';
import {requiredGarageFor,garageLevel,GARAGE_LEVELS} from './garage-levels.js';
// С какого гаража деталь встаёт на машину. Витрина и покупка спрашивают одно и то же.
export const partGarage=id=>{const p=partById(id);return p?requiredGarageFor(p.slot,p.rarity):1;};
import {PAINT_OFFERS,ownsPaint} from './paints.js';
import {NEON_OFFERS,ownsNeon,addNeon} from './neons.js';
import {track} from './analytics.js';
// Цена детали — около дюжины побед на той стадии, где её редкость становится нужна (9 октября).
// Редкость полезна не сама по себе, а потолком ранга: обычная упирается в 5, редкая в 7, эпическая в 10.
// Выше 5 ранга пускает только гараж III (35 ранг, ~380 ₽ за победу), выше 7 — гараж IV (78 ранг,
// ~900 ₽). Раньше редкая стоила 9 000, эпическая 26 000 — по доходу это 40 и 30 побед, и к моменту,
// когда игрок их наскребал, такие же детали уже выпадали сами. Витрина стояла мёртвой.
// Легендарная остаётся за баксы: 420 $ ≈ 160 000 ₽ по курсу ящиков (HARD_RATE).
export const PART_PRICE=[null,4500,14000];
export const PART_OFFERS=PARTS.filter(p=>p.rarity>0&&p.rarity<4&&!p.style&&!p.variant)/* магазин продаёт только базовые варианты обычных редкостей: стили, версии и уникальные — добыча */.map(p=>({id:p.id,currency:p.rarity===3?'hard':'cash',cashPrice:p.rarity===3?160000:null,price:p.rarity===3?420:PART_PRICE[p.rarity]}));
export function buy(s,kind,id,payment=null){const outcome=buyInner(s,kind,id,payment);if(outcome?.ok)track('buy',{kind,id,payment:payment||'default'});return outcome;}
function buyInner(s,kind,id,payment){
 const offer=kind==='materials'?MATERIAL_PACKS.find(p=>p.id===id):kind==='crate'?crateById(id):kind==='part'?PART_OFFERS.find(p=>p.id===id):kind==='paint'?PAINT_OFFERS.find(p=>p.id===id)&&{...PAINT_OFFERS.find(p=>p.id===id),currency:'cash'}:kind==='neon'?NEON_OFFERS.find(p=>p.id===id)||null:null;
 if(!offer)return {ok:false,error:'Нет такого товара'};
 const currency=payment||offer.currency,price=currency===offer.currency?offer.price:currency==='cash'?offer.cashPrice:null;
 if(!['cash','hard'].includes(currency)||!Number.isFinite(price)||price<=0)return {ok:false,error:'Этот способ оплаты недоступен'};
 if(kind==='part'&&s.inventory[id])return {ok:false,error:'Эта деталь уже есть'};
 // Не продаём то, что гараж ещё не даст поставить: легендарную юбку за 420 $ новичок держал бы в
 // багажнике до 78 ранга.
 if(kind==='part'&&partGarage(id)>garageLevel(s.garage).level)return {ok:false,error:'Нужен гараж '+GARAGE_LEVELS[partGarage(id)-1].roman};
 if(kind==='paint'&&ownsPaint(s,id))return {ok:false,error:'Эта краска уже есть'};
 if(kind==='neon'&&ownsNeon(s,id))return {ok:false,error:'Этот неон уже есть'};
 if(kind==='crate'&&crateCount(s,id)>=10000)return {ok:false,error:'Склад заполнен'};
 if(kind==='materials'&&s.scrap+offer.amount>1e7)return {ok:false,error:'Склад материалов заполнен'};
 if(!Number.isFinite(s[currency])||s[currency]<price)return {ok:false,error:'Не хватает '+(currency==='hard'?'баксов':'рублей')};
 s[currency]-=price;
 if(kind==='materials'){s.scrap+=offer.amount;return {ok:true,kind,id,amount:offer.amount};}
 if(kind==='crate'){grantCrate(s,id,'Покупка в магазине');return {ok:true,kind,id};}
 if(kind==='paint'){s.ownedPaints.push(id);return {ok:true,kind,id};}
 if(kind==='neon'){addNeon(s,id);return {ok:true,kind,id};}
 return {ok:true,kind,id,drop:addPart(s,partById(id).id)};
}
