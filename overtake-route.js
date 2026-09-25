// «Обгон»: ночное шоссе, три полосы, поток машин идёт в попутном направлении на 55–80 км/ч. Игрок газует
// и переключается как обычно, а перестраивается тапом по левой или правой половине дороги. Решение здесь —
// момент перестроения; мощность решает, как быстро ты набираешь ход после каждого прижатия к потоку.
// Чистая математика без three.js; трафик детерминирован сидом, поэтому калибровка и игра видят одно и то же.
export const OVERTAKE_DISTANCE=804;
export const LANES=[-3.2,0,3.2];
export const LANE_CHANGE_TIME=.32;
export const CAR_LENGTH=4.2;
export const BUMP_STUN=.45;
export const TRAFFIC_KINDS=[1,3,8,10,12,2]; // индексы моделей из fleet: копейка, пятёрка, москвич, волга, буханка, ока
const rngOf=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
// Поток: машина каждые 16–28 м, полоса случайная, но в любом окне 30 м хотя бы одна полоса свободна.
export function buildTraffic(seed=2026){
 const rng=rngOf(seed),cars=[];let d=60;
 const count=[0,0,0];
 while(d<OVERTAKE_DISTANCE+120){
  // Any 30 m window around any car keeps one lane free: the new car's window and every neighbour's.
  const walls=(lane,c)=>new Set([...cars.filter(o=>Math.abs(o.d-c)<30).map(o=>o.lane),lane]).size>=3;
  const ok=[0,1,2].filter(lane=>!walls(lane,d)&&!cars.some(c=>Math.abs(c.d-d)<30&&walls(lane,c.d)));
  if(!ok.length){d+=6;continue;}
  // Among the allowed lanes prefer the emptier ones, so the middle lane is as busy as the sides.
  const least=Math.min(...ok.map(l=>count[l])),pool=ok.filter(l=>count[l]===least);
  const lane=pool[Math.floor(rng()*pool.length)],speed=15.3+rng()*7,kind=TRAFFIC_KINDS[Math.floor(rng()*TRAFFIC_KINDS.length)];
  count[lane]++;cars.push({d,lane,speed,kind,id:cars.length});d+=16+rng()*12;
 }
 return cars;
}
export const trafficPosition=(t,time)=>t.d+t.speed*time;
export function overtakeStart(car,seed=2026){car.overtake=true;car.lane=1;car.laneTarget=1;car.laneShift=0;car.stun=0;car.bumps=0;car.passed=0;car.traffic=buildTraffic(seed);}
export function changeLane(car,dir){if(!car.overtake||car.finished||car.crashed)return false;const target=Math.max(0,Math.min(2,car.laneTarget+dir));if(target===car.laneTarget||car.laneShift>0)return false;car.laneTarget=target;car.laneShift=LANE_CHANGE_TIME;return true;}
// Поперечное положение для рендера: плавный переход между полосами.
export function overtakeX(car){if(car.laneShift>0){const k=1-car.laneShift/LANE_CHANGE_TIME,from=LANES[car.lane],to=LANES[car.laneTarget];return from+(to-from)*(k*k*(3-2*k));}return LANES[car.lane];}
export function threatsAhead(car,horizon=70){const time=car.time||0;return car.traffic.filter(t=>{const p=trafficPosition(t,time);return p>car.distance-2&&p<car.distance+horizon;}).map(t=>({...t,pos:trafficPosition(t,time),gap:trafficPosition(t,time)-car.distance}));}
export function freestLane(car){const th=threatsAhead(car,140);return [0,1,2].map(l=>({lane:l,room:Math.min(140,...th.filter(t=>t.lane===l).map(t=>t.gap).concat([140]))})).sort((a,b)=>b.room-a.room||Math.abs(a.lane-car.laneTarget)-Math.abs(b.lane-car.laneTarget))[0];}
// Хук для tickCar: до обновления скорости. Возвращает ускорение, которое применить.
export function overtakeAcceleration(car,dt,accel){
 if(!car.overtake||car.finished||car.crashed)return accel;
 if(car.laneShift>0){car.laneShift=Math.max(0,car.laneShift-dt);if(car.laneShift===0)car.lane=car.laneTarget;}
 if(car.stun>0){car.stun=Math.max(0,car.stun-dt);return 0;}
 const time=car.time||0,lanes=car.laneShift>0?[car.lane,car.laneTarget]:[car.lane];
 for(const t of car.traffic){
  if(!lanes.includes(t.lane))continue;
  const p=trafficPosition(t,time),gap=p-CAR_LENGTH-car.distance;
  if(gap<0&&gap>-CAR_LENGTH&&car.speed>t.speed&&!t.hit){
   // Догнал впритык: скорость падает до потока, короткий ступор. Машина потока помечена, второй раз не бьёт.
   t.hit=true;car.speed=t.speed*.85;car.stun=BUMP_STUN;car.bumps++;car.lastBump={id:t.id,at:car.distance,speed:t.speed};return 0;
  }
  if(!t.passed&&p+CAR_LENGTH<car.distance){t.passed=true;car.passed++;}
 }
 return accel;
}
// Ночной таксист на Волге — эталон времени: чистый проезд без прижатий при разумной мощности.
export function overtakeOpponent(opp){return {...opp,id:0,practice:true,trackId:'overtake',name:'ТАКСИСТ',paint:'ivory',car:2,levels:[5,3,3],map:7,distance:OVERTAKE_DISTANCE,shift:5300,launchRpm:5200,reaction:.3,startAssist:false,boss:false,captain:false,requiredPerfect:0,beat:'ОБГОН · СВОБОДНЫЙ ЗАЕЗД',decal:'',window:1,launchAuto:.8,overtake:true,ghostTime:19};}
