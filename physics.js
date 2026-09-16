import {overpassAcceleration} from './overpass-route.js';
import {tickOverpassFall} from './overpass-flow.js';
import {hitRidgePosts} from './ridge-obstacles.js';
import {tickDrift,driftAutoSteer,setDriftSteer,coastBattleCar} from './ridge-drift.js';
import {tickRidgeCrash} from './ridge-body.js';
import {handlingFor,gearsFor} from './vehicle-dynamics.js';
export const TOP_SPEEDS=handlingFor('samara').gears;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Нитро: баллон с запасом и кнопкой, а не пассивная прибавка. Чем круче баллон (tier),
// тем дольше держит и злее толкает. Тем же баллоном пользуются сильные соперники.
export const NITRO={tank:1.2,push:.15,spool:.18};
export const nitroTank=tier=>+(NITRO.tank*Math.max(0,tier||0)).toFixed(2);
export const nitroPush=tier=>tier>0?NITRO.push*Math.pow(tier,.35):0;
// Нажатие: жжём, пока есть чем. Пустой баллон и стоящая машина кнопку игнорируют.
export function fireNitro(car){
 if(!car||car.finished||car.crashed||!(car.nitro>0))return false;
 if(car.nitroLeft<=0||car.nitroActive)return false;
 car.nitroActive=true;car.nitroFired=(car.nitroFired||0)+1;return true;
}
// kit — редкое железо, которое живёт не в уровнях, а в поведении. Пока это только баллон нитро.
export function createCar(levels=[0,0,0],variant=0,carId='samara',raceDistance=402,kit={}){
 const handling=handlingFor(carId),gears=gearsFor(handling.id,levels);
 return {levels:[...levels],variant,carId:handling.id,handling,gears,maxGear:gears.length,redline:handling.rpm,raceDistance,gear:1,rpm:1000,speed:0,distance:0,travelDistance:0,time:0,finished:false,finishTime:0,shiftPause:0,launchBoost:0,perfect:0,good:0,missed:0,combo:0,boost:0,heat:0,window:1,surface:1,rough:0,ride:handling.ride??.5,nitro:clamp(kit.nitro||0,0,3),nitroLeft:nitroTank(clamp(kit.nitro||0,0,3)),nitroActive:false,nitroFlame:0,nitroFired:0};
}
export function launchRpmFor(car){return car.handling.shift;}
// Deterministic rut profile along the road, 0..1: the same holes for the player, the rival and the calibration.
export const roughBump=d=>Math.max(0,Math.sin(d*.83)*Math.sin(d*.29+1.3)+.35*Math.sin(d*2.1+.4))*.75;
export function launch(car,rpm){car.rpm=rpm;const p=car.handling,scale=(p.rpm-1000)/6500;const perfect=Math.abs(rpm-p.shift)<=422.5*scale;car.launchBoost=perfect?1.5:rpm>p.shift?-.5:.1;car.launchLog={rpm:Math.round(rpm),dev:Math.round(rpm-p.shift),perfect:perfect?1:0};car.speed=(perfect?2.2:1)*p.traction;car.rpm=rpmAtSpeed(car);return perfect;}
export function shiftZone(car){const p=car.handling,half=(422.5+(Math.min(car.levels[2],12)+4*(1-Math.exp(-Math.max(0,car.levels[2]-12)/4)))*35)*(car.window??1)*(p.rpm-1000)/6500;return [Math.max(1400,p.shift-half),Math.min(p.rpm-120,p.shift+half)];}
export function gearLimit(car){return (car.gears||car.handling.gears)[car.gear-1]/3.6*(1+car.levels[0]*.012);}
function rpmAtSpeed(car){return clamp(1000+car.speed/gearLimit(car)*(car.redline-1000),1000,car.redline);}
export function shift(car,assisted=false){
 if(car.gear>=car.maxGear||car.finished||car.crashed||car.ridge||car.air||car.shiftPause>0)return null;
 const [low,high]=shiftZone(car),p=car.handling;
 const goodLow=1000+(car.redline-1000)*.585,hot=car.redline-400;
 const quality=assisted?'good':car.rpm>=low&&car.rpm<=high?'perfect':car.rpm>=goodLow&&car.rpm<hot?'good':'missed';
 (car.shiftLog??=[]).push({g:car.gear,rpm:Math.round(car.rpm),dev:Math.round(car.rpm-p.shift),q:quality,t:+(car.time||0).toFixed(2),v:Math.round(car.speed*3.6),a:assisted?1:0});/* per-shift quality for telemetry */
 car[quality]++;car.combo=quality==='perfect'?car.combo+1:0;
 // Нитро не «ещё немного мощи», а рывок: за чёткое переключение баллон держит дольше и толкает злее.
 car.boost=quality==='perfect'?.65+car.combo*.15:0;car.gear++;
 car.shiftPause=(quality==='perfect'?.11:quality==='good'?.22:.44)*p.inertia/(1+Math.max(0,car.levels[2])*.025);
 if(quality==='missed')car.speed*=.955;
 car.rpm=rpmAtSpeed(car);return quality;
}
export function tickCar(car,dt){
 if(dt<=0)return;if(car.crashed){if(car.overpass)tickOverpassFall(car,dt);else tickRidgeCrash(car,dt);return;}if(car.finished)return;
 if((car.ridge||car.overpass)&&dt>1/120+.000001){for(let left=dt;left>1e-8;left-=1/120)tickCar(car,Math.min(left,1/120));return;}
 if(car.ridge){tickDrift(car,dt);hitRidgePosts(car,dt);return;}
 if(car.overpass&&!car.air&&car.rpm>=car.handling.shift&&car.gear<car.maxGear)shift(car);
 const p=car.handling,prevDistance=car.distance,prevTime=car.time;car.time+=dt;
 car.shiftPause=Math.max(0,car.shiftPause-dt);car.boost=Math.max(0,(car.boost||0)-dt);
 // Баллон горит, пока в нём что-то есть: пламя из трубы и тяга держатся ровно столько же.
 if(car.nitroActive){car.nitroLeft=Math.max(0,car.nitroLeft-dt);if(car.nitroLeft<=0)car.nitroActive=false;}
 car.nitroFlame=car.nitroActive?Math.min(1,(car.nitroFlame||0)+dt*6):Math.max(0,(car.nitroFlame||0)-dt*4);
 // At the final gear the limiter holds speed; there is no nonexistent next gear to demand.
 car.heat=clamp((car.heat||0)+(car.gear<car.maxGear&&car.rpm>car.redline-400?.28:-.5)*dt,0,1);
 const power=1+car.levels[0]*.13,grip=1+car.levels[1]*.09,maxSpeed=gearLimit(car);
 const relative=(car.rpm-1000)/(car.redline-1000),torque=clamp((relative+.077)/.431,p.low,1);
 let accel=(p.accel-car.speed*p.drag)*power*torque;
 if(car.speed<15){const wet=car.surface<1?clamp(car.surface+p.wet,0,1):1;accel*=(grip+car.launchBoost*.18)*p.traction*wet;}
 accel*=1+car.levels[1]*.012;accel*=car.shiftPause>0?.08:1;accel*=car.boost>0?1.10+Math.min(car.combo,4)*.025:1;
 if(car.nitroActive)accel*=1+nitroPush(car.nitro);accel*=1-car.heat*.6;
 // Broken dirt: constant rolling loss plus hits on every rut, both softened by the car's ride.
 if(car.rough>0){const soft=clamp(1-(car.ride??.5),0,1)*car.rough;accel-=car.speed*soft*.11+roughBump(car.distance)*soft*9;}
 if(car.speed>maxSpeed*.94)accel*=clamp((maxSpeed-car.speed)/(maxSpeed*.06),0,1);
 if(car.overpass){const air=car.air;accel=overpassAcceleration(car,dt,accel);if(car.crashed){car.overpassFall={y:0,vy:air?air.vy-9.81*air.t:-1,pitch:air?Math.atan2(air.vy-9.81*air.t,air.vx):0};car.crashElapsed=0;return;}}
 car.speed=car.air?car.speed:clamp(car.speed+accel*dt,0,maxSpeed);car.rpm=rpmAtSpeed(car);if(car.crashed)return;car.distance+=car.speed*dt;car.travelDistance=car.distance;
 if(car.distance>=car.raceDistance){car.finished=true;car.finishTime=prevTime+(car.raceDistance-prevDistance)/(car.distance-prevDistance)*dt;car.distance=car.raceDistance;}
}
// Race timing stops at the line; presentation continues along the road.
export function tickCoast(car,dt){if(!car.finished)return;if(car.overpass){const v=car.speed;car.speed=Math.max(0,v-12*dt);car.travelDistance=(car.travelDistance??car.raceDistance)+(v+car.speed)*.5*dt;car.rpm=Math.max(950,car.rpm*Math.exp(-dt));return;}if(car.ridge){if(dt>1/120+.000001){for(let left=dt;left>1e-8;left-=1/120)tickCoast(car,Math.min(left,1/120));return;}coastBattleCar(car,dt);hitRidgePosts(car,dt);return;}const oldSpeed=car.speed;car.speed=Math.max(0,car.speed*Math.exp(-.25*dt)-.38*dt);car.travelDistance=(car.travelDistance??car.raceDistance)+(oldSpeed+car.speed)*.5*dt;car.rpm=Math.max(950,car.rpm*Math.exp(-.66*dt));}
// Fixed opponents use their car's gearbox and power band; upgrading the player never buffs them.
export function tickOpponent(car,opp,dt){
 if(car.finished){tickCoast(car,dt);return;}
 if(car.reactionRemaining===undefined)car.reactionRemaining=opp.reaction??.25;
 if(car.reactionRemaining>0){const wait=Math.min(dt,car.reactionRemaining);car.reactionRemaining-=wait;car.time+=wait;dt-=wait;}
 if(dt<=0)return;
 const p=car.handling,scale=(p.rpm-1000)/6500;
 if(!car.hasLaunched){launch(car,p.shift+((opp.launchRpm??6100)-6168)*scale);car.hasLaunched=true;}
 // Соперник с баллоном жмёт его на последней трети: там, где исход ещё можно перевернуть.
 if(car.nitro>0&&!car.nitroActive&&car.nitroLeft>0&&car.distance>car.raceDistance*.62)fireNitro(car);
 const target=clamp(p.shift+(opp.shift-6168)*scale,1800,p.rpm-100);
 if(car.rpm>target&&car.gear<car.maxGear)shift(car);
 if(car.ridge)setDriftSteer(car,driftAutoSteer(car));
 tickCar(car,dt);
}
