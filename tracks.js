import {DISTRICT_LENGTH,campaignPosition} from './campaign-config.js';
export const TRACKS=[
 {id:'district',name:'СПАЛЬНЫЙ РАЙОН',weather:'Солнечный день',sky:0x9bbac9,fog:0xbac9c8,sun:0xfff0ce,intensity:3.1,ambient:1.25,wet:0,night:false,seed:17},
 {id:'factory',name:'ПРОМЗОНА',weather:'Закат',sky:0xc88669,fog:0xcda08a,sun:0xff9849,intensity:3.6,ambient:.8,wet:0,night:false,seed:39},
 {id:'construction',name:'СТРОЙКА',weather:'Дождь',sky:0x6d7b86,fog:0x8998a0,sun:0xb8cadb,intensity:.8,ambient:1.2,wet:.65,night:false,seed:72},
 {id:'country',name:'СЕЛЬСКАЯ ДОРОГА',weather:'Рассвет · туман',sky:0xaaa9b6,fog:0xc8bbaf,sun:0xffc497,intensity:1.5,ambient:1.05,wet:0,night:false,seed:94},
 {id:'railway',name:'ВДОЛЬ ЖД ПУТЕЙ',weather:'Ночь · гроза',sky:0x071221,fog:0x122234,sun:0x829fbf,intensity:.32,ambient:.45,wet:1,night:true,seed:113},
 {id:'ridge',name:'ГРЕБЕНЬ',weather:'Боковой ветер · песок',sky:0x9da9ac,fog:0xc3b398,sun:0xffdb9e,intensity:3.2,ambient:1.3,wet:0,night:false,seed:217,bonus:true,rough:.28},
 {id:'switchback',name:'ПЕРЕКЛАДКИ',weather:'Насыпь · затяжные дуги',sky:0x9faeb6,fog:0xc8b795,sun:0xffdfad,intensity:3.1,ambient:1.2,wet:0,night:false,seed:329,bonus:true,rough:.28,description:'Длинная дуга, короткая связка, смена ритма.'},
 {id:'parking',name:'ПАРКОВКА',weather:'Город · открытая площадка',sky:0x8da9ba,fog:0xadb9b9,sun:0xffe1ae,intensity:3.2,ambient:1.25,wet:0,night:false,seed:451,bonus:true,rough:.05,description:'Открытая площадка. Четыре размеченные дуги: по 40 метров дрифта в каждой.'},
 {id:'pines',name:'СОСНОВЫЙ БОР',weather:'Грунтовка · оранжевый закат',sky:0xdf9867,fog:0xd4a17b,sun:0xff8b36,intensity:4.0,ambient:1.0,wet:0,night:false,seed:673,bonus:true,rough:.65,description:'Скользкая грунтовка, сосны и поляны. Заранее готовь перекладку.'},
 {id:'overpass',name:'ЭСТАКАДА',weather:'Закат · десять метров над районом',sky:0xc88669,fog:0xcda08a,sun:0xffba79,intensity:3.1,ambient:1.1,wet:0,night:false,seed:331,bonus:true,check:true,description:'Три пролёта. Проверка разгона перед боссом.'},
];
export function trackIndex(rank){return Math.min(4,Math.max(0,Math.floor(rank/DISTRICT_LENGTH)));}
// Five looks (time of day and weather) rotate over the nine series of a district on top of its geometry,
// so the same streets are seen at dawn, at night and in the rain; a district opens and closes with its own look.
export const LOOKS=[
 {look:'day',weather:'Солнечный день',sky:0x9bbac9,fog:0xbac9c8,sun:0xfff0ce,intensity:3.1,ambient:1.25,wet:0,night:false},
 {look:'sunset',weather:'Закат',sky:0xc88669,fog:0xcda08a,sun:0xff9849,intensity:3.6,ambient:.8,wet:0,night:false},
 {look:'rain',weather:'Дождь',sky:0x6d7b86,fog:0x8998a0,sun:0xb8cadb,intensity:.8,ambient:1.2,wet:.65,night:false},
 {look:'dawn',weather:'Рассвет · туман',sky:0xaaa9b6,fog:0xc8bbaf,sun:0xffc497,intensity:1.5,ambient:1.05,wet:0,night:false},
 {look:'storm',weather:'Ночь · гроза',sky:0x071221,fog:0x122234,sun:0x829fbf,intensity:.32,ambient:.45,wet:1,night:true},
];
export const LOOK_ORDER=[0,1,2,3,4,1,3,2,0];
// The country road breaks up into a rutted dirt track from its fourth series: off-roaders shine there.
export const ROUGH_MAP=3,ROUGH_FROM_SERIES=3;
export function raceLook(map,series=0,practice=false){const base=TRACKS[map]||TRACKS[0],index=Math.max(0,Math.min(TRACKS.length-1,map));if(base.bonus)return {...base};const l=practice?LOOKS[index]:LOOKS[(index+LOOK_ORDER[((series%9)+9)%9])%LOOKS.length];const rough=!practice&&index===ROUGH_MAP&&series>=ROUGH_FROM_SERIES?1:0;return {...base,...l,id:base.id,name:base.name,seed:base.seed,rough,weather:rough?l.weather+' · грунтовка':l.weather};}
// Bosses of districts 3–5 always race in the district's hardest weather: the storm (or the rutted dirt, which the country road already gives), never a lucky sunny draw.
export function lookForRank(rank,practice=false){const p=campaignPosition(rank);const look=raceLook(p.map,p.series,practice);if(!practice&&p.boss&&p.map>=2&&!look.rough)return {...look,...LOOKS[4]};return look;}
