// Арифметика лестницы корешей: во сколько награда обходится в магазине, чем её нарисовать и
// сколько ещё звать. Без DOM — этим пользуются три поверхности сразу (окно корешей, баннер в
// гараже, плашка на результате), и проверяется всё это без браузера.
//
// Цена не пишется руками: «эпический ящик» ничего не говорит, «32 000 ₽» говорит всё. И если
// цену в магазине поменяют, подпись поедет за ней сама, а не соврёт.
import {CRATES,crateRubles} from './crates.js';
import {PAINTS} from './paints.js';
import {NEONS} from './neons.js';
import {REFERRAL_TAIL,REFERRAL_TIERS} from './referral-tiers.js';

const rubles=n=>Math.round(Number(n)||0);

// Рубли считаем только по рублёвым ценникам. Харды и детали в рубли не переводим: у них свой
// курс в магазине, и выдуманная конвертация врала бы игроку.
export function tierWorth(payload={}){
 let sum=0;
 const crate=payload.crate?CRATES.find(c=>c.id===payload.crate)||null:null;
 if(crate)sum+=rubles(crateRubles(crate));
 const paint=payload.paint?PAINTS.find(p=>p.id===payload.paint)||null:null;
 if(paint)sum+=rubles(paint.price);
 const neon=payload.neon?NEONS.find(n=>n.id===payload.neon)||null:null;
 if(neon)sum+=rubles(neon.worth);
 sum+=rubles(payload.cash);
 // Краска и неон впереди ящика: на ступени «неон, ящик и 50 $» главное — неон, его видно на
 // машине, а ящик — общий предмет, который и так падает отовсюду.
 const art=paint?{kind:'paint',value:paint.color}
  :neon?{kind:'neon',value:neon.color}
  :crate?{kind:'crate',value:crate.id}
  :{kind:'coins',value:[payload.scrap?'parts':null,payload.cash?'soft':null,payload.hard?'hard':null].filter(Boolean)};
 return {rubles:sum,art};
}

// Состав награды сервер начал присылать не сразу, а картинка и цена нужны всегда: если поля нет,
// берём его из своих же ступеней по числу корешей, а за последней именной — награду хвоста.
export const tierPayload=tier=>tier?.payload
 ||REFERRAL_TIERS.find(x=>x.mates===tier?.mates)?.payload
 ||REFERRAL_TAIL.payload;

// Строки дороги. Одна ступень — одна строка, состояние решает вид:
//   claim — закрыта, награда ждёт; done — закрыта и забрана; live — текущая; far — впереди.
// Последней идёт строка хвоста: лестница не заканчивается на двадцати, и это должно быть видно.
export function roadRows({ladder=[],activated=0,left=0}={}){
 const live=ladder.find(t=>!t.reached)||null;
 const rows=ladder.map(t=>({
  mates:t.mates,
  title:t.title,
  payload:tierPayload(t),
  rewardId:t.rewardId||null,
  worth:tierWorth(tierPayload(t)),
  left:Math.max(0,t.mates-activated),
  state:t.rewardId?'claim':t.reached?'done':t===live?'live':'far',
 }));
 const current=live?rows.find(r=>r.mates===live.mates):null;
 if(current&&left)current.left=left;
 rows.push({state:'tail',every:REFERRAL_TAIL.every,title:REFERRAL_TAIL.title});
 return rows;
}

// Одна строка выгоды для баннера в гараже и плашки на экране результата.
export function bannerLine({left=0,next=null,payload=null}={}){
 if(!next||!left)return {hidden:true,text:''};
 const worth=tierWorth(payload||tierPayload(next));
 const name=String(next.title||'').toLocaleLowerCase('ru-RU');
 // Цену склеиваем неразрывными пробелами целиком: иначе на узком экране «₽» уезжает на
 // отдельную строку и висит там один.
 const price=worth.rubles?', '+worth.rubles.toLocaleString('ru-RU').replace(/ /g,' ')+' ₽':'';
 return {hidden:false,text:`ещё ${left} — и ${name}${price}`,worth};
}
