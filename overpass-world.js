import * as T from 'three';
import {gapsFor,bumpsFor,OVERPASS_HEIGHT,OVERPASS_DISTANCE,rampHeight,overpassPose,nextGap} from './overpass-route.js';
import {configureRaceShadow,softenShadowBoundary} from './race-shadows.js';
import {asphaltDetail} from './surface-detail.js';
import {ParticleBatch,particleObject} from './particle-batch.js';
export function createOverpassWorld(cfg,{roadTexture=null,environment=null,smokeMap=null}={}){
 const scene=new T.Scene(),root=new T.Group();scene.add(root);scene.background=new T.Color(cfg.sky);scene.fog=new T.FogExp2(cfg.fog,.0055);scene.environment=environment;scene.environmentIntensity=.65;
 const gaps=gapsFor(cfg.district||0),bumps=bumpsFor(gaps),height=OVERPASS_HEIGHT;
 let seed=cfg.seed;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 const mats=[],geoBox=new T.BoxGeometry(),geoRock=new T.IcosahedronGeometry(1,0),geoCyl=new T.CylinderGeometry(1,1,1,8),geoTree=new T.ConeGeometry(1,1,7),bins=new Map(),temp=new T.Object3D();
 const material=(color,roughness=.85,metalness=0,emissive=0)=>{const m=softenShadowBoundary(new T.MeshStandardMaterial({color,roughness,metalness,emissive,emissiveIntensity:emissive?.7:0}));mats.push(m);return m;};
 const concrete=material(0xa5a18d),deck=material(0x777b72),dark=material(0x323a37),rust=material(0x86523b,.7,.25),steel=material(0x6b7575,.5,.5),ochre=material(0xbf943f),wood=material(0x766046),white=material(0xd7ccac),gravel=material(0x878276),earth=material(0x695e48),leaves=material(0x485443),windows=material(0x46616a,.28,.3),warm=material(0xe6b477,.55,0,0xae6828);
 const detail=asphaltDetail();deck.normalMap=detail.normal;deck.normalScale.set(.35,.35);deck.roughnessMap=detail.roughness;if(roadTexture)deck.map=roadTexture;
 function part(g,size,pos,m,rot=[0,0,0],shadow=true){const key=g.uuid+m.uuid+shadow;let b=bins.get(key);if(!b){b={g,m,shadow,matrices:[]};bins.set(key,b);}temp.position.set(...pos);temp.scale.set(...size);temp.rotation.set(...rot);temp.updateMatrix();b.matrices.push(temp.matrix.clone());}
 const box=(size,pos,m=concrete,rot,shadow=true)=>part(geoBox,size,pos,m,rot,shadow);
 const cylinder=(r,h,pos,m=steel)=>part(geoCyl,[r,h,r],pos,m);
 const beam=(a,b,w,m=rust)=>{const va=new T.Vector3(...a),vb=new T.Vector3(...b),delta=vb.clone().sub(va);temp.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());const e=new T.Euler().setFromQuaternion(temp.quaternion);box([w,delta.length(),w],va.add(vb).multiplyScalar(.5).toArray(),m,e.toArray().slice(0,3));};
 // The deck is genuinely absent in each gap. Courtyards stay visible ten metres below.
 const sections=[];let start=-90;for(const g of gaps){sections.push([start,g.start]);start=g.start+g.width;}sections.push([start,1150]);
 box([380,.5,1600],[0,-height-.25,-500],earth);
 for(const [a,b] of sections){
  box([8,.55,b-a],[0,-.275,-(a+b)/2],concrete);
  box([7.4,.045,b-a],[0,.0225,-(a+b)/2],deck,undefined,false);
  for(const side of [-1,1]){
   box([.22,.20,b-a],[side*3.85,.1,-(a+b)/2],white);
   box([.075,.04,b-a],[side*3.22,.051,-(a+b)/2],white,undefined,false);
   box([.16,.18,b-a],[side*3.86,.85,-(a+b)/2],steel);
   for(let d=a+2;d<b-1;d+=5)box([.08,1,.08],[side*3.86,.5,-d],rust);
  }
  for(let d=a+8;d<b-3;d+=16){for(const side of [-1,1])box([.7,9.5,.8],[side*2.8,-5.25,-d],concrete);box([7.8,.7,1],[0,-1,-d],concrete);}
  for(let d=a+12;d<b-2;d+=12)box([7.2,.008,.055],[0,.051,-d],dark,undefined,false);
 }
 for(const g of gaps){
  const h=rampHeight(g),length=g.ramp.length;
  // Wedge of compacted rubble; the physical ramp ends at the lip, above the deck.
  const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(length,0);shape.lineTo(length,h);shape.closePath();
  const ramp=new T.ExtrudeGeometry(shape,{depth:6.2,bevelEnabled:false});ramp.rotateY(Math.PI/2);ramp.translate(-3.1,0,-g.start+length);const mesh=new T.Mesh(ramp,gravel);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
  for(let j=0;j<40;j++){const f=rand(),x=(rand()-.5)*6;part(geoRock,[.12+rand()*.18,.05,.18],[x,h*f+.055,-g.start+length*(1-f)],gravel,[rand(),rand(),rand()],false);}
  for(const side of [-1,1]){box([.22,1.8,.2],[side*3.5,.9,-g.start+.5],ochre);for(let k=0;k<4;k++)box([.24,.16,.22],[side*3.5,.25+k*.4,-g.start+.5],dark,undefined,false);}
  for(let j=0;j<8;j++){box([.045,.045,1.8],[-3.3+j*.94,-.17,-g.start-.55],rust);box([.045,.045,1.2],[-3.3+j*.94,-.17,-g.start-g.width+.5],rust);}
  // Extra supports frame the void, never run an invisible road underneath it.
  for(const d of [g.start-2,g.start+g.width+2])for(const side of [-1,1])box([.9,9.5,.9],[side*2.8,-5.25,-d],concrete);
 }
 for(const b of bumps)for(let j=0;j<16;j++)part(geoRock,[.12+rand()*.18,.08+rand()*.09,.16+rand()*.2],[(rand()-.5)*6,.04,-b.at+(rand()-.5)*1.2],gravel,[0,rand()*6,0],false);
 // Panel apartment blocks with whole-building shadows, balconies, entrances and warm windows.
 for(let d=-70;d<1150;d+=54)for(const side of [-1,1]){
  const x=side*(24+rand()*16),z=-d,h=14.5,w=15+rand()*7;
  box([w,h,11],[x,-height+h/2,z],concrete);box([w+.5,.35,11.6],[x,-height+h+.15,z],dark);
  for(let floor=0;floor<5;floor++)for(let col=0;col<7;col++){
   const wx=x-w/2+1.5+col*(w-3)/6,wy=-height+1.5+floor*2.7;
   for(const face of [-1,1]){box([1.15,1.4,.03],[wx,wy,z+face*5.52],rand()<.25?warm:windows,undefined,false);if(col%3===1){box([1.65,.55,.4],[wx,wy-.7,z+face*5.7],white,undefined,false);}}
  }
  box([2,2.3,.2],[x,-height+1.15,z+5.6],dark,undefined,false);box([3,.12,1.2],[x,-height+2.4,z+6],rust);
  for(let k=0;k<5;k++){const tx=side*(10+rand()*8),tz=z+(rand()-.5)*44;cylinder(.17,3,[tx,-height+1.5,tz],wood);part(geoRock,[2.3,3.5,2.2],[tx,-height+4,tz],leaves);}
  box([12,.04,30],[side*12,-height+.025,z],deck,undefined,false);
  // Courtyard benches, garages, bins and scattered construction material.
  box([6,2.6,5],[side*13,-height+1.3,z+20],steel);box([6.4,.16,5.4],[side*13,-height+2.7,z+20],rust);
  for(let j=0;j<6;j++)part(geoRock,[.6+rand(),.3+rand()*.4,.5+rand()],[side*(5+rand()*10),-height+.35,z+rand()*20],gravel,[rand(),rand(),rand()]);
  for(let k=0;k<7;k++)box([3,.9,.12],[side*(7+k*3),-height+.45,z-23],wood);
 }
 // Lattice tower cranes are recognizable silhouettes above the district.
 for(const d of [190,380,650]){const x=d===380?-18:18;
  for(let y=-10;y<24;y+=3){for(const s of [-1,1])box([.17,3,.17],[x+s*1.2,y+1.5,-d],ochre);beam([x-1.2,y,-d],[x+1.2,y+3,-d],.1,ochre);}
  box([35,.25,.6],[x-7,23,-d],ochre);box([35,.1,.6],[x-7,25,-d],ochre);for(let k=0;k<11;k++)beam([x-24+k*3,23,-d],[x-21+k*3,25,-d],.1,ochre);
  box([3,1.5,2],[x+7,23.8,-d],dark);box([1.5,1.5,1.5],[x,22,-d],windows);box([.035,12,.035],[x-15,17,-d],rust);box([.7,.5,.3],[x-15,10.9,-d],dark);
 }
 for(const b of bins.values()){const mesh=new T.InstancedMesh(b.g,b.m,b.matrices.length);b.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.castShadow=b.shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();root.add(mesh);}
 const sun=new T.DirectionalLight(cfg.sun,cfg.intensity);sun.position.set(-24,21,-32);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun,sun.target,new T.HemisphereLight(0xd8dfe1,0x6c533a,cfg.ambient));configureRaceShadow(sun);scene.userData.sun=sun;scene.userData.baseSun=cfg.intensity;scene.userData.track=cfg;
 const stripe=()=>{const g=new T.Group();for(let i=0;i<14;i++)for(let j=0;j<2;j++){const m=new T.Mesh(geoBox,(i+j)%2?dark:white);m.scale.set(.5,.012,.5);m.position.set(-3.25+i*.5,.06,j*.5);g.add(m);}scene.add(g);return g;};
 scene.userData.start=stripe();scene.userData.finish=stripe();scene.userData.tree=new T.Group();scene.add(scene.userData.tree);scene.userData.roadRide={update:()=>({height:0,pitch:0,roll:0})};
 let lastLanding=0,landingAge=9,travelBefore=0,dust=null,puffs=[];
 function update(travel,car,rival,models,dt,reduced=false){
  root.position.z=travel;const model=models[0],pose=car.overpassFall||overpassPose(car);const shadow=model.userData.overpassShadow??=model.getObjectByName('ContactShadow');if(shadow)shadow.visible=!car.air&&!car.crashed&&pose.y<.03;landingAge+=dt;
  if(car.landings>lastLanding){lastLanding=car.landings;landingAge=0;if(dust)for(let i=0;i<puffs.length;i++){const p=puffs[i];p.life=.55+Math.random()*.4;p.m.visible=true;p.m.position.set((i%2?1:-1)*.8,.12,((i>>1)%2?1:-1)*1.25);p.m.scale.setScalar(.35);p.vx=(i%2?1:-1)*(.7+Math.random());}}
  model.position.set(0,pose.y-(landingAge<.45?Math.sin(landingAge/.45*Math.PI)*.09:0),0);model.rotation.set(0,-Math.PI/2,-pose.pitch);if(car.overpassFall)model.rotation.x=Math.min(.28,car.crashElapsed*.15);
  scene.userData.start.position.z=travel-3;scene.userData.finish.position.z=travel-OVERPASS_DISTANCE-3;
  if(dust){const delta=Math.max(0,travel-travelBefore);for(const p of puffs){p.life-=dt;p.m.visible=p.life>0;if(!p.m.visible)continue;p.m.position.x+=p.vx*dt;p.m.position.y+=dt*.3;p.m.position.z+=delta;p.m.scale.multiplyScalar(1+dt*1.9);p.m.material.opacity=Math.min(.32,p.life*.5);}dust.sync(puffs);}travelBefore=travel;
 }
 function setSmokeMap(map){dust=new ParticleBatch(scene,16,'smoke',map,0xa99d82);puffs=Array.from({length:16},()=>({m:particleObject(),life:0,vx:0}));}
 function camera(camera,car,model,dt,reduced=false){
  const next=nextGap(car.distance,car.overpassGaps),near=next?T.MathUtils.smoothstep(65-next.metres,0,50):0,air=!!car.air,fall=!!car.overpassFall;
  if(camera.view?.enabled)camera.clearViewOffset();const lift=air?1:near;
  const pos=new T.Vector3(fall?6:3+lift*3,model.position.y+(fall?5:7.8+lift*3.3),fall?11:14+lift*5),aim=new T.Vector3(0,model.position.y+.5,fall?0:-5-lift*8);
  camera.position.lerp(pos,reduced?1:1-Math.exp(-dt*3));camera.up.set(0,1,0);camera.userData.overpassAim??=aim.clone();camera.userData.overpassAim.lerp(aim,1-Math.exp(-dt*5));camera.lookAt(camera.userData.overpassAim);camera.fov=T.MathUtils.lerp(camera.fov,46+Math.min(car.speed*.07,4),1-Math.exp(-dt*3));camera.updateProjectionMatrix();
 }
 function dispose(){dust?.dispose();const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material);if(o.isInstancedMesh)o.dispose();}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());detail.normal.dispose();detail.roughness.dispose();sun.shadow.map?.dispose();scene.clear();}
 return {scene,moving:[],cfg,gaps,sections,update,camera,setSmokeMap,dispose};
}
