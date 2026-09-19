import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {applyFullBodyDecal,applyGlassBanner} from './decal-projection.js';
// Гараж в метрах: машины 3.2–4.7 м, комната 8.6×7.6 м. Этот модуль приводит реквизит к тем же метрам
// (кирпич 25 см, шины 60 см, диван 2 м, телевизор 21"), ставит четырёхстоечный подъёмник вокруг машины
// с IV уровня, прячет всё, что попадает между камерой и машиной, и кладёт дешёвое отражение в пол:
// зеркальная копия машины под полупрозрачным полом, один лишний проход без render target.
export const BRICK_UV_SCALE=2.7;   // плитка кирпича 3.0 м → 1.1 м: кирпич 25 см, ряд 8.5 см
export const LIFT_HEIGHT=.13;      // высота дорожек четырёхстоечного подъёмника
export const LIFT_LEVEL=4;         // с «Районного сервиса»
export const FLOOR_OPACITY={concrete:.88,cream:.7};
export const OCCLUDER_OPACITY=.12;
export const CAR_SPOT={x:0,z:.4,yaw:Math.PI-.08};
const scratch={a:new T.Vector3(),b:new T.Vector3(),box:new T.Box3(),size:new T.Vector3()};
// Uses the world bbox of a node and rescales it about its own centre (also for nodes whose geometry is baked in world space).
function scaleAbout(node,s,lift=0){node.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(node),c=box.getCenter(new T.Vector3());node.position.set(c.x+(node.position.x-c.x)*s,c.y+(node.position.y-c.y)*s+lift,c.z+(node.position.z-c.z)*s);node.scale.multiplyScalar(s);node.updateWorldMatrix(true,true);}
// The slab under the floor loses its top face so the mirrored car shows through the translucent floor.
function openSlabTop(room,owned){const slab=room.getObjectByName('Floor__Powdercoat_charcoal');if(!slab?.geometry)return;slab.updateWorldMatrix(true,false);const g=slab.geometry.clone(),p=g.attributes.position,v=new T.Vector3(),index=g.index,total=index?index.count:p.count,keep=[];
 for(let i=0;i<total;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(ids.every(id=>v.fromBufferAttribute(p,id).applyMatrix4(slab.matrixWorld).y>-.06))continue;keep.push(...ids);}
 g.setIndex(keep);slab.geometry=g;owned.push(g);}
const corners=Array.from({length:8},()=>new T.Vector3()),inverse=new T.Matrix4();
function rect(box,inv){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,near=-1e9;for(let i=0;i<8;i++){const c=corners[i].set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).applyMatrix4(inv);if(c.x<x0)x0=c.x;if(c.x>x1)x1=c.x;if(c.y<y0)y0=c.y;if(c.y>y1)y1=c.y;if(c.z>near)near=c.z;}return {x0,x1,y0,y1,near};}
let debugAt=0; // ?garageDebug logs occluder rects once every 1.5 s
export function arrangeGarage(scene,room,level,options={}){
 const owned=[],occluders=[],lift=level>=LIFT_LEVEL;let mirror=null,car=null;
 const carBounds=new T.Box3(),defaultBounds=new T.Box3(new T.Vector3(CAR_SPOT.x-2.1,0,CAR_SPOT.z-.9),new T.Vector3(CAR_SPOT.x+2.1,1.5,CAR_SPOT.z+.9));
 // 1. Кирпич: та же текстура, в 2.7 раза плотнее — 25-сантиметровый кирпич вместо 65-сантиметрового.
 room.traverse(o=>{if(!o.isMesh||!/__Old_brick$/.test(o.name)||!o.geometry.attributes.uv)return;const g=o.geometry.clone(),src=g.attributes.uv,arr=new Float32Array(src.count*2);for(let i=0;i<src.count;i++){arr[i*2]=src.getX(i)*BRICK_UV_SCALE;arr[i*2+1]=src.getY(i)*BRICK_UV_SCALE;}g.setAttribute('uv',new T.BufferAttribute(arr,2));o.geometry=g;owned.push(g);/* quantized UVs cannot hold values above 1, hence the float copy */});
 // 2. Шины: стойка на западной стене и стопка у ворот были с метровыми колёсами.
 const rack=room.getObjectByName('Stage_5_5002');if(rack)scaleAbout(rack,.62,.12);
 const stack=room.getObjectByName('Stage_1_1__Rubber');if(stack)scaleAbout(stack,.76);
 // 3. Подъёмник: двухстоечный из GLB уходит, вместо него четырёхстоечный вокруг машины.
 const twoPost=room.getObjectByName('Upgrade3');if(twoPost)twoPost.visible=false;
 const liftGroup=new T.Group();liftGroup.name='FourPostLift';liftGroup.position.set(CAR_SPOT.x,0,CAR_SPOT.z);liftGroup.rotation.y=CAR_SPOT.yaw;liftGroup.visible=lift;scene.add(liftGroup);
 {const blue=new T.MeshStandardMaterial({color:options.liftColor??0x2f5d86,roughness:.42,metalness:.35}),steel=new T.MeshStandardMaterial({color:0x6d7579,roughness:.38,metalness:.8}),grip=new T.MeshStandardMaterial({color:0x2a2d30,roughness:.85});
  const mesh=(geo,m,pos,rot=[0,0,0],name='',parent=liftGroup)=>{const o=new T.Mesh(geo,m);o.position.set(...pos);o.rotation.set(...rot);o.castShadow=o.receiveShadow=true;o.name=name;parent.add(o);owned.push(geo);return o;};
  const posts=[];for(const x of [-2.55,2.55])for(const z of [-1.42,1.42]){const post=mesh(new RoundedBoxGeometry(.2,2.25,.2,2,.015),blue.clone(),[x,1.125,z],[0,0,0],'Lift_post'),trim=steel.clone();/* own materials: a faded post takes its plate, cap and lock ladder with it, never the runways */mesh(new T.BoxGeometry(.34,.02,.34),trim,[0,-1.115,0],[0,0,0],'',post);mesh(new T.BoxGeometry(.24,.06,.24),trim,[0,1.155,0],[0,0,0],'',post);for(let i=0;i<9;i++)mesh(new T.BoxGeometry(.05,.03,.22),trim,[x>0?-.12:.12,-.775+i*.2,0],[0,0,0],'',post);posts.push(post);}
  liftGroup.updateWorldMatrix(true,true);if(lift)for(const post of posts)registerOccluder(post);
  for(const z of [-.72,.72]){mesh(new T.BoxGeometry(4.9,LIFT_HEIGHT,.56),blue,[0,LIFT_HEIGHT/2,z],[0,0,0],'Lift_runway');mesh(new T.BoxGeometry(4.7,.004,.46),grip,[0,LIFT_HEIGHT+.002,z]);mesh(new T.BoxGeometry(.06,.07,.5),steel,[2.42,LIFT_HEIGHT+.035,z]);mesh(new T.BoxGeometry(.5,LIFT_HEIGHT,.56),blue,[-2.7,LIFT_HEIGHT/2-.03,z],[0,0,.47]);}
  for(const x of [-2.4,2.4])mesh(new T.BoxGeometry(.16,.12,2.86),steel,[x,.07,0]);
  for(const x of [-2.4,2.4])for(const z of [-1.42,1.42])mesh(new T.CylinderGeometry(.006,.006,2.1,6),steel,[x+(x>0?-.06:.06),1.12,z+(z>0?-.14:.14)]);
 }
 // 4. Пол: полупрозрачный над зеркальной машиной; плита под ним без верхней грани.
 const floors=[],floorRoot=room.getObjectByName('Floor');floorRoot?.updateWorldMatrix(true,true);
 floorRoot?.traverse(o=>{if(!o.isMesh||/Powdercoat[ _]charcoal$/.test(o.name))return;const box=new T.Box3().setFromObject(o),size=box.getSize(scratch.size);if(size.y>.05||size.x<3||size.z<3)return;const cream=/Fresh[ _]workshop[ _]cream$|Aged[ _]paper$/.test(o.name);floors.push([o.material,cream?FLOOR_OPACITY.cream:FLOOR_OPACITY.concrete]);});
 for(const [m,opacity] of floors){m.transparent=true;m.opacity=opacity;m.depthWrite=true;m.color.multiplyScalar(1/opacity);}/* the floor keeps its brightness over the dark background; only the reflection shows through */
 openSlabTop(room,owned);
 // 5. Загораживающий реквизит из GLB: верстак у южной стены, шкафчик, створки ворот, стопки.
 for(const name of ['Stage_4_5002','Upgrade2','Gate_leaf','Gate_leaf001','Stage_1_1__Rubber'])registerOccluder(room.getObjectByName(name));
 for(const o of options.occluders||[])registerOccluder(o);
 function registerOccluder(object){if(!object)return;object.updateWorldMatrix(true,true);const box=new T.Box3().setFromObject(object);if(box.isEmpty())return;const size=box.getSize(new T.Vector3());if(size.y<.5)return;const mats=new Set();object.traverse(m=>{if(m.isMesh){if(Array.isArray(m.material))return;mats.add(m.material);}});
  // Transparent from the first frame: a program compiled opaque carries #define OPAQUE and ignores opacity for good.
  for(const m of mats){m.transparent=true;m.forceSinglePass=true;m.opacity=1;}
  occluders.push({object,box,center:box.getCenter(new T.Vector3()),materials:[...mats],opacity:1});}
 function setCar(next){
  car=next;carBounds.makeEmpty();if(mirror){scene.remove(mirror);mirror.traverse(o=>{if(o.isMesh)o.material.dispose();});mirror=null;}
  if(!car)return;
  car.position.y=lift?LIFT_HEIGHT:0;car.updateWorldMatrix(true,true);carBounds.setFromObject(car);if(carBounds.isEmpty())carBounds.copy(defaultBounds);
  mirror=new T.Group();mirror.name='GarageFloorMirror';mirror.matrixAutoUpdate=false;
  car.traverse(o=>{if(!o.isMesh||!o.visible)return;const m=Array.isArray(o.material)?o.material[0]:o.material;if(!m||m.isShaderMaterial||m.isRawShaderMaterial)return;const clone=m.clone();clone.transparent=false;clone.opacity=1;/* Глубина у зеркала включена: иначе спойлер просвечивает сквозь бампер, а силуэт выворачивается — детали рисуются в порядке обхода, не по расстоянию. */clone.depthTest=true;clone.depthWrite=true;if(clone.emissive&&clone.color&&!m.userData.indicator){clone.emissive.copy(clone.color).multiplyScalar(m.userData.decal?.14:.28).add(clone.emissive);clone.emissiveIntensity=Math.max(1,clone.emissiveIntensity||1);}/* the mirrored body is lit from below, so lift it a little */clone.onBeforeCompile=()=>{};clone.customProgramCacheKey=()=>'garage-mirror-'+m.type;/* no box-projected probe on the mirror; key per material type so programs are not shared across types */if(m.userData.decal){if(/glass/i.test(m.name))applyGlassBanner(clone,m.userData.decal,m.userData.decalFit||m.userData.decalSpan,m.color,m.userData.glass);else applyFullBodyDecal(clone,m.userData.decal,m.userData.decalFit||m.userData.decalSpan,m.color);}/* декаль клон получает заново: clone() хуки шейдера не копирует, и без этого в полу отражалась чистая машина */const mesh=new T.Mesh(o.geometry,clone);mesh.userData.source=o;mesh.matrixAutoUpdate=false;mesh.matrix.copy(o.matrixWorld);mesh.matrixWorldNeedsUpdate=true;mesh.renderOrder=-1000;mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;mirror.add(mesh);});
  mirror.matrix.makeScale(1,-1,1);mirror.matrixWorldNeedsUpdate=true;mirror.renderOrder=-1000;scene.add(mirror);
 }
 // Reflection follows the car every frame; props between camera and car fade to a ghost.
 function update(camera,current=car,blend=.12){
  let changed=false;if(current&&current!==car)setCar(current);
  if(mirror&&car){car.updateWorldMatrix(true,true);for(const m of mirror.children){const src=m.userData.source;let vis=true,p=src;while(p&&p!==car){if(!p.visible){vis=false;break;}p=p.parent;}m.visible=vis&&src.visible;if(m.visible){m.matrix.copy(src.matrixWorld);m.matrixWorldNeedsUpdate=true;}}}
  if(!camera)return changed;
  // Screen-space test in camera space (orthographic): a prop fades when its projected box overlaps the car's and it is nearer.
  camera.updateMatrixWorld();inverse.copy(camera.matrixWorld).invert();
  const carBox=car?carBounds:defaultBounds,carRect=rect(carBox,inverse);
  const debug=typeof location!=='undefined'&&/garageDebug/.test(location.search)&&(debugAt=(debugAt||0))<(typeof performance!=='undefined'?performance.now():0)-1500&&(debugAt=performance.now());
  if(debug)console.log('[garage] car rect',JSON.stringify(carRect),'box',JSON.stringify(carBox));
  for(const oc of occluders){const r=rect(oc.box,inverse),depth=scratch.b.copy(oc.center).applyMatrix4(inverse).z;if(debug)console.log('[garage]',oc.object.name,'rect',JSON.stringify(r),'depth',depth.toFixed(2),'opacity',oc.opacity.toFixed(2));
   const overlaps=r.x1>carRect.x0+.12&&r.x0<carRect.x1-.12&&r.y1>carRect.y0+.12&&r.y0<carRect.y1-.12,/* must intrude 12 cm into the car's silhouette: a post standing beside the car end-on stays solid */front=depth>carRect.near-.6&&overlaps,/* at least as near as the car's nearest corner: a post at the near corner fades, one at the far corner stays */target=front?OCCLUDER_OPACITY:1;
   if(Math.abs(oc.opacity-target)<.004){if(oc.opacity!==target){oc.opacity=target;apply(oc);}continue;}
   oc.opacity=blend>=1?target:T.MathUtils.lerp(oc.opacity,target,blend);apply(oc);changed=true;}
  return changed;
 }
 let shadowDirty=false;
 // Тени декора меняются только когда призрак переходит порог .6 — об этом сообщает takeShadowDirty(), и game.js тогда пересчитывает теневую карту.
 function apply(oc){for(const m of oc.materials){m.opacity=oc.opacity;m.depthWrite=oc.opacity>.5;}const cast=oc.opacity>.6;if(oc.cast!==cast){oc.cast=cast;shadowDirty=true;if(oc.object.castShadow!==undefined)oc.object.traverse(o=>{if(o.isMesh)o.castShadow=cast;});}}
 function takeShadowDirty(){const d=shadowDirty;shadowDirty=false;return d;}
 function syncMirror(){if(!mirror)return;for(const mesh of mirror.children){const src=mesh.userData.source?.material;if(src?.userData.indicator)mesh.material.emissiveIntensity=src.emissiveIntensity;}}
 return {lift,liftGroup,occluders,setCar,update,syncMirror,takeShadowDirty,dispose(){for(const g of owned)g.dispose();if(mirror){scene.remove(mirror);mirror.traverse(o=>{if(o.isMesh)o.material.dispose();});}scene.remove(liftGroup);}};
}
