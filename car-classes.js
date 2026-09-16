// Лестница машин (docs/car-ladder.md). Класс — это кузов: базовая мощь машины без тюнинга.
import {CARS} from './fleet.js';
import {vehicleStats} from './vehicle-dynamics.js';
export const LOANER={car:0,levels:[15,10,8],races:3,owner:'братан'}; // Восьмёрка братана: 195 → 230 км/ч, не прокачивается
export const START_CAR=1; // Копейка — первая своя
export const GIFT_CAR=0;  // Восьмёрка возвращается после первого босса
export const CLASS_CEILING=[107,111,115,119,Infinity];
export const CLASS_NAMES=['Классика до 107','До 111: свои Жигули','До 115: девяносто девятые и Волги','До 119: всё, кроме заряженных','Свободный класс'];
export const CAR_SHARD_ORDER=[3,4,5,10,7,6,11,8,12,2,9];
export const BENCH_CAR=['kopeyka','samara','ninety-nine','ten','ten'];
export const baseRating=i=>vehicleStats(CARS[i].id).rating;
export const classOf=i=>CLASS_CEILING.findIndex(c=>baseRating(i)<=c);
export const carAllowed=(i,map)=>baseRating(i)<=CLASS_CEILING[Math.min(map,CLASS_CEILING.length-1)];
export const inPrologue=s=>!!s.loaner&&(s.rank||0)<LOANER.races;
// The car the campaign is driven with: the loaner during the prologue, otherwise whatever is selected.
export const campaignCar=s=>inPrologue(s)?LOANER.car:s.selected;
export const bestAllowedCar=(s,map)=>{let best=null;for(let i=0;i<CARS.length;i++){if(!s.unlockedCars?.[i]||!carAllowed(i,map))continue;if(best===null||baseRating(i)>baseRating(best))best=i;}return best;};
export const benchCarFor=(rank,map=Math.min(4,Math.floor(rank/45)))=>rank<LOANER.races?CARS[LOANER.car].id:BENCH_CAR[map];
// Ladder order for the fleet screen: the districts' cars first, collection cars after.
export const LADDER=[START_CAR,...CAR_SHARD_ORDER.slice(0,6),GIFT_CAR,...CAR_SHARD_ORDER.slice(6)];
export function unlockHint(i){const k=CAR_SHARD_ORDER.indexOf(i);if(i===START_CAR)return 'первая своя';if(i===GIFT_CAR)return 'отдаст братан после первого босса';if(k<0)return '';const district=k<1?0:k<2?1:k<4?2:k<6?3:4;return ['чертежи главарей Спального','чертежи главарей Промзоны','чертежи главарей Стройки','чертежи главарей Сельской','чертежи главарей ЖД'][district];}
