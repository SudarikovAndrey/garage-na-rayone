import {MOBILE_RENDER} from './render-quality.js';
import {batchCarShadows} from './car-shadow-batch.js';
import * as T from 'three';
// Legacy single-map coverage remains for the ridge/overpass worlds. Drag races
// override it with a permanent far map plus a separate detail map below.
export const SHADOW_ROAD={left:-28,right:28,back:26,ahead:-70,padding:6};
export function configureRaceShadow(light,coverage=SHADOW_ROAD,distance=180){
 const dir=light.position.clone().sub(light.target.position).normalize();
 const center=new T.Vector3(0,0,(coverage.ahead+coverage.back)/2);
 light.target.position.copy(center);light.position.copy(center).addScaledVector(dir,distance);
 light.updateMatrixWorld(true);light.target.updateMatrixWorld(true);light.shadow.updateMatrices(light);
 const camera=light.shadow.camera,box=new T.Box3(),p=new T.Vector3();
 for(const x of [coverage.left,coverage.right])for(const z of [coverage.ahead,coverage.back])box.expandByPoint(p.set(x,0,z).applyMatrix4(camera.matrixWorldInverse));
 Object.assign(camera,{left:box.min.x-coverage.padding,right:box.max.x+coverage.padding,bottom:box.min.y-coverage.padding,top:box.max.y+coverage.padding,near:1,far:distance*2+40});
 camera.updateProjectionMatrix();light.shadow.autoUpdate=true;light.shadow.needsUpdate=true;
}
// Windows, joints, thin trim and markings do not need separate shadow draws.
export function isMajorCaster(size,kind){
 if(kind==='detail')return false;
 if(kind==='sphere')return Math.min(...size)>.35;
 if(kind==='cylinder')return size[1]>1&&size[0]>.06;
 // Плоская плита перекрытия ниже 35 см, но это целый этаж дома: по площади она и даёт тень на дорогу.
 if(size[0]>2.5&&size[2]>2.5)return true;
 return size[1]>.35&&((size[0]>.28&&size[2]>.28)||(size[1]>3&&Math.min(size[0],size[2])>.06));
}
export function shadowOnlyMaterial(){return new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,side:T.FrontSide});}
// Continuous separable filters: 4x4 tent for drag cascades, legacy 3x3 quadratic
// for other worlds. No frame-dependent noise or additional shadow map.
export function continuousShadowChunk(){
 return T.ShaderChunk.shadowmap_pars_fragment.replace(
  /#if defined\( SHADOWMAP_TYPE_PCF \)[\s\S]*?#elif defined\( SHADOWMAP_TYPE_PCF_SOFT \)/,
  `#if defined( SHADOWMAP_TYPE_PCF )
   vec2 texelSize=1.0/shadowMapSize;
   #ifdef RACE_SHADOW_CASCADES
   {
    // Continuous 4x4 tent on both cascades; dense near coverage keeps contacts crisp.
    vec2 cell=shadowCoord.xy*shadowMapSize-.5, ff=fract(cell);
    vec2 base=(floor(cell)+.5)*texelSize;
    vec4 ax=vec4(1.-ff.x,2.-ff.x,1.+ff.x,ff.x)*.25;
    vec4 ay=vec4(1.-ff.y,2.-ff.y,1.+ff.y,ff.y)*.25;
    shadow=0.;
    for(int y=0;y<4;y++)for(int x=0;x<4;x++)shadow+=ax[x]*ay[y]*texture2DCompare(shadowMap,base+(vec2(float(x),float(y))-1.)*texelSize,shadowCoord.z);
   }
   #else
   vec2 grid=shadowCoord.xy*shadowMapSize, f=fract(grid);
   vec2 uv=(floor(grid)+0.5)*texelSize;
   vec3 wx=vec3(.5*(1.-f.x)*(1.-f.x),.75-(f.x-.5)*(f.x-.5),.5*f.x*f.x);
   vec3 wy=vec3(.5*(1.-f.y)*(1.-f.y),.75-(f.y-.5)*(f.y-.5),.5*f.y*f.y);
   shadow=0.;
   for(int y=0;y<3;y++)for(int x=0;x<3;x++)
    shadow+=wx[x]*wy[y]*texture2DCompare(shadowMap,uv+(vec2(float(x),float(y))-1.)*texelSize,shadowCoord.z);
   #endif
   #elif defined( SHADOWMAP_TYPE_PCF_SOFT )`);
}
const emptyContact={raceContactDensity:{value:0},raceContactPose:{value:[new T.Vector4(),new T.Vector4()]},raceContactSize:{value:[new T.Vector4(),new T.Vector4()]},raceContactWheels:{value:[new T.Vector4(),new T.Vector4()]}};
const filteredMaterials=new WeakSet();
// Cars use the same continuous filter; only road receivers need the outer guard band.
export function filterShadow(material,{fadeBoundary=false}={}){
 if(filteredMaterials.has(material))return material;filteredMaterials.add(material);
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  (shader.uniforms??={}).raceBoundary={value:fadeBoundary?1:0};
  shader.uniforms.raceContactEnabled={value:fadeBoundary&&this._raceContact&&this.userData.raceContactReceiver?1:0};
  shader.fragmentShader='uniform float raceBoundary;uniform float raceContactEnabled;\n'+shader.fragmentShader;
  let chunk=continuousShadowChunk();chunk=chunk.replace('return mix( 1.0, shadow, shadowIntensity );',`#ifndef RACE_SHADOW_CASCADES
  float edgeDistance = min(min(shadowCoord.x, 1.0-shadowCoord.x), min(shadowCoord.y, 1.0-shadowCoord.y));
  return mix(1.0, shadow, shadowIntensity * mix(1.0,smoothstep(0.0, 0.055, edgeDistance),raceBoundary));
  #else
  return mix(1.0, shadow, shadowIntensity);
  #endif`);
  if(this.defines?.RACE_SHADOW_CASCADES){
   shader.vertexShader='varying float raceWorldZ;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nraceWorldZ=(modelMatrix*vec4(transformed,1.)).z;');
   shader.uniforms.raceHazeRange=this._raceHaze?.raceHazeRange||{value:new T.Vector2(140,195)};
   shader.fragmentShader='varying float raceWorldZ;uniform vec2 raceHazeRange;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>',`#include <fog_fragment>
    #ifdef USE_FOG
    gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,smoothstep(raceHazeRange.x,raceHazeRange.y,abs(raceWorldZ))*raceBoundary);
    #endif`);
  }
  if(this.defines?.RACE_SHADOW_CASCADES){
   Object.assign(shader.uniforms,this._raceContact||emptyContact);
   shader.vertexShader='varying vec3 raceContactWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nraceContactWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader=CONTACT_SAMPLE+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
    float contactVisibility=raceContactEnabled>.5?raceContactVisibility():1.;
    reflectedLight.indirectDiffuse*=contactVisibility;
    reflectedLight.indirectSpecular*=contactVisibility;`);
  }
  shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',chunk+CASCADE_SAMPLE);
  if(this.defines?.RACE_SHADOW_CASCADES)shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin.replace(/directLight.color \*= \( directLight.visible && receiveShadow \) \? getShadow\( directionalShadowMap\[ i \],[^;]+;/,`
   #if UNROLLED_LOOP_INDEX == 0
    directLight.color *= (directLight.visible && receiveShadow) ? raceCascadeShadow() : 1.0;
   #endif`));
 };
 material.customProgramCacheKey=()=> key+'-shadow-continuous-v8';
 return material;
}

export const softenShadowBoundary=material=>filterShadow(material,{fadeBoundary:true});

// Local ambient occlusion in the road's lighting, not a projected second sun shadow.
// Only indirect light is attenuated; headlights, neon and direct sun remain intact.
const CONTACT_SAMPLE=`
varying vec3 raceContactWorld;
uniform float raceContactDensity;
uniform vec4 raceContactPose[2],raceContactSize[2],raceContactWheels[2];
float raceContactVisibility(){
 if(raceContactWorld.y>.09)return 1.;
 float visibility=1.;
 for(int i=0;i<2;i++){
  vec4 size=raceContactSize[i],pose=raceContactPose[i],w=raceContactWheels[i];
  if(size.z<=0.)continue;
  vec2 delta=raceContactWorld.xz-pose.xy;
  if(dot(delta,delta)>36.)continue;
  vec2 p=vec2(dot(delta,vec2(pose.z,-pose.w)),dot(delta,pose.wz));
  vec2 edge=abs(p)-max(size.xy-vec2(.32,.17),vec2(.1));
  float body=(1.-smoothstep(-.16,.12,max(edge.x,edge.y)))*mix(.72,.86,raceContactDensity);
  float along=min(abs(p.x-w.x),abs(p.x-w.y));
  float across=abs(abs(p.y)-w.z);
  float tyre=1.-smoothstep(.25,1.,length(vec2(along/.20,across/.13)));
  // Fade on a lift/jump. Occlusion stays within the body/wheel footprint.
  visibility*=1.-max(body,tyre*mix(.94,.98,raceContactDensity))*size.z;
 }
 return visibility;
}
`;

// Two overlapping maps represent ONE sun: select/blend visibility, never add shadows.
// Most fragments sample only one map. The overlap samples both without a visible seam.
const CASCADE_SAMPLE=`
#if defined(RACE_SHADOW_CASCADES) && defined(USE_SHADOWMAP) && NUM_DIR_LIGHT_SHADOWS == 2
float raceCascadeShadow(){
 vec3 n=vDirectionalShadowCoord[1].xyz/vDirectionalShadowCoord[1].w;
 float edge=min(min(n.x,1.-n.x),min(n.y,1.-n.y));
 float weight=smoothstep(0.02,0.18,edge)*step(0.,n.z)*step(n.z,1.);
 float nearShadow=1.;
 if(weight>0.)nearShadow=getShadow(directionalShadowMap[1],directionalLightShadows[1].shadowMapSize,directionalLightShadows[1].shadowIntensity,directionalLightShadows[1].shadowBias,directionalLightShadows[1].shadowRadius,vDirectionalShadowCoord[1]);
 if(weight>=1.)return nearShadow;
 vec3 f=vDirectionalShadowCoord[0].xyz/vDirectionalShadowCoord[0].w;
 float farEdge=min(min(f.x,1.-f.x),min(f.y,1.-f.y));
 float farShadow=getShadow(directionalShadowMap[0],directionalLightShadows[0].shadowMapSize,directionalLightShadows[0].shadowIntensity,directionalLightShadows[0].shadowBias,directionalLightShadows[0].shadowRadius,vDirectionalShadowCoord[0]);
 farShadow=mix(1.,farShadow,smoothstep(0.,0.12,farEdge));
 return mix(farShadow,nearShadow,weight);
}
#endif
`;

export class RaceShadowCascades{
 constructor(light,scene){
  this.carBatches=new Map();this.light=light;this.scene=scene;this.point=new T.Vector3();this.materials=new WeakSet();
  this.haze={raceHazeRange:{value:new T.Vector2(140,195)}};
  this.contact={raceContactDensity:{value:0},raceContactPose:{value:[new T.Vector4(),new T.Vector4()]},raceContactSize:{value:[new T.Vector4(),new T.Vector4()]},raceContactWheels:{value:[new T.Vector4(),new T.Vector4()]}};
  configureRaceShadow(light,{left:-38,right:38,ahead:-280,back:240,padding:18},450);
  this.farBounds={};for(const key of ['left','right','bottom','top'])this.farBounds[key]=light.shadow.camera[key];
  // Zero-energy carrier: Three owns the second depth map, the shader uses it for the first sun.
  const near=this.near=new T.DirectionalLight(light.color,0);near.name='RaceDetailShadow';near.castShadow=true;
  near.position.copy(light.position);near.target.position.copy(light.target.position);scene.add(near,near.target);
  near.updateMatrixWorld(true);near.target.updateMatrixWorld(true);near.shadow.updateMatrices(near);
  Object.assign(near.shadow.camera,{near:1,far:1000});
 }
 setMainSource(source){
  if(this.mainSource===source)return;
  if(this.mainSource)this.mainSource.castShadow=false;
  this.mainSource=source;
  if(source){source.castShadow=true;this.light.castShadow=false;this.near.castShadow=false;}
  else{this.light.castShadow=true;this.near.castShadow=true;}
 }
 setDirection(direction){
  if(this.direction&&this.direction.distanceToSquared(direction)<1e-7)return;
  this.direction=direction.clone();
  this.light.position.copy(this.light.target.position).addScaledVector(direction,450);
  configureRaceShadow(this.light,{left:-38,right:38,ahead:-280,back:240,padding:18},450);
  for(const key of ['left','right','bottom','top'])this.farBounds[key]=this.light.shadow.camera[key];
  this.near.position.copy(this.light.position);this.near.target.position.copy(this.light.target.position);
 }
 update(scene,camera){
  if(MOBILE_RENDER){
   for(const [root,batch] of this.carBatches){if(root.parent!==scene){batch.dispose();this.carBatches.delete(root);}else batch.update();}
   for(const root of scene.children)if(root.userData?.racing&&!this.carBatches.has(root))this.carBatches.set(root,batchCarShadows(root));
  }
  this.near.updateMatrixWorld();this.near.target.updateMatrixWorld();this.near.shadow.updateMatrices(this.near);
  const far=this.light.shadow,near=this.near.shadow,c=near.camera;
  // Scroll the far sampling grid with the scenery, modulo a whole texel. Static
  // poles keep identical raster coverage instead of blinking between depth texels.
  const fc=far.camera,b=this.farBounds,fe=fc.matrixWorldInverse.elements,travel=scene.userData.raceTravel||0;
  const fx=(travel*fe[8])%((b.right-b.left)/far.mapSize.x),fy=(travel*fe[9])%((b.top-b.bottom)/far.mapSize.y);
  Object.assign(fc,{left:b.left+fx,right:b.right+fx,bottom:b.bottom+fy,top:b.top+fy});fc.updateProjectionMatrix();
  this.near.castShadow=this.light.castShadow;
  const size=far.mapSize.x<=512?1024:1536;
  if(near.mapSize.x!==size){near.map?.dispose();near.map=null;near.mapSize.set(size,size);}
  near.normalBias=.018;near.bias=-.000035;near.radius=1;near.autoUpdate=true;
  // Fixed world-space footprint: camera height and FOV cannot change its texel density.
  const actor=scene.children.find(root=>root.userData?.racing&&root.visible);
  let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
  for(const x of [-7,7])for(const y of [0,3])for(const z of [-18,18]){
   const p=this.point.set(x,y,z).applyMatrix4(c.matrixWorldInverse);
   left=Math.min(left,p.x);right=Math.max(right,p.x);bottom=Math.min(bottom,p.y);top=Math.max(top,p.y);
  }
  const w=right-left+4,h=top-bottom+4,tx=w/size,ty=h/size;
  const rival=scene.children.find(root=>root!==actor&&root.userData?.racing&&root.visible);
  for(let i=0;i<2;i++){
   const root=i?rival:actor,u=root?.userData.groundLight?.uniforms;
   const size=this.contact.raceContactSize.value[i];size.set(0,0,0,0);
   if(!root||!u)continue;
   this.contact.raceContactPose.value[i].set(root.position.x,root.position.z,Math.cos(root.rotation.y),Math.sin(root.rotation.y));
   size.set(u.shadowHalf.value.x,u.shadowHalf.value.y,u.lift.value,root.position.y);
   this.contact.raceContactWheels.value[i].set(u.wheelX.value.x,u.wheelX.value.y,u.wheelZ.value,u.wheelR.value.y);
  }
  const e=c.matrixWorldInverse.elements,ax=actor?.position.x||0;
  const az=(actor?.position.z||0)+T.MathUtils.clamp(((rival?.position.z??actor?.position.z??0)-(actor?.position.z||0))*.5,-12,12);
  const cx=Math.round(((left+right)*.5+ax*e[0]+az*e[8])/tx)*tx,cy=Math.round(((bottom+top)*.5+ax*e[1]+az*e[9])/ty)*ty;
  Object.assign(c,{left:cx-w*.5,right:cx+w*.5,bottom:cy-h*.5,top:cy+h*.5});c.updateProjectionMatrix();
  scene.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material]){
   if(!m?.isMeshStandardMaterial||this.materials.has(m))continue;
   m._raceHaze=this.haze;
   if(m.userData.raceContactReceiver)m._raceContact=this.contact;filterShadow(m);m.defines={...m.defines,RACE_SHADOW_CASCADES:1};m.needsUpdate=true;this.materials.add(m);
  }});
 }
 resetCars(){for(const batch of this.carBatches.values())batch.dispose();this.carBatches.clear();for(const size of this.contact.raceContactSize.value)size.set(0,0,0,0);}
 dispose(){this.resetCars();this.near.shadow.map?.dispose();this.near.removeFromParent();this.near.target.removeFromParent();}
}
