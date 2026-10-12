import {ridgeFit} from './ridge-tyres.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),wrap=x=>Math.atan2(Math.sin(x),Math.cos(x));
// Below tyre-slip speeds use a rolling bicycle manoeuvre. Steering has no authority
// at rest; a car facing backwards first rolls backwards, instead of pivoting on its CG.
export function recoverSlowImpact(car,dt){
 const d=car.drift;
 if(!d.recoveryMotion){if(car.speed>=7||Math.abs(car.ridgeYaw??d.angle)<.75||(!(d.impactTime>0)&&Math.abs(d.angle)<1.15))return false;
  const yaw=car.ridgeYaw??d.angle,n=d.obstacleNormal,escape=car.time-(d.obstacleAt??-10)<2&&n&&Math.sin(yaw)*n[0]+Math.cos(yaw)*n[1]>.3;d.recoveryMotion={yaw,v:Math.cos(yaw)<0?-Math.min(2,car.speed):Math.min(2,car.speed),escape:!!escape,backed:0};d.mode='recover';d.pending=0;d.chain=0;d.multiplier=1;d.scoring=false;
 }
 const m=d.recoveryMotion,fit=ridgeFit(car),reverse=Math.cos(m.yaw)<-.2||m.escape,desired=reverse?-2.2:3.8;
 // Brake through zero before changing direction. No position correction or angle animation.
 m.v+=clamp(desired-m.v,-2.8*dt,1.8*dt);if(m.v<0)m.backed-=m.v*dt;if(m.backed>4||Math.abs(m.yaw)<.55)m.escape=false;
 const lock=clamp(-m.yaw*1.25*Math.sign(m.v||1)+d.steer*.22,-.58,.58),rate=m.v*Math.tan(lock)/(fit.axle*2);
 const gripRate=Math.abs(m.v)*.45;
 d.angularVelocity+=(rate-d.angularVelocity)*(1-Math.exp(-dt*7));d.angularVelocity=clamp(d.angularVelocity,-gripRate,gripRate);
 const before=m.yaw;m.yaw=wrap(m.yaw+d.angularVelocity*dt);
 const forward=m.v*Math.cos(m.yaw),side=m.v*Math.sin(m.yaw);
 car.distance+=forward*dt;car.travelDistance=car.distance;car.ridgeSlide=(car.ridgeSlide||0)+side*dt;car.ridgeLateralSpeed=side;
 car.speed=Math.abs(m.v);car.ridgeYaw=m.yaw;car.ridgeYawRate=wrap(m.yaw-before)/dt;car.ridgeBank=(car.ridgeBank||0)*Math.exp(-dt*4);
 d.angle=m.yaw;d.grip=Math.min(1,d.grip+dt);d.drifting=false;d.rearBrake=0;d.axles?.forEach(a=>{a.smoke=0;a.mark=0;a.wheelSpeed=m.v;});car.gear=1;car.rpm=1100+Math.abs(m.v)*180;
 if(Math.abs(m.yaw)<.17&&m.v>1){d.recoveryMotion=null;d.impactTime=0;d.mode='recover';d.angle=m.yaw-Math.atan2(side,Math.max(.1,forward));car.speed=forward;d.angularVelocity*=.4;}
 return true;
}

export const roadForwardSpeed=car=>car.drift?.recoveryMotion?car.drift.recoveryMotion.v*Math.cos(car.drift.recoveryMotion.yaw):car.speed;
export function applyRoadImpulse(car,forward,side){
 const d=car.drift,m=d.recoveryMotion,bearing=Math.atan2(car.ridgeLateralSpeed||0,Math.max(1,car.speed)),v=roadForwardSpeed(car)+forward;
 car.ridgeLateralSpeed=(car.ridgeLateralSpeed||0)+side;
 if(m){m.v=v*Math.cos(m.yaw)+car.ridgeLateralSpeed*Math.sin(m.yaw);car.speed=Math.abs(m.v);}
 else{car.speed=Math.max(0,v);d.angle+=bearing-Math.atan2(car.ridgeLateralSpeed,Math.max(1,car.speed));}
}
