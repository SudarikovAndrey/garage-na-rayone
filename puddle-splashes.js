import * as T from 'three';
import {ParticleBatch,particleObject} from './particle-batch.js';

export class PuddleSplashes{
 constructor(scene,water){
  this.water=water;this.density=.7;this.reduced=false;
  this.drops=Array.from({length:384},()=>({o:particleObject(),life:0,v:new T.Vector3()}));
  this.fans=Array.from({length:48},()=>({o:particleObject(),life:0}));
  this.dropBatch=new ParticleBatch(scene,384,'spray',null,0xc2dce8);
  this.fanBatch=new ParticleBatch(scene,48,'mist',null,0xb3ccda);
  this.cooldown=new Float32Array(8);this.previousZ=[null,null];this.bursts=0;
 }
 burst(x,z,side,speed,depth){
  this.bursts++;this.water?.disturb?.(x,z,speed,depth);const force=Math.min(1,speed/35)*(.45+.55*depth);
  const fan=this.fans.find(p=>p.life<=0);
  if(fan){Object.assign(fan,{life:.6,total:.6,x,z,side,force});fan.o.visible=true;fan.o.material.rotation=side*.18;}
  const count=Math.ceil((12+force*20)*this.density*(this.reduced?.5:1));
  for(let i=0;i<count;i++){
   const p=this.drops.find(p=>p.life<=0);if(!p)break;
   p.life=p.total=.25+Math.random()*.4;p.o.visible=true;p.o.position.set(x,.10,z);
   const direction=i%5===0?-side:side;
   p.v.set(direction*(1.4+Math.random()*3.2)*(.4+force),(.35+Math.random()*1.8)*(.5+force),-speed*(.2+Math.random()*.35));
   p.size=.7+Math.random()*.65;p.o.material.rotation=-direction*(.4+Math.random()*.6);
  }
 }
 update(dt,cars,models,delta){
  for(let i=0;i<8;i++)this.cooldown[i]=Math.max(0,this.cooldown[i]-dt);
  for(let c=0;c<2;c++){
   const model=models[c],car=cars[c];if(!model||!car){this.previousZ[c]=null;continue;}
   const width=(model.userData.carWidth||1.7)*.48,base=(model.userData.wheelbase||2.5)*.5,offset=model.userData.axleOffset||0;
   const sweep=this.previousZ[c]===null?0:delta+this.previousZ[c]-model.position.z;
   this.previousZ[c]=model.position.z;
   if(car.speed<4)continue;
   for(let axle=0;axle<2;axle++)for(let s=0;s<2;s++){
    const side=s?1:-1,index=c*4+axle*2+s,x=model.position.x+side*width,z=model.position.z+offset+(axle?base:-base);
    const depth=this.water?.sample(x,z,z+sweep)||0;
    if(depth>.025&&this.cooldown[index]<=0){this.burst(x,z,side,car.speed,depth);this.cooldown[index]=this.reduced?.16:.065;}
   }
  }
  for(const p of this.drops){
   if(p.life<=0)continue;p.life-=dt;p.o.position.z+=delta;p.o.position.addScaledVector(p.v,dt);p.v.y-=dt*9.81;p.v.x*=Math.exp(-dt*1.4);p.v.z*=Math.exp(-dt*1.4);
   p.o.visible=p.life>0&&p.o.position.y>.025;if(!p.o.visible){p.life=0;continue;}
   const t=1-p.life/p.total;p.o.scale.set(.012*p.size,(.03+Math.min(.065,p.v.length()*.003))*p.size,1);p.o.material.opacity=(1-t)*.65;
  }
  for(const p of this.fans){
   if(p.life<=0)continue;p.life-=dt;p.z+=delta;p.o.visible=p.life>0;if(!p.o.visible)continue;
   const t=1-p.life/p.total,width=(.45+t*1.9)*(.6+p.force),height=(.15+t*.5)*(.5+p.force);
   p.o.position.set(p.x+p.side*width*.40,.035+height*.45,p.z+t*.25);p.o.scale.set(width,height,1);
   p.o.material.opacity=Math.sin(Math.PI*t)*.075*(this.reduced?.5:1);
  }
  this.dropBatch.sync(this.drops);this.fanBatch.sync(this.fans);
 }
 reset(){this.cooldown.fill(0);this.previousZ=[null,null];this.bursts=0;for(const p of [...this.drops,...this.fans]){p.life=0;p.o.visible=false;}this.dropBatch.sync(this.drops);this.fanBatch.sync(this.fans);}
 dispose(){this.dropBatch.dispose();this.fanBatch.dispose();}
}
