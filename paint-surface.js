// UV-independent lacquer microfinish. Object space sticks to moving cars; derivatives
// remove subpixel structure before it can shimmer. No maps, extra passes or time uniform.
const installed=new WeakSet();
export function applyPaintSurface(material){
 if(installed.has(material))return material;
 installed.add(material);
 material.userData.paintSurface=true;
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  shader.vertexShader='varying vec3 paintPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npaintPosition=position;');
  shader.fragmentShader='varying vec3 paintPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`
   #include <lights_physical_fragment>
   // Roughness variation in the coating, not fake emissive glitter or geometry dents.
   vec3 pp=paintPosition*340.;
   float footprint=max(length(dFdx(pp)),length(dFdy(pp)));
   float resolved=1.-smoothstep(.65,2.5,footprint);
   float peel=sin(pp.x+sin(pp.z*.73))*sin(pp.y*1.13+pp.z);
   material.roughness=clamp(material.roughness+peel*.018*resolved*metalnessFactor, .0525,1.);
   #ifdef USE_CLEARCOAT
    material.clearcoatRoughness=clamp(material.clearcoatRoughness+(.5+.5*peel)*.028*resolved,.0525,1.);
   #endif
  `);
 };
 material.customProgramCacheKey=()=>key+'-paint-surface-v1';
 material.needsUpdate=true;
 return material;
}
