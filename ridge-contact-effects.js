import * as T from 'three';
import {ParticleBatch,particleObject} from './particle-batch.js';
// World-space pools: one spark draw and one dust draw; nothing allocated per hit.
export class RidgeContactEffects{
 constructor(parent){
  this.last=new WeakMap();this.cursor=0;this.dustCursor=0;this.scrapeClock=-1;
  this.sparks=Array.from({length:64},()=>({life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,max:1}));
  this.positions=new Float32Array(64*6);this.colors=new Float32Array(64*6);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(this.positions,3).setUsage(T.DynamicDrawUsage));geo.setAttribute('color',new T.BufferAttribute(this.colors,3).setUsage(T.DynamicDrawUsage));
  this.lines=new T.LineSegments(geo,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.95,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending}));this.lines.frustumCulled=false;parent.add(this.lines);
  this.dust=new ParticleBatch(parent,24,'mist',null,0xad9c82);this.puffs=Array.from({length:24},()=>({o:particleObject(),life:0,max:1}));
 }
 emit(point,strength,reduced,scrape=false){
  const count=reduced?2:Math.ceil((scrape?3:6)+strength*12);
  for(let i=0;i<count;i++){const p=this.sparks[this.cursor++%64],a=this.cursor*2.399;p.life=p.max=.18+strength*.25+(i%3)*.04;p.x=point.x;p.z=point.z;p.y=.55;p.vx=Math.cos(a)*(1+strength*5);p.vz=Math.sin(a)*(1+strength*5);p.vy=1+(i%4)*.45;}
  if(!scrape)for(let i=0;i<(reduced?1:4);i++){const p=this.puffs[this.dustCursor++%24];p.life=p.max=.45+strength*.35;p.o.position.set(point.x+(i-1.5)*.08,.35,point.z);}
 }
 update(dt,car,reduced=false){
  const b=car?.battle,e=b?.contact,clock=b?.clock||0;
  if(e&&(this.last.get(car)||0)!==e.id){this.last.set(car,e.id);if(clock-e.clock<.2)this.emit(e.point,e.strength,reduced);}
  if(b?.touchPoint&&clock-(b.touchClock??-10)<.04&&b.scrape>.15&&clock-this.scrapeClock>.12){this.scrapeClock=clock;this.emit(b.touchPoint,.12,reduced,true);}
  for(let i=0;i<64;i++){const p=this.sparks[i];p.life=Math.max(0,p.life-dt);if(p.life){p.vy-=9*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;if(p.y<.04){p.y=.04;p.vy=Math.abs(p.vy)*.25;} }const fade=p.life/p.max,k=i*6;this.positions.set([p.x,p.y,p.z,p.x-p.vx*.026,p.y-p.vy*.026,p.z-p.vz*.026],k);this.colors.set([fade*2.2,fade*1.15,fade*.26,fade*.6,fade*.2,0],k);}
  this.lines.geometry.attributes.position.needsUpdate=this.lines.geometry.attributes.color.needsUpdate=true;
  for(const p of this.puffs){p.life=Math.max(0,p.life-dt);p.o.visible=p.life>0;if(!p.life)continue;const age=p.max-p.life;p.o.position.y+=dt*.5;p.o.scale.setScalar(.25+age*2);p.o.material.opacity=p.life/p.max*(reduced?.16:.28);}
  this.dust.sync(this.puffs);
 }
 dispose(){this.lines.removeFromParent();this.lines.geometry.dispose();this.lines.material.dispose();this.dust.dispose();}
}
