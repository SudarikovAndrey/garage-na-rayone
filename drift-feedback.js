import {driftWheelSteering} from './drivetrain.js';
import * as T from 'three';
import {ParticleBatch,particleObject} from './particle-batch.js';
// Cars face local -X. Positive local Y counters a positive (rightward) body slip.
// Follow actual slip through release/reversal, not the requested thumb direction.
export const frontWheelSteer=car=>-driftWheelSteering(car)||0;
// Suspend the shell, kit and underbody around the roll centre. Wheel contact patches
// and the ground shadow stay in the chassis frame, including aftermarket wheels.
export function leanDriftBody(model,angle){
 let body=model.userData.driftBody;
 if(!body){const car=model.children[0];if(!car)return;body=new T.Group();body.name='SuspendedBody';body.position.y=.35;
  for(const child of [...car.children])if(!/^Wheel_[FR][LR]$/.test(child.name)&&child.name!=='ContactShadow'){body.add(child);child.position.y-=.35;}
  car.add(body);model.userData.driftBody=body;
 }
 body.rotation.x=angle;
}
// Connect successive actual wheel contacts, not stamps aligned to the road.
// Distance sampling keeps continuous lines at both 30 and 120 Hz; one bounded draw.
export class DriftTrails{
 constructor(scene){this.batch=new ParticleBatch(scene,384,'skid',null,0x020403);this.pool=Array.from({length:384},()=>({o:particleObject(),life:0}));this.previous=[null,null,null,null];this.cursor=0;this.haze=0;this.hazeCursor=0;}
 contact(side,x,z,strength){const previous=this.previous[side];if(!previous){this.previous[side]={x,z};return;}
  const dx=x-previous.x,dz=z-previous.z,length=Math.hypot(dx,dz);if(length<.4)return;
  if(length<5){const p=this.pool[this.cursor++%this.pool.length];p.life=6;p.age=0;p.strength=strength;p.o.visible=true;p.o.position.set((x+previous.x)*.5,.009,(z+previous.z)*.5);p.o.scale.set(.22,length+.055,1);p.o.material.rotation=Math.atan2(dx,dz);}
  this.previous[side]={x,z};
 }
 release(){this.previous=[null,null,null,null];}
 update(dt,emitHaze,reduced=false){for(const p of this.pool){p.life=Math.max(0,p.life-dt);p.age=(p.age||0)+dt;p.o.visible=p.life>0;p.o.material.opacity=Math.min(1,p.life/1.5)*(p.strength||0)*.85;}
  if(emitHaze){this.haze+=dt*(reduced?5:22);while(this.haze>=1){this.haze--;for(let n=0;n<this.pool.length;n++){const p=this.pool[this.hazeCursor++%this.pool.length];if(p.life>0&&p.age>.12&&p.age<1.9){emitHaze(p.o.position.x,p.o.position.z,p.strength,true);break;}}}}
  this.batch.sync(this.pool);
 }
 dispose(){this.batch.dispose();}
}
