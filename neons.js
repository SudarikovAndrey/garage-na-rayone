// Неон под днищем — косметика, открывается на весь гараж, ставится на любую машину во вкладке
// «Цвет». У каждого набора свой цвет и своя пульсация. Ключи сохранения `ownedNeons` и `neon` —
// не переименовывать.
//
// За рубли неон не продаётся вообще (Андрей, 18 сентября). Четыре дороги, и у каждого набора
// ровно одна:
//   hard   — два простых набора в витрине за баксы, дорого;
//   boss   — приз за главаря района, по одному на район 1-3;
//   prize  — награда за корешей (лагуна на рубеже 20);
//   ничего — пул редкого бонуса из больших ящиков, он же будущая витрина за звёзды.
import {CARS} from './fleet.js';

export const PULSES={
 steady:{name:'ровный свет'},
 breath:{name:'дыхание'},
 strobe:{name:'строб'},
 wave:{name:'бегущая волна'},
 heartbeat:{name:'пульс'},
};
export const NEONS=[
 {id:'ice',name:'Лёд',color:'#3ec8ff',pulse:'steady',rarity:1,worth:9000,hard:200,description:'Холодный ровный свет — классика заправки в два ночи'},
 {id:'violet',name:'Ультрафиолет',color:'#8a4dff',pulse:'breath',rarity:1,worth:9000,hard:200,description:'Медленно дышит, как колонка на низах'},
 {id:'acid',name:'Кислота',color:'#7dff3a',pulse:'strobe',rarity:2,worth:14000,boss:0,description:'Двойная вспышка — милиция на районе нервничает'},
 {id:'stop',name:'Стоп-сигнал',color:'#ff2a3c',pulse:'heartbeat',rarity:2,worth:14000,boss:1,description:'Бьётся как сердце перед стартом'},
 {id:'lagoon',name:'Лагуна',color:'#22f0d0',pulse:'wave',rarity:2,worth:16000,prize:true,description:'Волна бегает по кругу: нос, борт, корма, борт'},
 {id:'raspberry',name:'Малина',color:'#ff4fd8',pulse:'breath',rarity:2,worth:16000,boss:2,description:'Розовое дыхание для тех, кому нечего доказывать'},
 {id:'amber',name:'Янтарь',color:'#ffb02e',pulse:'wave',rarity:3,worth:24000,description:'Тёплая волна под днищем, как ночной проспект'},
 {id:'xenon',name:'Ксенон',color:'#e8f4ff',pulse:'strobe',rarity:3,worth:24000,description:'Белый строб — на трассе видно из соседнего района'},
];
// Как неон выглядит в интерфейсе: тёмный пол, свет по полу, трубка и белый сердечник. Разметка
// одна на магазин и гараж — иначе трубка в одном месте есть, а в другом остаётся пустая плашка.
export const neonArt=(pulse,extra='')=>`<i class="neon-swatch ${extra} pulse-${pulse}" aria-hidden="true"><b class="neon-floor"></b><b class="neon-tube"></b></i>`;
// Витрина: только баксы, рублёвой альтернативы нет. Форма товара общая с деталями и ящиками,
// чтобы магазин не знал про неон ничего особенного.
export const NEON_OFFERS=NEONS.filter(n=>n.hard>0).map(n=>({...n,currency:'hard',price:n.hard,cashPrice:null}));
// Приз за главаря района: по одному набору на первые три района. Районы 4-5 дают красный ящик,
// а из него неон может выпасть бонусом — так «редко за сложных боссов» остаётся правдой и там.
export const bossNeon=district=>NEONS.find(n=>n.boss===district)?.id||null;
// Пул редкого бонуса из больших ящиков: всё, что не в витрине, не за главаря и не за корешей.
export const NEON_CHANCE=.12;
export const crateNeonPool=s=>NEONS.filter(n=>!n.hard&&!Number.isInteger(n.boss)&&!n.prize&&!ownsNeon(s,n.id));
export function rollNeonBonus(s,rawRng=Math.random){
 const rng=()=>{const v=rawRng();return Number.isFinite(v)?Math.max(0,Math.min(.999999,v)):0;};
 if(rng()>=NEON_CHANCE)return null;
 const pool=crateNeonPool(s);
 if(!pool.length)return null;
 const n=pool[Math.min(pool.length-1,Math.floor(rng()*pool.length))];
 addNeon(s,n.id);return {id:n.id};
}
export const neonById=id=>NEONS.find(n=>n.id===id);
export const ownsNeon=(s,id)=>!!neonById(id)&&Array.isArray(s.ownedNeons)&&s.ownedNeons.includes(id);
export function restoreNeons(s,d,count=CARS.length){
 s.ownedNeons=[...new Set((Array.isArray(d.ownedNeons)?d.ownedNeons:[]).filter(id=>neonById(id)))];
 s.neon=Array.from({length:count},(_,car)=>ownsNeon(s,d.neon?.[car])?d.neon[car]:null);
}
export function addNeon(s,id){if(!neonById(id))throw Error('Неизвестный неон');if(!ownsNeon(s,id))s.ownedNeons.push(id);return id;}

const fract=x=>x-Math.floor(x);
// Яркость трубки k (0 — нос, 1 — правый борт, 2 — корма, 3 — левый борт) в момент t, от 0 до 1.
// Функции чистые: одна и та же формула красит трубки в сцене и плитку в тюнинге.
export function pulseLevel(pulse,t,k=0){
 switch(pulse){
  case 'breath':return .38+.62*(.5+.5*Math.sin(t*2.1));
  case 'strobe':{const p=fract(t*2.4);return p<.07||(p>.15&&p<.22)?1:.18;}
  case 'wave':return .22+.78*Math.max(0,Math.cos(t*2.6-k*Math.PI/2));
  case 'heartbeat':{const p=fract(t/1.15),bump=(c,w)=>Math.exp(-(((p-c)/w)**2));return .22+.78*Math.min(1,bump(.10,.045)+.75*bump(.30,.06));}
  default:return 1;
 }
}
