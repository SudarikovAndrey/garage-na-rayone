// Quiet metre-scale concrete/dust. Coordinates follow the scenery ring, never
// the camera. Analytic marks fade before becoming sub-pixel, without decal draws.
export function industrialGround(material,travel,{road=false,atlas=null}={}){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);shader.uniforms.yardRoad={value:road?1:0};shader.uniforms.industryTravel=travel;shader.uniforms.yardAtlas={value:atlas};
  shader.vertexShader='varying vec3 yardWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nyardWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=`varying vec3 yardWorld;uniform float industryTravel;uniform float yardRoad;uniform sampler2D yardAtlas;
   float yardHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float yardNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(yardHash(i),yardHash(i+vec2(1,0)),f.x),mix(yardHash(i+vec2(0,1)),yardHash(i+1.),f.x),f.y);}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec2 yardP=vec2(yardWorld.x,mod(yardWorld.z-industryTravel+960.,480.));
   float yardDistance=length(yardWorld.xz-cameraPosition.xz);
   float yardDetail=1.-smoothstep(45.,110.,yardDistance);
   float yardBroad=yardNoise(yardP*.095);
   float yardRough=yardBroad;
   if(yardRoad>.5){
    float curb=smoothstep(2.9,3.95,abs(yardWorld.x));
    float dust=curb*(.10+.15*yardBroad)*yardDetail;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.16,.137,.099),dust);
    // Short cracked and repaired patches close to the edge, not a noisy carpet.
    float crack=1.-smoothstep(.012,.03+fwidth(yardP.x)*1.4,abs(abs(yardP.x)-3.35-sin(yardP.y*1.7)*.10));
    crack*=smoothstep(.58,.74,yardNoise(yardP*.31));
    diffuseColor.rgb*=1.-crack*.22*yardDetail;
   }else{
    vec2 grid=yardP/vec2(5.8,7.5),cell=floor(grid);
    float cellTone=yardHash(cell);
    vec2 edge=min(fract(grid),1.-fract(grid))*vec2(5.8,7.5);
    float seam=1.-smoothstep(.008,.025+max(fwidth(yardP.x),fwidth(yardP.y)),min(edge.x,edge.y));
    float dirt=smoothstep(.35,.80,yardBroad);
    vec3 yardTint=mix(vec3(.89,.88,.85),vec3(.80,.75,.65),dirt*.45);
    diffuseColor.rgb*=yardTint*(.92+.13*yardBroad+yardDetail*(cellTone-.5)*.09);
    if(yardDetail>.01){
     vec2 uv1=.508+.484*(1.-abs(mod(yardP/4.8,2.)-1.));uv1.y-=.5;
     vec2 uv2=.508+.484*(1.-abs(mod(yardP.yx/7.1+vec2(.37,.61),2.)-1.));uv2.y-=.5;
     vec3 concrete=mix(texture2D(yardAtlas,uv1).rgb,texture2D(yardAtlas,uv2).rgb,.4);
     diffuseColor.rgb*=mix(vec3(1.),clamp(concrete*2.4,vec3(.55),vec3(1.3)),.60*yardDetail);
    }
    diffuseColor.rgb*=1.-seam*.16*yardDetail;
    // Broad compacted tracks crossing the yards, subtle in the middle distance.
    float track=exp(-pow((mod(yardP.y+8.,60.)-14.)/2.4,2.));
    diffuseColor.rgb*=1.-track*.12*yardDetail;
   }
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+(yardRough-.5)*.08,0.,1.);');
 };
 material.customProgramCacheKey=()=>key+'-industrial-ground-v2';return material;
}
