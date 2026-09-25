import * as T from 'three';
import {axleSmoke} from './drivetrain.js';
import {ParticleBatch,particleObject} from './particle-batch.js';
export function tireSlip(car,phase){if(car.ridge){if(phase!=='running'||car.crashed||car.finished||car.speed<6||car.drift?.mode==='grip')return 0;return Math.max(axleSmoke(car,0),axleSmoke(car,1));}return phase==='running'&&car.speed>0&&car.speed<19?Math.max(0,1-car.time/2.8)*Math.min(1,.7+(car.launchBoost||0)*.2):0;}
export function exhaustPower(car){return T.MathUtils.clamp((car.levels[0]-1.5)/6,0,1);}
// All offsets use the same dimensions as the authored fleet, facing down -Z in races.
export function vehicleAnchors(model){const u=model.userData,w=u.carWidth||1.7,l=u.carLength||4.1;return {pipeX:-w*.315,pipeY:(u.wheelRadius||.335)>.36?.34:.24,rear:l/2+.177,front:-l/2-.035,lampX:w*.36,lampY:u.lampY??((u.wheelRadius||.335)>.36?.84:.66),tailY:u.tailY??.68};}
export class VehicleEffects{
 constructor(scene,map,cfg={}){
  this.cfg=cfg;this.density=.75;this.time=0;
  this.exhaust=Array.from({length:36},()=>({m:particleObject(),life:0,max:1}));
  this.flames=Array.from({length:2},()=>particleObject());this.flameItems=this.flames.map(m=>({m}));this.front=Array.from({length:4},()=>({m:particleObject()}));this.rear=Array.from({length:4},()=>({m:particleObject()}));
  this.exhaustBatch=new ParticleBatch(scene,36,'smoke',map,0xaeb6bd);
  this.flameBatch=new ParticleBatch(scene,2,'flame',null,0xff922e);
  this.frontBatch=new ParticleBatch(scene,4,'trail',null,0xffe3ac);this.rearBatch=new ParticleBatch(scene,4,'trail',null,0xff2010);
  this.reset();
 }
 reset(){this.emit=[0,0];this.gears=[1,1];this.flash=[0,0];for(const p of this.exhaust){p.life=0;p.m.visible=false;}for(const f of this.flames)f.visible=false;for(const p of [...this.front,...this.rear])p.m.visible=false;this.sync();}
 sync(){this.exhaustBatch.sync(this.exhaust);this.flameBatch.sync(this.flameItems);this.frontBatch.sync(this.front);this.rearBatch.sync(this.rear);}
 update(dt,cars,models,phase,delta,reduced){this.time+=dt;
  cars.forEach((car,i)=>{const model=models[i];if(!model)return;const a=vehicleAnchors(model),running=phase==='running',powered=exhaustPower(car);
   if(running&&car.gear>this.gears[i])this.flash[i]=powered>0?.18+powered*.12:0;this.gears[i]=car.gear;
   this.flash[i]=Math.max(0,this.flash[i]-dt);const flame=this.flames[i];
   // Нитро жжёт ровным длинным факелом, пока держат кнопку; обычный хлопок на переключении — короткая вспышка.
   const live=running&&!car.finished;/* после финиша машина катится накатом — трубе гореть нечем */const nitro=live?Math.max(0,Math.min(1,car.nitroFlame||0)):0,pulse=live?Math.max(nitro,this.flash[i]/(.18+powered*.12)):0;
   flame.visible=pulse>0&&!reduced;const length=(.65+powered*1.05+nitro*1.5)*Math.sqrt(pulse)*(1+Math.sin(this.time*93)*(nitro?.06:.12));
   flame.position.set(model.position.x+a.pipeX,a.pipeY,model.position.z+a.rear+length*.5);flame.scale.set(.22+powered*.2+nitro*.16,length,1);
   flame.material.opacity=Math.min(1,pulse*3);flame.material.rotation=0;
   if(flame.material.color)flame.material.color.setRGB(1,nitro?.72-nitro*.3:.62,nitro?.55+nitro*.45:.25);
   for(const m of model.userData.tailMaterials||[])m.emissiveIntensity=car.finished?1.9:this.cfg.night?.85:.18;
   if(['ready','countdown','launch','running','coasting'].includes(phase)){this.emit[i]+=dt*(12+car.rpm/700)*(reduced?.4:1)*this.density;while(this.emit[i]>=1){this.emit[i]--;const p=this.exhaust.find(p=>p.life<=0);if(!p)break;p.life=p.max=.45+Math.random()*.4;p.m.visible=true;p.m.position.set(model.position.x+a.pipeX,a.pipeY,model.position.z+a.rear+.07);p.m.material.rotation=Math.random()*6;}}
   const strength=reduced?0:T.MathUtils.clamp((car.speed-5)/22,0,1),night=this.cfg.night?1:this.cfg.wet?.6:.32;
   for(let j=0;j<2;j++){const side=j?1:-1,f=this.front[i*2+j].m,r=this.rear[i*2+j].m,tailLength=.15+strength*1.4;
    f.visible=r.visible=car.speed>.5;f.position.set(model.position.x+side*a.lampX,a.lampY,model.position.z+a.front+tailLength*.5);r.position.set(model.position.x+side*a.lampX,a.tailY,model.position.z+a.rear-.14+tailLength*.5);
    f.scale.set(.13,tailLength,1);r.scale.set(.17,tailLength,1);f.material.opacity=strength*night*.7;r.material.opacity=strength*night*(car.finished?1:.7);f.material.rotation=r.material.rotation=0;
   }
  });
  for(const p of this.exhaust){if(p.life<=0)continue;p.life-=dt;p.m.visible=p.life>0;const age=1-p.life/p.max;p.m.position.z+=delta*.85+dt*1.1;p.m.position.y+=dt*.28;p.m.scale.setScalar(.16+age*.65);p.m.material.opacity=(1-age)*.22;p.m.material.rotation+=dt*.4;}
  this.sync();
 }
 dispose(){for(const b of [this.exhaustBatch,this.flameBatch,this.frontBatch,this.rearBatch])b.dispose();}
}
