import * as T from 'three';
import {vehicleAnchors} from './vehicle-effects.js';

// Shared by the actual puddle geometry, wheel contact tests and road materials.
// No raycasts, extra lights, reflection cameras or render targets.
// Лужа: неправильный контур (три гармоники по углу), мягкий край через атрибут puddleAlpha, зеркальный материал,
// который отражает небо через окружение сцены, и трафарет для зеркальных копий машин (PuddleMirror).
export function puddleGeometry(radius,rand=Math.random,segments=40){
 const p1=rand()*6.28,p2=rand()*6.28,p3=rand()*6.28,rim=[];
 for(let i=0;i<segments;i++){const t=i/segments*Math.PI*2;rim.push(radius*(1+.14*Math.sin(2*t+p1)+.09*Math.sin(3*t+p2)+.05*Math.sin(5*t+p3)));}
 const pos=[0,0,0],alpha=[.56],uv=[.5,.5],idx=[];
 for(let i=0;i<segments;i++){const t=i/segments*Math.PI*2,r=rim[i];pos.push(Math.cos(t)*r*.48,Math.sin(t)*r*.48,0);alpha.push(.56);uv.push(.5+Math.cos(t)*.24,.5+Math.sin(t)*.24);}
 for(let i=0;i<segments;i++){const t=i/segments*Math.PI*2,r=rim[i];pos.push(Math.cos(t)*r,Math.sin(t)*r,0);alpha.push(0);uv.push(.5+Math.cos(t)*.5,.5+Math.sin(t)*.5);}
 for(let i=0;i<segments;i++){const n=(i+1)%segments;idx.push(0,1+i,1+n);idx.push(1+i,1+segments+i,1+segments+n,1+i,1+segments+n,1+n);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('puddleAlpha',new T.Float32BufferAttribute(alpha,1));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
const wakeGLSL=`uniform vec4 wetWakes[12];
float waterWake(vec2 p){float disturbance=0.;for(int i=0;i<12;i++){vec4 w=wetWakes[i];if(w.w>0.){vec2 d=p-w.xy;float age=w.z;float radius=.35+age*1.3;float ripple=.65+.35*sin(length(d)*15.-age*20.);disturbance+=w.w*exp(-dot(d,d)/(radius*radius))*exp(-age*1.2)*ripple;}}return clamp(disturbance,0.,1.);}`;
const poolGLSL=`uniform vec4 wetPools[32];float poolFade(vec2 p){float edge=0.;for(int i=0;i<16;i++){vec4 a=wetPools[i*2],b=wetPools[i*2+1];vec2 d=p-a.xy;vec2 uv=vec2(dot(d,a.zw),dot(d,b.xy));edge=max(edge,(1.-smoothstep(.24,.96,dot(uv,uv)))*b.z);}return edge;}`;
export const PUDDLE_STENCIL=1;
export function puddleMaterial(material){material.transparent=true;material.depthWrite=false;material.stencilWrite=true;material.stencilRef=PUDDLE_STENCIL;material.stencilFunc=T.AlwaysStencilFunc;material.stencilZPass=T.ReplaceStencilOp;material.envMapIntensity=1.25;return material;}
// Mirrored copies of the racing cars under the road, drawn only where the stencil says «puddle».
export class PuddleMirror{
 constructor(uniforms={wetWakes:{value:Array.from({length:12},()=>new T.Vector4())},wetPools:{value:Array.from({length:32},()=>new T.Vector4())}}){this.uniforms=uniforms;this.group=new T.Group();this.group.name='PuddleMirror';this.group.matrixAutoUpdate=false;this.roots=new Set();this.frame=-1;}
 sync(scene,frame=this.frame+1){
  if(frame===this.frame)return;this.frame=frame;if(this.group.parent!==scene)scene.add(this.group);
  for(const root of scene.children){if(!root.userData?.racing||this.roots.has(root))continue;this.roots.add(root);
   root.traverse(o=>{if(!o.isMesh)return;const m=Array.isArray(o.material)?o.material[0]:o.material;if(!m||m.isShaderMaterial||m.isRawShaderMaterial)return;
    const c=m.clone();c.transparent=true;c.opacity=.30;c.depthTest=false;c.depthWrite=false;c.stencilWrite=true;c.stencilFunc=T.EqualStencilFunc;c.stencilRef=PUDDLE_STENCIL;c.stencilZPass=T.KeepStencilOp;const previous=m.onBeforeCompile,key=m.customProgramCacheKey();c.onBeforeCompile=(shader,renderer)=>{previous.call(c,shader,renderer);Object.assign(shader.uniforms,this.uniforms);shader.vertexShader='varying vec3 mirrorWorld;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nmirrorWorld=(modelMatrix*vec4(transformed,1.)).xyz;');shader.fragmentShader='varying vec3 mirrorWorld;\n'+wakeGLSL+poolGLSL+'\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=poolFade(mirrorWorld.xz)*(1.-waterWake(mirrorWorld.xz)*.96);\n#include <opaque_fragment>');};c.customProgramCacheKey=()=>key+'-puddle-wake-v3';
    const mm=new T.Mesh(o.geometry,c);mm.matrixAutoUpdate=false;mm.frustumCulled=false;mm.renderOrder=6;mm.castShadow=mm.receiveShadow=false;mm.userData.source=o;mm.userData.root=root;this.group.add(mm);});}
  for(const mm of [...this.group.children]){const root=mm.userData.root,src=mm.userData.source;
   if(root.parent!==scene){this.group.remove(mm);mm.material.dispose();this.roots.delete(root);continue;}
   let vis=true,p=src;while(p&&p!==scene){if(!p.visible){vis=false;break;}p=p.parent;}mm.visible=vis;
   if(vis){const e=mm.matrixWorld.copy(src.matrixWorld).elements;e[1]=-e[1];e[5]=-e[5];e[9]=-e[9];e[13]=-e[13];}}
 }
 dispose(){for(const mm of this.group.children)mm.material.dispose();this.group.parent?.remove(this.group);this.roots.clear();}
}
export class WetRoad{
 constructor(cfg){this.cfg=cfg;this.puddles=[];this.uniforms={wetTails:{value:Array.from({length:4},()=>new T.Vector4())},wetTime:{value:0},wetWakes:{value:Array.from({length:12},()=>new T.Vector4())},wetPools:{value:Array.from({length:32},()=>new T.Vector4())}};this.mirror=new PuddleMirror(this.uniforms);this.wakeCursor=0;this.lastTravel=0;}
 addPuddle(mesh,group,radius){
  mesh.updateMatrix();const e=mesh.matrix.elements,ax=e[0]*radius,az=e[2]*radius,bx=e[4]*radius,bz=e[6]*radius,det=ax*bz-az*bx;
  this.puddles.push({group,x:e[12],z:e[14],ix:bz/det,iz:-bx/det,jx:-az/det,jz:ax/det,reach:Math.hypot(az,bz)});
 }
 sample(x,z,previousZ=z){
  let depth=0;
  for(const p of this.puddles){
   if(!p.group.visible)continue;
   const center=p.z+p.group.position.z;if(Math.min(z,previousZ)>center+p.reach||Math.max(z,previousZ)<center-p.reach)continue;
   const dx=x-p.x-p.group.position.x,dz=z-center,old=previousZ-center;
   const u=dx*p.ix+dz*p.iz,v=dx*p.jx+dz*p.jz,du=(old-dz)*p.iz,dv=(old-dz)*p.jz;
   const t=T.MathUtils.clamp(-(u*du+v*dv)/(du*du+dv*dv||1),0,1),r=(u+du*t)**2+(v+dv*t)**2;
   depth=Math.max(depth,1-r);
  }
  return Math.max(0,depth);
 }
 disturb(x,z,speed,depth){this.uniforms.wetWakes.value[this.wakeCursor++%12].set(x,z,0,Math.min(1,speed/25)*(.4+depth*.6));}
 update(dt,cars,models){
  const near=this.puddles.filter(p=>p.group.visible).sort((a,b)=>Math.abs(a.z+a.group.position.z)-Math.abs(b.z+b.group.position.z)).slice(0,16);for(let i=0;i<16;i++){const p=near[i],a=this.uniforms.wetPools.value[i*2],b=this.uniforms.wetPools.value[i*2+1];if(p){a.set(p.x+p.group.position.x,p.z+p.group.position.z,p.ix,p.iz);b.set(p.jx,p.jz,1,0);}else{a.set(0,0,0,0);b.set(0,0,0,0);}}
  this.uniforms.wetTime.value+=dt;const travel=cars[0]?.travelDistance||0,delta=Math.max(0,travel-this.lastTravel);this.lastTravel=travel;for(const w of this.uniforms.wetWakes.value){w.y+=delta;w.z+=dt;if(w.z>4)w.w=0;}
  for(let i=0;i<2;i++)for(let side=0;side<2;side++){
   const lamp=this.uniforms.wetTails.value[i*2+side],model=models[i],car=cars[i];
   if(!model||!car){lamp.w=0;continue;}
   const a=vehicleAnchors(model),strength=(this.cfg.night?1:.35)*(car.finished?2.3:1);
   lamp.set(model.position.x+(side?1:-1)*a.lampX,a.tailY+model.position.y,model.position.z+a.rear,strength);
  }
 }
 attach(material,puddle=false){
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
   previous.call(material,shader,renderer);Object.assign(shader.uniforms,this.uniforms);
   shader.vertexShader=(puddle?'attribute float puddleAlpha;varying float vPuddleAlpha;\n':'')+'varying vec3 wetWorld;\n'+shader.vertexShader;
   if(puddle)shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPuddleAlpha=puddleAlpha;');
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nwetWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader=(puddle?'varying float vPuddleAlpha;\n':'')+'varying vec3 wetWorld;uniform vec4 wetTails[4];uniform float wetTime;\n'+wakeGLSL+'\n'+shader.fragmentShader;
   if(puddle)shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nfloat rippleWake=waterWake(wetWorld.xz);normal=normalize(normal+vec3(sin(wetWorld.z*22.-wetTime*14.),cos(wetWorld.x*19.+wetTime*12.),0.)*rippleWake*.22);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
    vec3 redRoad=vec3(0.);
    for(int i=0;i<4;i++){
     vec4 lamp=wetTails[i];vec2 d=wetWorld.xz-lamp.xz;
     if(lamp.w>0. && dot(d,d)<49.){
      float behind=smoothstep(-.6,.25,d.y);
      float spill=exp(-dot(d*vec2(.85,.48),d*vec2(.85,.48)))*behind;
      vec3 virtualLamp=vec3(lamp.x,-lamp.y,lamp.z);
      vec3 reflected=mix(cameraPosition,virtualLamp,cameraPosition.y/max(.01,cameraPosition.y+lamp.y));
      vec2 r=wetWorld.xz-reflected.xz;
      float ripple=sin(wetWorld.z*29.+wetWorld.x*13.+wetTime*1.4)*.025;
      r.x+=ripple;
      float streak=exp(-dot(r*vec2(${puddle?'4.0,1.1':'2.1,.62'}),r*vec2(${puddle?'4.0,1.1':'2.1,.62'})));
      float broken=.85+.15*sin(wetWorld.z*19.+sin(wetWorld.x*31.)*2.+wetTime*.6)*sin(wetWorld.x*17.-wetWorld.z*7.);
      redRoad+=vec3(1.,.016,.004)*lamp.w*(spill*.10+streak*broken*${puddle?'1.7':'.24'});
     }
    }
    float wake=waterWake(wetWorld.xz);outgoingLight+=redRoad*(1.-wake*.8);${puddle?`diffuseColor.a*=vPuddleAlpha;if(vPuddleAlpha<.002)discard;diffuseColor.a*=1.-wake*.3;`:''}
    #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>key+'-wet-tail-v3-'+Number(puddle);return material;
 }
 reset(){this.lastTravel=0;this.wakeCursor=0;for(const w of this.uniforms.wetWakes.value)w.set(0,0,0,0);this.uniforms.wetTime.value=0;for(const p of this.uniforms.wetTails.value)p.w=0;}
}
