// Лестница машин (docs/car-ladder.md). Класс — это кузов: базовая мощь машины без тюнинга.
import {CARS} from './fleet.js';
import {vehicleStats} from './vehicle-dynamics.js';
export const LOANER={car:0,levels:[15,10,8],races:3,owner:'братан'}; // Восьмёрка братана: 195 → 230 км/ч, не прокачивается
export const START_CAR=1; // Копейка — первая своя
export const GIFT_CAR=0;  // Восьмёрка возвращается после первого босса
export const CLASS_CEILING=[107,111,115,119,Infinity];
export const CLASS_NAMES=['Классика до 107','До 111: свои Жигули','До 115: девяносто девятые и Волги','До 119: всё, кроме заряженных','Свободный класс'];
// Порядок лестницы (Андрей, 18 сентября): копейка → 99-я → волга → десятка. Москвич, ока, инвалидка
// и внедорожники пока не выдаются вовсе — их очередь придёт отдельной задачей.
// 22 сентября парк сократился до трёх машин: копейка → волга (волга встала на место 99-й).
// 23 сентября вернулась Десятка хэтчбеком 2112 — снова последняя ступень. Нива, как и раньше, вне лестницы.
export const CAR_SHARD_ORDER=[1,2,3];
// Лестница прокачки (Андрей, 18 сентября): «прокачав восьмёрку больше ничего не надо — это плохо».
// Кузов задаёт не старт, а ПОТОЛОК: сколько ранга детали и апгрейда машина вообще держит. Раньше все
// тринадцать машин сходились к 781–817 мощи — разброс 4.6%, и вторая тачка была не нужна вовсе.
// Восьмёрка 9 → копейка 11 → 99-я 13 → волга 14 → десятка 15: каждая ступень это +8…12% потолка.
// Деталь выше потолка не пропадает — на слабом кузове она просто работает вполсилы, а на сильном
// раскрывается: поэтому игроку всегда есть что качать дальше, а не только выше.
// Москвич, ока, инвалидка и внедорожники ждут своей очереди — им потолок пока минимальный.
export const BODY_RANK=[9,11,14,15,8];// восьмёрка, копейка, волга, двенашка, нива
export const bodyRankCap=car=>BODY_RANK[car]??9;
// Эталонная машина района — та, до которой игрок к этому моменту доезжает по лестнице прокачки:
// восьмёрка своя с начала, копейка открывается к промзоне, 99-я к стройке, волга к сельской, десятка к ЖД.
export const BENCH_CAR=['samara','kopeyka','volga','volga','volga'];
export const baseRating=i=>vehicleStats(CARS[i].id).rating;
export const classOf=i=>CLASS_CEILING.findIndex(c=>baseRating(i)<=c);
export const carAllowed=(i,map)=>baseRating(i)<=CLASS_CEILING[Math.min(map,CLASS_CEILING.length-1)];
export const inPrologue=s=>!!s.loaner&&(s.rank||0)<LOANER.races;
// The car the campaign is driven with: the loaner during the prologue, otherwise whatever is selected.
export const campaignCar=s=>inPrologue(s)?LOANER.car:s.selected;
// Лестница потолков работает и без пролога: игрок садится на самую «высокую» из своих машин.
export const bestOwnedCar=s=>{let best=null;for(let i=0;i<CARS.length;i++){if(!s.unlockedCars?.[i])continue;if(best===null||BODY_RANK[i]>BODY_RANK[best])best=i;}return best;};
export const bestAllowedCar=(s,map)=>{let best=null;for(let i=0;i<CARS.length;i++){if(!s.unlockedCars?.[i]||!carAllowed(i,map))continue;if(best===null||baseRating(i)>baseRating(best))best=i;}return best;};
export const benchCarFor=(rank,map=Math.min(4,Math.floor(rank/45)))=>rank<LOANER.races?CARS[LOANER.car].id:BENCH_CAR[map];
// Ladder order for the fleet screen: the districts' cars first, collection cars after.
// Порядок на экране машин: сначала стартовая и лестница, потом всё, что ждёт своей очереди.
export const LADDER=[GIFT_CAR,...CAR_SHARD_ORDER,...CARS.map((_,i)=>i).filter(i=>i!==GIFT_CAR&&!CAR_SHARD_ORDER.includes(i))];
// Подпись под закрытой машиной на экране парка: за что она открывается.
export function unlockHint(i){
 if(i===GIFT_CAR)return 'твоя с самого начала';
 const k=CAR_SHARD_ORDER.indexOf(i);
 if(k<0)return 'придёт своим чередом';
 return ['чертежи Спального','чертежи Промзоны','чертежи Стройки','чертежи Сельской'][k]||'чертежи районов';
}
