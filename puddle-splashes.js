import * as T from 'three';
import {ParticleBatch,particleObject} from './particle-batch.js';

// Shared budget for BOTH cars: 48 drops + 8 mist ribbons + 4 entry sheets.
export const WATER_FX={drops:48,mist:8,sheets:4};
export function splashForce(speed,depth){return T.MathUtils.smoothstep(speed,0,30)*Math.max(0,Math.min(1,depth));}
export class PuddleSplashes{
 constructor(scene,water){
  this.water=water;this.density=.7;this.reduced=false;
  const pool=n=>Array.from({length:n},()=>({o:particleObject(),life:0,v:new T.Vector3()}));
  this.drops=pool(WATER_FX.drops);this.fans=pool(WATER_FX.mist);this.sheets=pool(WATER_FX.sheets);
  const warm=water?.cfg?.look==='sunset'||(!water?.cfg?.look&&water?.cfg?.id==='factory'),night=water?.cfg?.night;
  this.dropBatch=new ParticleBatch(scene,WATER_FX.drops,'spray',null,night?0x71828c:warm?0xb09a72:0x879ca6);
  this.fanBatch=new ParticleBatch(scene,WATER_FX.mist,'mist',null,night?0x80919c:warm?0xbcb4a0:0xa7b8c0);
  this.sheetBatch=new ParticleBatch(scene,WATER_FX.sheets,'waterfan',null,night?0x71818a:warm?0xa99576:0x8b9ba2);
  this.cooldown=new Float32Array(8);this.inside=new Float32Array(8);this.previousZ=[null,null];this.bursts=0;this.lensCooldown=0;this.sync();
 }
 free(pool,car){return pool.find((p,i)=>i%2===car&&p.life<=0);}
 burst(x,z,side,speed,depth,front=false,entry=false,car=0){
  this.bursts++;this.water?.disturb?.(x,z,speed,depth);const force=splashForce(speed,depth);
  const fan=!front&&speed>4?this.free(this.fans,car):null;
  if(fan){Object.assign(fan,{life:.35+force*.4,total:.35+force*.4,x,z,side,force,speed});fan.o.visible=true;fan.o.material.rotation=side*.22;}
  if(front&&entry&&speed>4&&depth>.1){const sheet=this.free(this.sheets,car);if(sheet){Object.assign(sheet,{life:.24,total:.24,x,z,side,force,speed});sheet.o.visible=true;sheet.o.material.rotation=side*.4;}}
  const count=Math.ceil((1+force*(front?3:10))*this.density*(this.reduced?.5:1));
  for(let i=0;i<count;i++){
   const p=this.free(this.drops,car);if(!p)break;
   p.life=p.total=.18+Math.random()*.25;p.o.visible=true;p.o.position.set(x,.08,z);
   p.v.set(side*(.3+Math.random()*1.8)*(.3+force),(.25+Math.random()*1.6)*(.4+force),-speed*(.65+Math.random()*.2));
   p.size=.7+Math.random()*.65;p.o.material.rotation=-side*(.4+Math.random()*.6);
  }

 }
 update(dt,cars,models,delta){
  if(dt<=0)return;this.lensCooldown=Math.max(0,this.lensCooldown-dt);
  // Teleports/restarts must not sweep the whole route or leave a stationary spray cloud.
  if(delta>Math.max(8,(cars[0]?.speed||0)*dt*3)){this.reset();delta=0;}
  for(let i=0;i<8;i++)this.cooldown[i]=Math.max(0,this.cooldown[i]-dt);
  for(let c=0;c<2;c++){
   const model=models[c],car=cars[c];if(!model||!car||!model.visible){this.previousZ[c]=null;continue;}
   const width=(model.userData.carWidth||1.7)*.48,base=(model.userData.wheelbase||2.5)*.5,offset=model.userData.axleOffset||0;
   const sweep=this.previousZ[c]===null?0:delta+this.previousZ[c]-model.position.z;this.previousZ[c]=model.position.z;
   for(let axle=0;axle<2;axle++)for(let s=0;s<2;s++){
    const front=axle===0,side=s?1:-1,index=c*4+axle*2+s,x=model.position.x+side*width,z=model.position.z+offset+(front?-base:base);
    const depth=this.water?.sample(x,z,z+sweep)||0,previous=this.inside[index],entry=depth>.12&&previous<=.12;this.inside[index]=depth;
    if(c===0&&front&&depth>.55&&previous<=.55&&car.speed>17&&!this.reduced&&this.lensCooldown===0&&this.water){this.water.lensSplash=.22;this.lensCooldown=8;}
    if(car.speed<.4||depth<=.025||this.cooldown[index]>0||front&&!entry)continue;
    this.burst(x,z,side,car.speed,depth,front,entry,c);this.cooldown[index]=front?.25:this.reduced?.24:.12;
   }
  }
  for(const p of this.drops){
   if(p.life<=0)continue;p.life-=dt;p.o.position.z+=delta;p.o.position.addScaledVector(p.v,dt);p.v.y-=dt*9.81;
   p.o.visible=p.life>0&&p.o.position.y>.025;if(!p.o.visible){p.life=0;continue;}
   const t=1-p.life/p.total;p.o.scale.set(.020*p.size,(.045+Math.min(.08,p.v.length()*.003))*p.size,1);p.o.material.opacity=(1-t)*.60;
  }
  for(const p of this.fans){
   if(p.life<=0)continue;p.life-=dt;p.z+=delta-p.speed*.68*dt;p.o.visible=p.life>0;if(!p.o.visible)continue;
   const t=1-p.life/p.total,width=(.25+t*(.8+p.speed*.035))*(.5+p.force),height=.10+t*.30;
   p.o.position.set(p.x+p.side*t*.35,.06+height*.45,p.z);p.o.scale.set(width,height,1);
   p.o.material.opacity=Math.sin(Math.PI*t)*(.035+p.force*.12)*(this.reduced?.5:1);
  }
  for(const p of this.sheets){
   if(p.life<=0)continue;p.life-=dt;p.z+=delta-p.speed*.8*dt;p.o.visible=p.life>0;if(!p.o.visible)continue;
   const t=1-p.life/p.total,height=(.2+p.force*.3)*Math.sin(Math.PI*t),width=.25+t*(.35+p.force*.55);
   p.o.position.set(p.x+p.side*width*.45,.03+height*.5,p.z);p.o.scale.set(width,height,1);p.o.material.opacity=(1-t)*(.10+p.force*.12);
  }
  this.sync();
 }
 sync(){for(const [batch,pool] of [[this.dropBatch,this.drops],[this.fanBatch,this.fans],[this.sheetBatch,this.sheets]]){batch.sync(pool);batch.mesh.visible=pool.some(p=>p.o.visible);}}
 reset(){this.cooldown.fill(0);this.inside.fill(0);this.previousZ=[null,null];this.bursts=0;this.lensCooldown=0;for(const pool of [this.drops,this.fans,this.sheets])for(const p of pool){p.life=0;p.o.visible=false;}this.sync();}
 dispose(){this.dropBatch.dispose();this.fanBatch.dispose();this.sheetBatch.dispose();}
}
