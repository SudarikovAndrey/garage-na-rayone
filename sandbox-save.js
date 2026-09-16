// Песочница: прокачанный сейв для проверок «руками». Живёт в отдельном ключе хранилища,
// телеметрию и профили не трогает — настоящий прогресс от неё не страдает.
// Открывается как index.html?sandbox=1
import {PARTS,CAR_SHARD_COSTS} from './progression.js';
import {UPGRADES} from './upgrades.js';
import {CARS} from './fleet.js';
export const SANDBOX_KEY='rayon-drag-sandbox';
export const isSandbox=search=>/[?&]sandbox=1\b/.test(String(search||''));
export function sandboxSave(){
 // Лучшая деталь каждого слота и уровень, на котором коробка уже даёт длинную ступень.
 const inventory={},equipped={};
 for(const slot of [...new Set(PARTS.map(p=>p.slot))]){
  const best=PARTS.filter(p=>p.slot===slot).sort((a,b)=>b.rarity-a.rarity)[0];
  if(!best)continue;
  inventory[best.id]={rank:Math.min(best.maxRank,12)};
  equipped[slot]=best.id;
 }
 const carShards=CARS.map((_,i)=>CAR_SHARD_COSTS[i]||0);
 return {
  version:3,campaignRevision:2,collectionRevision:1,economyVersion:1,paintUnlockVersion:1,decalUnlockVersion:1,
  rank:120,wins:120,races:140,garage:5,garageRevision:2,
  cash:500000,scrap:5000,hard:5000,
  inventory,equipped:CARS.map((_,i)=>i===0?equipped:{}),
  carShards,
  // Машина прокачана и по уровню: в песочнице нечего копить, всё должно быть доступно сразу.
  carLevels:CARS.map(()=>10),carLevelSpent:CARS.map(()=>0),
  upgradesOwned:UPGRADES.map(u=>u.id),
  upgrades:{0:UPGRADES.map(u=>u.id)},
  tutorials:{'drag-auto':true,'drag-manual':true,drift:true},
  hints:['customize','captain','launch','garage','crates','fleet','shop','training','duels'],
  selected:0,
 };
}
