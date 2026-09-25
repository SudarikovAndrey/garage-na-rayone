import {PuddleSplashes} from './puddle-splashes.js';
import * as T from 'three';
import {ParticleBatch,particleObject} from './particle-batch.js';

// Дождь: штрихи капель, удары капель об асфальт и о машины, брызги из-под колёс, прожекторы фар, молния.
//
// Удары капель (Андрей, 22 сентября: «чтоб было видно удары капель о машины и асфальт») — три пула в трёх
// инстансированных вызовах: кольца на асфальте перед камерой, кольца на капоте и крыше каждой машины, и
// «коронки» — по капле, подскакивающей из части ударов. Где у машины верх, узнаём один раз на заезд лучами
// сверху по сетке 7×3 в её системе координат; ниже 25 см луч ловит колесо или землю — такие точки не берём.
// Кольца на машине живут в её системе: кузов качается на подвеске, и кольцо едет вместе с капотом.
export const RAIN={
 drops:{day:1100,night:2400},   // штрихов до множителя ливня (было 700/1500 — дождь читался редким)
 storm:.9,                      // ливень: во столько раз гуще и быстрее
 alpha:{day:.20,night:.055},    // в темноте штрих едва читается — контраст с лучом фар (Андрей: «в фарах сильнее, чем в темноте»)
 lit:.95,                       // сколько добавляет луч фар: в луче штрих в полтора десятка раз ярче тёмного
 pools:{road:220,car:72,crown:110},
 rate:{road:520,car:80},        // ударов в секунду при плотности 1; ливень ×1.6
 crown:.36,                     // доля ударов с подскоком капли
};
// Молния. Без музыки — случайно, раз в 8–15 с. С музыкой — по первой доле такта: когда пришло время, ждём
// ближайшую (часы такта отдаёт игра через setBeat) и бьём ровно в неё; следующая — через 2–4 такта, чтобы разряд
// ложился на начало музыкальной фразы, а не куда попало.
export const LIGHTNING={first:5,quiet:[8,15],bars:[2,4],hold:.38,onBeat:.03};
const UP=new T.Vector3(0,-1,0);

export class WeatherEffects{
 constructor(scene,cfg,reduced=false,smokeMap=null){
  Object.assign(this,{scene,cfg,reduced,time:0,travel:0,flash:0,nextFlash:LIGHTNING.first,armed:false,beatsLeft:0,strikes:0,beat:null,onFlash:null,splashes:[],glows:[],lamps:[],beams:[],resources:[],density:.7,budget:{road:0,car:[0,0]}});if(!cfg.wet)return;
  // Дождь бывает разный: обычный или проливной (storm 1) — гуще, быстрее, длиннее штрихи. Разыгрывается на заезд,
  // если трасса не задала сама. Капли летят к камере: у штриха есть скорость по +z, так движение чувствуется сильнее.
  this.storm=cfg.storm??(Math.random()<.4?1:0);this.wind=3+this.storm*8;this.water=scene.userData.wetRoad;this.puddleFx=new PuddleSplashes(scene,this.water);this.puddleFx.reduced=reduced;
  const count=Math.round((cfg.night?RAIN.drops.night:RAIN.drops.day)*(1+this.storm*RAIN.storm));this.drops=Array.from({length:count},()=>({x:(Math.random()-.5)*34,y:Math.random()*18,z:Math.random()*62-36}));
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(count*6),3).setUsage(T.DynamicDrawUsage));
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{night:{value:cfg.night?1:0},lamps:{value:[new T.Vector3(),new T.Vector3(),new T.Vector3(),new T.Vector3()]}},vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',fragmentShader:`varying vec3 world;uniform vec3 lamps[4];uniform float night;void main(){float lit=0.;for(int i=0;i<4;i++){vec3 d=world-lamps[i];float forward=-d.z;float width=1.3+forward*.30;vec2 q=vec2(d.x/width,(d.y+forward*.06)/max(.5,width*.6));float beam=exp(-dot(q,q)*1.8);lit=max(lit,beam*smoothstep(-.5,1.,forward)*(1.-smoothstep(14.,32.,forward)));}float a=mix(${RAIN.alpha.day},${RAIN.alpha.night},night)+lit*${RAIN.lit};gl_FragColor=vec4(mix(vec3(.42,.53,.64),vec3(.95,.88,.72),lit),a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});this.rain=new T.LineSegments(geo,m);this.rain.frustumCulled=false;scene.add(this.rain);this.resources.push(this.rain);
  this.sprayBatch=new ParticleBatch(scene,120,'spray',null,0xbbd4e2);this.mistBatch=new ParticleBatch(scene,24,'mist',null,0x8ba0b0);
  this.roadBatch=new ParticleBatch(scene,RAIN.pools.road,'splash',null,0xd9e8f4);this.carBatch=new ParticleBatch(scene,RAIN.pools.car,'ringn',null,0xe6f1fa);this.crownBatch=new ParticleBatch(scene,RAIN.pools.crown,'spray',null,0xd2e4ee);
  const pool=(n,kind)=>Array.from({length:n},()=>({o:particleObject(),life:0,total:0,kind,velocity:new T.Vector3(),local:new T.Vector3(),localNormal:new T.Vector3(0,1,0),normal:new T.Vector3(0,1,0),model:null,floor:0,size:1,strength:1}));
  this.air=pool(120,'drop');this.mist=pool(24,'mist');this.road=pool(RAIN.pools.road,'road');this.car=pool(RAIN.pools.car,'car');this.crown=pool(RAIN.pools.crown,'crown');
  this.splashes=[...this.air,...this.mist,...this.road,...this.car,...this.crown];
  const boltGeo=new T.BufferGeometry().setFromPoints([[-13,37,-65],[-11,30,-65],[-14,25,-65],[-10,18,-65],[-12,14,-65],[-9,7,-65]].map(p=>new T.Vector3(...p)));this.bolt=new T.Line(boltGeo,new T.LineBasicMaterial({color:0xdbeaff,transparent:true,opacity:0,depthTest:false}));this.bolt.visible=false;scene.add(this.bolt);this.resources.push(this.bolt);
  // Два узких луча на машину — по одному на фару (lampX = ширина × .36), без прозрачных конусов-оболочек.
  for(let car=0;car<2;car++){
   for(const side of [-1,1]){const light=new T.SpotLight(0xffe4be,(cfg.night?1800:140)*.7,34,.30,.7,2);light.castShadow=false;scene.add(light,light.target);this.lamps.push({light,car,side});}
   for(const side of [-1,1]){const glow=new T.Sprite(new T.SpriteMaterial({map:smokeMap,color:0xffe1b7,transparent:true,opacity:cfg.night?.32:.06,depthWrite:false,blending:T.AdditiveBlending}));glow.scale.set(.68,.28,1);scene.add(glow);this.glows.push({glow,car,side});}
  }
  this.scratch=new T.Vector3();this.ray=new T.Raycaster();this.ray.far=6;
 }
 // Часы бита: функция без аргументов → секунд до следующей сильной доли или null, когда музыки нет.
 setBeat(fn){this.beat=fn||null;}
 setQuality(q){this.density=q.rain;if(this.puddleFx)this.puddleFx.density=q.rain;if(this.rain)this.rain.geometry.setDrawRange(0,Math.floor(this.drops.length*q.rain)*2);}
 reset(){this.water?.reset();this.puddleFx?.reset();this.time=this.travel=this.flash=0;this.nextFlash=LIGHTNING.first;this.armed=false;this.beatsLeft=0;this.budget.road=0;this.budget.car=[0,0];for(const p of this.splashes){p.life=0;p.o.visible=false;}this.syncPools();}
 syncPools(){this.sprayBatch?.sync(this.air);this.mistBatch?.sync(this.mist);this.roadBatch?.sync(this.road);this.carBatch?.sync(this.car);this.crownBatch?.sync(this.crown);}
 // Верх машины в её системе координат: капот, крыша, багажник. Считается лучами один раз на модель.
 topPoints(model){
  if(!model)return null;if(model.userData.rainTop!==undefined)return model.userData.rainTop;
  const len=model.userData.carLength||4,width=model.userData.carWidth||1.7,meshes=[];
  model.updateWorldMatrix(true,true);model.traverse(o=>{if(o.isMesh&&!o.userData.groundLight&&o.visible)meshes.push(o);});
  // Точка и нормаль поверхности в системе машины: кольцо ложится в плоскость крыши, а крыша скруглена.
  const points=[],origin=new T.Vector3(),normal=new T.Vector3(),inverse=new T.Matrix4();
  if(meshes.length){inverse.copy(model.matrixWorld).invert();for(let i=0;i<7;i++)for(let j=0;j<3;j++){
   origin.set((i/6-.5)*len*.88,4,(j/2-.5)*width*.72);model.localToWorld(origin);this.ray.set(origin,UP);
   const hit=this.ray.intersectObjects(meshes,false)[0];if(!hit||hit.point.y-model.position.y<.25)continue;
   normal.copy(hit.face?.normal||new T.Vector3(0,1,0)).transformDirection(hit.object.matrixWorld).transformDirection(inverse).normalize();if(normal.y<0)normal.negate();/* грань двусторонняя — нормаль всегда вверх */
   points.push({p:model.worldToLocal(hit.point.clone()),n:normal.clone()});
  }}
  model.userData.rainTop=points.length?points:null;return model.userData.rainTop;
 }
 free(pool){for(const p of pool)if(p.life<=0)return p;return null;}
 // Кольцо на асфальте перед камерой: ближе — чаще, там оно и читается.
 hitRoad(){
  const p=this.free(this.road);if(!p)return;
  p.life=p.total=.18+Math.random()*.12;p.size=.7+Math.random()*.7;p.o.visible=true;
  p.o.position.set((Math.random()-.5)*14,.03,5-21*Math.pow(Math.random(),1.4));p.o.material.rotation=Math.random()*6.28;
  if(Math.random()<RAIN.crown)this.hitCrown(p.o.position,null,.02,1);
 }
 // Кольцо на капоте или крыше: точка сетки плюс разброс, живёт в системе машины.
 hitCar(model,tops){
  const p=this.free(this.car);if(!p)return;
  const at=tops[Math.floor(Math.random()*tops.length)];
  p.life=p.total=.15+Math.random()*.10;p.size=.6+Math.random()*.6;p.model=model;p.o.visible=true;
  p.local.set(at.p.x+(Math.random()-.5)*.26,at.p.y,at.p.z+(Math.random()-.5)*.2).addScaledVector(at.n,.012);p.localNormal.copy(at.n);
  model.localToWorld(p.o.position.copy(p.local));p.normal.copy(p.localNormal).transformDirection(model.matrixWorld);p.o.material.rotation=Math.random()*6.28;
  if(Math.random()<RAIN.crown)this.hitCrown(p.o.position,model,p.o.position.y-.02,.7,p.normal);
 }
 hitCrown(at,model,floor,drift,normal=null){
  const p=this.free(this.crown);if(!p)return;
  p.life=p.total=.20+Math.random()*.12;p.size=.5+Math.random()*.6;p.model=model;p.floor=floor;p.strength=drift;p.o.visible=true;
  p.o.position.copy(at);p.velocity.set((Math.random()-.5)*.5,.55+Math.random()*.6,(Math.random()-.5)*.4);if(normal)p.velocity.addScaledVector(normal,.6).y=Math.max(p.velocity.y,.3);p.o.material.rotation=0;
 }
 // Когда бить. Без часов бита — по таймеру. С часами: как только таймер вышел, взводимся и ждём сильную долю;
 // бьём в кадре, в котором до неё меньше кадра (или она уже прошла на onBeat секунд — часы дискретны).
 scheduleLightning(dt){
  const wait=this.beat?.();
  if(wait===null||wait===undefined){this.armed=false;this.beatsLeft=0;if(this.time>this.nextFlash){this.strike();this.nextFlash=this.time+LIGHTNING.quiet[0]+Math.random()*(LIGHTNING.quiet[1]-LIGHTNING.quiet[0]);}return;}
  if(!this.armed){if(this.time>this.nextFlash){this.armed=true;this.beatsLeft=0;}else return;}
  // Ждём долю. Пока ждём, считаем прошедшие такты: следующая молния — через bars[0]..bars[1] тактов.
  if(this.lastWait!==undefined&&wait>this.lastWait+.05)this.beatsLeft--;// доля прошла между кадрами
  this.lastWait=wait;
  if(this.beatsLeft>0)return;
  if(wait<=Math.max(dt,LIGHTNING.onBeat)){this.strike(wait);this.beatsLeft=LIGHTNING.bars[0]+Math.floor(Math.random()*(LIGHTNING.bars[1]-LIGHTNING.bars[0]+1));this.lastWait=undefined;this.nextFlash=this.time;}
 }
 // delay — сколько до самой доли: вспышка рисуется следующим кадром, а гром ставится в очередь ровно на долю.
 strike(delay=0){
  const strength=.55+Math.random()*.45;this.flash=LIGHTNING.hold;this.strikes++;this.bolt.position.x=(Math.random()-.5)*18;
  this.onFlash?.(strength,delay);
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('garage:lightning',{detail:{strength,time:this.time,beat:this.beat?this.beat():null}}));
 }
 update(dt,player,rival,playerModel,rivalModel){
  if(!this.cfg.wet)return;this.time+=dt;const travel=player?.travelDistance||0,delta=Math.max(0,travel-this.travel);this.travel=travel;const speed=player?.speed||0,models=[playerModel,rivalModel],cars=[player,rival];
  this.water?.update(dt,cars,models);this.puddleFx.update(dt,cars,models,delta);
  const positions=this.rain.geometry.attributes.position.array,active=Math.floor(this.drops.length*this.density);
  const fall=(this.cfg.night?20:14)*(1+this.storm*.45),streak=(this.cfg.night?.95:.42)*(1+this.storm*.9),wind=this.wind;for(let i=0;i<active;i++){const d=this.drops[i];d.y-=dt*fall;d.x+=dt*1.7;d.z+=delta*.55+dt*wind;if(d.y<0){d.y=16+Math.random()*2;d.x=(Math.random()-.5)*34;d.z-=wind*.8;}if(d.z>26)d.z-=62;const j=i*6;positions[j]=d.x;positions[j+1]=d.y;positions[j+2]=d.z;positions[j+3]=d.x-.055;positions[j+4]=d.y+streak;positions[j+5]=d.z-speed*.012-streak*wind/fall;}this.rain.geometry.attributes.position.needsUpdate=true;
  // Брызги из-под колёс: капли и водяная пыль, только на ходу.
  for(const pool of [this.air,this.mist])for(let i=0;i<pool.length;i++){
   const p=pool[i],o=p.o;if(i>=Math.ceil(pool.length*this.density)){p.life=0;o.visible=false;continue;}p.life-=dt;
   if(p.life<=0){const carIndex=i%2,model=models[carIndex],carSpeed=cars[carIndex]?.speed||0,mist=p.kind==='mist';if(!model||carSpeed<3){o.visible=false;continue;}
    const side=i%4<2?-1:1;p.life=mist?.32+Math.random()*.3:.16+Math.random()*.32;p.total=p.life;p.strength=Math.min(1,carSpeed/24);o.visible=true;
    const halfWidth=(model.userData.carWidth||1.7)*.48,axle=(model.userData.wheelbase||2.5)*.5*(i%8<4?1:-1)+(model.userData.axleOffset||0);o.position.set(model.position.x+side*halfWidth,.07,model.position.z+axle);p.velocity.set(side*(.4+Math.random()*1.3),mist?.35:.7+Math.random()*1.6,carSpeed*(mist?.05:.10));
    o.material.rotation=mist?-.1:Math.random()*.6-.3;p.size=.6+Math.random()*.7;
   }
   const t=1-p.life/p.total,mist=p.kind==='mist';o.position.z+=delta;o.position.addScaledVector(p.velocity,dt);if(!mist)p.velocity.y-=dt*8;
   if(o.position.y<.025){p.life=0;o.visible=false;continue;}
   if(mist){o.scale.set((.32+t*1.15)*p.size,.10+t*.34,1);o.material.opacity=Math.sin(Math.PI*t)*.095*p.strength;}
   else{o.scale.set(.018*p.size,.06*p.size*(1+t),1);o.material.opacity=(1-t)*.48*p.strength;}
  }
  // Удары капель. Рождаем по бюджету: столько ударов в секунду, сколько задано, на долю качества и ливня.
  const rate=this.density*(1+this.storm*.6)*(this.reduced?.5:1);
  this.budget.road+=dt*RAIN.rate.road*rate;for(let n=0;n<40&&this.budget.road>=1;n++){this.budget.road-=1;this.hitRoad();}
  for(let c=0;c<2;c++){const model=models[c];if(!model||!model.visible){this.budget.car[c]=0;continue;}const tops=this.topPoints(model);if(!tops)continue;
   this.budget.car[c]+=dt*RAIN.rate.car*rate;for(let n=0;n<12&&this.budget.car[c]>=1;n++){this.budget.car[c]-=1;this.hitCar(model,tops);}}
  const ringAlpha=this.cfg.night?.75:.55;
  for(const p of this.road){if(p.life<=0)continue;p.life-=dt;const o=p.o;if(p.life<=0){o.visible=false;continue;}const t=1-p.life/p.total;o.position.z+=delta;const s=(.07+t*.46)*p.size;o.scale.set(s,s,1);o.material.opacity=(1-t)*(1-t)*ringAlpha;}
  for(const p of this.car){if(p.life<=0)continue;p.life-=dt;const o=p.o;if(p.life<=0||!p.model?.visible){p.life=0;o.visible=false;continue;}const t=1-p.life/p.total;p.model.localToWorld(o.position.copy(p.local));p.normal.copy(p.localNormal).transformDirection(p.model.matrixWorld);const s=(.04+t*.24)*p.size;o.scale.set(s,s,1);o.material.opacity=(1-t)*(1-t)*(ringAlpha+.15);}
  for(const p of this.crown){if(p.life<=0)continue;p.life-=dt;const o=p.o;if(p.life<=0){o.visible=false;continue;}const t=1-p.life/p.total;o.position.addScaledVector(p.velocity,dt);p.velocity.y-=dt*9.8;o.position.z+=delta*p.strength;
   if(o.position.y<p.floor){p.life=0;o.visible=false;continue;}o.scale.set(.022*p.size,.07*p.size,1);o.material.opacity=(1-t)*.65;}
  for(const [i,{light,car,side}] of this.lamps.entries()){const model=models[car];light.visible=!!model;if(!model)continue;const half=(model.userData.carLength||4)/2;light.position.set(model.position.x+side*(model.userData.carWidth||1.7)*.36,model.userData.lampY||.7,model.position.z-half);light.target.position.set(light.position.x,.015,light.position.z-10);this.rain.material.uniforms.lamps.value[i].copy(light.position);}
  for(const {glow,car,side} of this.glows){const model=models[car];glow.visible=!!model;if(model)glow.position.set(model.position.x+side*(model.userData.carWidth||1.7)*.36,model.userData.lampY||.7,model.position.z-(model.userData.carLength||4)/2-.03);}
  this.syncPools();
  // Гроза: ночью всегда, днём — только в ливень. Разряд подсвечивает небо и солнце, молния — ломаная вдали.
  if(this.cfg.night||this.storm){
   if(!this.reduced)this.scheduleLightning(dt);
   this.flash=Math.max(0,this.flash-dt);const f=this.flash>.21?1:this.flash>.13?.1:this.flash>0?.6:0;this.bolt.visible=f>0;this.bolt.material.opacity=f;
   const day=this.cfg.night?1:.45;this.scene.userData.sun.intensity=this.scene.userData.baseSun+f*3.8*day;this.scene.background.set(this.cfg.sky).lerp(new T.Color(0x8ca6c5),f*.65*day);
  }
 }
 dispose(){this.water?.reset();this.puddleFx?.dispose();for(const b of [this.sprayBatch,this.mistBatch,this.roadBatch,this.carBatch,this.crownBatch])b?.dispose();for(const {glow} of this.glows){glow.removeFromParent();glow.material.dispose();}const gs=new Set(),ms=new Set();for(const o of this.resources){gs.add(o.geometry);ms.add(o.material);o.removeFromParent();}for(const g of gs)g.dispose();for(const m of ms)m.dispose();for(const {light} of this.lamps){light.removeFromParent();light.target.removeFromParent();light.dispose();}}
}
