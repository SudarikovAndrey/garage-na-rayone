import * as T from 'three';
import {STREET_LIGHTING} from './lighting-state.js';
// The drag streets have two columns of equally spaced fixtures. Only the closest
// row can reach an above-ground fragment: height*tan(angle) < spacing/2.
// Evaluate that row's two physical lights through Three's PBR equations, at any
// road distance. Work per pixel is constant; no camera-centred light budget edge.
export class StreetSurfaceLight{
 constructor(){
  this.enabled=false;this.materials=new WeakSet();
  this.uniforms={streetGrid:{value:new T.Vector4()},streetGridStep:{value:30},streetGridTravel:{value:0},streetGridPower:{value:0},streetGridColor:{value:new T.Color(STREET_LIGHTING.color)},streetShadowSource:{value:new T.Vector3()}};
 }
 configure(lamps){
  this.enabled=false;if(!lamps.length)return;
  const xs=[...new Set(lamps.map(l=>l.x+l.group.position.x))].sort((a,b)=>a-b),zs=[...new Set(lamps.map(l=>l.z+l.group.position.z))].sort((a,b)=>a-b),y=lamps[0].y,step=zs[1]-zs[0];
  if(xs.length!==2||!(step>2*(y+.5)*Math.tan(.88))||lamps.length!==zs.length*2)return;
  if(lamps.some(l=>Math.abs(l.y-y)>1e-5)||zs.some((z,i)=>i&&Math.abs(z-zs[i-1]-step)>1e-5))return;
  this.uniforms.streetGrid.value.set(xs[0],xs[1],y,zs[0]);this.uniforms.streetGridStep.value=step;this.enabled=true;
 }
 update(travel,level,source){
  this.uniforms.streetGridTravel.value=((travel%480)+480)%480;
  this.uniforms.streetGridPower.value=this.enabled&&level>.35?STREET_LIGHTING.intensity*level:0;
  if(source)this.uniforms.streetShadowSource.value.copy(source.world);
 }
 rowAt(z){const u=this.uniforms,g=u.streetGrid.value,step=u.streetGridStep.value,offset=g.w+u.streetGridTravel.value;return Math.floor((z-offset)/step+.5)*step+offset;}
 attach(material){
  if(!material?.isMeshStandardMaterial||this.materials.has(material))return;this.materials.add(material);
  const before=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
   before.call(material,shader,renderer);Object.assign(shader.uniforms,this.uniforms);
   shader.vertexShader='varying vec3 streetSurfaceWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nstreetSurfaceWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader='varying vec3 streetSurfaceWorld;uniform vec4 streetGrid;uniform float streetGridStep,streetGridTravel,streetGridPower;uniform vec3 streetGridColor,streetShadowSource;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_maps>',`
    if(streetGridPower>0. && streetSurfaceWorld.y<streetGrid.z){
     float row=floor((streetSurfaceWorld.z-streetGridTravel-streetGrid.w)/streetGridStep+.5)*streetGridStep+streetGridTravel+streetGrid.w;
     // Same cutoff, penumbra and inverse-square attenuation as the local fixture.
     for(int streetSide=0;streetSide<2;streetSide++){
      vec3 source=vec3(streetSide==0?streetGrid.x:streetGrid.y,streetGrid.z,row);
      vec3 delta=source-streetSurfaceWorld;
      float distanceToLamp=length(delta);
      float cone=smoothstep(.637151144,.981318543,delta.y/max(distanceToLamp,.001));
      if(cone>0.){
       IncidentLight streetIncident;
       streetIncident.direction=(viewMatrix*vec4(delta/max(distanceToLamp,.001),0.)).xyz;
       streetIncident.color=streetGridColor*streetGridPower*cone*getDistanceAttenuation(distanceToLamp,23.,2.);
       streetIncident.visible=true;
       #if defined(USE_SHADOWMAP) && NUM_SPOT_LIGHT_SHADOWS > 0
        if(receiveShadow && distance(source,streetShadowSource)<.1){
         streetIncident.color*=getShadow(spotShadowMap[0],spotLightShadows[0].shadowMapSize,spotLightShadows[0].shadowIntensity,spotLightShadows[0].shadowBias,spotLightShadows[0].shadowRadius,vSpotLightCoord[0]);
        }
       #endif
       RE_Direct(streetIncident,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);
      }
     }
    }
    #include <lights_fragment_maps>`);
  };
  material.customProgramCacheKey=()=>key+'-street-surface-pbr-v1';material.needsUpdate=true;
 }
}
