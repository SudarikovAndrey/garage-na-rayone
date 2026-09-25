// Local part pivot is shared by inspection camera and the surface highlight.
import {powertrainLayout} from './powertrain-layout.js';
export function garagePartTarget(car,slot,anchorYaw=0){
 const rotation=Math.PI-.08,side=Math.cos(.68-anchorYaw-rotation)>=0?1:-1,axle=-car.wheelbase*.5+(car.axleOffset||0);
 const layout=powertrainLayout(car),engine=layout.engine,clutch=layout.clutch;
 const profiles={
  engine:[engine.x,engine.y,engine.z,1.12,6.0,layout.rear?1:-1,side*.65,.70,.5,.65],
  gearbox:[clutch.x,clutch.y,clutch.z,.88,4.6,layout.transverse?-.3:layout.rear?-1:1,layout.transverse?-1:side*.6,.5,.43,.45],
  tires:[axle,car.radius,side*(car.width*.5-.04),car.radius*2.65,3.1,-.18,side,car.radius*1.2,car.radius*1.2,.23],
  rims:[axle,car.radius,side*(car.width*.5+.025),car.radius*2.55,2.7,-.16,side,car.radius*1.12,car.radius*1.12,.23],
  fenders:[axle,car.radius*1.6,side*car.width*.5,car.radius*3.2,4.2,-.4,side,car.radius*1.5,car.radius*1.4,.30],
  skirts:[car.axleOffset||0,car.radius,side*car.width*.5,car.wheelbase*.61,3.3,-.3,side,car.wheelbase*.52,.19,.24],
  spoiler:[car.spoilerX??car.length*.4,car.spoilerY??car.height*.8,0,Math.max(1.2,car.width*.78),5.3,.8,side,.55,.75,car.width*.7],
  bumpers:[-car.length*.5+.09,car.radius+.12,0,car.width*1.18,3.5,-1,side*.55,.55,.30,car.width*.65],
 };
 
 const p=profiles[slot];if(!p)return null;
 const [x,y,z,span,rise,viewX,viewZ,rx,ry,rz]=p;return {x,y,z,span,rise,viewX,viewZ,rx,ry,rz,side};
}
export function garageFocus(car,slot,yaw=0,anchorYaw=yaw){
 const base={x:0,z:0,height:Math.max(.9,car.height*.6),elevation:8,zoom:1,yaw};
 const p=garagePartTarget(car,slot,anchorYaw);if(!p)return base;
 const rotation=Math.PI-.08,c=Math.cos(rotation),s=Math.sin(rotation);
 const angle=Math.atan2(p.viewX*c+p.viewZ*s,-p.viewX*s+p.viewZ*c),raw=.68-angle;
 const inspectYaw=anchorYaw+Math.atan2(Math.sin(raw-anchorYaw),Math.cos(raw-anchorYaw));
 return {x:p.x*c+p.z*s,z:-p.x*s+p.z*c+.4,height:p.y,elevation:p.y+p.rise,zoom:p.span/Math.max(2.55,car.length*.69),yaw:inspectYaw+yaw-anchorYaw};
}
