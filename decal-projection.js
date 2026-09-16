import * as T from 'three';
import {decalById} from './decals.js';
const glslColor=value=>new T.Color(value).toArray().map(n=>n.toFixed(4)).join(',');
const decalMasks={
 volt:'float ma=step(abs(fract(u*.42+v*.27+.08*sin(v*7.))- .5),.10);float mb=step(abs(fract(u*.42+v*.27+.24)-.5),.022);',
 
 tiger:'float q=fract(u*.86+v*.62+.10*sin(v*8.));float ma=step(q,.22);float mb=step(abs(q-.48),.035);',
 hazard:'float q=abs(fract((u+abs(v-.72))*1.05)-.5);float ma=step(q,.22);float mb=step(abs(fract((u-v)*1.7)-.5),.035);',
 glitch:'float h=fract(sin(dot(floor(vec2(u*5.,v*7.)),vec2(127.1,311.7)))*43758.5453);float ma=step(.48,h);float mb=1.-step(.18,h);',
 arctic:'float h=fract(sin(dot(floor(vec2(u*3.4,v*5.)),vec2(91.7,271.9)))*31718.19);float q=fract(u*.72+v*.57+h*.7);float ma=step(.48,q);float mb=step(abs(q-.48),.055);',
 pulse:'float ma=step(abs(v-(.72+.22*sin(u*4.7))),.075);float mb=step(abs(v-(.72+.36*sin(u*3.2+1.4))),.03);',
 tag:'float q=abs(fract(u*.67-v*.58+.16*sin(v*8.))-.5);float ma=step(q,.11);float mb=max(step(abs(fract(u*1.4+v*.8)-.5),.04),step(length(vec2(u-1.1,v-.75)),.18));',
 sunset:'float ma=step(length(vec2(u-1.05,(v-.75)*1.35)),.42)*step(fract(v*8.),.58);float mb=max(step(abs(fract(v*3.6)-.5),.035),step(abs(u+v-.15),.035));',
 phantom:'float h=fract(sin(floor(v*9.)*173.31)*9182.7);float q=fract(u*.82+v*.18+h*.5);float ma=step(q,.14);float mb=step(abs(q-.36),.027);',
};

export const DECAL_KEY='vinyl-stickers-v4';
// All distances are in the car's rest space, in metres. No UV islands or per-draw material uniforms.
export function bindDecalSpace(car,owned=new Set()){
 car.updateWorldMatrix(true,true);const inverse=car.matrixWorld.clone().invert(),point=new T.Vector3(),normal=new T.Vector3();
 car.traverse(o=>{
  if(!o.isMesh||!o.material?.userData?.decal)return;
  const old=o.geometry,g=old.clone(),matrix=new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld),normalMatrix=new T.Matrix3().getNormalMatrix(matrix);
  if(!g.attributes.normal)g.computeVertexNormals();
  const source=g.attributes.position,normals=g.attributes.normal,positions=new Float32Array(source.count*3),directions=new Float32Array(source.count*3);
  for(let i=0;i<source.count;i++){
   point.fromBufferAttribute(source,i).applyMatrix4(matrix).toArray(positions,i*3);
   normal.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize().toArray(directions,i*3);
  }
  g.setAttribute('decalPosition',new T.BufferAttribute(positions,3));g.setAttribute('decalNormal',new T.BufferAttribute(directions,3));
  o.geometry=g;if(owned.delete(old))old.dispose();owned.add(g);
 });return owned;
}
export function applyFullBodyDecal(material,id){
 const d=decalById(id);if(!d)return;
 const [a,b,c]=d.colors;
 const checker=`
 // A single 3D lattice: identical cells on roof, doors and bumpers, no overlapping projections.
 vec3 phase=(vDecalPosition+vec3(.071,.113,.173))*(3.14159265/.34);
 vec3 wave=sin(phase);vec3 fw=max(fwidth(phase),vec3(.0001));
 vec3 cell=smoothstep(-fw,fw,wave)*2.-1.;
 // Fade undersampled cells to their average instead of shimmering in the distance.
 cell*=1.-smoothstep(vec3(1.2),vec3(3.14),fw);
 float ma=.5+.5*cell.x*cell.y*cell.z;
 float mb=1.-decalStep(.055,abs(vDecalPosition.z));
 vec2 masks=vec2(ma,mb);`;
 const functions=`
 varying vec3 vDecalPosition;varying vec3 vDecalNormal;
 float decalStep(float edge,float value){float width=max(fwidth(value-edge),.001);return smoothstep(edge-width,edge+width,value);}
 ${id==='finish'?'':`vec2 decalPattern(vec2 uv){float u=uv.x;float v=uv.y;${decalMasks[id].replaceAll('step(', 'decalStep(')}return vec2(ma,mb);}`}
 `;
 const projection=id==='finish'?checker:`
 vec3 n=abs(normalize(vDecalNormal));vec3 w=n*n;w=w*w*w;w/=max(w.x+w.y+w.z,.0001);
 // Side XY, roof XZ, front ZY, all at the same physical scale. Sharp but continuous corner blending.
 vec3 p=vDecalPosition;
 vec2 masks=decalPattern(p.zy)*w.x+decalPattern(p.xz+vec2(0.,.72))*w.y+decalPattern(p.xy)*w.z;
 `;
 const fragment=projection+`
// Uncovered paint is untouched: the two masks are opaque vinyl pieces, not a recolour.
diffuseColor.rgb=mix(mix(diffuseColor.rgb,vec3(${glslColor(a)}),clamp(masks.x,0.,1.)),vec3(${glslColor(c)}),clamp(masks.y,0.,1.));`;
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
 const base=previousKey===T.Material.prototype.customProgramCacheKey?(previous&&previous!==T.Material.prototype.onBeforeCompile?previous.toString():''):previousKey.call(material);
 material.onBeforeCompile=(shader,renderer)=>{
  previous?.call(material,shader,renderer);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 decalPosition;attribute vec3 decalNormal;varying vec3 vDecalPosition;varying vec3 vDecalNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvDecalPosition=decalPosition;vDecalNormal=decalNormal;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>'+functions).replace('#include <color_fragment>','#include <color_fragment>'+fragment);
 };
 material.customProgramCacheKey=()=>DECAL_KEY+'-'+id+(base?'|'+base:'');material.userData.decal=id;material.needsUpdate=true;
}
