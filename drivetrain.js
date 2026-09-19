import {CARS} from './fleet.js';
const FITS=new Map(CARS.map(c=>[c.id,c]));
// Authoritative drivetrain by vehicle ID. Legacy `variant` is NOT a drivetrain:
// bots and older callers can pass a paint/animation variant independently of carId.
export const DRIVETRAINS=Object.freeze({samara:'fwd',kopeyka:'rwd',oka:'fwd',pyaterka:'rwd',nine:'fwd','ninety-nine':'fwd',ten:'fwd',niva:'awd',moskvich:'rwd',smz:'rwd',volga:'rwd',uaz:'part-time',bukhanka:'part-time'});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const DRIVE_PROFILES=Object.freeze({
 fwd:Object.freeze({front:1,frontLoad:.61,angle:.78,align:8.5,gripReturn:1.45,scrub:1.20,counter:.72}),
 rwd:Object.freeze({front:0,frontLoad:.52,angle:1,align:2.5,gripReturn:.88,scrub:1,counter:.95}),
 awd:Object.freeze({front:.5,frontLoad:.54,angle:.82,align:6,gripReturn:1.15,scrub:1.08,counter:.83})
});
export function drivetrainFor(car,terrain='asphalt'){const type=DRIVETRAINS[typeof car==='string'?car:car?.carId]||'fwd';return type==='part-time'?(terrain==='forest'||terrain==='dirt'||(car?.rough||0)>.45?'awd':'rwd'):type;}
export const drivenAxles=(car,terrain='asphalt')=>{const p=DRIVE_PROFILES[drivetrainFor(car,terrain)];return [p.front,1-p.front];};
export function driftWheelSteering(car){const d=car.drift;if(!d)return 0;const a=d.angle||0,blend=smooth(0,.25,Math.abs(a)),p=DRIVE_PROFILES[d.driveType||drivetrainFor(car)];return clamp((d.steer||0)*.30*(1-blend)-a*p.counter*blend,-.62,.62);}
// Friction circle: longitudinal traction/braking leaves less lateral force available.
export const lateralCapacity=longitudinal=>Math.sqrt(Math.max(.05,1-clamp(longitudinal,-.97,.97)**2));
// A two-axle, mass-normalised approximation. Values are game calibration, not vehicle specs.
// Store slip velocity / heat per axle for smoke, marks, wheel rotation and sound to share.
export function updateDriftAxles(car,dt,terrain,wheelbase=FITS.get(car.carId)?.wheelbase||2.46,curvature=0){
 const d=car.drift,type=drivetrainFor(car,terrain),p=DRIVE_PROFILES[type],input=Math.abs(d.steer),slide=d.mode==='slide',moving=clamp((car.speed-5)/10,0,1);
 d.driveType=type;
 const brakeTarget=slide&&type==='fwd'?(.22+.68*smooth(.72,1,input))*moving:0;
 d.rearBrake=(d.rearBrake||0)+(brakeTarget-(d.rearBrake||0))*(1-Math.exp(-dt*(brakeTarget?7:5)));
 d.throttle=slide?(type==='fwd'?.80-d.rearBrake*.38:type==='awd'?.84:1):1;
 const throttleLoad=d.throttle*(slide?.76:.22),transfer=(d.rearBrake*.065-(car.speed<16?.035:.015)*d.throttle);
 d.frontLoad=clamp(p.frontLoad+transfer,.35,.72);d.rearLoad=1-d.frontLoad;
 d.frontGrip=lateralCapacity(throttleLoad*p.front/Math.max(.35,d.frontLoad)*.50);
 d.rearGrip=lateralCapacity(throttleLoad*(1-p.front)/Math.max(.3,d.rearLoad)*.50+d.rearBrake*.72);
 const axles=d.axles??=[{heat:0},{heat:0}],speed=Math.max(0,car.speed),u=Math.max(3,speed*Math.cos(d.angle)),v=-speed*Math.sin(d.angle),yaw=(d.angularVelocity||0)+curvature*speed,steer=driftWheelSteering(car);
 for(let i=0;i<2;i++){
  const a=axles[i],share=i?1-p.front:p.front,load=i?d.rearLoad:d.frontLoad,alpha=Math.atan2(v+(i?-1:1)*yaw*wheelbase*.5,u)-(i?0:steer);
  const spin=share*d.throttle*(slide?(type==='rwd'?.45:type==='awd'?.10:.08):.025)*moving;
  const brake=i?d.rearBrake:0;a.slipAngle=alpha;a.spin=spin;a.brake=brake;a.longSlip=spin-brake;
  a.lateralSpeed=Math.abs(Math.sin(alpha))*speed;a.slipSpeed=Math.hypot(a.lateralSpeed,a.longSlip*speed);
  // The work at the contact patch drives the effect; a non-driven sliding tyre can smoke too.
  const work=Math.max(0,a.slipSpeed-2)*load*(terrain==='forest'?.5:1);
  a.heat+=(clamp(work/10,0,1)-a.heat)*(1-Math.exp(-dt*(work>2?3:4)));
  a.smoke=car.crashed||car.finished||speed<6?0:clamp(a.heat*(.28+Math.min(1,a.slipSpeed/12))*(terrain==='forest'?.55:1),0,1);
  a.mark=car.crashed||car.finished||speed<6?0:clamp((a.slipSpeed-2)/12,0,1);
  a.wheelSpeed=Math.max(0,speed*Math.cos(alpha)*(1+spin-brake));
 }
 return p;
}
export function axleSmoke(car,axle){return car.drift?.axles?.[axle]?.smoke||0;}
