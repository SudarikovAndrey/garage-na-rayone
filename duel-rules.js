import {createCar,launch,shift,tickCar} from './physics.js';
import {CARS} from './fleet.js';
import {vehicleStats} from './vehicle-dynamics.js';
import {DECALS,decalById} from './decals.js';
import {neonById} from './neons.js';

import {PAINTS} from './paints.js';
import {partById} from './progression.js';
export const DUEL={version:'street-classes-v2',map:0,distance:402,step:1/120,maxSteps:12000,launchSteps:96,ttl:20*60*1000};
export const DUEL_CLASSES=[{id:'D',name:'ДВОР',min:0,max:119},{id:'C',name:'УЛИЦА',min:120,max:159},{id:'B',name:'РАЙОН',min:160,max:219},{id:'A',name:'ГОРОД',min:220,max:299},{id:'S',name:'ЛИГА',min:300,max:999}];
const paintOk=id=>PAINTS.some(p=>p.id===id);
const slots=['spoiler','skirts','fenders','rims','bumpers'];
const integer=(n,a,b)=>Math.max(a,Math.min(b,Math.floor(Number(n)||0)));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const duelClassFor=power=>DUEL_CLASSES.find(c=>power<=c.max)||DUEL_CLASSES.at(-1);
export function normalizeDuelBuild(raw={}){const car=integer(raw.car,0,CARS.length-1),levels=[0,1,2].map(i=>clamp(Number(raw.levels?.[i])||0,0,50)),equipment={};for(const slot of slots){const id=raw.equipment?.[slot],part=partById(id);if(part&&part.slot===slot)equipment[slot]=id;}const paint=paintOk(raw.paint)?raw.paint:CARS[car].color,decal=decalById(raw.decal)?.id||null,neon=neonById(raw.neon)?.id||null,/* косметика: сервер хранит, соперник видит */power=vehicleStats(CARS[car].id,levels).rating;
 // Нитро меняет поведение машины, а не уровни: без него сервер повторит заезд иначе, чем он шёл у игрока.
 const kit=raw.kit?.nitro?{nitro:1}:{};
 return {car,levels,power,classId:duelClassFor(power).id,equipment,paint,decal,neon,kit};}
// Сборка, присланная клиентом. Ботов и призраков собирает сам сервер, им высокие уровни нужны —
// машина у бота слабее, и мощь игрока он добирает уровнями. А вот то, что пришло из игры, держим в
// пределах полностью собранной машины: предельный гараж — все детали максимального ранга, все
// уникальные апгрейды и пятнадцатый уровень машины — даёт 34.8 / 26.1 / 26.9 и 817 мощи. Раньше
// здесь стояло 50 на слот, то есть вдвое выше любой достижимой машины.
// Что потолок не занижен и не задран, сторожит check-anticheat.mjs.
export const BUILD_CEILING=[36,28,28];
export const normalizePlayerBuild=raw=>normalizeDuelBuild({...raw,levels:[0,1,2].map(i=>clamp(Number(raw?.levels?.[i])||0,0,BUILD_CEILING[i]))});
// Дистанция — параметр: в дуэли она общая, в стрелке у каждого своя из-за форы.
export function duelCar(build={car:0,levels:[0,0,0]},distance=DUEL.distance){const b=normalizeDuelBuild(build),car=CARS[b.car];return createCar(b.levels,car.drive,car.id,distance,b.kit||{});}

// Inputs are integer physics ticks after green, not a claimed finish time.
export function duelStep(car,frame,inputs){
 if(car.finished)return;
 if(!car.hasLaunched){
  if(inputs[0]===frame||frame===DUEL.launchSteps){const reaction=frame*DUEL.step;launch(car,car.handling.shift-(reaction<=.24?0:reaction<.68?1200:2200));car.hasLaunched=true;}
  else {car.time+=DUEL.step;return;}
 }else if(inputs.includes(frame))shift(car);
 tickCar(car,DUEL.step);
}
export function verifyReplay(inputs,build,distance=DUEL.distance){
 const b=normalizeDuelBuild(build),maxInputs=vehicleStats(CARS[b.car].id,b.levels).gears+3;
 if(!Array.isArray(inputs)||inputs.length<1||inputs.length>maxInputs)throw Error('Некорректная запись заезда');
 if(inputs.some((n,i)=>!Number.isInteger(n)||n<0||n>=DUEL.maxSteps||(i&&n<=inputs[i-1]))||inputs[0]>DUEL.launchSteps)throw Error('Некорректные переключения');
 const car=duelCar(b,distance);for(let frame=0;frame<DUEL.maxSteps&&!car.finished;frame++)duelStep(car,frame,inputs);
 if(!car.finished||inputs.at(-1)*DUEL.step>car.finishTime)throw Error('Заезд не завершён');
 return {time:car.finishTime,perfect:car.perfect,missed:car.missed};
}
export function ratingChange(rating,other,result){return Math.round(28*(result-1/(1+10**((other-rating)/400))));}

export const DUEL_BOTS=[
 {id:'shurup',name:'Шуруп',car:2,paint:'orange',skill:1,mix:[.58,.30,.12],kit:['rims']},
 {id:'sedoy',name:'Седой',car:1,paint:'cherry',skill:2,mix:[.48,.18,.34],kit:['rims','bumpers']},
 {id:'shket',name:'Шкет',car:9,paint:'blue',skill:0,mix:[.62,.30,.08],kit:['rims']},
 {id:'palych',name:'Палыч',car:10,paint:'black',skill:3,mix:[.36,.20,.44],kit:['rims','skirts']},
 {id:'gvozd',name:'Гвоздь',car:4,paint:'silver',skill:4,mix:[.44,.38,.18],kit:['rims','fenders','bumpers']},
 {id:'kabanchik',name:'Кабанчик',car:11,paint:'green',skill:1,mix:[.66,.25,.09],kit:['rims','bumpers']},
 {id:'filya',name:'Филя',car:3,paint:'ivory',skill:2,mix:[.40,.42,.18],kit:['rims','skirts']},
 {id:'baton',name:'Батон',car:12,paint:'ivory',skill:0,mix:[.70,.20,.10],kit:['rims','fenders']},
 {id:'ryzhiy',name:'Рыжий',car:8,paint:'orange',skill:3,mix:[.42,.22,.36],kit:['rims','spoiler','bumpers']},
 {id:'klesch',name:'Клещ',car:0,paint:'cherry',skill:4,mix:[.50,.34,.16],kit:['rims','skirts','fenders','spoiler']},
 {id:'truba',name:'Труба',car:7,paint:'green',skill:1,mix:[.38,.52,.10],kit:['rims','fenders']},
 {id:'major',name:'Мажор',car:6,paint:'silver',skill:2,mix:[.54,.16,.30],kit:['rims','skirts','spoiler']},
 {id:'kirpich',name:'Кирпич',car:5,paint:'black',skill:0,mix:[.45,.20,.35],kit:['rims','bumpers']},
 {id:'boroda',name:'Борода',car:10,paint:'green',skill:3,mix:[.32,.28,.40],kit:['rims','skirts','fenders']},
 {id:'turbo',name:'Турбо',car:6,paint:'blue',skill:4,mix:[.60,.24,.16],kit:['rims','skirts','fenders','spoiler','bumpers']},
 {id:'shtaket',name:'Штакет',car:1,paint:'ivory',skill:1,mix:[.34,.48,.18],kit:['rims','fenders']},
 {id:'dizel',name:'Дизель',car:11,paint:'black',skill:2,mix:[.68,.14,.18],kit:['rims','bumpers','skirts']},
 {id:'maloy',name:'Малой',car:4,paint:'blue',skill:0,mix:[.46,.36,.18],kit:['rims','spoiler']},
 {id:'prizrak',name:'Призрак',car:5,paint:'silver',skill:3,mix:[.38,.18,.44],kit:['rims','skirts','spoiler']},
 {id:'hozyain',name:'Хозяин',car:0,paint:'black',skill:4,mix:[.52,.30,.18],kit:['rims','skirts','fenders','spoiler','bumpers']},
 // Вторая десятка (17 сентября): свои ливреи и неон, чтобы в подборе не было двух одинаковых машин подряд.
 {id:'lyoha',name:'Лёха с Пятой',car:3,paint:'mint',skill:1,mix:[.50,.32,.18],kit:['rims'],decal:'taxi'},
 {id:'zmey',name:'Змей',car:8,paint:'graphite',skill:3,mix:[.44,.20,.36],kit:['rims','skirts','spoiler'],decal:'night-pride',neon:'acid'},
 {id:'santa',name:'Санта',car:12,paint:'bright-white',skill:0,mix:[.72,.18,.10],kit:['rims','bumpers'],decal:'polyot-21'},
 {id:'kosmos',name:'Космос',car:6,paint:'plum',skill:4,mix:[.48,.28,.24],kit:['rims','skirts','fenders','spoiler','bumpers'],decal:'circuit',neon:'violet'},
 {id:'vovan',name:'Вован',car:1,paint:'orange',skill:2,mix:[.56,.26,.18],kit:['rims','fenders'],decal:'forward-88'},
 {id:'ledi',name:'Леди',car:4,paint:'lime',skill:2,mix:[.40,.36,.24],kit:['rims','skirts'],decal:'runners',neon:'raspberry'},
 {id:'stary',name:'Старый',car:10,paint:'garnet',skill:3,mix:[.36,.24,.40],kit:['rims','bumpers','skirts'],decal:'retro-rally'},
 {id:'shnyaga',name:'Шняга',car:2,paint:'khaki',skill:0,mix:[.60,.30,.10],kit:['rims']},
 {id:'metel',name:'Метель',car:5,paint:'snow-queen',skill:1,mix:[.46,.40,.14],kit:['rims','fenders','bumpers'],decal:'north-wind',neon:'ice'},
 {id:'kapitan',name:'Капитан',car:9,paint:'gold',skill:4,mix:[.54,.28,.18],kit:['rims','spoiler','bumpers'],decal:'gold-7',neon:'amber'},
];
const hash=s=>[...s].reduce((n,c)=>(n*33+c.charCodeAt(0))>>>0,5381);
function botBuild(bot,targetPower){const cls=duelClassFor(targetPower),offset=(hash(bot.id)%15)-7,desired=clamp(targetPower+offset,cls.min,cls.max),base=vehicleStats(CARS[bot.car].id).rating,delta=Math.max(0,desired-base),levels=bot.mix.map((share,i)=>delta*share/[14,5,3][i]),rarity=integer(DUEL_CLASSES.findIndex(c=>c.id===cls.id),0,3),equipment={};for(const slot of bot.kit)equipment[slot]=slot+'-'+rarity;return normalizeDuelBuild({car:bot.car,levels,equipment,paint:bot.paint,decal:bot.decal||DECALS[hash(bot.id)%DECALS.length].id,neon:bot.neon||null});}
function botInputs(bot,build){const car=duelCar(build),h=hash(bot.id),launchFrame=clamp([70,48,30,19,11][bot.skill]+h%7,1,DUEL.launchSteps),inputs=[launchFrame],late=[820,480,220,70,-20][bot.skill];for(let frame=0;frame<DUEL.maxSteps&&!car.finished;frame++){const jitter=((h+car.gear*13)%7-3)*22;if(car.hasLaunched&&car.gear<car.maxGear&&!car.shiftPause&&car.rpm>=car.handling.shift+late+jitter)inputs.push(frame);duelStep(car,frame,inputs);}return inputs;}
export function chooseBot(profile,playerBuild){const build=normalizeDuelBuild(playerBuild),wave=[1,2,0,3,1,4,2],skill=wave[(profile.races||0)%wave.length],compatible=DUEL_BOTS.filter(b=>vehicleStats(CARS[b.car].id).rating<=build.power+10),fresh=compatible.filter(b=>'bot:'+b.id!==profile.lastOpponent),pool=fresh.length?fresh:compatible,bot=pool[(Math.floor(build.power)+(profile.races||0)*7+skill*3)%pool.length],opponentBuild=botBuild(bot,build.power),tuned={...bot,skill},inputs=botInputs(tuned,opponentBuild),run=verifyReplay(inputs,opponentBuild),rating=Math.max(0,(profile.rating||1000)+[-110,-55,0,60,110][skill]);return {userId:'bot:'+bot.id,name:bot.name,rating,time:run.time,inputs,build:opponentBuild,isBot:true,skill};}
function parseGhosts(row){try{const p=typeof row.data==='string'?JSON.parse(row.data):row.data||{},runs=Object.values(p.ghosts||{});if(!runs.length&&p.inputs&&p.build)runs.push({inputs:p.inputs,build:p.build,time:p.best});return runs.map(ghost=>({...row,ghost}));}catch{return [];}}
export function chooseGhost(rows,profile,playerBuild={car:0,levels:[0,0,0]}){const build=normalizeDuelBuild(playerBuild),tolerance=Math.max(10,Math.round(build.power*.07)),eligible=rows.flatMap(parseGhosts).filter(r=>{const rival=normalizeDuelBuild(r.ghost.build);return r.ghost.time>0&&rival.classId===build.classId&&Math.abs(rival.power-build.power)<=tolerance&&Math.abs(r.rating-profile.rating)<=250&&(!profile.best||Math.abs(r.ghost.time-profile.best)/profile.best<.16);});if(!eligible.length)return null;const fresh=eligible.filter(r=>r.user_id!==profile.lastOpponent),pool=fresh.length?fresh:eligible,offset=[0,60,-90,25,110][profile.races%5];return pool.sort((a,b)=>Math.abs(a.rating-profile.rating-offset)-Math.abs(b.rating-profile.rating-offset)||a.user_id.localeCompare(b.user_id))[0];}
