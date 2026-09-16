import {recoverSlowImpact} from './ridge-recovery.js';
import {updateDriftAxles} from './drivetrain.js';
import {tickParkingCourse} from './parking-course.js';
import {driftCourse} from './ridge-terrain.js';
import {impactTyres,shoulderGrip,offRidge} from './ridge-tyres.js';
import {ridgeConditions} from './ridge-route.js';
import {beginRidgeCrash} from './ridge-body.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
export const DRIFT_TARGET=1600;
export function driftState(car){return car.drift??={angle:0,angularVelocity:0,grip:1,lineTarget:0,steer:0,previousSteer:0,steerRate:0,mode:'grip',strongTime:0,recoveryTime:0,drifting:false,scoring:false,bankVelocity:0,score:0,pending:0,multiplier:1,chain:0,bestChain:0,lastSign:0,validTime:0,gap:0,metres:0,bestAngle:0,broken:false,feedback:'',feedbackTime:0};}
export function driftCue(car){
 const now=ridgeConditions(car),ahead=ridgeConditions(car,car.distance+Math.max(12,car.speed*.55));
 const bend=Math.abs(ahead.curvature)>.002?ahead:now;
 return {...bend,sign:Math.abs(bend.curvature)>.002?Math.sign(bend.curvature):0,now};
}
// Signed, absolute steering. No road-dependent direction or alternating input state.
export function setDriftSteer(car,value){if(!car?.ridge)return;const d=driftState(car);d.steer=car.finished||car.crashed||!Number.isFinite(Number(value))?0:clamp(Number(value),-1,1);car.handbrake=false;}
export const DRIFT_ENTER=.72,DRIFT_EXIT=.38;
export function driftSteerAngle(value){const v=clamp(Number(value)||0,-1,1),a=Math.abs(v);return a<DRIFT_EXIT?0:Math.sign(v)*(.20+Math.max(0,a-.50)*1.60);}
export function bankDrift(car){const d=driftState(car);if(d.pending>0){d.lastBank=Math.floor(d.pending);d.bankSerial=(d.bankSerial||0)+1;}d.score+=d.pending;d.pending=0;return Math.floor(d.score);}
export function breakChain(d){if(!d.broken&&(d.pending>0||d.chain)){d.feedback='СЕРИЯ СОРВАНА';d.feedbackTime=1.2;}d.pending=0;d.flowTime=0;d.multiplier=1;d.chain=0;d.lastSign=0;d.validTime=0;d.broken=true;}
// Assisted analog steering: forward progress follows the route, while lateral
// momentum and grip determine the actual line. Nose angle and travel direction differ.
export function tickDrift(car,dt){
 const d=driftState(car),cue=driftCue(car),c=cue.now,oldAngle=d.angle;
 const oldDistance=car.distance,oldTime=car.time;car.time+=dt;d.feedbackTime=Math.max(0,d.feedbackTime-dt);
 if(recoverSlowImpact(car,dt))return;
 const input=Math.abs(d.steer);
 d.contactTime=Math.max(0,(d.contactTime||0)-dt);d.impactTime=Math.max(0,(d.impactTime||0)-dt);const recovery=d.contactTime>0?.28:1,physical=d.impactTime>0||Math.abs(d.angle)>1.15;
 // Measure the gesture separately from its position. Moving slowly through the middle is steering.
 const previous=d.previousSteer??0,delta=d.steer-previous;d.previousSteer=d.steer;
 d.steerRate=mix(d.steerRate||0,delta/dt,18,dt);
 const flick=input>=.72&&d.steer*d.steerRate>0&&Math.abs(d.steerRate)>2.8;
 d.strongTime=input>DRIFT_ENTER?(d.strongTime||0)+dt:0;
 d.mode??=d.drifting?'slide':'grip';
 const opposite=d.steer*d.angle<-.025;
 if(car.speed>=12&&(flick||d.strongTime>.16)){
  d.mode='slide';d.recoveryTime=0;
 }else if(d.mode==='slide'&&(input<DRIFT_EXIT||car.speed<10||opposite&&input<.48)){
  d.mode='recover';d.recoveryTime=0;
 }
 if(d.mode==='recover')d.recoveryTime=(d.recoveryTime||0)+dt;
 const recovering=d.mode==='recover',sliding=d.mode==='slide';
 const driveProfile=updateDriftAxles(car,dt,driftCourse().terrain,undefined,c.curvature);
 // The rear tyres need time to grip again. Large slip and yaw rate delay that recovery.
 const slipLoad=Math.abs(d.angle)+Math.abs(d.angularVelocity)*.16;
 const gripTarget=sliding?(.24+d.rearGrip*.23):recovering?1-.40*smooth(.08,.75,slipLoad):1;
 d.grip=mix(d.grip,gripTarget,sliding?4:(opposite?1.65:.85)*driveProfile.gripReturn,dt);
 if(!physical){
  let torque;
  if(sliding){const target=driftSteerAngle(d.steer)*driveProfile.angle;const pull=driveProfile.front*d.frontGrip*(1-d.rearBrake)*driveProfile.align;torque=(target-d.angle)*(42+16*(1-driveProfile.front))-d.angularVelocity*(12+2*driveProfile.front)-Math.sin(d.angle)*pull;}
  else if(recovering){
   // Self-aligning tyre moment + the driver's countersteer; no prescribed return-to-zero animation.
   torque=-Math.sin(d.angle)*(2.2+d.grip*3.8+driveProfile.front*d.frontGrip*driveProfile.align)-d.angularVelocity*(1.7+d.grip*2+driveProfile.front*1.2)+d.steer*10*smooth(.06,.5,Math.abs(d.angle));
  }else torque=-d.angle*18-d.angularVelocity*9;
  const rolling=smooth(.3,7,car.speed);torque*=rolling;d.angularVelocity=clamp(d.angularVelocity+clamp(torque*recovery/(car.handling.inertia||1),-12,12)*dt,-4,4)*Math.exp(-dt*(1-rolling)*6);
 }
 // Finish recovery only after the yaw, its rate and tyre grip have actually settled.
 if(recovering&&Math.abs(d.angle)<.045&&Math.abs(d.angularVelocity)<.13&&d.grip>.86){d.mode='grip';d.recoveryTime=0;}
 d.drifting=d.mode!=='grip';
 d.angle+=d.angularVelocity*dt;car.handbrake=false;
 const angle=Math.abs(d.angle),aligned=d.angle*c.curvature>0;
 const control=aligned?smooth(.12,.4,angle)*(1-smooth(.78,1.18,angle)):0;
 const available=(c.available*(car.ridgeBattle?1.5:.82)+control*23)*(d.frontLoad*d.frontGrip+d.rearLoad*d.rearGrip)*shoulderGrip(car);
 const wanted=car.speed*car.speed*c.curvature,slide=car.ridgeSlide||0,lateral=car.ridgeLateralSpeed||0;
 // Releasing the thumb straightens along the current line instead of pulling to road centre.
 const exiting=d.mode==='recover',slidingNow=d.mode==='slide';
 const residual=exiting?Math.sin(d.angle)*car.speed*.14:0;
 // Small steering commands lateral velocity everywhere: returning to neutral never selects lane zero.
 // During a slide the rear slip absorbs most of the steering; excessive lock still pushes outward.
 const steeringVelocity=(slidingNow?(car.ridgeBattle?d.steer*1.66:d.steer*1.9-Math.sin(d.angle)*2.5/driveProfile.angle)+Math.sign(d.steer)*smooth(.76,1,input)*4.5:d.steer*(car.ridgeBattle?4.8:3.8))+residual;
 const targetVelocity=steeringVelocity*clamp(car.speed/12,0,1);
 d.lineTarget=slide+targetVelocity*.3;
 let force=clamp(wanted+(targetVelocity-lateral)*(d.contactTime>0?1.25:exiting?(car.ridgeBattle?1.6:1)+d.grip:car.ridgeBattle?5:4.5),-available,available);
 let longitudinal=0;
 if(physical){const tyre=impactTyres(car,Math.min(available,10)),yaw=d.angle+Math.atan2(lateral,Math.max(1,car.speed));force=tyre.side*Math.cos(yaw);longitudinal=-tyre.side*Math.sin(yaw);d.angularVelocity+=tyre.yaw*dt;}
 const overRotation=(physical?0:1)*Math.max(0,angle-.90)*25*clamp(car.speed/15,0,1);
 car.ridgeLateralSpeed=lateral+(force-wanted+Math.sign(d.angle)*overRotation+(c.wind-.65*driftCourse().wind)*.32*clamp(car.speed/12,0,1))*dt;
 if(physical){const before=Math.atan2(lateral,Math.max(1,car.speed)),after=Math.atan2(car.ridgeLateralSpeed,Math.max(1,car.speed+longitudinal*dt));d.angle-=after-before;}
 d.angle=Math.atan2(Math.sin(d.angle),Math.cos(d.angle));car.ridgeSlide=slide+car.ridgeLateralSpeed*dt;
 car.ridgeYaw=d.angle+Math.atan2(car.ridgeLateralSpeed,Math.max(6,car.speed));car.ridgeYawRate=c.curvature*car.speed+(physical?d.angularVelocity:Math.atan2(Math.sin(d.angle-oldAngle),Math.cos(d.angle-oldAngle))/dt);
 const bankTarget=clamp(force*.006,-.13,.13),bank=car.ridgeBank||0;
 d.bankVelocity+=((bankTarget-bank)*64-d.bankVelocity*12)*dt;car.ridgeBank=bank+d.bankVelocity*dt;
 car.skid=clamp(angle*.95+Math.abs(car.ridgeLateralSpeed)*.15,0,1);
 const top=Math.min(43+Math.min(12,car.levels[0])*.25,car.handling.gears.at(-1)/3.6*(1+Math.min(12,car.levels[0])*.012)),accel=(car.handling.accel*.9+1.2)*(1+Math.min(12,car.levels[0])*.018);
 // Lateral tyre scrub costs momentum; automatic throttle cannot erase a deep slide.
 const slip=Math.sin(Math.min(1.4,angle))**2;
 const scrub=slip*(2.2+car.speed*.30)*driveProfile.scrub+(d.rearBrake||0)*(1.1+car.speed*.035),drive=accel*(1-(car.speed/top)**2)*(1-slip*.65)*d.throttle;
 const thrust=drive*(physical?Math.max(0,Math.cos(car.ridgeYaw)):1)-.25-scrub+longitudinal+(car.ridgeBattle?(car.battle?.paceAccel||0)*(1-slip*.85):0);
 car.speed=clamp(car.speed+thrust*dt,0,top*(car.battle?.bot?1.08:1));car.heat=0;car.boost=0;car.shiftPause=0;
 // Automatic transmission is presentation only in this mode; manual shift is disabled.
 const box=car.gears||car.handling.gears;
 let gear=car.gear;if(gear<car.maxGear&&car.speed>box[gear-1]/3.6*.86)gear++;else if(gear>1&&car.speed<box[gear-2]/3.6*.66)gear--;
 car.gear=gear;const limit=box[gear-1]/3.6;car.rpm=clamp(1000+car.speed/limit*(car.redline-1000),1000,car.redline-150);
 const edge=Math.abs((car.ridgeLane??0)+car.ridgeSlide),valid=d.drifting&&aligned&&Math.abs(c.curvature)>.002&&angle>=.22&&angle<=.87&&car.speed>12&&edge<(driftCourse().guideWidth||driftCourse().width)-.75;
 d.scoring=valid;if(driftCourse().terrain==='city')tickParkingCourse(car,dt,valid);
 if(angle>1.03||edge>(driftCourse().guideWidth||driftCourse().width)-.45||(car.speed<7&&car.time>5))breakChain(d);
 if(valid){
  d.broken=false;d.gap=0;d.validTime+=dt;d.flowTime=(d.flowTime||0)+dt;const sign=Math.sign(d.angle);
  if(d.validTime>.35&&sign!==d.lastSign){d.chain++;d.lastSign=sign;d.multiplier=Math.min(4,1+(d.chain-1)*.5);d.bestChain=Math.max(d.bestChain,d.chain);d.feedback=d.chain>1?'ПЕРЕКЛАДКА ×'+d.multiplier:'ЧИСТЫЙ ДРИФТ';d.feedbackTime=1.1;}
  d.multiplier=Math.min(4,1+Math.max(Math.floor((d.flowTime||0)/2),d.chain-1)*.5);
  const quality=.65+.35*(1-clamp(Math.abs(angle-.52)/.35,0,1));d.pending+=car.speed*dt*3.5*quality*d.multiplier;d.metres+=car.speed*dt;d.bestAngle=Math.max(d.bestAngle,angle*180/Math.PI);
 }else{d.validTime=0;d.gap+=dt;if(d.gap>1.65){bankDrift(car);d.flowTime=0;d.chain=0;d.multiplier=1;d.lastSign=0;}}
 if(offRidge(car)){breakChain(d);beginRidgeCrash(car);return;}
 car.distance+=car.speed*dt;car.travelDistance=car.distance;
 if(car.distance>=car.raceDistance){car.finished=true;car.finishTime=oldTime+(car.raceDistance-oldDistance)/(car.distance-oldDistance)*dt;car.distance=car.raceDistance;car.handbrake=false;d.steer=0;bankDrift(car);}
}
// Test/reference driver uses the same signed axis available to the player.
export function driftAutoSteer(car){const cue=driftCue(car);if(car.speed<12||!cue.sign)return 0;return cue.sign*.76;}

// The finish freezes the score/time, never the physical body or its world position.
export function coastBattleCar(car,dt){
 const d=driftState(car),v=car.speed;d.impactTime=Math.max(0,(d.impactTime||0)-dt);d.contactTime=Math.max(0,(d.contactTime||0)-dt);
 d.angularVelocity+=(d.impactTime>0||Math.abs(d.angle)>1.15?impactTyres(car,8).yaw:-d.angle*9*smooth(.3,7,v)-d.angularVelocity*5)*dt;d.angle+=d.angularVelocity*dt;
 car.speed=Math.max(0,v*Math.exp(-.25*dt)-.38*dt);car.travelDistance=(car.travelDistance??car.distance)+(v+car.speed)*.5*dt;
 car.ridgeSlide=(car.ridgeSlide||0)+(car.ridgeLateralSpeed||0)*dt;car.ridgeLateralSpeed=(car.ridgeLateralSpeed||0)*Math.exp(-(d.contactTime>0?.8:2.2)*dt);
 car.ridgeYaw=d.angle+Math.atan2(car.ridgeLateralSpeed,Math.max(6,car.speed));d.bankVelocity+=(-(car.ridgeBank||0)*42-d.bankVelocity*9)*dt;car.ridgeBank=(car.ridgeBank||0)+d.bankVelocity*dt;car.rpm=Math.max(950,car.rpm*Math.exp(-.66*dt));
}
