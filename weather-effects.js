import {PuddleSplashes} from './puddle-splashes.js';
import * as T from 'three';
import {ParticleBatch,particleObject} from './particle-batch.js';
export class WeatherEffects{
 constructor(scene,cfg,reduced=false,smokeMap=null){
  Object.assign(this,{scene,cfg,reduced,time:0,travel:0,flash:0,nextFlash:5,splashes:[],glows:[],lamps:[],beams:[],resources:[],density:.7});if(!cfg.wet)return;this.water=scene.userData.wetRoad;this.puddleFx=new PuddleSplashes(scene,this.water);this.puddleFx.reduced=reduced;
  const count=cfg.night?1500:700;this.drops=Array.from({length:count},()=>({x:(Math.random()-.5)*34,y:Math.random()*18,z:Math.random()*62-36}));
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(count*6),3).setUsage(T.DynamicDrawUsage));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{night:{value:cfg.night?1:0},lamps:{value:[new T.Vector3(),new T.Vector3()]}},vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',fragmentShader:`varying vec3 world;uniform vec3 lamps[2];uniform float night;void main(){float lit=0.;for(int i=0;i<2;i++){vec3 d=world-lamps[i];float forward=-d.z;float width=1.+forward*.23;float beam=exp(-dot(vec2(d.x/width,(d.y+forward*.055)/max(.4,width*.55)),vec2(d.x/width,(d.y+forward*.055)/max(.4,width*.55)))*2.);lit=max(lit,beam*smoothstep(0.,1.,forward)*(1.-smoothstep(12.,30.,forward)));}float a=mix(.20,.035,night)+lit*.65;gl_FragColor=vec4(mix(vec3(.42,.53,.64),vec3(.95,.88,.72),lit),a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});this.rain=new T.LineSegments(geo,m);this.rain.frustumCulled=false;scene.add(this.rain);this.resources.push(this.rain);
  this.sprayBatch=new ParticleBatch(scene,120,'spray',null,0xbbd4e2);this.splashBatch=new ParticleBatch(scene,40,'splash',null,0x9eb8c9);this.mistBatch=new ParticleBatch(scene,24,'mist',null,0x8ba0b0);
  this.air=Array.from({length:120},()=>({o:particleObject(),life:0,kind:'drop',velocity:new T.Vector3()}));this.ground=Array.from({length:40},()=>({o:particleObject(),life:0,kind:'ground',velocity:new T.Vector3()}));this.mist=Array.from({length:24},()=>({o:particleObject(),life:0,kind:'mist',velocity:new T.Vector3()}));this.splashes=[...this.air,...this.ground,...this.mist];
  const boltGeo=new T.BufferGeometry().setFromPoints([[-13,37,-65],[-11,30,-65],[-14,25,-65],[-10,18,-65],[-12,14,-65],[-9,7,-65]].map(p=>new T.Vector3(...p)));this.bolt=new T.Line(boltGeo,new T.LineBasicMaterial({color:0xdbeaff,transparent:true,opacity:0,depthTest:false}));this.bolt.visible=false;scene.add(this.bolt);this.resources.push(this.bolt);
  // One broad real light per car, no overlapping transparent cone shells.
  for(let car=0;car<2;car++){
   const light=new T.SpotLight(0xffe4be,cfg.night?1800:140,34,.58,1,2);light.castShadow=false;scene.add(light,light.target);this.lamps.push({light,car});
   for(const side of [-1,1]){const glow=new T.Sprite(new T.SpriteMaterial({map:smokeMap,color:0xffe1b7,transparent:true,opacity:cfg.night?.32:.06,depthWrite:false,blending:T.AdditiveBlending}));glow.scale.set(.68,.28,1);scene.add(glow);this.glows.push({glow,car,side});}
  }
 }
 setQuality(q){this.density=q.rain;if(this.puddleFx)this.puddleFx.density=q.rain;if(this.rain)this.rain.geometry.setDrawRange(0,Math.floor(this.drops.length*q.rain)*2);}
 reset(){this.water?.reset();this.puddleFx?.reset();this.time=this.travel=this.flash=0;this.nextFlash=5;for(const p of this.splashes){p.life=0;p.o.visible=false;}this.sprayBatch?.sync(this.air);this.splashBatch?.sync(this.ground);this.mistBatch?.sync(this.mist);}
 update(dt,player,rival,playerModel,rivalModel){
  if(!this.cfg.wet)return;this.time+=dt;const travel=player?.travelDistance||0,delta=Math.max(0,travel-this.travel);this.travel=travel;const speed=player?.speed||0,models=[playerModel,rivalModel],cars=[player,rival];
  this.water?.update(dt,cars,models);this.puddleFx.update(dt,cars,models,delta);
  const positions=this.rain.geometry.attributes.position.array,active=Math.floor(this.drops.length*this.density);
  for(let i=0;i<active;i++){const d=this.drops[i];d.y-=dt*(this.cfg.night?20:14);d.x+=dt*1.7;d.z+=delta*.55;if(d.y<0){d.y=16+Math.random()*2;d.x=(Math.random()-.5)*34;}if(d.z>26)d.z-=62;const j=i*6;positions[j]=d.x;positions[j+1]=d.y;positions[j+2]=d.z;positions[j+3]=d.x-.055;positions[j+4]=d.y+(this.cfg.night?.72:.38);positions[j+5]=d.z-speed*.012;}this.rain.geometry.attributes.position.needsUpdate=true;
  for(const pool of [this.air,this.ground,this.mist])for(let i=0;i<pool.length;i++){
   const p=pool[i],o=p.o;if(i>=Math.ceil(pool.length*this.density)){p.life=0;o.visible=false;continue;}p.life-=dt;
   if(p.life<=0){const carIndex=i%2,model=models[carIndex],carSpeed=cars[carIndex]?.speed||0,isGround=p.kind==='ground',mist=p.kind==='mist';if(!isGround&&(!model||carSpeed<3)){o.visible=false;continue;}
    const side=i%4<2?-1:1;p.life=isGround?.16+Math.random()*.16:mist?.32+Math.random()*.3:.16+Math.random()*.32;p.total=p.life;p.strength=Math.min(1,carSpeed/24);o.visible=true;
    if(isGround){o.position.set((Math.random()-.5)*8,.027,Math.random()*38-22);p.velocity.set(0,0,0);}else{const halfWidth=(model.userData.carWidth||1.7)*.48,axle=(model.userData.wheelbase||2.5)*.5*(i%8<4?1:-1)+(model.userData.axleOffset||0);o.position.set(model.position.x+side*halfWidth,.07,model.position.z+axle);p.velocity.set(side*(.4+Math.random()*1.3),mist?.35:.7+Math.random()*1.6,carSpeed*(mist?.05:.10));}
    o.material.rotation=mist?-.1:Math.random()*.6-.3;p.size=.6+Math.random()*.7;
   }
   const t=1-p.life/p.total,isGround=p.kind==='ground',mist=p.kind==='mist';o.position.z+=delta; o.position.addScaledVector(p.velocity,dt);if(!isGround&&!mist)p.velocity.y-=dt*8;
   if(o.position.y<.025){p.life=0;o.visible=false;continue;}
   if(isGround){const size=(.025+t*.22)*p.size;o.scale.set(size,size,1);o.material.opacity=(1-t)*.15;}
   else if(mist){o.scale.set((.32+t*1.15)*p.size,.10+t*.34,1);o.material.opacity=Math.sin(Math.PI*t)*.095*p.strength;}
   else{o.scale.set(.018*p.size,.06*p.size*(1+t),1);o.material.opacity=(1-t)*.48*p.strength;}
  }
  for(const [i,{light,car}] of this.lamps.entries()){const model=models[car];light.visible=!!model;if(!model)continue;const half=(model.userData.carLength||4)/2;light.position.set(model.position.x,model.userData.lampY||.7,model.position.z-half);light.target.position.set(light.position.x,.015,light.position.z-10);this.rain.material.uniforms.lamps.value[i].copy(light.position);}
  for(const {glow,car,side} of this.glows){const model=models[car];glow.visible=!!model;if(model)glow.position.set(model.position.x+side*(model.userData.carWidth||1.7)*.36,model.userData.lampY||.7,model.position.z-(model.userData.carLength||4)/2-.03);}
  this.sprayBatch.sync(this.air);this.splashBatch.sync(this.ground);this.mistBatch.sync(this.mist);
  if(this.cfg.night){if(!this.reduced&&this.time>this.nextFlash){this.flash=.38;this.nextFlash=this.time+8+Math.random()*7;this.bolt.position.x=(Math.random()-.5)*18;}this.flash=Math.max(0,this.flash-dt);const f=this.flash>.21?1:this.flash>.13?.1:this.flash>0?.6:0;this.bolt.visible=f>0;this.bolt.material.opacity=f;this.scene.userData.sun.intensity=this.scene.userData.baseSun+f*3.8;this.scene.background.set(this.cfg.sky).lerp(new T.Color(0x8ca6c5),f*.65);}
 }
 dispose(){this.water?.reset();this.puddleFx?.dispose();this.splashBatch?.dispose();this.sprayBatch?.dispose();this.mistBatch?.dispose();for(const {glow} of this.glows){glow.removeFromParent();glow.material.dispose();}const gs=new Set(),ms=new Set();for(const o of this.resources){gs.add(o.geometry);ms.add(o.material);o.removeFromParent();}for(const g of gs)g.dispose();for(const m of ms)m.dispose();for(const {light} of this.lamps){light.removeFromParent();light.target.removeFromParent();light.dispose();}}
}
