import * as T from 'three';
import {createPuddleAtlas} from './puddle-atlas.js';
import {generatePuddleLayout,seededRandom,trackPuddleOptions} from './puddle-layout.js';
import {createWetnessField} from './puddle-field.js';
import {vehicleAnchors} from './vehicle-effects.js';

// Small seamless slope field. Random local disturbances instead of two coherent
// sine waves, which became zebra bands across the sunset reflection.
export function createWaterRippleTexture(){
 const size=128,random=seededRandom(58321),height=Float32Array.from({length:size*size},()=>random()),smooth=new Float32Array(size*size);
 const at=(a,x,y)=>a[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let sum=0;for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++)sum+=at(height,x+i,y+j)*(3-Math.abs(i))*(3-Math.abs(j));
  smooth[y*size+x]=sum/81;
 }
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const k=(y*size+x)*4;
  data[k]=Math.round(127.5+T.MathUtils.clamp((at(smooth,x+1,y)-at(smooth,x-1,y))*5,-1,1)*127.5);
  data[k+1]=Math.round(127.5+T.MathUtils.clamp((at(smooth,x,y+1)-at(smooth,x,y-1))*5,-1,1)*127.5);
  data[k+2]=128;data[k+3]=255;
 }
 const texture=new T.DataTexture(data,size,size);texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

// Shared by the actual puddle geometry, wheel contact tests and road materials.
// No raycasts, extra lights, reflection cameras or render targets.
// Лужа: неправильный контур (три гармоники по углу), мягкий край через атрибут puddleAlpha, зеркальный материал,
// Shared scene environment supplies reflected sky/city. Car mirrors are disabled in live races.
export function puddleGeometry(radius,rand=Math.random,segments=40){
 const p1=rand()*6.28,p2=rand()*6.28,p3=rand()*6.28,rim=[];
 for(let i=0;i<segments;i++){const t=i/segments*Math.PI*2;rim.push(radius*(1+.14*Math.sin(2*t+p1)+.09*Math.sin(3*t+p2)+.05*Math.sin(5*t+p3)));}
 const pos=[0,0,0],alpha=[1],uv=[.5,.5],idx=[];
 for(let i=0;i<segments;i++){const t=i/segments*Math.PI*2,r=rim[i];pos.push(Math.cos(t)*r*.84,Math.sin(t)*r*.84,0);alpha.push(1);uv.push(.5+Math.cos(t)*.42,.5+Math.sin(t)*.42);}
 for(let i=0;i<segments;i++){const t=i/segments*Math.PI*2,r=rim[i];pos.push(Math.cos(t)*r,Math.sin(t)*r,0);alpha.push(0);uv.push(.5+Math.cos(t)*.5,.5+Math.sin(t)*.5);}
 for(let i=0;i<segments;i++){const n=(i+1)%segments;idx.push(0,1+i,1+n);idx.push(1+i,1+segments+i,1+segments+n,1+i,1+segments+n,1+n);}
 const g=new T.BufferGeometry();g.setAttribute('puddleStyle',new T.Float32BufferAttribute(Array.from({length:pos.length/3},()=>[0,.075,75,170]).flat(),4));g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('puddleAlpha',new T.Float32BufferAttribute(alpha,1));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));const tile=Math.min(7,Math.floor(p1/6.28*8)),atlasUV=uv.map((v,i)=>(v*.98+.01+(i%2?tile>>2:tile%4))/(i%2?2:4));g.setAttribute('puddleUv',new T.Float32BufferAttribute(atlasUV,2));g.userData.puddleTile=tile;g.userData.puddleRim=rim.map(r=>r/radius);g.setIndex(idx);g.computeVertexNormals();return g;
}
// Per-instance data is baked into the existing chunk batch, not new materials/draws.
export function layoutPuddleGeometry(p,c){
 const g=puddleGeometry(1,seededRandom(p.shapeSeed),p.sizeClass==='tiny'?12:28),uv=g.attributes.uv,a=g.attributes.puddleUv,style=g.attributes.puddleStyle;
 const kind=p.kind==='curb'?3:p.kind==='rut'?4:p.role==='primary'?0:p.role==='secondary'?1:2;
 const scale=p.sizeClass==='tiny'?.25:p.role==='primary'?1:.55;
 for(let i=0;i<uv.count;i++){
  const u=p.mirror?1-uv.getX(i):uv.getX(i);a.setXY(i,(u*.98+.01+p.tile%4)/4,(uv.getY(i)*.98+.01+(p.tile>>2))/2);
  style.setXYZW(i,kind,p.roughness,c.midDistance*scale,c.farDistance*scale);
 }
 g.userData.puddleTile=p.tile;g.userData.puddleMirror=p.mirror;
 return g;
}
const wakeGLSL=`uniform vec4 wetWakes[12];
float waterWake(vec2 p){float disturbance=0.;for(int i=0;i<12;i++){vec4 w=wetWakes[i];if(w.w>0.){vec2 d=p-w.xy;if(dot(d,d)>16.)continue;float age=w.z;float radius=.16+age*.7;float ripple=.5+.5*sin(length(d)*24.-age*18.);vec2 cut=d/vec2(.11+age*.12,.5+w.w*1.6);float track=exp(-dot(cut,cut)*2.);disturbance+=w.w*(track+exp(-dot(d,d)/(radius*radius))*ripple*.6)*exp(-age*2.8);}}return clamp(disturbance,0.,1.);}`;
const poolGLSL=`uniform vec4 wetPools[32];float poolFade(vec2 p){float edge=0.;for(int i=0;i<16;i++){vec4 a=wetPools[i*2],b=wetPools[i*2+1];vec2 d=p-a.xy;vec2 uv=vec2(dot(d,a.zw),dot(d,b.xy));edge=max(edge,(1.-smoothstep(.24,.96,dot(uv,uv)))*b.z);}return edge;}`;
export const PUDDLE_STENCIL=1;
export function puddleMaterial(material){material.transparent=true;material.depthWrite=false;material.stencilWrite=false;material.metalness=0;material.roughness=.065;material.envMapIntensity=1.1;material.userData.puddleSurface=true;return material;}

// Project the virtual (below-ground) car onto y=0 from the actual camera. Testing
// the real car's footprint would incorrectly remove long grazing-angle reflections.
export function reflectionTouchesPools(box,camera,pools){
 if(!camera?.isPerspectiveCamera||camera.position.y<=.05)return true;
 const eye=camera.position;let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
  if(eye.y+y<=.01)return true;const t=eye.y/(eye.y+y),px=eye.x+(x-eye.x)*t,pz=eye.z+(z-eye.z)*t;
  x0=Math.min(x0,px);x1=Math.max(x1,px);z0=Math.min(z0,pz);z1=Math.max(z1,pz);
 }
 for(let i=0;i<16;i++){const a=pools[i*2],b=pools[i*2+1];if(!a||!b||b.z<=0)continue;
  const det=a.z*b.y-a.w*b.x;if(Math.abs(det)<1e-8)continue;
  const rx=Math.hypot(b.y,a.w)/Math.abs(det)+.15,rz=Math.hypot(b.x,a.z)/Math.abs(det)+.15;
  if(x1>=a.x-rx&&x0<=a.x+rx&&z1>=a.y-rz&&z0<=a.y+rz)return true;
 }return false;
}
// Mirrored copies of the racing cars under the road, drawn only where the stencil says «puddle».
export class PuddleMirror{
 constructor(uniforms={wetWakes:{value:Array.from({length:12},()=>new T.Vector4())},wetPools:{value:Array.from({length:32},()=>new T.Vector4())}},enabled=true){this.enabled=enabled;this.uniforms=uniforms;this.group=new T.Group();this.group.name='PuddleMirror';this.group.matrixAutoUpdate=false;this.roots=new Set();this.frame=-1;this.bounds=new Map();this.visibleRoots=new Set();this.worldBox=new T.Box3();}
 sync(scene,frame=this.frame+1,camera=null){
  if(!this.enabled||frame===this.frame)return;this.frame=frame;if(this.group.parent!==scene)scene.add(this.group);
  for(const root of scene.children){if(!root.userData?.racing||this.roots.has(root))continue;this.roots.add(root);
   const box=new T.Box3(),inverse=root.matrixWorld.clone().invert();
   root.traverse(o=>{if(!o.isMesh||o.isSkinnedMesh||/steering|underbody|wheelwells/i.test(o.name))return;const m=Array.isArray(o.material)?o.material[0]:o.material;if(!m||m.isShaderMaterial||m.isRawShaderMaterial||/brake/i.test(m.name))return;
    o.geometry.computeBoundingBox();box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inverse));
    const c=m.clone();c.transparent=true;c.opacity=.30;c.depthTest=false;c.depthWrite=false;c.stencilWrite=true;c.stencilFunc=T.EqualStencilFunc;c.stencilRef=PUDDLE_STENCIL;c.stencilZPass=T.KeepStencilOp;const previous=m.onBeforeCompile,key=m.customProgramCacheKey();c.onBeforeCompile=(shader,renderer)=>{previous.call(c,shader,renderer);Object.assign(shader.uniforms,this.uniforms);shader.vertexShader='varying vec3 mirrorWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nmirrorWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 mirrorWorld;\n'+wakeGLSL+poolGLSL+'\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=poolFade(mirrorWorld.xz)*(1.-waterWake(mirrorWorld.xz)*.96);\n#include <opaque_fragment>');};c.customProgramCacheKey=()=>key+'-puddle-wake-v3';
    const mm=new T.Mesh(o.geometry,c);mm.matrixAutoUpdate=false;mm.matrixWorldAutoUpdate=false;mm.frustumCulled=true;mm.renderOrder=6;mm.castShadow=mm.receiveShadow=false;mm.userData.source=o;mm.userData.root=root;this.group.add(mm);});this.bounds.set(root,box.expandByScalar(.2));}
  this.visibleRoots.clear();for(const root of this.roots){if(root.parent!==scene){this.roots.delete(root);this.bounds.delete(root);continue;}const bounds=this.bounds.get(root);if(bounds&&reflectionTouchesPools(this.worldBox.copy(bounds).applyMatrix4(root.matrixWorld),camera,this.uniforms.wetPools.value))this.visibleRoots.add(root);}
  for(const mm of [...this.group.children]){const root=mm.userData.root,src=mm.userData.source;
   if(root.parent!==scene){this.group.remove(mm);mm.material.dispose();this.roots.delete(root);this.bounds.delete(root);continue;}
   let vis=this.visibleRoots.has(root),p=src;while(p&&p!==scene){if(!p.visible){vis=false;break;}p=p.parent;}mm.visible=vis;
   if(vis){const e=mm.matrixWorld.copy(src.matrixWorld).elements;e[1]=-e[1];e[5]=-e[5];e[9]=-e[9];e[13]=-e[13];}
   // Мигающие линзы (аварийка, неон) в луже мигают вместе с машиной, иначе клон застывает на яркости момента копирования.
   const sm=Array.isArray(src.material)?src.material[0]:src.material;if(sm?.userData?.indicator)mm.material.emissiveIntensity=sm.emissiveIntensity*.7;}
 }
 dispose(){for(const mm of this.group.children)mm.material.dispose();this.group.clear();this.group.parent?.remove(this.group);this.roots.clear();this.bounds.clear();this.visibleRoots.clear();}
}
export class WetRoad{
 constructor(cfg){this.cfg=cfg;this.lensSplash=0;this.layout=generatePuddleLayout(cfg.seed,trackPuddleOptions(cfg));this.field=createWetnessField(this.layout);this.batches=[];this.puddles=[];this.uniforms={wetTails:{value:Array.from({length:4},()=>new T.Vector4())},wetTailFacing:{value:Array.from({length:2},()=>new T.Vector3(0,1,0))},wetTime:{value:0},wetWakes:{value:Array.from({length:12},()=>new T.Vector4())},wetPools:{value:Array.from({length:32},()=>new T.Vector4())}};this.atlas=createPuddleAtlas();this.ripples=createWaterRippleTexture();this.uniforms.waterRipples={value:this.ripples};this.uniforms.waterRain={value:cfg.damp?0:Math.min(1,cfg.wet||0)};this.uniforms.waterNight={value:cfg.night?1:0};this.uniforms.waterAmount={value:cfg.wet===0?0:1};this.uniforms.puddleAtlas={value:this.atlas};this.uniforms.wetField={value:this.field};this.uniforms.wetTravel={value:0};this.uniforms.wetDebug={value:0};this.uniforms.wetRoadSize={value:new T.Vector2(this.layout.config.roadWidth,this.layout.config.span)};this.mirror=new PuddleMirror(this.uniforms,false);this.wakeCursor=0;this.lastTravel=0;this.lampPosition=new T.Vector3();this.tailDirection=new T.Vector3();}
 addPuddle(mesh,group,radius){
  mesh.updateMatrix();const e=mesh.matrix.elements,ax=e[0]*radius,az=e[2]*radius,bx=e[4]*radius,bz=e[6]*radius,det=ax*bz-az*bx;
  this.puddles.push({group,x:e[12],z:e[14],ix:bz/det,iz:-bx/det,jx:-az/det,jz:ax/det,reach:Math.hypot(az,bz),tile:mesh.geometry.userData.puddleTile,rim:mesh.geometry.userData.puddleRim,mirror:mesh.geometry.userData.puddleMirror});
 }
 sample(x,z,previousZ=z){
  if(this.uniforms.waterAmount.value<=.001)return 0;
  let depth=0;
  for(const p of this.puddles){
   if(!p.group.visible)continue;
   const center=p.z+p.group.position.z;if(Math.min(z,previousZ)>center+p.reach||Math.max(z,previousZ)<center-p.reach)continue;
   const dx=x-p.x-p.group.position.x,dz=z-center,old=previousZ-center;
   const u=dx*p.ix+dz*p.iz,v=dx*p.jx+dz*p.jz,du=(old-dz)*p.iz,dv=(old-dz)*p.jz;
   const t=T.MathUtils.clamp(-(u*du+v*dv)/(du*du+dv*dv||1),0,1),r=(u+du*t)**2+(v+dv*t)**2;
   let mask=1;
   if(p.tile!==undefined){
    const px=u+du*t,py=v+dv*t,angle=((Math.atan2(py,px)/(Math.PI*2)+1)%1)*p.rim.length;
    const ri=Math.floor(angle),rr=T.MathUtils.lerp(p.rim[ri],p.rim[(ri+1)%p.rim.length],angle-ri);
    const tx=Math.max(0,Math.min(127,Math.floor(((p.mirror?-px:px)/rr*.49+.5)*128))),ty=Math.max(0,Math.min(127,Math.floor((py/rr*.49+.5)*128)));
    const index=(((p.tile>>2)*128+ty)*512+(p.tile%4)*128+tx)*4;
    mask=this.atlas.image.data[index]/255;
   }
   depth=Math.max(depth,(1-r)*mask);
  }
  return Math.max(0,depth);
 }
 disturb(x,z,speed,depth){this.uniforms.wetWakes.value[this.wakeCursor++%12].set(x,z,0,Math.min(1,speed/25)*(.4+depth*.6));}
 update(dt,cars,models){
  if(this.mirror.enabled){const near=this.puddles.filter(p=>p.group.visible).sort((a,b)=>Math.abs(a.z+a.group.position.z)-Math.abs(b.z+b.group.position.z)).slice(0,16);for(let i=0;i<16;i++){const p=near[i],a=this.uniforms.wetPools.value[i*2],b=this.uniforms.wetPools.value[i*2+1];if(p){a.set(p.x+p.group.position.x,p.z+p.group.position.z,p.ix,p.iz);b.set(p.jx,p.jz,1,0);}else{a.set(0,0,0,0);b.set(0,0,0,0);}}}
  this.lensSplash=Math.max(0,this.lensSplash-dt);this.uniforms.wetTime.value+=dt;const travel=cars[0]?.travelDistance||0,delta=Math.max(0,travel-this.lastTravel);this.lastTravel=travel;for(const w of this.uniforms.wetWakes.value){w.y+=delta;w.z+=dt;if(w.z>4)w.w=0;}
  for(let i=0;i<2;i++)for(let side=0;side<2;side++){
   const lamp=this.uniforms.wetTails.value[i*2+side],model=models[i],car=cars[i];
   if(!model||!car){lamp.w=0;continue;}
   const a=vehicleAnchors(model),level=model.userData.tailMaterials?.[0]?.emissiveIntensity??(this.cfg.night?.85:.18);
   const strength=Math.min(1.4,level)*(this.cfg.wet??1);
   this.lampPosition.set(a.rear,a.tailY,(side?1:-1)*a.lampX).applyQuaternion(model.quaternion).add(model.position);
   this.tailDirection.set(1,0,0).applyQuaternion(model.quaternion);
   this.uniforms.wetTailFacing.value[i].set(this.tailDirection.x,this.tailDirection.z,0);
   lamp.set(this.lampPosition.x,this.lampPosition.y,this.lampPosition.z,model.visible?strength:0);
  }
 }
 // Camera-facing is constant across the road: calculate twice per frame, not
 // four normalizations per asphalt pixel. Called before the scene render.
 prepare(camera){
  this.drawCalls=0;const far=this.layout.config.farDistance;for(const b of this.batches){const z=b.parent.position.z+b.userData.puddleCenter;b.visible=this.uniforms.waterAmount.value>.001&&Math.abs(z-camera.position.z)<far+b.userData.puddleReach;}
  for(let i=0;i<2;i++){
   const a=this.uniforms.wetTails.value[i*2],b=this.uniforms.wetTails.value[i*2+1],f=this.uniforms.wetTailFacing.value[i];
   const dx=camera.position.x-(a.x+b.x)*.5,dz=camera.position.z-(a.z+b.z)*.5;
   f.z=T.MathUtils.smoothstep((dx*f.x+dz*f.y)/Math.max(.001,Math.hypot(dx,dz)),.05,.4);
  }
 }
 attach(material,puddle=false){
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  const c=this.layout.config,parameters={
   waterDistances:{value:new T.Vector2(c.nearDistance,c.midDistance)},
   waterSurface:{value:new T.Vector4(c.wetRoughness,c.veryWetRoughness,c.zoneStrength,c.haloStrength)},
   waterDiffuse:{value:c.waterDiffuse}
  };
  material.onBeforeCompile=(shader,renderer)=>{
   Object.assign(shader.uniforms,parameters);
   previous.call(material,shader,renderer);Object.assign(shader.uniforms,this.uniforms);
   shader.vertexShader=(puddle?'attribute float puddleAlpha;attribute vec2 puddleUv;attribute vec4 puddleStyle;varying vec4 vPuddleStyle;varying vec2 vPuddleUv;varying float vPuddleAlpha;\n':'')+'varying vec3 wetWorld;\n'+shader.vertexShader;
   if(puddle)shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPuddleAlpha=puddleAlpha;vPuddleUv=puddleUv;vPuddleStyle=puddleStyle;');
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nwetWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader=(puddle?'uniform sampler2D puddleAtlas;uniform sampler2D waterRipples;varying vec4 vPuddleStyle;varying vec2 vPuddleUv;varying float vPuddleAlpha;\n':'')+'uniform vec2 waterDistances;uniform vec4 waterSurface;uniform float waterDiffuse;uniform sampler2D wetField;uniform float wetTravel;uniform float wetDebug;uniform vec2 wetRoadSize;varying vec3 wetWorld;uniform vec4 wetTails[4];uniform vec3 wetTailFacing[2];uniform float wetTime;uniform float waterRain;uniform float waterNight;uniform float waterAmount;\n'+wakeGLSL+'\n'+shader.fragmentShader;
   if(puddle){
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec3 puddleMask=texture2D(puddleAtlas,vPuddleUv).rgb;
     float waterDistance=length(wetWorld.xz-cameraPosition.xz);
     float waterLOD=(1.-smoothstep(vPuddleStyle.z,vPuddleStyle.w,waterDistance))*waterAmount;
     if(puddleMask.g*vPuddleAlpha*waterLOD<.015||abs(wetWorld.x)>wetRoadSize.x*.48)discard;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     roughnessFactor=vPuddleStyle.y+waterRain*.075;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
     float waterDetail=1.-smoothstep(waterDistances.x,waterDistances.y,waterDistance);
     float rippleWake=0.;if(waterDetail>.01)rippleWake=waterWake(wetWorld.xz);roughnessFactor+=rippleWake*.16;
     vec2 ripplePhase=vec2(wetWorld.x,wetWorld.z-wetTravel)*.55;
     vec2 rippleFootprint=fwidth(ripplePhase)*128.;
     vec2 rippleFilter=vec2(1.)-smoothstep(vec2(.7),vec2(2.8),rippleFootprint);
     vec2 drift=wetTime*vec2(.017,-.023)*(1.+waterRain);
     vec2 fine=texture2D(waterRipples,ripplePhase+drift).rg*2.-1.;
     mat2 turn=mat2(.8,-.6,.6,.8);
     // Both sample transforms repeat over the 480 m scenery ring.
     vec2 fine2=texture2D(waterRipples,turn*ripplePhase*.625-drift*.83+vec2(.37,.61)).rg*2.-1.;
     vec2 slope=(fine+mat2(.8,.6,-.6,.8)*fine2*.55)*min(rippleFilter.x,rippleFilter.y);
     vec3 rippleSlope=vec3(slope.x,0.,slope.y);
     normal=normalize(normal+mat3(viewMatrix)*rippleSlope*(.0007+waterRain*.009+rippleWake*.012)*puddleMask.r*waterDetail);`);
   }else{
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
     vec2 drainageUv=vec2(wetWorld.x/wetRoadSize.x+.5,(wetTravel-wetWorld.z)/wetRoadSize.y);
     vec3 drainage=texture2D(wetField,drainageUv).rgb*waterAmount;
     diffuseColor.rgb*=1.-drainage.r*.08-drainage.g*.12;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
     roughnessFactor=mix(roughnessFactor,min(roughnessFactor,waterSurface.x),drainage.r*waterSurface.z);
     roughnessFactor=mix(roughnessFactor,min(roughnessFactor,waterSurface.y),drainage.g*waterSurface.w);`);
   }
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    vec3 redRoad=vec3(0.);
    for(int i=0;i<4;i++){
     vec4 lamp=wetTails[i];vec2 d=wetWorld.xz-lamp.xz;
     vec2 rear=wetTailFacing[i/2].xy;
     float facing=wetTailFacing[i/2].z;
     if(lamp.w>0. && facing>0. && dot(d,d)<9. && dot(d,rear)>0.){
      vec3 virtualLamp=vec3(lamp.x,-lamp.y,lamp.z);
      vec3 reflected=mix(cameraPosition,virtualLamp,cameraPosition.y/max(.01,cameraPosition.y+lamp.y));
      vec2 r=wetWorld.xz-reflected.xz;
      vec2 lobe=vec2(dot(r,vec2(rear.y,-rear.x)),dot(r,rear));
      // A finite source, with a compact rough-surface lobe instead of a long decal.
      vec2 spread=vec2(${puddle?'.13,.22':'.19,.38'});
      float streak=exp(-dot(lobe/spread,lobe/spread));
      float reach=1.-smoothstep(1.8,3.,length(d));
      redRoad+=vec3(1.,.016,.004)*lamp.w*facing*streak*reach*${puddle?'.55':'.14'};
     }
    }
    float wake=${puddle?'rippleWake':'waterWake(wetWorld.xz)'};outgoingLight+=redRoad*(1.-wake*.8);${puddle?`// The water replaces the asphalt's granular shading; only its shore blends.
     // Standard PBR already supplies angular Fresnel. Alpha describes coverage, not Fresnel twice.
     // Water keeps the same low direct diffuse return at night; increasing it
     // under street lamps turns the whole puddle into a chalk-white patch.
     // Preserve the reflected environment and specular highlights.
     outgoingLight-=reflectedLight.directDiffuse*(1.-waterDiffuse)+reflectedLight.indirectDiffuse*(1.-mix(waterDiffuse,.065,waterNight));
     diffuseColor.a*=vPuddleAlpha*puddleMask.g*mix(.35,.97,puddleMask.r)*waterLOD;`:''}
    ${puddle?`if(wetDebug>.5){float k=vPuddleStyle.x;outgoingLight=k<.5?vec3(1.,.18,.02):k<1.5?vec3(.85,.8,.03):k<2.5?vec3(.15,.9,.2):k<3.5?vec3(.0,.65,1.):vec3(.7,.12,1.);diffuseColor.a*=.9;}`:`if(wetDebug>.5)outgoingLight=mix(outgoingLight,vec3(.03,.35,.65),drainage.r*.75)+vec3(.1,.08,0.)*drainage.g;`}
    #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>key+'-wet-drainage-v12-'+Number(puddle);return material;
 }
 dispose(){this.atlas.dispose();this.ripples.dispose();this.field.dispose();this.mirror.dispose();this.puddles.length=0;this.batches.length=0;}
 reset(){this.lensSplash=0;this.lastTravel=0;this.wakeCursor=0;for(const w of this.uniforms.wetWakes.value)w.set(0,0,0,0);this.uniforms.wetTime.value=0;for(const p of this.uniforms.wetTails.value)p.w=0;}
}
