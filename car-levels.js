// Уровень машины. Чертежи не заканчиваются вместе с открытием: дальше они качают саму машину.
// В текстах для игрока это «чертежи»; в коде и в сохранении ключи остались shard-овыми,
// переименовывать их нельзя — слетит прогресс у всех, кто уже играет.
// Уровень не добавляет мощи напрямую — он снимает ограничения: какой ранг деталей машина держит
// и какие уникальные апгрейды на неё встают. Вторая шкала допуска рядом с гаражом, как просил Андрей.
// Мощь по-прежнему приходит только из деталей, поэтому калибровка кампании не съезжает.
import {CARS} from './fleet.js';
export const MAX_CAR_LEVEL=10;
// «1 чертёж», «2 чертежа», «5 чертежей»: число награды читается вслух, поэтому склоняем.
export const blueprintWord=n=>{const t=n%100,o=n%10;return t>=11&&t<=14?'чертежей':o===1?'чертёж':o>=2&&o<=4?'чертежа':'чертежей';};

// Сколько чертежей стоит переход на следующий уровень: costs[n] — цена перехода с n на n+1.
// Цены подобраны под доход: победа даёт 1 чертёж своей машине (2 за главаря, 3 за босса),
// плюс половина чертежей главаря. За кампанию на одной машине набегает около двухсот — как раз на десятый уровень.
export const CAR_LEVEL_COSTS=[0,6,9,13,18,23,28,33,38,44];
// Чем выше класс кузова, тем дороже его уровни: восьмёрка стоит свои 212 чертежей до десятого уровня,
// копейка 254, 99-я 318, волга 360, десятка 424. Так каждая следующая машина — это не «ещё одна такая же»,
// а отдельная цель на пару сотен заездов, и качать всегда есть что: пока копится на новую, старая растёт.
export const CAR_LEVEL_FACTOR=[1,1.2,1.7,2,1];// восьмёрка, копейка, волга, двенашка, нива
export const levelFactor=car=>CAR_LEVEL_FACTOR[car]??1;
// Потолок ранга деталей от уровня машины. Первый уровень уже держит обычные детали,
// дальше догоняет и перегоняет гараж: сильная деталь требует и мастерской, и самой машины.
export const CAR_RANK_CAPS=[3,5,6,7,9,10,11,12,13,15];
// Какие уникальные апгрейды машина вообще принимает: 0 — обычные, 3 — легендарные.
export const CAR_UPGRADE_RARITY=[0,1,1,2,2,3,3,3,3,3];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const int=(v,a,b)=>clamp(Math.floor(Number(v)||0),a,b);

export const carLevel=(s,car=s?.selected)=>int(s?.carLevels?.[car],1,MAX_CAR_LEVEL)||1;
export const carRankCap=level=>CAR_RANK_CAPS[clamp(level,1,MAX_CAR_LEVEL)-1];
export const carUpgradeRarity=level=>CAR_UPGRADE_RARITY[clamp(level,1,MAX_CAR_LEVEL)-1];
export const levelCost=(level,car=0)=>Math.round((CAR_LEVEL_COSTS[clamp(level,1,MAX_CAR_LEVEL)]||0)*levelFactor(car));
// Что уровень даёт прямо сейчас и что даст следующий — одними словами для окна и для награды.
// Названия редкости женского рода («Легендарная»), после «до» им нужен родительный падеж.
const upToRarity=name=>String(name||'').toLowerCase().replace(/ая$/,'ой');
export const carLevelPerks=(level,rarityName=r=>String(r))=>[
 'Ранг деталей до '+carRankCap(level),
 'Апгрейды до '+upToRarity(rarityName(carUpgradeRarity(level))),
];

// Чертежи сверх того, что ушло на открытие машины, копятся здесь же и идут в уровень.
export function carLevelProgress(s,car=s?.selected,unlockCost=0){
 const level=carLevel(s,car),spent=int(s?.carLevelSpent?.[car],0,1e9);
 const own=Math.max(0,int(s?.carShards?.[car],0,1e9)-unlockCost-spent);
 // Общий гаражный фонд (Андрей, 18 сентября): чертежи капают и той машине, на которой едешь, и в гараж.
 // Без фонда «пока качаю копейку, на восьмёрку тем временем накопилось» не случалось вовсе: чертежи
 // получала только машина за рулём, и брошенная тачка стояла мёртвым грузом.
 const shared=int(s?.blueprintPool,0,1e9),pool=own+shared;
 const needed=level>=MAX_CAR_LEVEL?0:levelCost(level,car);
 return {level,current:pool,own,shared,needed,ready:needed>0&&pool>=needed,max:level>=MAX_CAR_LEVEL};
}
// Повышение уровня: чертежи списываются, машина держит детали рангом выше и принимает более крутые апгрейды.
export function levelUpCar(s,car=s?.selected,unlockCost=0){
 const p=carLevelProgress(s,car,unlockCost);
 if(!p.ready)return null;
 s.carLevels??=CARS.map(()=>1);
 s.carLevelSpent??=CARS.map(()=>0);
 // Сначала тратим чертежи самой машины, остаток добираем из гаражного фонда.
 const fromShared=Math.max(0,p.needed-p.own);
 if(fromShared)s.blueprintPool=Math.max(0,int(s.blueprintPool,0,1e9)-fromShared);
 s.carLevelSpent[car]=int(s.carLevelSpent[car],0,1e9)+(p.needed-fromShared);
 s.carLevels[car]=p.level+1;
 return {car,level:p.level+1,spent:p.needed,rankCap:carRankCap(p.level+1),upgradeRarity:carUpgradeRarity(p.level+1)};
}
// Старым сейвам уровень подбирается так, чтобы уже собранная машина осталась легальной.
export function restoreCarLevels(s,d,levelNeededFor){
 s.carLevels=CARS.map((_,i)=>{
  const saved=int(d?.carLevels?.[i],1,MAX_CAR_LEVEL)||1;
  return Math.max(saved,levelNeededFor?levelNeededFor(i):1);
 });
 s.carLevelSpent=CARS.map((_,i)=>int(d?.carLevelSpent?.[i],0,1e9));
 s.blueprintPool=int(d?.blueprintPool,0,1e9);
}
// Минимальный уровень, при котором машина держит деталь такого ранга.
export const levelForRank=rank=>{const at=CAR_RANK_CAPS.findIndex(cap=>cap>=rank);return at<0?MAX_CAR_LEVEL:at+1;};
