export const PAINTS=[{id:'cherry',name:'Вишня',color:'#781523',rarity:0},{id:'ivory',name:'Слоновая кость',color:'#cec6a8',rarity:0},{id:'black',name:'Чёрный',color:'#171a1c',rarity:0},{id:'blue',name:'Синий',color:'#254973',rarity:1},{id:'green',name:'Зелёный',color:'#295144',rarity:1},{id:'silver',name:'Серебро',color:'#9da5ac',rarity:2},{id:'orange',name:'Оранжевый',color:'#cb541e',rarity:2},
 // Заводские цвета конкретных моделей: не выпадают и не продаются, их носит только та машина, на которой они стояли с завода.
 {id:'champagne',name:'Брызги шампанского',color:'#c9c2a4',rarity:0,stock:true},{id:'riesling',name:'Рислинг',color:'#d8d08a',rarity:0,stock:true},{id:'safari',name:'Сафари',color:'#b9a271',rarity:0,stock:true},{id:'murena',name:'Мурена',color:'#2f4a47',rarity:0,stock:true},{id:'snow-queen',name:'Снежная королева',color:'#b9c6cc',rarity:0,stock:true},{id:'cypress',name:'Кипарис',color:'#3b5134',rarity:0,stock:true},{id:'garnet',name:'Гранат',color:'#6d1d20',rarity:0,stock:true},{id:'baltika',name:'Балтика',color:'#8fa3ac',rarity:0,stock:true},{id:'khaki',name:'Хаки',color:'#6b6a42',rarity:0,stock:true},{id:'bright-white',name:'Ярко-белый',color:'#ddddd6',rarity:0,stock:true},
 // Premium paints: bought for rubles late in the game or earned by records; never drop from crates.
 {id:'graphite',name:'Графит',color:'#3b3f45',rarity:2,price:18000},{id:'plum',name:'Баклажан',color:'#4a1d3f',rarity:2,price:22000},{id:'mint',name:'Мятный',color:'#6fb7a0',rarity:2,price:22000},{id:'lime',name:'Кислотный',color:'#a8d13a',rarity:3,price:36000},{id:'gold',name:'Золото',color:'#c9a227',rarity:3,price:45000}];
export const PAINT_OFFERS=PAINTS.filter(p=>p.price);
import {CARS} from './fleet.js';
const STOCK_COLOR=CARS.map(c=>c.color);
export const STARTER_PAINTS=['cherry','ivory','black'];
export const PAINT_CHANCE=.25;
export const paintById=id=>PAINTS.find(p=>p.id===id);
export const ownsPaint=(s,id)=>!!paintById(id)&&s.ownedPaints?.includes(id);
export function restorePaints(s,d){s.paintUnlockVersion=1;s.ownedPaints=[...new Set([...STARTER_PAINTS,...(Array.isArray(d.ownedPaints)?d.ownedPaints.filter(id=>paintById(id)):[])])];s.paint=s.paint.map((id,i)=>ownsPaint(s,id)||id===STOCK_COLOR[i]?id:STOCK_COLOR[i]??'cherry');}
// Paint is a bonus: never replaces the guaranteed part or changes its pity counter.
export function rollPaintBonus(s,rng=Math.random){if(rng()>=PAINT_CHANCE)return null;const pool=PAINTS.filter(p=>p.rarity>0&&!p.price&&!p.stock&&!ownsPaint(s,p.id));if(!pool.length){s.scrap+=10;return {duplicate:true,scrap:10};}const p=pool[Math.min(pool.length-1,Math.max(0,Math.floor(rng()*pool.length)))];s.ownedPaints.push(p.id);return {id:p.id,duplicate:false,scrap:0};}
