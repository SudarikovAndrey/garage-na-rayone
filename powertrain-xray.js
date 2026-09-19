import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {powertrainLayout} from './powertrain-layout.js';

function assembly(name,position,scale,rarity,clutch=false){
 const group=new T.Group();group.name=name;group.position.set(position.x,position.y,position.z);group.scale.setScalar(scale);
 const mats=[new T.MeshStandardMaterial({color:0xa8c9ce,metalness:.72,roughness:.28,emissive:0x1c5662,emissiveIntensity:.5}),new T.MeshStandardMaterial({color:0x182e38,metalness:.28,roughness:.45,emissive:0x102b38,emissiveIntensity:.5}),new T.MeshStandardMaterial({color:[0x88b8c8,0x60c7fa,0xc195ff,0xffce73][Math.max(0,rarity)],metalness:.5,roughness:.24,emissive:0x28677c,emissiveIntensity:.7})];
 const pieces=mats.map(()=>[]);
 const add=(geometry,position,material=0,rotation=[0,0,0])=>{const matrix=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1));pieces[material].push((geometry.index?geometry.toNonIndexed():geometry.clone()).applyMatrix4(matrix));geometry.dispose();};
 const box=(size,position,material=0)=>add(new RoundedBoxGeometry(...size,1,.012),position,material);
 const cyl=(radius,depth,position,material=0,rotation=[Math.PI/2,0,0])=>add(new T.CylinderGeometry(radius,radius,depth,24),position,material,rotation);
 if(!clutch){
  box([.56,.30,.38],[0,0,0]);box([.61,.09,.40],[0,.20,0],2);box([.45,.10,.32],[0,-.21,0],1);
  for(let i=0;i<4;i++){
   const x=-.22+i*.145;cyl(.032,.07,[x,.28,0],1,[0,0,0]);
   add(new T.TorusGeometry(.072,.026,8,16,Math.PI),[x,-.015,-.25],0,[0,Math.PI/2,Math.PI/2]);
   cyl(.037,.15,[x,.09,.26],0);box([.016,.06,.024],[x,.23,.13],1);
  }
  box([.54,.045,.045],[0,.13,.34],0);cyl(.065,.13,[.28,-.10,.19],2,[0,0,0]);
  cyl(.115,.055,[-.34,-.025,0],1,[0,0,Math.PI/2]);cyl(.062,.066,[-.345,.16,0],0,[0,0,Math.PI/2]);
  if(rarity>=1){cyl(.10,.11,[.14,.04,-.34],2,[0,Math.PI/2,0]);add(new T.TorusGeometry(.075,.024,8,24),[.14,.04,-.405],0);}
  if(rarity>=2)box([.30,.065,.20],[.08,.285,-.08],2);
  if(rarity>=3)for(const x of [-.17,.02,.21])cyl(.045,.10,[x,.31,.14],2,[0,0,0]);
 }else{
  // Open bell housing exposes the flywheel, friction disc, pressure plate and springs.
  add(new T.TorusGeometry(.25,.036,10,40,Math.PI*1.35),[0,0,-.06],0,[0,0,-.3]);
  cyl(.224,.028,[0,0,-.07]);cyl(.188,.018,[0,0,-.025],1);cyl(.165,.035,[0,0,.025],2);
  add(new T.TorusGeometry(.174,.013,8,40),[0,0,.06],0);
  cyl(.044,.25,[0,0,.04],0);
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6;cyl(.011,.02,[Math.cos(a)*.20,Math.sin(a)*.20,-.045],1);
   const spoke=new RoundedBoxGeometry(.086,.014,.012,1,.003);add(spoke,[Math.cos(a)*.094,Math.sin(a)*.094,.052],0,[0,0,a]);
  }
  for(let i=0;i<4;i++){const a=i*Math.PI/2;cyl(.022,.07,[Math.cos(a)*.10,Math.sin(a)*.10,.078],2,[Math.PI/2,a,0]);}
  box([.25,.23,.27],[0,0,-.265]);for(let i=0;i<4;i++)box([.28,.26,.014],[0,0,-.17-i*.057],0);
 }
 for(const [i,geos] of pieces.entries()){
  const geometry=mergeGeometries(geos);geos.forEach(g=>g.dispose());const mesh=new T.Mesh(geometry,mats[i]);mesh.name=name+'_'+i;mesh.renderOrder=10;mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);
  mats[i].transparent=true;mats[i].opacity=0;mats[i].depthWrite=true;
 }
 return group;
}

export class PowertrainXray{
 constructor(root,entries,state){
  this.root=root;this.entries=entries;let fit;root.traverse(o=>{if(o.userData.fit)fit=o.userData.fit;});
  fit??={id:'samara',wheelbase:2.46,width:1.65,height:1.4,radius:.292};this.layout=powertrainLayout(fit);this.fit=fit;
  this.amount=state?.amount||0;this.engineAlpha=state?.engineAlpha||0;this.clutchAlpha=state?.clutchAlpha||0;
  this.uniforms={xrayCenter:{value:new T.Vector3(...(state?.center||[this.layout.engine.x,this.layout.engine.y,0]))},xrayExtent:{value:new T.Vector3(...(state?.extent||[.85,.85,.86]))},xrayAmount:{value:this.amount}};
  for(const e of entries){
   const m=e.mesh.material,previous=m.onBeforeCompile,key=m.customProgramCacheKey();e.xrayOriginal={transparent:m.transparent,depthWrite:m.depthWrite,renderOrder:e.mesh.renderOrder,compile:previous,cacheKey:m.customProgramCacheKey};
   m.onBeforeCompile=(shader,renderer)=>{previous.call(m,shader,renderer);Object.assign(shader.uniforms,this.uniforms);
    shader.fragmentShader='uniform mat4 inspectionInverse;uniform vec3 xrayCenter,xrayExtent;uniform float xrayAmount;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 xrayView=normalize((inspectionInverse*vec4(cameraPosition,1.0)).xyz-xrayCenter);
vec3 xrayDelta=inspectionPosition-xrayCenter;
vec3 xrayProjected=xrayDelta-xrayView*dot(xrayDelta,xrayView);
float xrayMask=(1.0-smoothstep(0.68,1.05,length(xrayProjected/xrayExtent)))*xrayAmount;
diffuseColor.a*=1.0-xrayMask*0.93;
diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.12,0.36,0.43),xrayMask*0.6);
`);
   };m.customProgramCacheKey=()=>key+'-powertrain-xray-v1';m.needsUpdate=true;
  }
  this.group=new T.Group();this.group.name='InspectionPowertrain';root.add(this.group);
  const rarity=slot=>Number(root.userData.equipment?.[slot]?.match(/-(\d)/)?.[1]??0);/* id вида slot-rarity[-style][~variant] */
  this.engine=assembly('Xray_engine',this.layout.engine,this.layout.scale,rarity('engine'));
  this.clutch=assembly('Xray_clutch',this.layout.clutch,this.layout.scale,rarity('gearbox'),true);
  this.engine.rotation.y=this.layout.transverse?Math.PI/2:0;
  this.clutch.rotation.y=this.layout.transverse?0:this.layout.rear?-Math.PI/2:Math.PI/2;
  this.group.add(this.engine,this.clutch);this.group.visible=false;this.transparent=false;
 }
 snapshot(){return {amount:this.amount,engineAlpha:this.engineAlpha,clutchAlpha:this.clutchAlpha,center:this.uniforms.xrayCenter.value.toArray(),extent:this.uniforms.xrayExtent.value.toArray()};}
 update(dt,slot,reduced=false){
  const active=slot==='engine'||slot==='gearbox',target=active?1:0,a=reduced?1:1-Math.exp(-Math.min(dt,.1)*11),before=this.amount;
  this.amount=T.MathUtils.lerp(this.amount,target,a);if(Math.abs(this.amount-target)<.001)this.amount=target;
  const engineTarget=slot==='engine'?1:slot==='gearbox'?.20:0,clutchTarget=slot==='gearbox'?1:slot==='engine'?.48:0;
  this.engineAlpha=T.MathUtils.lerp(this.engineAlpha,engineTarget,a);this.clutchAlpha=T.MathUtils.lerp(this.clutchAlpha,clutchTarget,a);
  if(active){const p=slot==='engine'?this.layout.engine:this.layout.clutch;this.uniforms.xrayCenter.value.lerp(new T.Vector3(p.x,p.y,p.z),a);
   this.uniforms.xrayExtent.value.lerp(new T.Vector3(slot==='engine'?.94:.72,this.fit.id==='bukhanka'?1.65:1.05,this.fit.width*.68),a);
  }
  this.uniforms.xrayAmount.value=this.amount;
  if((this.amount>0)!==this.transparent){this.transparent=this.amount>0;for(const e of this.entries){const m=e.mesh.material,old=e.xrayOriginal;m.transparent=this.transparent?true:old.transparent;m.depthWrite=this.transparent?false:old.depthWrite;e.mesh.renderOrder=this.transparent?20:old.renderOrder;m.needsUpdate=true;}}
  this.group.visible=this.amount>0;
  for(const [g,alpha] of [[this.engine,this.engineAlpha],[this.clutch,this.clutchAlpha]])for(const mesh of g.children){mesh.material.opacity=alpha;mesh.material.emissiveIntensity=.5+alpha*.65;mesh.material.depthWrite=alpha>.8;mesh.renderOrder=alpha>.8?10:9;}
  return before!==this.amount||active&&!reduced;
 }
 dispose(){for(const e of this.entries){const old=e.xrayOriginal,m=e.mesh.material;m.transparent=old.transparent;m.depthWrite=old.depthWrite;e.mesh.renderOrder=old.renderOrder;m.onBeforeCompile=old.compile;m.customProgramCacheKey=old.cacheKey;m.needsUpdate=true;}this.group.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});this.group.removeFromParent();}
}
