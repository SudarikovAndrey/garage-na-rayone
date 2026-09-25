import {TRACKS} from './tracks.js';
import {track} from './analytics.js';
// The garage is an access gate: each level decides which body kits may be mounted and how deep
// any part can be tuned. Costs need rubles, materials and campaign progress at the same time.
// Скидок на тюнинг гараж не даёт (решение Андрея, 16 сентября): чем дальше, тем больше трат, а не меньше.
export const GARAGE_LEVELS=[
 {level:1,roman:'Ⅰ',name:'Бокс на соплях',cost:0,scrap:0,rank:0,rankCap:3,kitTier:0,trimTier:1,carSlots:1,description:'Голый бокс, хлам и лампочка',background:0x8d8272,ambient:.66,sun:2.45,tube:17,tubeColor:0xffc27a,rim:.52,environment:.58},
 {level:2,roman:'Ⅱ',name:'Батин угол',cost:3000,scrap:60,rank:5,rankCap:5,kitTier:1,trimTier:2,carSlots:2,description:'Уборка, стеллаж и свой угол',background:0xa5977c,ambient:.72,sun:2.55,tube:26,tubeColor:0xffd19b,rim:.60,environment:.63},
 {level:3,roman:'Ⅲ',name:'Своя мастерская',cost:6000,scrap:90,rank:35,rankCap:7,kitTier:2,trimTier:3,carSlots:3,description:'Верстак, инструмент и рабочий свет',background:0xb8ad96,ambient:.72,sun:2.7,tube:32,tubeColor:0xd0e7ff,rim:.70,environment:.65},
 {level:4,roman:'Ⅳ',name:'Районный сервис',cost:15000,scrap:220,rank:78,rankCap:10,kitTier:3,trimTier:3,carSlots:3,description:'Подъёмник, компрессор и сварка',background:0xabb2a8,ambient:.82,sun:2.7,tube:47,tubeColor:0xd9eeff,rim:.90,environment:.72},
 {level:5,roman:'Ⅴ',name:'Ателье «Ракета»',cost:30000,scrap:380,rank:120,rankCap:15,kitTier:3,trimTier:3,carSlots:3,description:'Чистый пол, диагностика и полный комплект',background:0xb9c4bf,ambient:.92,sun:2.9,tube:64,tubeColor:0xe4f3ff,rim:1.15,environment:.85},
];
export const BODY_KIT_SLOTS=['bumpers','skirts','fenders'],TRIM_SLOTS=['rims','spoiler'];
export const garageLevel=n=>GARAGE_LEVELS[Math.max(0,Math.min(GARAGE_LEVELS.length-1,Math.floor(Number(n)||1)-1))];
export const nextGarage=s=>GARAGE_LEVELS[garageLevel(s.garage).level]||null;
export const garageRankCap=s=>garageLevel(s.garage).rankCap;
// Body kits of rarity r need garage r+1, rims and spoilers garage r (at least I), drivetrain parts mount anywhere:
// the first garage already takes common kits, so early drops are usable and the garage upgrade comes later (Andrey, 13 Sep).
export const requiredGarageFor=(slot,rarity)=>BODY_KIT_SLOTS.includes(slot)?Math.min(GARAGE_LEVELS.length,rarity+1):TRIM_SLOTS.includes(slot)?Math.min(GARAGE_LEVELS.length,Math.max(1,rarity)):1;
// The garage is also parking: how many cars it holds. Shards keep collecting; a finished car waits for a free spot.
export const carSlotsFor=level=>garageLevel(level).carSlots;
export const garageForRank=rank=>GARAGE_LEVELS.find(g=>g.rankCap>=rank)||null;
export function garageRequirement(s,level=nextGarage(s)?.level){
 const g=GARAGE_LEVELS[level-1];if(!g||g.level<=garageLevel(s.garage).level)return null;
 const missing={cash:Math.max(0,g.cost-(Number(s.cash)||0)),scrap:Math.max(0,g.scrap-(Number(s.scrap)||0)),rank:Math.max(0,g.rank-(Number(s.rank)||0))};
 return {level:g.level,cost:g.cost,scrap:g.scrap,rank:g.rank,missing,ok:!missing.cash&&!missing.scrap&&!missing.rank};
}
export function upgradeGarage(s){const next=nextGarage(s);if(!next||!garageRequirement(s,next.level)?.ok)return false;s.cash-=next.cost;s.scrap-=next.scrap;s.garage=next.level;(s.played??=[]).push({t:Date.now(),k:'garage',lvl:next.level,r:s.rank,cash:s.cash});track('garage',{level:next.level,cost:next.cost,scrap:next.scrap});return next;}
// Levels open two series before the district boss and cost what the median player holds by then (docs/campaign-design-review.md, D):
// the garage is bought BEFORE the wall, so the wall is beaten by upgrading, not by luck.
export function garageConditionText(g){if(!g||!g.rank)return '';const map=Math.floor(g.rank/45),series=Math.ceil((g.rank%45)/5);return map===0?'Пройди серию '+series:TRACKS[Math.min(TRACKS.length-1,map)].name+' · пройди серию '+series;}
export const KIT_TIER_NAMES=['только сток','обычный обвес','редкий обвес','эпический обвес','легендарный обвес'];
export function garageUnlockSummary(g){return g.name+' · '+KIT_TIER_NAMES[g.kitTier+1]+' · ранг до '+g.rankCap+' · мест '+g.carSlots;}
export function configureGarageStage(room,level){const stage=garageLevel(level);room.traverse(o=>{const m=/^Stage_(\d+)_(\d+)/.exec(o.name);if(m)o.visible=stage.level>=Number(m[1])&&stage.level<=Number(m[2]);});return stage;}

export function restoreGarageLevel(data){const level=garageLevel(data.garage).level;return data.garageRevision>=1?level:level===2?3:level===3?4:level;}
