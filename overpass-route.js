// «Эстакада»: недостроенная дорога на сваях в десяти метрах над спальным районом. Пролёты между готовыми
// секциями перекрыты рукотворными трамплинами из строительного мусора; дальность прыжка решает только
// скорость на отрыве. Недолёт — падение и конец заезда. Чистая математика, без three.js.
export const OVERPASS_DISTANCE=700; // later districts land the big gap past 610 m
export const OVERPASS_HEIGHT=10;
export const GRAVITY=9.81;
// Пролёты: start — край готовой секции (начало трамплина), width — пропасть, ramp — длина трамплина и угол.
// Соперника на эстакаде нет (решение Андрея, 14 сентября): это проверка машины перед боссом района —
// хватает ли мощи перелететь три пролёта. Ширины пролётов растут по районам (dist/overpass-districts.js,
// генерируется scripts/overpass-tune.mjs от эталонной машины района).
import {OVERPASS_WIDTHS} from './overpass-districts.js';
export const GAPS=[
 {id:'first', start:150,width:25,ramp:{length:5, angle:8*Math.PI/180}, name:'Первый пролёт'},
 {id:'second',start:300,width:66,ramp:{length:8, angle:10*Math.PI/180},name:'Второй пролёт'},
 {id:'third', start:470,width:104,ramp:{length:11,angle:12*Math.PI/180},name:'Большой пролёт'},
];
// Кочки из щебня на целых секциях: короткий подскок без риска, только ритм и небольшая потеря.
// Кучи гравия на эстакаде: короткий тычок подвески, а не подброс машины (Андрей, 17 сентября — прежние .22–.30 бросали её).
export const BUMPS=[{at:80,height:.08},{at:230,height:.10},{at:400,height:.11},{at:590,height:.09}];
export const LANDING_LOSS_PER_SECOND=.035; // доля скорости за секунду полёта: длинный прыжок кладёт машину на нос
export const BUMP_LOSS=.012;
export const gapsFor=map=>{const w=OVERPASS_WIDTHS[Math.max(0,Math.min(OVERPASS_WIDTHS.length-1,map))]||GAPS.map(g=>g.width);return GAPS.map((g,i)=>({...g,width:w[i]}));};
export const bumpsFor=gaps=>BUMPS.filter(b=>!gaps.some(g=>b.at>=g.start-g.ramp.length-5&&b.at<=g.start+g.width+5)); // gravel bumps never sit on a ramp or a landing
export const gapAt=(d,gaps=GAPS)=>gaps.find(g=>d>=g.start-g.ramp.length&&d<g.start+g.width+2)||null;
export const rampHeight=g=>Math.sin(g.ramp.angle)*g.ramp.length;
// Дальность по горизонтали при отрыве с трамплина высотой h под углом a со скоростью v (посадка на уровень секции).
export function jumpRange(v,g){const a=g.ramp.angle,h=rampHeight(g),vx=v*Math.cos(a),vy=v*Math.sin(a);const t=(vy+Math.sqrt(vy*vy+2*GRAVITY*h))/GRAVITY;return {range:vx*t,time:t,vx,vy};}
export function requiredSpeed(g){let lo=1,hi=90;for(let i=0;i<40;i++){const m=(lo+hi)/2;if(jumpRange(m,g).range>=g.width+.5)hi=m;else lo=m;}return hi;}
export const requiredKmh=g=>Math.ceil(requiredSpeed(g)*3.6);
// Хук для tickCar: вызывается с рассчитанным ускорением до обновления скорости, возвращает ускорение,
// которое надо применить. В полёте тяги нет, скорость по горизонтали постоянна, вертикаль баллистическая.
export function overpassAcceleration(car,dt,accel){
 if(!car.overpass||car.finished||car.crashed)return accel;
 const air=car.air;
 if(air){
  air.t+=dt;air.y=air.vy*air.t-GRAVITY*air.t*air.t/2+air.h;
  if(air.y<=0){
   const landed=car.distance;
   delete car.air;
   if(landed<air.gap.start+air.gap.width){car.crashed=true;car.fell={gap:air.gap.id,short:+(air.gap.start+air.gap.width-landed).toFixed(1),speed:air.v};return 0;}
   car.speed*=Math.max(.55,1-LANDING_LOSS_PER_SECOND*air.t);car.landings=(car.landings||0)+1;return accel*.5;
  }
  return 0;
 }
 const g=(car.overpassGaps||GAPS).find(g=>car.distance>=g.start&&car.distance<g.start+g.width&&!(car.jumped||[]).includes(g.id));
 if(g){
  const v=car.speed,{time,vx,vy}=jumpRange(v,g);
  car.jumped=[...(car.jumped||[]),g.id];car.air={gap:g,t:0,y:rampHeight(g),h:rampHeight(g),v,vx,vy,time,land:g.start+jumpRange(v,g).range};
  car.speed=vx;return 0;
 }
 const b=(car.overpassBumps||BUMPS).find(b=>car.distance>=b.at&&car.distance<b.at+1.5&&!(car.hopped||[]).includes(b.at));
 if(b){car.hopped=[...(car.hopped||[]),b.at];car.speed*=1-BUMP_LOSS;car.hop={at:b.at,t:0,height:b.height};}
 if(car.hop){car.hop.t+=dt;if(car.hop.t>.35)delete car.hop;}
 return accel;
}
// Поза кузова для рендера: подъём над настилом и тангаж. На трамплине — вдоль его склона, в полёте — баллистика.
export function overpassPose(car){
 if(car.air){const a=car.air,rise=a.vy-GRAVITY*a.t;return {y:Math.max(0,a.y),pitch:Math.atan2(rise,a.vx),air:true};}
 const g=gapAt(car.distance,car.overpassGaps||GAPS);
 if(g&&car.distance<g.start&&car.distance>=g.start-g.ramp.length){const k=(car.distance-(g.start-g.ramp.length))/g.ramp.length;return {y:rampHeight(g)*k,pitch:g.ramp.angle,air:false};}
 if(car.hop){const k=car.hop.t/.35;return {y:Math.sin(Math.PI*k)*car.hop.height,pitch:Math.cos(Math.PI*k)*.045,air:false};}
 return {y:0,pitch:0,air:false};
}
// Расстояние до следующего пролёта и нужная скорость — для подсказки на приборке.
export function nextGap(d,gaps=GAPS){const g=gaps.find(g=>d<g.start);return g?{gap:g,metres:g.start-d,needKmh:requiredKmh(g)}:null;}
// Старт проверки: пролёты района на машине игрока. Никакого соперника, только скорость на отрыве.
export function overpassStart(car,map=0){car.overpass=true;car.overpassGaps=gapsFor(map);car.overpassBumps=bumpsFor(car.overpassGaps);car.jumped=[];car.landings=0;delete car.air;delete car.fell;return car;}
// Этап-проверка перед боссом района: без соперника, без чётких, засчитывается перелёт всех трёх пролётов.
export function overpassCheck(map=0,base={}){const gaps=gapsFor(map);return {...base,id:'overpass-'+map,trackId:'overpass',solo:true,overpass:true,practice:true,name:'ЭСТАКАДА',beat:'ПРОВЕРКА ПЕРЕД БОССОМ',kicker:'ХВАТИТ ЛИ МОЩИ',map:base.map??map,district:map,distance:OVERPASS_DISTANCE,gaps,needKmh:gaps.map(requiredKmh),requiredPerfect:0,boss:false,captain:false,startAssist:false,launchAuto:.8,window:1,car:null,levels:null,paint:null,reward:{scrap:40+map*20,cash:600+map*300},hint:'Если упал — качай мотор и коробку до босса: он едет ровно на этой мощи.'};}
