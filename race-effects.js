import {drivenAxles} from './drivetrain.js';
import {VehicleEffects,tireSlip} from './vehicle-effects.js';
import * as T from 'three';
import {ParticleBatch,particleObject} from './particle-batch.js';
// Bounded pools keep exaggerated launch effects affordable on a portrait phone.
export class RaceEffects{
 constructor(scene,map,cfg={}){
  this.smoke=[];this.marks=[];this.flashes=[];this.streaks=[];
  this.density=.75;this.smokeBatch=new ParticleBatch(scene,150,'smoke',map,0xdfe4e5);this.markBatch=new ParticleBatch(scene,100,'skid',null,0x151916);
  for(let i=0;i<150;i++)this.smoke.push({m:particleObject(),life:0,max:1,vx:0,vy:0,spin:0});
  for(let i=0;i<100;i++){const m=particleObject();m.scale.set(.15,.55,1);this.marks.push({m,life:0});}
  this.vehicle=new VehicleEffects(scene,map,cfg);this.flashes=this.vehicle.flames;
  const lineGeo=new T.BoxGeometry(.025,.025,2.4),lineMat=new T.MeshBasicMaterial({color:0xf8ead1,transparent:true,opacity:0,depthWrite:false});
  this.streakMesh=new T.InstancedMesh(lineGeo,lineMat,18);this.streakMesh.frustumCulled=false;scene.add(this.streakMesh);for(let i=0;i<18;i++){const m=new T.Object3D();m.material=lineMat;m.position.set((i%2?-1:1)*(3.1+(i%3)*.5),.18+(i%4)*.35,-24+i*2.3);this.streaks.push(m);}
  this.reset();
 }
 dispose(){const gs=new Set(),ms=new Set();this.vehicle.dispose();this.smokeBatch.dispose();this.markBatch.dispose();this.streakMesh.dispose();for(const o of [this.streakMesh]){if(!o.isSprite)gs.add(o.geometry);ms.add(o.material);o.removeFromParent();}for(const g of gs)g.dispose();for(const m of ms)m.dispose();}
 setQuality(q){this.density=q.particles;this.vehicle.density=q.particles;}
 reset(){this.vehicle.reset();this.emit=[0,0,0,0];this.puffSide=0;this.markEmit=0;this.lastTravel=0;this.gear=[1,1];this.flash=[0,0];for(const p of [...this.smoke,...this.marks]){p.life=0;p.m.visible=false;}for(const m of this.flashes)m.visible=false;if(this.streaks.length)this.streaks[0].material.opacity=0;this.smokeBatch.sync(this.smoke);this.markBatch.sync(this.marks);}
 puff(model,side,drivenZ){const p=this.smoke.find(p=>p.life<=0);if(!p)return;p.max=p.life=1.05+Math.random()*.7;p.m.position.set(model.position.x+side*(model.userData.carWidth/2||.89),.16,model.position.z+drivenZ);p.m.scale.setScalar(.38);p.m.visible=true;p.vx=side*(.4+Math.random()*.7);p.vy=.5+Math.random()*.45;p.spin=(Math.random()-.5)*.8;p.m.material.rotation=Math.random()*6;}
 update(dt,player,rival,models,phase,reduced=false){
  const travel=player.travelDistance??player.distance,delta=Math.max(0,travel-this.lastTravel);this.lastTravel=travel;
  [player,rival].forEach((car,i)=>{
   const model=models[i];if(!model||!model.visible||car.ridge)return; // Ridge world owns all four drift contacts.
   const shares=drivenAxles(car),slip=tireSlip(car,phase);
   for(let axle=0;axle<2;axle++){const slot=i*2+axle,drivenZ=(axle?1:-1)*(model.userData.wheelbase/2||1.25)+(model.userData.axleOffset||0);
    if(slip>0&&shares[axle]>0){this.emit[slot]+=dt*(reduced?18:i===0?85:45)*this.density*(.35+slip)*shares[axle];while(this.emit[slot]>=1){this.puff(model,(this.puffSide++%2)?-1:1,drivenZ);this.emit[slot]--;}}
   }
  });
  if(!player.ridge&&tireSlip(player,phase)>0&&player.speed>1){this.markEmit+=dt*28;while(this.markEmit>=1){this.markEmit--;const shares=drivenAxles(player);for(let axle=0;axle<2;axle++)if(shares[axle]>0)for(const side of [-1,1]){const p=this.marks.find(p=>p.life<=0);if(!p)break;p.life=7;p.m.visible=true;p.m.position.set(models[0].position.x+side*(models[0].userData.carWidth/2||.89),.025,models[0].position.z+(axle?1:-1)*(models[0].userData.wheelbase/2||1.25)+(models[0].userData.axleOffset||0));p.m.material.opacity=.38;}}}
  for(const p of this.smoke){if(p.life<=0)continue;p.life-=dt;p.m.visible=p.life>0;if(!p.m.visible)continue;const age=1-p.life/p.max;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt*(.22+age*.65);p.m.position.z+=delta*.8+dt*.6;const size=.38+age*1.75;p.m.scale.set(size,size*.82,1);p.m.material.opacity=Math.min(1,age*8)*(1-age)*.78;p.m.material.rotation+=p.spin*dt;}
  for(const p of this.marks){if(p.life<=0)continue;p.life-=dt;p.m.visible=p.life>0;p.m.position.z+=delta;p.m.material.opacity=Math.min(.38,p.life*.11);}
  const strength=reduced?0:T.MathUtils.clamp((player.speed-20)/35,0,.32);this.streaks[0].material.opacity=strength;for(const [i,m] of this.streaks.entries()){m.position.z+=delta*1.4;if(m.position.z>18)m.position.z=-26;m.updateMatrix();this.streakMesh.setMatrixAt(i,m.matrix);}this.streakMesh.instanceMatrix.needsUpdate=true;
  this.smokeBatch.sync(this.smoke);this.markBatch.sync(this.marks);this.vehicle.update(dt,[player,rival],models,phase,delta,reduced);
 }
}
export function carPose(speed,acceleration,clock,kick=0,reduced=false){if(reduced)return {height:0,pitch:0,roll:0};return {height:Math.sin(clock*34)*.011*Math.min(speed/25,1),pitch:-T.MathUtils.clamp(acceleration,-8,8)*.0035+Math.sin(clock*32)*kick*.12,roll:Math.sin(clock*18)*.005*Math.min(speed/25,1)};}
