import {DRIVE_PROFILES,drivetrainFor,driftWheelSteering} from './drivetrain.js';
import {driftCourse} from './ridge-terrain.js';
import {TYRE_TABLE} from './ridge-tyre-table.js';
import {CARS} from './fleet.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function tyreResponse(slip){const x=Math.min(64,Math.abs(slip)*128/Math.PI),i=Math.min(63,Math.floor(x));return Math.sign(slip)*(TYRE_TABLE[i]+(TYRE_TABLE[i+1]-TYRE_TABLE[i])*(x-i));}
const fits=new Map(CARS.map(f=>[f.id,{mass:clamp(f.length*f.width*180,650,2200),inertia:(f.length*f.length+f.width*f.width)/12,axle:f.wheelbase*.5,width:f.width,length:f.length}]));
export const ridgeFit=c=>fits.get(c.carId)||fits.values().next().value;
// Two loaded axles, rather than a spring snapping the nose back after an impact.
// Forces are mass-normalised; yaw acceleration = axle moment / (I / mass).
export function impactTyres(car,budget){
 const d=car.drift,fit=ridgeFit(car),speed=Math.hypot(car.speed,car.ridgeLateralSpeed||0),u=speed*Math.cos(d.angle),v=-speed*Math.sin(d.angle),w=d.angularVelocity;
 const profile=DRIVE_PROFILES[d.driveType||drivetrainFor(car,driftCourse().terrain)],steer=driftWheelSteering(car),den=Math.max(4,Math.abs(u));
 const front=-budget*(d.frontLoad||profile.frontLoad)*(d.frontGrip||1)*tyreResponse(Math.atan2(v+w*fit.axle,den)-steer),rear=-budget*(d.rearLoad||1-profile.frontLoad)*(d.rearGrip||1)*tyreResponse(Math.atan2(v-w*fit.axle,den));
 return {side:front+rear,yaw:(front-rear)*fit.axle/fit.inertia};
}
// The centre of gravity must remain over supported ground. Both sides use the
// same edge; footprint additionally reduces grip when outer tyres reach gravel.
export function shoulderGrip(car){const f=ridgeFit(car),yaw=car.ridgeYaw||0,edge=Math.abs((car.ridgeLane||0)+(car.ridgeSlide||0)),reach=Math.abs(Math.cos(yaw))*f.width*.42+Math.abs(Math.sin(yaw))*f.axle;return 1-.35*clamp((edge+reach-(driftCourse().width-.05))/.85,0,1);}
export const offRidge=car=>driftCourse().terrain!=='city'&&Math.abs((car.ridgeLane||0)+(car.ridgeSlide||0))>driftCourse().width+.65;
