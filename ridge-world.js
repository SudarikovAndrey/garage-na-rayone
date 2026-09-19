import {repairMaterial,repairGeometry} from './road-repairs.js';
import {PARKING_ARCS} from './parking-course.js';
import {decorateDriftCourse} from './drift-scenery.js';
import {createRidgePosts,tickRidgePosts} from './ridge-obstacles.js';
import {RidgeContactEffects} from './ridge-contact-effects.js';
import * as T from 'three';
import {ridgePoint,ridgeLocal,ridgeConditions,ridgeWind} from './ridge-route.js';
import {ridgeHeight,setDriftCourse} from './ridge-terrain.js';
import {ridgeBodyPose} from './ridge-body.js';
import {leanDriftBody,DriftTrails,frontWheelSteer} from './drift-feedback.js';
import {RoadRide} from './road-ride.js';
import {ParticleBatch,particleObject} from './particle-batch.js';
import {configureRaceShadow,softenShadowBoundary,isMajorCaster} from './race-shadows.js';

// A fixed, continuous road. The whole landscape follows the player's tangent frame;
// the cars, finish film and particles retain the normal close-to-origin precision.
export function createRidgeWorld(cfg,{roadTexture,environment}={}){
 const course=setDriftCourse(cfg.id),width=course.width,forest=course.terrain==='forest',city=course.terrain==='city';
 const scene=new T.Scene(),land=new T.Group();scene.add(land);scene.background=new T.Color(cfg.sky);scene.fog=new T.FogExp2(cfg.fog,.0045);scene.environment=environment;scene.environmentIntensity=.65;
 const hemi=new T.HemisphereLight(forest?0xffd5a0:0xd0e0e5,forest?0x51452d:0x64503a,forest?1.7:city?1.8:1.55),sun=new T.DirectionalLight(cfg.sun,cfg.intensity);sun.position.set(-25,forest?12:19,-34);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:28,bottom:-18,far:110});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;configureRaceShadow(sun);scene.add(hemi,sun,sun.target);Object.assign(scene.userData,{sun,baseSun:cfg.intensity,track:cfg,roadRide:new RoadRide(cfg.rough||.05)});
 const sunDirection=sun.position.clone().sub(sun.target.position),sunAnchor=sun.target.position.clone();
 const materials=[],geometries=[],signTextures=[];
 const mat=(color,roughness=.94)=>{const m=softenShadowBoundary(new T.MeshStandardMaterial({color,roughness}));materials.push(m);return m;};
 const asphalt=mat(forest?0xbb986b:roadTexture?0x90938e:0x575e5b);let dirtTexture;
 if(forest&&typeof document!=='undefined'){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),image=ctx.createImageData(128,128);let grain=cfg.seed;for(let i=0;i<image.data.length;i+=4){grain=(1664525*grain+1013904223)>>>0;const v=180+(grain%65);image.data.set([v,v,v,255],i);}ctx.putImageData(image,0,0);dirtTexture=new T.CanvasTexture(canvas);dirtTexture.wrapS=dirtTexture.wrapT=T.RepeatWrapping;dirtTexture.anisotropy=4;asphalt.map=dirtTexture;}else if(roadTexture)asphalt.map=roadTexture;
 const stone=mat(0xa89b81),soil=mat(0x78664c),paint=mat(0xe6d9a9),black=mat(0x343830),brick=mat(0x986448),concrete=mat(0xa5a396),rust=mat(0x89573b),dry=mat(0x756240),steel=mat(0x85817a,.64);
 const profile=x=>ridgeHeight(0,x);
 function ribbon(offsets,material,lift=0){const p=[],uv=[],ix=[],colors=[];for(let d=-80;d<=1520;d+=2)for(const x of offsets){const a=ridgePoint(d,x);p.push(a.x,ridgeHeight(d,x)+lift,a.z);uv.push(x*.32,d*.12);const tint=material===soil?.72+.25*(.5+.5*Math.sin(d*.42+x*3)*Math.sin(d*.11-x*.7)):1;colors.push(tint,tint*.98,tint*.91);}const n=offsets.length;for(let row=0;row<800;row++)for(let j=0;j<n-1;j++){const a=row*n+j,b=a+n;ix.push(a,a+1,b,b,a+1,b+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));if(material===soil){g.setAttribute('color',new T.Float32BufferAttribute(colors,3));material.vertexColors=true;}g.setIndex(ix);g.computeVertexNormals();geometries.push(g);const m=new T.Mesh(g,material);m.receiveShadow=true;land.add(m);return m;}
 if(city){const points=Array.from({length:151},(_,i)=>ridgePoint(i*10));const xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs)-120,maxX=Math.max(...xs)+120,minZ=Math.min(...zs)-160,maxZ=Math.max(...zs)+120;const g=new T.PlaneGeometry(maxX-minX,maxZ-minZ);g.rotateX(-Math.PI/2);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++){uv.setXY(i,uv.getX(i)*(maxX-minX)*.25,uv.getY(i)*(maxZ-minZ)*.25);}geometries.push(g);const lot=new T.Mesh(g,asphalt);lot.name='OpenParking';lot.position.set((minX+maxX)/2,-.02,(minZ+maxZ)/2);lot.receiveShadow=true;land.add(lot);}
 else{ribbon([-width,0,width],asphalt,.02);ribbon([-width-1,-width],stone);ribbon([width,width+1],stone);ribbon([-90,-35,-20,-17,-14,-12,-9,-width-1],soil);ribbon([width+1,9,12,14,17,20,35,90],soil);}
 if(forest){const rut=mat(0x987951);ribbon([-1.85,-1.50],rut,.025);ribbon([1.50,1.85],rut,.025);}
 if(!forest&&!city){ribbon([-width+.27,-width+.35],paint,.035);ribbon([width-.35,width-.27],paint,.035);}
 let seed=cfg.seed||217;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const floorGeo=new T.PlaneGeometry(5000,5000);floorGeo.rotateX(-Math.PI/2);geometries.push(floorGeo);const floor=new T.Mesh(floorGeo,mat(0x9f9277));floor.position.y=-13.288;land.add(floor);
 const box=new T.BoxGeometry(1,1,1),rock=new T.IcosahedronGeometry(1,0),cylinder=new T.CylinderGeometry(1,1,1,8);geometries.push(box,rock,cylinder);
 const collisionBoxes=[],batches=new Map(),dummy=new T.Object3D();
 function prop(geometry,material,d,x,y,size,rotation=[0,0,0],anchor=null){const p=ridgePoint(d,x),caster=!material.userData.roadRepair&&isMajorCaster(size,geometry===cylinder?'cylinder':'box'),key=geometry.uuid+material.uuid+Math.floor(d/(city?240:80))+caster;
  if(!batches.has(key))batches.set(key,{geometry,material,transforms:[],caster});
  dummy.position.set(p.x,ridgeHeight(d,x)+y,p.z);if(anchor){const base=ridgePoint(anchor.d,anchor.lane),c=Math.cos(base.heading),s=Math.sin(base.heading);dummy.position.set(base.x+c*anchor.x+s*anchor.z,ridgeHeight(anchor.d,anchor.lane)+y,base.z+s*anchor.x-c*anchor.z);}
  dummy.rotation.set(rotation[0],rotation[1]-p.heading,rotation[2]);dummy.scale.set(...size);dummy.updateMatrix();
  geometry.computeBoundingBox();const ext=geometry.boundingBox.getSize(new T.Vector3()).multiply(dummy.scale).multiplyScalar(.5),foot=new T.Box3(ext.clone().negate(),ext.clone()).applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rotation[0],0,rotation[2]))).getSize(new T.Vector3()).multiplyScalar(.5),bottom=y-foot.y;
  if(bottom<.4&&ext.y>.45&&Math.max(ext.x,ext.z)>.20){collisionBoxes.push({p:dummy.position.toArray(),q:dummy.quaternion.toArray(),half:ext.toArray(),foot:foot.toArray(),ground:true,d,lane:x,yaw:rotation[1],reach:Math.hypot(foot.x,foot.z)});}
  batches.get(key).transforms.push(dummy.matrix.clone());}

 if(!forest&&!city)for(let d=-65;d<1460;d+=6)prop(box,paint,d,0,.04,[.10,.008,2.3]);
 if(city){const yellow=mat(0xf0bd45);for(let d=0;d<804;d+=3){const arc=PARKING_ARCS.find(a=>d>=a.start&&d<=a.end);for(const side of [-1,1])prop(box,arc?yellow:paint,d,side*6,.045,[.18,.012,1.9]);if(d%12===0)for(const side of [-1,1])prop(box,arc?yellow:paint,d,side*.35,.045,[.1,.012,1],[0,side*.6,0]);}for(const [i,a] of PARKING_ARCS.entries()){for(let d=a.start;d<=a.end;d+=6)prop(box,yellow,d,-a.sign*5.5,.045,[.5,.012,2.8]);}}
 // Short worn shoulder ticks stay visible beside the car: a true three-metre cadence.
 if(!forest&&!city)for(let d=-65;d<1460;d+=3)for(const side of [-1,1])prop(box,paint,d,side*(width-.62),.035,[.32,.006,.09]);
 // Repairs share the asphalt's lighting; forest ruts retain their dirt surface.
 const repair=repairMaterial(asphalt),repairGeo=repairGeometry(random);materials.push(repair);geometries.push(repairGeo);
 for(let d=-65;d<1460;d+=5.5){const x=(random()-.5)*6.7;
  if(!forest)prop(repairGeo,repair,d+random()*2,x,.026,[.035,1,.5+random()*1.6],[0,(random()-.5)*1.4,0]);
  if(!forest&&random()<.45)prop(repairGeo,repair,d+1,x+.15,.025,[.25+random()*.5,1,.4+random()*.6]);
 }
 if(course.terrain==='ridge')for(let d=-70;d<1440;d+=3){
  for(const side of [-1,1]){
   // Gravel transitions from fine road-edge aggregate to larger fractured embankment stone.
   for(let k=0;k<7;k++){const x=side*(4.1+random()*18),s=.07+random()*.35;prop(rock,k%3?stone:concrete,d+random()*3,x,s*.35,[s,s*.55,s*1.4],[random(),random()*6,random()]);}
   if(random()<.67){const x=side*(5.2+random()*15),h=.28+random()*.65;for(let twig=0;twig<7;twig++)prop(cylinder,dry,d+1,x,h*.5,[.018,h,.018],[.5*(random()-.5),random()*6,(twig-1.5)*.29]);}
   // Rubble is down at the foot, leaving the crest's silhouette open.
   if(random()<.32){const x=side*(20+random()*13);for(let j=0;j<6;j++)prop(box,j%3?concrete:brick,d+random()*6,x+random()*3,.2+random()*.4,[.35+random()*1.6,.2+random()*.4,.35+random()*1.4],[random()*.5,random()*6,random()*.4]);prop(cylinder,rust,d+1,x+2,.6,[.42,2.7,.42],[Math.PI/2,random()*3,0]);}
  }
 }
 if(course.terrain!=='ridge')decorateDriftCourse({course,prop,mat,box,cylinder,rock,geometries,random});
 if(city&&typeof document!=='undefined')for(const [i,arc] of PARKING_ARCS.entries()){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#edb849';ctx.fillRect(0,0,128,128);ctx.fillStyle='#252b23';ctx.font='bold 88px Arial';ctx.textAlign='center';ctx.fillText(String(i+1),64,98);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;signTextures.push(texture);const material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide});materials.push(material);const g=new T.PlaneGeometry(1.4,1.4);geometries.push(g);for(const side of [-1,1]){const p=ridgePoint(arc.start,side*6.7),sign=new T.Mesh(g,material);sign.position.set(p.x,1.7,p.z);sign.rotation.y=-p.heading;land.add(sign);prop(cylinder,steel,arc.start,side*6.7,.9,[.04,1.8,.04]);}for(let x=-5.8;x<6;x+=.65)prop(box,paint,arc.start,x,.049,[.35,.012,.4]);}
 // Reflector stakes, isolated chevrons and taut windsocks make the gust direction readable.
 const postAxis=new T.Vector3(),posts=createRidgePosts(),postMeshes=[],socks=[];const tyreGeo=new T.TorusGeometry(.52,.16,5,12);geometries.push(tyreGeo);
 for(const post of posts){const p=ridgePoint(post.d,post.lane),pivot=new T.Group();pivot.position.set(p.x,ridgeHeight(post.d,post.lane),p.z);pivot.userData.instances=[];
  const add=(geo,mat,x,y,z,sx,sy,sz)=>{const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;pivot.add(m);return m;};
  if(post.kind==='tyres'||post.kind==='barrier'){for(let n=0;n<3;n++){const ring=add(tyreGeo,n===2?paint:black,0,.2+n*.29,0,1,1,1);ring.rotation.x=Math.PI/2;}}
  else if(post.kind==='island'){add(box,concrete,0,.25,0,post.radius*1.5,.5,post.radius*1.5);add(box,brick,0,.51,0,post.radius*1.4,.04,post.radius*1.4);}
  else add(cylinder,post.kind==='stake'?paint:steel,0,post.height/2,0,post.radius,post.height,post.radius);
  if(post.kind==='flag'){const flag=add(box,Math.floor(post.d/30)%2?brick:paint,.42,2.25,0,.9,.55,.025);flag.rotation.y=-p.heading;}

  if(post.kind==='stake')add(box,black,0,.85,0,.21,.22,.21);
  if(post.kind==='sign'){const sign=add(box,paint,0,1.6,0,1.05,.68,.10);sign.rotation.y=-p.heading;for(const n of [-1,1]){const stripe=add(box,brick,0,1.6+n*.14,-.07,.45,.09,.12);stripe.rotation.z=n*Math.sign(post.lane)*.7;}}
  if(post.kind==='lamp'){const arm=add(box,steel,-Math.sign(post.lane)*.4,5.05,0,1,.09,.09);const lamp=add(box,paint,-Math.sign(post.lane)*.9,5,0,.58,.16,.32);lamp.rotation.y=arm.rotation.y=-p.heading;}
  if(post.kind==='sock'){const group=new T.Group();group.position.y=4;pivot.add(group);for(let i=0;i<5;i++){const g=new T.CylinderGeometry(.20-i*.026,.18-i*.026,.27,8,1,true);geometries.push(g);const m=new T.Mesh(g,i%2?paint:brick);m.rotation.z=-Math.PI/2;m.position.x=i*.26;group.add(m);}socks.push(group);}
  pivot.updateMatrixWorld(true);for(const child of pivot.children.flatMap(c=>c.isMesh?[c]:c.children)){if(!child.isMesh)continue;const key=child.geometry.uuid+child.material.uuid+Math.floor(post.d/(city?240:80));if(!batches.has(key))batches.set(key,{geometry:child.geometry,material:child.material,transforms:[],caster:true});const batch=batches.get(key),index=batch.transforms.length;batch.transforms.push(child.matrixWorld.clone());pivot.userData.instances.push({batch,index,child});}
  postMeshes.push(pivot);
 }
 for(const batch of batches.values()){const {geometry,material,transforms}=batch;const m=new T.InstancedMesh(geometry,material,transforms.length);transforms.forEach((mx,i)=>m.setMatrixAt(i,mx));m.receiveShadow=true;m.castShadow=!!batch.caster;land.add(m);batch.mesh=m;}
 function marker(d){const g=new T.Group();for(const parity of [0,1]){const batch=new T.InstancedMesh(box,parity?paint:black,Math.round(width*4));let i=0;for(let x=0;x<Math.round(width*4);x++)for(let z=0;z<2;z++)if((x+z)%2===parity){dummy.position.set(-width+.25+x*.5,0,z*.5);dummy.rotation.set(0,0,0);dummy.scale.set(.5,.009,.5);dummy.updateMatrix();batch.setMatrixAt(i++,dummy.matrix);}g.add(batch);}g.userData.distance=d;land.add(g);return g;}
 const start=marker(3),finish=marker(807),tree=new T.Group();land.add(tree);Object.assign(scene.userData,{start,finish,tree});
 const dust=new ParticleBatch(scene,72,'mist',null,0xd6b787),puffs=Array.from({length:72},(_,i)=>{const o=particleObject();o.visible=true;o.position.set(random()*60-30,.08+random()*1.4,random()*140-105);return {o,seed:random(),index:i};});
 const sandGeo=new T.BufferGeometry(),sandPositions=new Float32Array(240*6);sandGeo.setAttribute('position',new T.BufferAttribute(sandPositions,3).setUsage(T.DynamicDrawUsage));const sandMat=new T.LineBasicMaterial({color:0xe9cd98,transparent:true,opacity:.26,depthWrite:false});const sand=new T.LineSegments(sandGeo,sandMat);sand.frustumCulled=false;scene.add(sand);geometries.push(sandGeo);materials.push(sandMat);sand.visible=course.terrain==='ridge';const grains=Array.from({length:240},()=>({x:random()*56-28,y:.08+random()*1.1,z:random()*90-65}));
 const impactDust=new ParticleBatch(scene,36,'mist',null,0xb99b70),impactPuffs=Array.from({length:36},()=>({o:particleObject(),life:0}));let impactCursor=0;const lastDust=new WeakMap();
 const driftSmoke=new ParticleBatch(land,384,'rubber',null,forest?0xc7a674:0xdde1d8),driftMarks=[new DriftTrails(land),new DriftTrails(land)];
 const smokePool=Array.from({length:384},()=>({o:particleObject(),life:0}));let smokeCursor=0;const driftEmit=[0,0];
 function emitRubber(x,z,strength,haze=false){const p=smokePool[smokeCursor++%smokePool.length];p.maxLife=haze?1.7:1.35;p.life=p.maxLife;p.haze=haze;p.strength=strength;p.o.visible=true;p.o.position.set(x,haze?.045:.13,z);p.o.material.rotation=-.12+(smokeCursor%7)*.04;}
 const contactEffects=new RidgeContactEffects(land);
 let last=0,time=0;
 function update(travel,player,rival,models,dt,reduced=false){
  const o=ridgePoint(travel),c=Math.cos(o.heading),s=Math.sin(o.heading);sun.target.position.copy(sunAnchor);sun.position.set(sunAnchor.x+c*sunDirection.x+s*sunDirection.z,sunAnchor.y+sunDirection.y,sunAnchor.z-s*sunDirection.x+c*sunDirection.z);land.rotation.y=o.heading;land.position.set(-c*o.x-s*o.z,0,s*o.x-c*o.z);
  for(const [mark,d] of [[start,3],[finish,player.raceDistance+3],[tree,6]]){const a=ridgePoint(d);mark.position.set(a.x,-.008,a.z);mark.rotation.y=-a.heading;}
  for(let i=0;i<models.length;i++){
   const car=i?rival:player,m=models[i],d=i?travel+Math.max(-35,Math.min(55,(car.travelDistance??car.distance)-travel)):travel,cond=ridgeConditions(car,d);
   if(car.crashed){if(car.drift)leanDriftBody(m,0);const contactShadow=m.getObjectByName('ContactShadow');if(contactShadow)contactShadow.visible=false;const pose=ridgeBodyPose(car,travel);if(pose){m.position.set(pose.x,pose.y,pose.z);m.quaternion.set(...pose.q);m.rotateY(-Math.PI/2);}continue;}
   const lane=car.ridgeLane??(i?1.9:-1.9),a=ridgeLocal(d,lane+(car.ridgeSlide||0),travel);
   m.position.x=a.x;m.position.z=a.z;const pitch=m.rotation.z;m.rotation.set(0,-Math.PI/2-a.heading-(car.ridgeYaw||0),0);if(car.drift)leanDriftBody(m,car.ridgeBank||0);else m.rotateX(car.ridgeBank||0);m.rotateZ(pitch);
   for(const wheel of m.userData.wheels||[])if(wheel.name.startsWith('Wheel_F'))wheel.rotation.y=frontWheelSteer(car);
   for(const material of m.userData.tailMaterials||[])material.emissiveIntensity=car.handbrake?2.2:.18;

  }
  // Four contact patches share the physical axle slip state. Free-rolling wheels
  // do not make burnout smoke; rear-locked FWD tyres can leave braking skid marks.
  for(let i=0;i<2;i++){
   const car=i?rival:player,model=models[i],marks=driftMarks[i],active=model?.visible&&car.drift&&!car.crashed&&!car.finished&&car.speed>6;
   if(active){
    const p=ridgePoint(car.distance,(car.ridgeLane??0)+(car.ridgeSlide||0)),heading=p.heading+(car.ridgeYaw||0),sn=Math.sin(heading),cs=Math.cos(heading),halfWidth=(model.userData.carWidth||1.65)*.42;
    for(let axle=0;axle<2;axle++){
     const tyre=car.drift.axles?.[axle],strength=tyre?.smoke||0,offset=(axle?1:-1)*(model.userData.wheelbase||2.46)/2+(model.userData.axleOffset||0),slot=i*2+axle;
     driftEmit[slot]=(driftEmit[slot]||0)+dt*(reduced?18:55)*strength;const count=Math.floor(driftEmit[slot]);driftEmit[slot]-=count;
     for(const side of [-1,1]){const contact=axle*2+(side>0?1:0),px=p.x-sn*offset+cs*side*halfWidth,pz=p.z+cs*offset+sn*side*halfWidth;
      for(let n=0;n<count;n++){const back=n*car.speed*dt/Math.max(1,count);emitRubber(px-Math.sin(p.heading)*back,pz+Math.cos(p.heading)*back,strength);}
      const lateral=(car.ridgeLane??0)+(car.ridgeSlide||0)+Math.cos(car.ridgeYaw||0)*side*halfWidth-Math.sin(car.ridgeYaw||0)*offset;
      if(!forest&&(tyre?.mark||0)>.025&&Math.abs(lateral)<(course.guideWidth||course.width)-.1)marks.contact(contact,px,pz,tyre.mark);else marks.previous[contact]=null;
     }
     // animateWheels already applied road speed; add only the physical slip/brake difference.
     for(const wheel of model.userData.wheels||[])if(wheel.name.startsWith(axle?'Wheel_R':'Wheel_F'))wheel.rotation.z+=((tyre?.wheelSpeed??car.speed)-car.speed)*dt/(model.userData.wheelRadius||.37);
    }
   }else{driftEmit[i*2]=driftEmit[i*2+1]=0;marks.release();}
   marks.update(dt,emitRubber,reduced);
  }
  for(const p of smokePool){p.life=Math.max(0,p.life-dt);p.o.visible=p.life>0;if(!p.life)continue;const age=p.maxLife-p.life,fade=p.life/p.maxLife;p.o.position.x+=dt*(2.5+ridgeWind(travel)*3)*(p.haze?.75:1);p.o.position.y+=dt*(p.haze?.20:.48);const size=p.haze?.7+age*2.5:1.15+age*3.6;p.o.scale.set(size,size*(p.haze?.26:.46),1);p.o.material.opacity=Math.min(1,age*18)*Math.sqrt(fade)*p.strength*(reduced?.20:p.haze?.19:.38);}
  driftSmoke.sync(smokePool);contactEffects.update(dt,player,reduced);
  for(let i=0;i<models.length;i++){const car=i?rival:player,b=car.crashBody;if(!b||b.impact<2||b.elapsed-(lastDust.get(b)??-1)<.12)continue;lastDust.set(b,b.elapsed);for(let j=0;j<3;j++){const p=impactPuffs[impactCursor++%impactPuffs.length];p.life=1.2;p.o.visible=true;p.o.position.copy(models[i].position);p.o.position.y+=.25;p.vx=(j-1)*1.5;p.vz=1+j;p.size=.8+Math.min(2,b.impact*.12);}}
  for(const p of impactPuffs){p.life=Math.max(0,p.life-dt);p.o.visible=p.life>0;if(!p.life)continue;p.o.position.x+=p.vx*dt;p.o.position.z+=p.vz*dt;p.o.position.y+=dt*.8;const size=p.size+(1.2-p.life)*2;p.o.scale.set(size,size*.65,1);p.o.material.opacity=p.life*.3;}impactDust.sync(impactPuffs);
  if(player.crashed&&models[0]){const p=models[0].position;sun.target.position.copy(p);sun.position.set(p.x+c*sunDirection.x+s*sunDirection.z,p.y+sunDirection.y,p.z-s*sunDirection.x+c*sunDirection.z);}
  const delta=Math.max(0,travel-last);last=travel;time+=dt;const wind=ridgeWind(travel);
  tickRidgePosts(posts,dt);for(let i=0;i<posts.length;i++){const p=posts[i];if(p.broken||p.compression>.0001||postMeshes[i].scale.y!==1){const squash=p.compression>.0001?p.compression:0;postMeshes[i].scale.set(1+squash*.3,1-squash,1+squash*.3);postAxis.set(p.direction[1]||0,0,-p.direction[0]||1).normalize();const pivot=postMeshes[i];pivot.quaternion.setFromAxisAngle(postAxis,p.angle);pivot.updateMatrixWorld(true);for(const {batch,index,child} of pivot.userData.instances){batch.mesh.setMatrixAt(index,child.matrixWorld);batch.mesh.instanceMatrix.needsUpdate=true;}}}
  for(const sock of socks){sock.rotation.y=.18*Math.sin(time*2)-o.heading*.2;const pivot=sock.parent;pivot.updateMatrixWorld(true);for(const {batch,index,child} of pivot.userData.instances){batch.mesh.setMatrixAt(index,child.matrixWorld);batch.mesh.instanceMatrix.needsUpdate=true;}}
  for(const p of puffs){const a=p.o;a.position.x+=dt*(12+wind*16);a.position.z+=delta*.9;if(a.position.x>34){a.position.x=-34;a.position.z=p.seed*140-105;}if(a.position.z>30)a.position.z-=140;a.scale.set(12+p.seed*16,.30+p.seed*.8,1);a.material.rotation=-.12;a.material.opacity=course.wind*(reduced?.035:.065)*(wind+.2)*Math.min(1,(34-Math.abs(a.position.x))/8);}
  dust.sync(puffs);sandMat.opacity=(reduced?.035:.09)*wind;for(let i=0;i<grains.length;i++){const g=grains[i];g.x+=dt*(16+wind*15);g.z+=delta;if(g.x>28)g.x-=56;if(g.z>25)g.z-=90;const k=i*6;sandPositions.set([g.x,g.y,g.z,g.x-.035-wind*.07,g.y-.01,g.z+.03],k);}sandGeo.attributes.position.needsUpdate=true;
 }
 update(0,{raceDistance:804,distance:0,speed:0,levels:[0,0,0],handling:{}},{distance:0,speed:0,levels:[0,0,0],handling:{}},[],0);
 return {scene,cfg,moving:[],collisionBoxes,posts,update,dispose(){signTextures.forEach(t=>t.dispose());dirtTexture?.dispose();contactEffects.dispose();dust.dispose();impactDust.dispose();driftSmoke.dispose();driftMarks.forEach(m=>m.dispose());for(const g of geometries)g.dispose();for(const m of materials)m.dispose();sun.shadow.map?.dispose();scene.traverse(o=>{if(o.isInstancedMesh)o.dispose();});scene.clear();}};
}
