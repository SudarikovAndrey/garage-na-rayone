import * as T from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {createGLTFLoader} from './gltf.js';
export const RESIDENT_HEIGHT=1.78;
let pending;
const clipBounds=new WeakMap();
export function loadGarageResident(){
 return pending??=(createGLTFLoader().loadAsync('assets/characters/garage-resident.glb').catch(error=>{pending=null;throw error;}));
}
// The same two-metre couch exists in every stage. Cancel its .9 decor scale:
// the supplied model is already calibrated in metres, independently of car selection.
export function addGarageResident(sofa,asset,{reduced=false,...overrides}={}){
 // Жека: базовая поза — Mixamo «Sitting Rubbing Arm» (руки разведены на 8°, чтобы кисть не тонула в груди), сценки — CC0-клипы сидя.
 return addAnimatedGarageCharacter(sofa,asset,{reduced,name:'SofaResident',scale:1/(sofa?.scale.x||1),position:[.07,0,.25],yaw:Math.PI/2,clipName:'Sitting_Rubbing_Arm',emoteEvery:[6,14],
  emotes:['Sit_Chat','Sit_Stretch','Sit_Upright','Sit_Phone','Sit_Snack','Sit_Converse','Sit_Laugh'],props:{Sit_Phone:'phone'},...overrides});
}
// emotes — имена одноразовых клипов в том же GLB: гость стоит в clipName, раз в emoteEvery[0..1] секунд
// делает случайную эмоцию с перекрёстным затуханием и возвращается в idle. reduced motion — только idle.
// props — {имяЭмоции:'mug'|'phone'}: простой предмет появляется в правой кисти на время эмоции (чай, телефон), чтобы жест читался.
const PROP_BUILDERS={
 mug(){const g=new T.Group();const body=new T.Mesh(new T.CylinderGeometry(.036,.032,.09,14),new T.MeshStandardMaterial({color:0xe8e2d2,roughness:.6}));body.position.y=.045;const handle=new T.Mesh(new T.TorusGeometry(.028,.006,8,16,Math.PI),new T.MeshStandardMaterial({color:0xe8e2d2,roughness:.6}));handle.position.set(.036,.045,0);handle.rotation.z=-Math.PI/2;const tea=new T.Mesh(new T.CircleGeometry(.03,14),new T.MeshStandardMaterial({color:0x6b3a12,roughness:.3}));tea.rotation.x=-Math.PI/2;tea.position.y=.082;g.add(body,handle,tea);return g;},
 phone(){const g=new T.Group();const m=new T.Mesh(new T.BoxGeometry(.05,.14,.018),new T.MeshStandardMaterial({color:0x2a2c30,roughness:.5}));const ant=new T.Mesh(new T.CylinderGeometry(.004,.004,.06,6),new T.MeshStandardMaterial({color:0x1a1a1a}));ant.position.set(.018,.1,0);g.add(m,ant);return g;}
};
// Кисть скелета игры: ось кости — вдоль пальцев, предмет ставим в ладонь со сдвигом и поворотом «в кулаке».
// Подобрано на стенде: ось кости Y идёт вдоль пальцев, −Z смотрит из ладони наружу, длина телефона поперёк пальцев (вдоль X).
// Кисти у моделей крупные, предметы чуть увеличены (×1.3), иначе теряются в кулаке.
const PROP_GRIP={mug:{pos:[0,.06,-.06],rot:[Math.PI/2,0,0],size:1.3},phone:{pos:[0,.07,-.045],rot:[0,0,Math.PI/2],size:1.3}};
export function addAnimatedGarageCharacter(parent,asset,{reduced=false,name='GarageGuest',scale=1,position=[0,0,0],yaw=0,clipName,clothColor,emotes=[],emoteEvery=[7,16],fade=.45,props={},propHand='Right_Hand'}={}){
 if(!parent||!asset)return null;
 const root=clone(asset.scene);root.name=name;
 root.scale.setScalar(scale);root.position.set(...position);root.rotation.y=yaw;
 const materials=new Set(),skeletons=new Set();
 root.traverse(o=>{o.userData.shared=true;if(!o.isMesh)return;
  o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
  for(const m of [].concat(o.material)){materials.add(m);m.roughness=.85;m.envMapIntensity=.45;
   if(clothColor&&/Top/i.test(m.name)){const tint=new T.Color(clothColor);m.onBeforeCompile=shader=>{shader.uniforms.clothTint={value:tint};shader.fragmentShader='uniform vec3 clothTint;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float redCloth=smoothstep(.025,.12,diffuseColor.r-max(diffuseColor.g,diffuseColor.b));
float fabricLight=max(diffuseColor.r,.02);diffuseColor.rgb=mix(diffuseColor.rgb,clothTint*fabricLight,redCloth);`);};m.customProgramCacheKey=()=> 'garage-crew-cloth-v1';}
  }
  o.castShadow=o.receiveShadow=true;o.frustumCulled=false;
  if(o.skeleton)skeletons.add(o.skeleton);
 });
 parent.add(root);
 const mixer=new T.AnimationMixer(root),clip=asset.animations.find(a=>a.name===clipName)||asset.animations[0];
 const idle=clip?mixer.clipAction(clip):null;
 const emoteActions=emotes.map(n=>asset.animations.find(a=>a.name===n)).filter(Boolean).map(c=>{const a=mixer.clipAction(c);a.setLoop(T.LoopOnce,1);a.clampWhenFinished=true;a.enabled=false;return a;});
 if(idle)idle.play();mixer.update(0);parent.updateWorldMatrix(true,true);root.updateMatrixWorld(true);
 // The supplied motion leans and reaches beyond its opening pose. Cache sampled skin
 // bounds once so the sofa fade still includes the head and hands throughout the clip.
 const poseAt=(action,t)=>{for(const a of [idle,...emoteActions])if(a){a.enabled=a===action;a.setEffectiveWeight(1);}action.play();mixer.setTime(t);root.updateMatrixWorld(true);};
 if(clip){
  let cached=clipBounds.get(asset);
  if(!cached){
   cached=new Map();
   for(const action of [idle,...emoteActions])for(let i=0;i<=16;i++){
    poseAt(action,action.getClip().duration*i/16);
    root.traverse(o=>{if(!o.isSkinnedMesh)return;o.computeBoundingBox();
     if(!cached.has(o.name))cached.set(o.name,new T.Box3());cached.get(o.name).union(o.boundingBox);
    });
   }
   for(const a of emoteActions){a.stop();a.enabled=false;}idle.enabled=true;idle.reset().play();
   root.traverse(o=>{if(o.isSkinnedMesh)cached.get(o.name).expandByScalar(.025/o.getWorldScale(new T.Vector3()).x);});
   clipBounds.set(asset,cached);
  }
  mixer.setTime(0);root.updateMatrixWorld(true);
  root.traverse(o=>{if(o.isSkinnedMesh)o.boundingBox=cached.get(o.name).clone();});
 }
 let elapsed=0,shadowElapsed=0,shadowDirty=false,disposed=false,current=null,last=null,sinceIdle=0,nextEmote=emoteEvery[0]+Math.random()*(emoteEvery[1]-emoteEvery[0]);
 const propMeshes={},hand=root.getObjectByName(propHand);
 const propFor=action=>{const kind=props[action.getClip().name];if(!kind||!hand||!PROP_BUILDERS[kind])return null;if(!propMeshes[kind]){const g=PROP_BUILDERS[kind]();const grip=PROP_GRIP[kind];g.position.set(...grip.pos);g.rotation.set(...grip.rot);g.scale.setScalar((grip.size||1)/hand.getWorldScale(new T.Vector3()).x);g.traverse(o=>{if(o.isMesh){o.castShadow=true;materials.add(o.material);}});g.visible=false;hand.add(g);propMeshes[kind]=g;}return propMeshes[kind];};
 let activeProp=null;
 const startEmote=action=>{current=action;last=action;action.enabled=true;action.reset().setEffectiveWeight(1).play();idle.crossFadeTo(action,fade,false);activeProp=propFor(action);if(activeProp)activeProp.visible=true;};
 const backToIdle=()=>{const from=current;current=null;if(activeProp){activeProp.visible=false;activeProp=null;}sinceIdle=0;nextEmote=emoteEvery[0]+Math.random()*(emoteEvery[1]-emoteEvery[0]);idle.enabled=true;idle.setEffectiveWeight(1);idle.play();from.crossFadeTo(idle,fade,false);};
 const onFinished=e=>{if(e.action===current)backToIdle();};
 mixer.addEventListener('finished',onFinished);
 return {root,mixer,poseAt,emotes:emoteActions.map(a=>a.getClip().name),playEmote(n){const a=emoteActions.find(a=>a.getClip().name===n);if(a&&!current)startEmote(a);return !!a;},update(dt){
  if(disposed||reduced||!clip)return false;
  elapsed+=dt;if(elapsed<1/24)return false;
  mixer.update(elapsed);shadowElapsed+=elapsed;
  if(!current&&emoteActions.length){sinceIdle+=elapsed;if(sinceIdle>=nextEmote){const pool=emoteActions.length>1?emoteActions.filter(a=>a!==last):emoteActions;startEmote(pool[Math.floor(Math.random()*pool.length)]);}}
  elapsed=0;
  if(shadowElapsed>=.2){shadowElapsed%=.2;shadowDirty=true;}
  return true;
 },takeShadowDirty(){const dirty=shadowDirty;shadowDirty=false;return dirty;},dispose(){if(disposed)return;disposed=true;mixer.removeEventListener('finished',onFinished);mixer.stopAllAction();mixer.uncacheRoot(root);root.removeFromParent();materials.forEach(m=>m.dispose());skeletons.forEach(s=>s.dispose());}};
}
