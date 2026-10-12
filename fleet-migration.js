// Перевод сейва со старого парка (13 машин) на нынешний (22 сентября: Восьмёрка, Копейка, Волга).
// Работает над сырыми данными до hydrate: всё, что лежит в сейве по номеру машины, собирается в
// оставшуюся машину по legacyCar. Ничего купленного не пропадает: открытая удалённая машина открывает
// свою замену, чертежи и потраченное на уровни складываются, уровень берётся больший, лучшее время — меньшее,
// наклейки объединяются. Оформление (краска, детали, винил, неон, апгрейды) — от самой оставшейся машины,
// если она была открыта, иначе от самой прокачанной из переехавших.
import {CAR_COUNT,FLEET_REVISION,LEGACY_CAR,anyCar} from './fleet.js';
const PER_CAR=['paint','records','equipped','carShards','unlockedCars','revealedCars','upgrades','ownedDecals','decal','neon','carLevels','carLevelSpent'];
export function migrateFleet(d){
 if(!d||typeof d!=='object'||Number(d.fleetRevision)===FLEET_REVISION)return d;
 // Старый сейв узнаём по спискам длиннее нынешнего парка: старый парк писал их на все 13 машин.
 // Сейв без ревизии, но со списками на три машины (песочница, собранный кодом) — уже нынешний.
 const legacy=PER_CAR.some(k=>Array.isArray(d[k])&&d[k].length>CAR_COUNT);
 const out={...d,fleetRevision:FLEET_REVISION};
 if(d.selected!==undefined)out.selected=legacy?(LEGACY_CAR[Math.floor(Number(d.selected))]??0):anyCar(d.selected);
 if(!legacy)return out;
 const at=(k,i)=>Array.isArray(d[k])?d[k][i]:(d[k]&&typeof d[k]==='object'?d[k][i]:undefined);
 const level=i=>Math.floor(Number(at('carLevels',i))||1);
 for(const k of PER_CAR)if(d[k]!==undefined)out[k]=Array.isArray(d[k])?[]:{};
 for(let t=0;t<CAR_COUNT;t++){
  const sources=LEGACY_CAR.map((to,i)=>to===t?i:-1).filter(i=>i>=0),own=sources[0];// оставшаяся машина первой: её старый номер меньше
  const unlocked=sources.filter(i=>!!at('unlockedCars',i));
  const look=unlocked.includes(own)?own:unlocked.sort((a,b)=>level(b)-level(a))[0]??own;
  const put=(k,v)=>{if(out[k]!==undefined&&v!==undefined)out[k][t]=v;};
  put('unlockedCars',unlocked.length>0);
  put('revealedCars',sources.some(i=>!!at('revealedCars',i))||(unlocked.length>0&&!!at('revealedCars',look)));
  put('carLevels',Math.max(...sources.map(level)));
  put('carLevelSpent',sources.reduce((n,i)=>n+(Math.floor(Number(at('carLevelSpent',i)))||0),0));
  put('carShards',sources.reduce((n,i)=>n+(Math.floor(Number(at('carShards',i)))||0),0));
  const times=sources.map(i=>Number(at('records',i))).filter(v=>v>0);put('records',times.length?Math.min(...times):null);
  for(const k of ['paint','equipped','upgrades','decal','neon'])put(k,at(k,look));
  const decals=new Set();for(const i of sources){const list=at('ownedDecals',i);if(Array.isArray(list))for(const id of list)decals.add(id);}
  put('ownedDecals',[...decals]);
 }
 return out;
}
