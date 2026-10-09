import * as T from 'three';
// Replace subpixel seam boxes with analytically antialiased grout on the floor itself.
export function stabilizeGarageFloor(room){
 const owned=[];room.updateMatrixWorld(true);
 room.getObjectByName('Floor')?.traverse(o=>{
  if(!o.isMesh||!/^Stage_5_5/.test(o.parent.name))return;
  if(o.material.name==='Powdercoat charcoal'){
   const g=o.geometry.clone(),p=g.attributes.position,indices=[],v=new T.Vector3();
   const index=g.index,total=index?.count||p.count;
   for(let i=0;i<total;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(ids.every(id=>v.fromBufferAttribute(p,id).applyMatrix4(o.matrixWorld).y<.006))continue;indices.push(...ids);}
   g.setIndex(indices);o.geometry=g;owned.push(g);
  }
  if(o.material.name==='Fresh workshop cream'){
   const m=o.material;m.roughness=.48;m.metalness=.025;m.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 floorWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloorWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
    shader.fragmentShader='varying vec3 floorWorld;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 grid=floorWorld.xz*2.;vec2 fw=max(fwidth(grid),vec2(.0001));vec2 edge=abs(fract(grid+.5)-.5);vec2 grout=1.-smoothstep(vec2(.009)-fw,vec2(.009)+fw,edge);float seam=max(grout.x,grout.y);diffuseColor.rgb*=1.-seam*.30;`);
   };m.customProgramCacheKey=()=> 'garage-floor-grout-v1';
  }
 });return owned;
}
// Box-projected, cached garage probe: floor and walls stay spatially anchored on lacquer.
export function garageReflections(car){const done=new Set();car.traverse(o=>{const m=o.material;if(!o.isMesh||!m?.isMeshStandardMaterial||done.has(m)||(!m.isMeshPhysicalMaterial&&!/glass/i.test(m.name)))return;done.add(m);
 m.envMapIntensity=m.isMeshPhysicalMaterial?1.5:1.8;
 // Chain, never replace: the paint may already carry a full-body decal hook (car-customization.js).
 const previous=m.onBeforeCompile,previousKey=m.customProgramCacheKey;
 m.onBeforeCompile=(shader,renderer)=>{previous?.call(m,shader,renderer);
  shader.vertexShader='varying vec3 garageWorld;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngarageWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  const box=`varying vec3 garageWorld;
vec3 garageRay(vec3 ray){vec3 safeRay=mix(vec3(-1.),vec3(1.),step(vec3(0.),ray))*max(abs(ray),vec3(.0001));vec3 bounds=mix(vec3(-4.3,0.,-3.8),vec3(4.3,3.3,3.8),step(vec3(0.),safeRay));vec3 distances=(bounds-garageWorld)/safeRay;float travel=max(0.,min(distances.x,min(distances.y,distances.z)));return garageWorld+safeRay*travel-vec3(0.,1.25,.4);}
`;
  shader.fragmentShader=box+shader.fragmentShader.replace('#include <envmap_physical_pars_fragment>',T.ShaderChunk.envmap_physical_pars_fragment.replace('envMapRotation * reflectVec','envMapRotation * garageRay( reflectVec )'));
 };m.customProgramCacheKey=()=>'garage-box-reflection-v1|'+(previousKey?previousKey.call(m):'');m.needsUpdate=true;
 });}
