// Уникальные апгрейды: редкая добыча, ставится навсегда и работает вместе с остальными.
// В отличие от деталей здесь нет слотов и нет конкуренции: поставил турбину и прямоток — работают обе.
// Каждый апгрейд даёт свой характер, а не просто «ещё немного мощи»; на них же потом сядут слои звука.
export const UPGRADES=[
 {id:'turbo',   rarity:3, name:'Турбина',        hint:'Наддув тянет сверху. Внизу секунда задумчивости, дальше как пинок.',
  stats:[1.6,0,0],   sound:{spool:1,wastegate:.6}},
 {id:'exhaust', rarity:1, name:'Прямоток',       hint:'Выхлоп в пол-трубы: чуть свободнее дышит и стреляет на сбросе.',
  stats:[.8,0,.5],   sound:{pops:.7,depth:1}},
 {id:'ecu',     rarity:2, name:'Прошивка',       hint:'Мозги перешиты: газ острее, зелёная зона шире.',
  stats:[0,0,1.6],   sound:{pops:1,antilag:.8}},
 {id:'cams',    rarity:2, name:'Распредвал',     hint:'Верхи живее, холостой неровный. Машина не стоит смирно.',
  stats:[1.2,0,0],   sound:{idle:1}},
 {id:'air',     rarity:1, name:'Пневмоподвеска', hint:'Прижимает и держит. На старте меньше срыва, в дуге спокойнее.',
  stats:[0,1.6,0],   sound:{}},
 // Нитро живёт не в уровнях, а в поведении: половина силы ушла из характеристик в сам рывок (kit.nitro).
 {id:'nitro',   rarity:3, name:'Нитро',          hint:'Баллон под запаску и кнопка на трассе. Чем круче машина, тем больше запас и злее толчок.',
  stats:[.25,0,.5],  sound:{hiss:1}, kit:'nitro'},
];
import {carLevel,carUpgradeRarity} from './car-levels.js';
import {bodyRankCap} from './car-classes.js';
export const upgradeById=id=>UPGRADES.find(u=>u.id===id)||null;
// Машина должна дорасти: слабая тачка не примет турбину. Второй допуск рядом с гаражом.
export const upgradeAllowed=(s,id,car=s?.selected)=>{const u=upgradeById(id);return !!u&&u.rarity<=carUpgradeRarity(carLevel(s,car));};
export const upgradeNeedsLevel=id=>{const u=upgradeById(id);if(!u)return 1;for(let level=1;level<=10;level++)if(carUpgradeRarity(level)>=u.rarity)return level;return 10;};
// Прокачка апгрейда (Андрей, 17 сентября): отдельная линия от деталей. Потолок по редкости 10/15/20/25, платится
// рублями и материалами, каждый ранг дороже предыдущего; прирост ощутимый на первых рангах и затухающий дальше.
// Ранг общий на гараж, как и владение: турбина одна, куда её ни поставь.
export const UPGRADE_RANK_CAP=[10,15,20,25];
const RANK_GAIN=3.0,RANK_DECAY=.9,RANK_CASH=[600,900,1400,2200],RANK_SCRAP=[15,22,32,45];
export const upgradeRankCap=u=>UPGRADE_RANK_CAP[u?.rarity??0];
export const upgradeRank=(s,id)=>{const cap=upgradeRankCap(upgradeById(id));return Math.max(1,Math.min(cap,Math.floor(Number(s?.upgradeRanks?.[id])||1)));};
// Множитель силы от ранга: 1 → 1.0, 2 → 1.3, 10 → 2.85, 25 → 3.7. Каждый следующий ранг даёт меньше предыдущего.
export const upgradeStrength=rank=>1+RANK_GAIN*(1-Math.pow(RANK_DECAY,Math.max(1,rank)-1));
export const upgradeTuneCost=(u,rank)=>({cash:Math.round(RANK_CASH[u.rarity]*Math.pow(rank,1.35)/50)*50,scrap:Math.round(RANK_SCRAP[u.rarity]*Math.pow(rank,1.2))});
export function tuneUpgrade(s,id){
 const u=upgradeById(id);if(!u||!ownsUpgrade(s,id))return false;
 const rank=upgradeRank(s,id);if(rank>=upgradeRankCap(u))return false;
 const c=upgradeTuneCost(u,rank);if(s.cash<c.cash||s.scrap<c.scrap)return false;
 s.cash-=c.cash;s.scrap-=c.scrap;s.upgradeRanks??={};s.upgradeRanks[id]=rank+1;return true;
}
// Владение общее на гараж: нашёл турбину — она твоя. Установка отдельная у каждой машины.
export const ownsUpgrade=(s,id)=>!!s.upgradesOwned?.includes(id);
export const isUpgradeOn=(s,id,car=s.selected)=>!!s.upgrades?.[car]?.includes(id);
export const installedUpgrades=(s,car=s.selected)=>(s.upgrades?.[car]||[]).map(upgradeById).filter(Boolean);
// Сумма по трём характеристикам — тем же, что считают детали, поэтому всё ниже по коду работает без правок.
// Кузов держит и апгрейды: на восьмёрке турбина в двадцатом ранге работает как в двенадцатом.
// Без этого потолки машин снова сходились — апгрейды дают около 250 мощи и не зависели от кузова.
export const bodyUpgradeRank=(u,car,rank)=>Math.max(1,Math.min(rank,Math.round(upgradeRankCap(u)*bodyRankCap(car)/15)));
export function upgradeLevels(s,car=s.selected){const out=[0,0,0];
 for(const u of installedUpgrades(s,car)){const k=upgradeStrength(bodyUpgradeRank(u,car,upgradeRank(s,u.id)));u.stats.forEach((v,i)=>out[i]+=v*k);}return out;}
export function toggleUpgrade(s,id,car=s.selected){
 if(!upgradeById(id)||!ownsUpgrade(s,id))return false;
 // Снять можно всегда, поставить — только если машина доросла.
 if(!isUpgradeOn(s,id,car)&&!upgradeAllowed(s,id,car))return false;
 s.upgrades??={};const list=s.upgrades[car]??=[];
 const at=list.indexOf(id);
 if(at>=0)list.splice(at,1);else list.push(id);
 return true;
}
export function grantUpgrade(s,id){
 if(!upgradeById(id))return false;
 s.upgradesOwned??=[];
 if(s.upgradesOwned.includes(id))return false;
 s.upgradesOwned.push(id);
 // Найденное сразу встаёт на текущую машину — если та доросла. Иначе лежит и ждёт уровня.
 s.upgrades??={};if(upgradeAllowed(s,id))(s.upgrades[s.selected]??=[]).push(id);
 return true;
}
// Что ещё не найдено — из этого и капает. Пусто, когда собрано всё.
// Что из установленного меняет поведение машины, а не её уровни.
// Нитро крутеет вместе с машиной: на шестом уровне это баллон, на восьмом — два, на десятом — три.
export const nitroTier=(s,car=s?.selected)=>{const level=carLevel(s,car);return level>=10?3:level>=8?2:1;};
export function raceKit(s,car=s?.selected){const kit={};for(const u of installedUpgrades(s,car))if(u.kit)kit[u.kit]=u.kit==='nitro'?nitroTier(s,car):1;return kit;}
export const missingUpgrades=s=>UPGRADES.filter(u=>!ownsUpgrade(s,u.id));
export function restoreUpgrades(s,d,carCount){
 const known=new Set(UPGRADES.map(u=>u.id));
 s.upgradesOwned=[...new Set((Array.isArray(d.upgradesOwned)?d.upgradesOwned:[]).filter(id=>known.has(id)))];
 // Ранги — только у найденных апгрейдов и не выше потолка редкости.
 s.upgradeRanks={};for(const id of s.upgradesOwned){const r=Math.floor(Number(d.upgradeRanks?.[id])||1);if(r>1)s.upgradeRanks[id]=Math.min(upgradeRankCap(upgradeById(id)),r);}
 s.upgrades={};
 for(let c=0;c<carCount;c++){
  const list=Array.isArray(d.upgrades?.[c])?d.upgrades[c]:[];
  s.upgrades[c]=[...new Set(list.filter(id=>known.has(id)&&s.upgradesOwned.includes(id)))];
 }
}
