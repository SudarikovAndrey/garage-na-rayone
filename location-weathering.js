// Three.js MeshStandardMaterial extension for this kit's shared props atlas.
// No extra textures, geometry or material slots. Standard GLB vertex colours
// remain usable without this shader. Attach after loading/cloning a material.
export const weatheringState = {
 enabled: {value:1}, strength: {value:.7}, seed: {value:11}
};
const vertex = `
varying vec3 vWeatherPosition;
varying vec3 vWeatherNormal;
`;
const fragment = `
varying vec3 vWeatherPosition;
varying vec3 vWeatherNormal;
uniform float weatherEnabled;
uniform float weatherStrength;
uniform float weatherSeed;
uniform float surfaceAtlas;
uniform float residentialFacade;
uniform float kioskPaint;
float wHash(vec3 p) {
 p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);
}
float wNoise(vec3 p) {
 vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(mix(wHash(i),wHash(i+vec3(1,0,0)),f.x),
                mix(wHash(i+vec3(0,1,0)),wHash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(wHash(i+vec3(0,0,1)),wHash(i+vec3(1,0,1)),f.x),
                mix(wHash(i+vec3(0,1,1)),wHash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
vec2 wMirror(vec2 p) { return 1.-abs(mod(p,2.)-1.); }
#ifdef USE_MAP
vec3 wAtlas(vec2 p) { return texture2D(map,vec2(.008)+.484*wMirror(p)).rgb; }
vec3 wSurfaceSample(vec2 q,vec2 origin,vec2 cell) {
 vec2 offset=vec2(wHash(vec3(cell,3.1)),wHash(vec3(cell,7.9)))*11.;
 return texture2D(map,origin+vec2(.008)+.484*wMirror(q+offset)).rgb;
}
vec3 wSurface(vec2 q,vec2 origin) {
 vec2 i=floor(q*.32),f=fract(q*.32);f=f*f*(3.-2.*f);
 return mix(mix(wSurfaceSample(q,origin,i),wSurfaceSample(q,origin,i+vec2(1,0)),f.x),
            mix(wSurfaceSample(q,origin,i+vec2(0,1)),wSurfaceSample(q,origin,i+vec2(1,1)),f.x),f.y);
}
vec3 wProjected(vec3 p,vec3 n) {
 vec3 w=pow(abs(normalize(n)),vec3(4.));w/=max(dot(w,vec3(1)),.0001);
 return wAtlas(p.yz)*w.x+wAtlas(p.xz+vec2(.43,.72))*w.y+wAtlas(p.xy+vec2(1.17,.38))*w.z;
}
#endif
`;
export function applyIndustrialWeathering(material) {
 if(!material.userData.proceduralWeathering&&!material.userData.proceduralSurface&&!material.userData.kioskPaint)return false;
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey();
 material.onBeforeCompile=(shader,renderer)=>{
  previous.call(material,shader,renderer);
  shader.uniforms.residentialFacade={value:material.userData.residentialFacade?1:0};
  shader.uniforms.kioskPaint={value:material.userData.kioskPaint?1:0};
  shader.uniforms.surfaceAtlas={value:material.userData.proceduralSurface?1:0};
  shader.uniforms.weatherEnabled=weatheringState.enabled;
  shader.uniforms.weatherStrength=weatheringState.strength;
  shader.uniforms.weatherSeed=weatheringState.seed;
  shader.vertexShader=vertex+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vWeatherPosition=position;vWeatherNormal=normal;
   #ifdef USE_INSTANCING
   vWeatherPosition=(instanceMatrix*vec4(position,1.)).xyz;
   vWeatherNormal=mat3(instanceMatrix)*normal;
   #endif
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_pars_fragment>','#include <map_pars_fragment>\n'+fragment);
  // Recolour after COLOR_0: palette is already baked per asset and survives batching.
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float wWear=0.;
   #ifdef USE_MAP
   if(kioskPaint>.5) {
    vec3 original=texture2D(map,vMapUv).rgb;
    // Preserve glass, stock and cream wall panels; recolour blue enamel only.
    float mask=smoothstep(.012,.065,original.b-original.r)*smoothstep(.015,.08,original.b);
    vec3 palette=vec3(.14,.40,.46);
    #ifdef USE_COLOR
    palette=vColor.rgb;
    #endif
    float grain=dot(original,vec3(.2126,.7152,.0722));
    float fade=wNoise(vWeatherPosition*.57+weatherSeed);
    vec3 paint=palette*clamp(.42+grain*2.4,.35,1.25);
    paint=mix(paint,paint*.74+vec3(.09,.075,.045),weatherStrength*smoothstep(.45,.8,fade)*.45);
    diffuseColor.rgb=mix(original,paint,mask);
   } else if(weatherEnabled>.5 && surfaceAtlas>.5) {
    vec3 p=vWeatherPosition;
    vec3 n=abs(normalize(vWeatherNormal));
    vec2 origin=floor(vMapUv*2.)*.5;
    bool brick=origin.x>.25 && origin.y>.25;
    vec2 q=n.y>.65?p.xz:(n.x>n.z?vec2(p.z,p.y):p.xy);
    vec3 tex=wSurface(q*.36,origin);
    vec3 palette=vec3(1.);
    #ifdef USE_COLOR
    palette=vColor.rgb;
    #endif
    float macro=wNoise(p*.14+weatherSeed);
    if(brick) {
      // Metric brick courses have no per-quad UV resets or checkerboard seams.
      vec2 b=q/vec2(.30,.092);b.x+=mod(floor(b.y),2.)*.5;
      vec2 id=floor(b),f=fract(b),aa=max(fwidth(b),vec2(.0001));
      vec2 edge=min(f,1.-f);
      float joint=1.-smoothstep(.03,.03+max(aa.x,aa.y)*.8,min(edge.x,edge.y));
      float grain=dot(tex,vec3(.2126,.7152,.0722));
      float variation=.70+.55*wHash(vec3(id,2.3));
      vec3 brickColor=vec3(.26,.18,.135)*variation*(.78+grain*1.4);
      float soot=wNoise(vec3(q.x*.26,q.y*.075,7.));
      brickColor*=.72+.28*soot;
      diffuseColor.rgb=mix(brickColor,vec3(.16,.15,.13),joint*.65)*palette;
    } else {
      diffuseColor.rgb=tex*palette*(.82+macro*.30);
      if(residentialFacade>.5) {
       float grain=dot(tex,vec3(.2126,.7152,.0722));
       vec3 plaster=mix(vec3(.47,.49,.47),vec3(.72,.73,.68),smoothstep(.10,.65,grain));
       vec2 panel=q/vec2(3.3,2.96),f=fract(panel),aa=max(fwidth(panel),vec2(.0001));
       float joint=1.-smoothstep(.003,.003+max(aa.x,aa.y),min(min(f.x,1.-f.x),min(f.y,1.-f.y)));
       float drip=wNoise(vec3(q.x*2.7,q.y*.18,weatherSeed+19.));
       float grime=weatherStrength*(.22*smoothstep(.43,.76,drip)+.18*exp(-max(p.y-.4,0.)*.65));
       diffuseColor.rgb=plaster*palette*(.82+macro*.22)*(1.-joint*.16)*(1.-grime);
      }
    }
    diffuseColor.rgb*=1.-weatherStrength*.16*smoothstep(.25,.75,1.-macro);
   } else if(weatherEnabled>.5 && surfaceAtlas<.5 && vMapUv.x>.5 && vMapUv.y<.5) {
    vec3 p=vWeatherPosition,n=abs(normalize(vWeatherNormal));
    vec2 q=n.y>.65?p.xz:(n.x>n.z?vec2(p.z,p.y):p.xy);
    vec3 tex=wSurface(q*.38,vec2(.5,0.));
    float grain=dot(tex,vec3(.2126,.7152,.0722));
    vec3 palette=vec3(1.);
    #ifdef USE_COLOR
    palette=vColor.rgb;
    #endif
    float dirt=wNoise(p*.22+weatherSeed);
    diffuseColor.rgb=vec3(.80,.79,.74)*(.15+sqrt(grain)*.80)*palette;
    diffuseColor.rgb*=.83+.17*dirt;
   } else if(weatherEnabled>.5 && surfaceAtlas<.5 && vMapUv.x<.5 && vMapUv.y<.5) {
    vec3 p=vWeatherPosition+vec3(weatherSeed*3.17,weatherSeed*.73,weatherSeed*1.39);
    float broad=wNoise(p*.27);
    float fine=wNoise(p*1.31+vec3(13.7,2.1,8.4));
    // Object-space projection breaks the repeated UV bands and equalises texel scale.
    vec3 samplePaint=wProjected(p*.34,vWeatherNormal);
    float grain=dot(samplePaint,vec3(.2126,.7152,.0722));
    float value=clamp(.12+sqrt(max(grain,0.))*1.35,.16,.88);
    vec3 palette=vec3(1.);
    #ifdef USE_COLOR
    palette=vColor.rgb;
    #endif
    vec3 paint=palette*value;
    float faded=smoothstep(.44,.8,broad)*weatherStrength;
    paint=mix(paint,paint*.78+vec3(.14,.125,.095),faded*.7);
    float chipped=clamp((samplePaint.r-samplePaint.g)*7.,0.,1.);
    float rusty=smoothstep(.51,.74,broad*.68+fine*.22+chipped*.10)*weatherStrength;
    vec3 rust=vec3(.19,.070,.025)*(.6+fine*.6);
    paint=mix(paint,rust,rusty*.85);
    float drip=wNoise(vec3(p.x*2.1,p.y*.14,p.z*2.1)+5.3);
    paint*=1.-weatherStrength*.24*smoothstep(.57,.83,drip);
    diffuseColor.rgb=mix(diffuseColor.rgb,paint,weatherEnabled);
    wWear=rusty;
   }
   #endif
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=clamp(roughnessFactor+wWear*.1,0.,1.);');
 };
 material.customProgramCacheKey=()=>previousKey+'-reviewed-location-v7';
 material.needsUpdate=true;
 return true;
}
