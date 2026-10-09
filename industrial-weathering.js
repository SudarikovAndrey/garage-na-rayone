// Kit albedo/vertex palette, broad weathering and art LOD. All hooks chain with
// the game's sun/contact/street lighting; no new textures or lighting passes.
export function industrialMaterial(material,{small=false,far=false}={}){
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.userData.industrial=true;material.userData.industrialSmall=small;material.userData.industrialFar=far;
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);
  shader.uniforms.industryLOD={value:[small?48:145,small?70:175,far?1:0]};
  shader.uniforms.industryWeathering={value:material.userData.proceduralWeathering?1:0};
  shader.vertexShader='varying vec3 industryPosition,industryNormal,industryWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nindustryPosition=position;industryNormal=normal;');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nindustryWorld=(modelMatrix*vec4(transformed,1.)).xyz;');
  shader.fragmentShader=`uniform vec3 industryLOD;uniform float industryWeathering;varying vec3 industryPosition,industryNormal,industryWorld;
   float iHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float iNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(iHash(i),iHash(i+vec3(1,0,0)),f.x),mix(iHash(i+vec3(0,1,0)),iHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(iHash(i+vec3(0,0,1)),iHash(i+vec3(1,0,1)),f.x),mix(iHash(i+vec3(0,1,1)),iHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float industryDistance=length(industryWorld.xz-cameraPosition.xz);
   float industryFade=1.-smoothstep(industryLOD.x,industryLOD.y,industryDistance);
   float industryDither=fract(52.9829189*fract(dot(floor(gl_FragCoord.xy),vec2(.06711056,.00583715))));
   if(industryLOD.z>.5?industryDither<industryFade:industryDither>=industryFade)discard;
   float industryDetail=1.-smoothstep(50.,150.,industryDistance);
   float industryWear=0.;
   #ifdef USE_MAP
   if(industryWeathering>.5&&vMapUv.x<.5&&vMapUv.y<.5){
    // Neutralise the source atlas's green tint even when detailed wear has faded.
    vec3 palette=vec3(1.);
    #ifdef USE_COLOR
     palette=vColor.rgb;
    #endif
    vec3 paint=palette*.40;
    if(industryDetail>.01){
     vec3 p=industryPosition+vec3(34.87,8.03,15.29);
     vec3 axis=pow(abs(normalize(industryNormal)),vec3(4.));axis/=max(dot(axis,vec3(1.)),.001);
     vec3 grain=texture2D(map,.008+.484*(1.-abs(mod(p.yz*.34,2.)-1.))).rgb*axis.x;
     grain+=texture2D(map,.008+.484*(1.-abs(mod(p.xz*.34+vec2(.43,.72),2.)-1.))).rgb*axis.y;
     grain+=texture2D(map,.008+.484*(1.-abs(mod(p.xy*.34+vec2(1.17,.38),2.)-1.))).rgb*axis.z;
     float broad=iNoise(p*.27),fine=iNoise(p*1.31+vec3(13.7,2.1,8.4));
     vec3 worn=palette*clamp(.12+sqrt(max(dot(grain,vec3(.2126,.7152,.0722)),0.))*1.35,.16,.88);
     worn=mix(worn,worn*.78+vec3(.14,.125,.095),smoothstep(.44,.8,broad)*.49);
     float rust=smoothstep(.51,.74,broad*.68+fine*.22+clamp((grain.r-grain.g)*7.,0.,1.)*.10)*.60;
     worn=mix(worn,vec3(.19,.070,.025)*(.6+fine*.6),rust*.85);
     worn*=1.-.16*smoothstep(.57,.83,iNoise(vec3(p.x*2.1,p.y*.14,p.z*2.1)+5.3));
     paint=mix(paint,worn,industryDetail);industryWear=rust*industryDetail;
    }
    diffuseColor.rgb=paint;
   }
   #endif
   float industryBase=(1.-smoothstep(.08,.8,industryWorld.y))*industryDetail;
   diffuseColor.rgb*=1.-industryBase*.20;
   // Scenery remains less saturated than the racing cars.
   diffuseColor.rgb=mix(vec3(dot(diffuseColor.rgb,vec3(.2126,.7152,.0722))),diffuseColor.rgb,.76);
   `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=min(1.,roughnessFactor+industryWear*.1);');
 };
 material.customProgramCacheKey=()=>key+'-industrial-v2';return material;
}
