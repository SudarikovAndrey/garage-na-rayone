import * as T from 'three';
import {garagePartTarget} from './garage-focus.js';
import {PowertrainXray} from './powertrain-xray.js';
export function selectedPartMesh(mesh,slot,side){
 const path=[];let o=mesh;while(o){path.push(o.name);o=o.parent;}
 const wheel=path.find(n=>/^Wheel_[FR][LR]$/.test(n));
 if(slot==='rims'||slot==='tires'){
  if(wheel!==(side>0?'Wheel_FR':'Wheel_FL'))return false;
  return slot==='tires'?/^Tyre/.test(mesh.material.name):!/^Tyre|^Black trim/.test(mesh.material.name);
 }
 if(wheel)return false;
 if(slot==='spoiler')return path.some(n=>/^(Kit_spoiler|StockSpoiler)$/.test(n));
 if(slot==='skirts')return path.some(n=>/^(Kit_skirts|StockSkirts)$/.test(n));
 if(slot==='fenders')return path.some(n=>/^(Kit_fenders|StockFenders)$/.test(n));
 if(slot==='bumpers')return path.some(n=>/^(Kit_bumpers|StockBumpers)$/.test(n));
 return ['engine','gearbox'].includes(slot)&&/^Paint/.test(mesh.material.name);
}
export class GarageSelection{
 constructor(root,xrayState){
  this.root=root;this.entries=[];this.slot=null;this.time=0;this.owned=[];const seen=new Map();
  this.shared={inspectionInverse:{value:new T.Matrix4()},inspectionCenter:{value:new T.Vector3()},inspectionExtent:{value:new T.Vector3(1,1,1)},inspectionPhase:{value:0}};
  root.traverse(mesh=>{let material=mesh.material;if(!mesh.isMesh||!material?.isMeshStandardMaterial)return;
   let hooks=seen.get(material);if(hooks){material=material.clone();mesh.material=material;this.owned.push(material);}else{hooks={previous:material.onBeforeCompile,key:material.customProgramCacheKey()};seen.set(material,hooks);}
   const enabled={value:0},{previous,key}=hooks;
   material.onBeforeCompile=(shader,renderer)=>{
    previous.call(material,shader,renderer);Object.assign(shader.uniforms,this.shared,{inspectionEnabled:enabled});
    shader.vertexShader='uniform mat4 inspectionInverse;varying vec3 inspectionPosition;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\ninspectionPosition=(inspectionInverse*modelMatrix*vec4(transformed,1.0)).xyz;');
    shader.fragmentShader='uniform vec3 inspectionCenter,inspectionExtent;uniform float inspectionEnabled,inspectionPhase;varying vec3 inspectionPosition;\n'+shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
if(inspectionEnabled>0.0){
vec3 inspectionDelta=inspectionPosition-inspectionCenter;
float inspectionMask=1.0-smoothstep(0.86,1.08,length(inspectionDelta/inspectionExtent));
float inspectionWave=1.0-smoothstep(0.025,0.14,abs(length(inspectionDelta)-inspectionPhase*max(inspectionExtent.x,max(inspectionExtent.y,inspectionExtent.z))*2.15));
float inspectionFade=smoothstep(0.0,0.10,inspectionPhase)*(1.0-smoothstep(0.75,1.0,inspectionPhase));
totalEmissiveRadiance+=vec3(0.45,0.85,1.0)*inspectionEnabled*inspectionMask*(0.035+inspectionWave*inspectionFade*1.5);
}`);
   };
   material.customProgramCacheKey=()=>key+'-inspection-wave-v1';material.needsUpdate=true;this.entries.push({mesh,enabled});
  });
  this.xray=new PowertrainXray(root,this.entries,xrayState);
 }
 dispose(){this.xray.dispose();for(const material of this.owned)material.dispose();this.entries.length=0;}
 update(dt,car,slot,anchorYaw,reduced=false){
  const p=garagePartTarget(car,slot,anchorYaw),key=slot+':'+p?.side;
  const changed=this.slot!==key;if(changed){this.slot=key;this.time=0;}
  this.time+=dt;this.root.updateWorldMatrix(true,false);this.shared.inspectionInverse.value.copy(this.root.matrixWorld).invert();
  if(p){this.shared.inspectionCenter.value.set(p.x,p.y,p.z);this.shared.inspectionExtent.value.set(p.rx,p.ry,p.rz);}
  this.shared.inspectionPhase.value=reduced?.35:(this.time%2.2)/2.2;
  if(changed){this.active=false;for(const entry of this.entries){const enabled=p&&selectedPartMesh(entry.mesh,slot,p.side);entry.enabled.value=enabled?(reduced?.25:1):0;if(enabled)this.active=true;}}
  const xrayMoving=this.xray.update(dt,slot,reduced);
  return changed||this.active&&!reduced||xrayMoving;
 }
}
