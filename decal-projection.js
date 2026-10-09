import * as T from 'three';
import {liveryById,DEFAULT_FIT} from './liveries.js';
import {liveryTexture,retainLivery,ROWS,ROW} from './decal-liveries.js';
// Ливрея — атлас (decal-liveries.js), проецируемый на кузов по координатам покоя машины: борт, верх и торцы
// выбираются по нормали грани, без UV-развёртки. Все расстояния — метры в пространстве машины.
export const DECAL_KEY='vinyl-stickers-v6';
// Финиш винила поверх лака: матовая плёнка, сатин, глянец, хром. Меняет шероховатость, металл и лак только
// под наклейкой — краска под ней остаётся своей.
export const VINYL_FINISH={matte:{roughness:.86,metalness:0,clearcoat:.05},satin:{roughness:.5,metalness:.05,clearcoat:.4},gloss:{roughness:.24,metalness:.10,clearcoat:.9},chrome:{roughness:.08,metalness:.92,clearcoat:1}};
export const DEFAULT_SPAN=[DEFAULT_FIT.length,DEFAULT_FIT.height];
const glslColor=value=>new T.Color(value).toArray().map(n=>n.toFixed(4)).join(',');

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

const fitOf=span=>Array.isArray(span)?{...DEFAULT_FIT,id:null,length:span[0],height:span[1]}:{...DEFAULT_FIT,...span};
// Хозяин атласа — собранная машина: retain при сборке кузова, release при разборке (car-customization.js).
// Нормализация кузова и цвета здесь та же, что в applyFullBodyDecal, иначе хозяин повиснет на чужом ключе.
export function retainDecal(id,span=DEFAULT_SPAN,paint=null){
 if(!liveryById(id))return null;
 return retainLivery(id,fitOf(span),paint?'#'+new T.Color(paint).getHexString():'#9d2730');
}
export {releaseLivery as releaseDecal} from './decal-liveries.js';
const vertexHook=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 decalPosition;attribute vec3 decalNormal;varying vec3 vDecalPosition;varying vec3 vDecalNormal;').replace('#include <begin_vertex>','#include <begin_vertex>\nvDecalPosition=decalPosition;vDecalNormal=decalNormal;');};
const chain=(material,hook,key,texture,id,fit)=>{
 const previous=material.onBeforeCompile,previousKey=material.customProgramCacheKey;
 const base=previousKey===T.Material.prototype.customProgramCacheKey?(previous&&previous!==T.Material.prototype.onBeforeCompile?previous.toString():''):previousKey.call(material);
 material.onBeforeCompile=(shader,renderer)=>{previous?.call(material,shader,renderer);(shader.uniforms||(shader.uniforms={})).decalMap={value:texture};vertexHook(shader);hook(shader);};
 material.customProgramCacheKey=()=>key+(base?'|'+base:'');
 material.userData.decal=id;material.userData.decalSpan=[fit.length,fit.height];material.userData.decalFit={id:fit.id,length:fit.length,height:fit.height,width:fit.width,wheelbase:fit.wheelbase,axleOffset:fit.axleOffset,radius:fit.radius,body:fit.body};material.needsUpdate=true;
};

// Кузов: атлас по трём проекциям, финиш винила только под наклейкой.
export function applyFullBodyDecal(material,id,span=DEFAULT_SPAN,paint=null){
 const d=liveryById(id);if(!d)return;
 const fit=fitOf(span),finish=VINYL_FINISH[d.finish]||VINYL_FINISH.matte;
 const paintHex=paint?'#'+new T.Color(paint).getHexString():'#9d2730';
 const texture=liveryTexture(id,fit,paintHex);
 const beltM=(fit.body?.belt??fit.height*.63)+.015;
 const consts=`const vec3 decalFit=vec3(${fit.length.toFixed(3)},${fit.height.toFixed(3)},${(fit.width||1.65).toFixed(3)});const float decalRow=${(1/ROWS).toFixed(6)};const float decalBelt=${beltM.toFixed(3)};`;
 const fragment=`
 vec3 dn=normalize(vDecalNormal);vec3 an=abs(dn);vec3 w=an*an;w=w*w*w;w/=max(w.x+w.y+w.z,.0001);
 // Низ кузова (нормаль вниз) винил не носит.
 w.y*=step(0.,dn.y);
 vec3 p=vDecalPosition;
 float sideR=step(0.,dn.z);
 vec2 uvSide=vec2(clamp(.5+(sideR*2.-1.)*p.x/decalFit.x,.002,.998),(clamp(p.y/decalFit.y,0.,1.)*.98+.01+${ROW.sideL}.+sideR)*decalRow);
 // Сверху при взгляде вниз (нос слева) правый борт +Z оказывается снизу кадра — атлас верха рисуется так же.
 vec2 uvTop=vec2(clamp(.5+p.x/decalFit.x,.002,.998),(clamp(.5-p.z/decalFit.z,0.,1.)*.98+.01+${ROW.top}.)*decalRow);
 float front=step(dn.x,0.);
 // Торцы читаются стоящим перед ними: спереди +Z справа, сзади — слева.
 vec2 uvEnd=vec2(clamp(.5+(front*2.-1.)*p.z/decalFit.z,.004,.996)*.5+(1.-front)*.5,(clamp(p.y/decalFit.y,0.,1.)*.98+.01+${ROW.ends}.)*decalRow);
 vec4 cS=texture2D(decalMap,uvSide),cT=texture2D(decalMap,uvTop),cE=texture2D(decalMap,uvEnd);
 // Стойки и рамки окон выше пояса — краска: наклейка на боковое стекло не заезжает.
 float sideW=w.z*${d.pillars?'1.':'(1.-smoothstep(decalBelt-.01,decalBelt+.01,p.y))'};
 float decalCover=clamp(cS.a*sideW+cT.a*w.y+cE.a*w.x,0.,1.);
 vec3 decalRgb=(cS.rgb*cS.a*sideW+cT.rgb*cT.a*w.y+cE.rgb*cE.a*w.x)/max(cS.a*sideW+cT.a*w.y+cE.a*w.x,.0001);
 diffuseColor.rgb=mix(diffuseColor.rgb,decalRgb,decalCover);`;
 chain(material,shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D decalMap;varying vec3 vDecalPosition;varying vec3 vDecalNormal;'+consts)
   .replace('#include <color_fragment>','#include <color_fragment>'+fragment)
   .replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,${finish.roughness.toFixed(3)},decalCover);`)
   .replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,${finish.metalness.toFixed(3)},decalCover);`)
   .replace('#include <lights_physical_fragment>',T.ShaderChunk.lights_physical_fragment.replace('material.clearcoat = clearcoat;',`material.clearcoat = mix(clearcoat,${finish.clearcoat.toFixed(3)},decalCover);`));
 },`${DECAL_KEY}-${id}-${consts}-${d.finish}`,texture,id,fit);
}

// Стекло: козырёк по верхней кромке лобового — полоса цвета ливреи с надписью. Верхние 11 % высоты,
// только передняя половина машины и грани, смотрящие вперёд-вверх.
// glassTop — верхняя кромка стекла в метрах (из габарита меша): у всех моделей она ниже крыши, и если считать
// от крыши, на стекло попадает только низ козырька без букв.
// glass = {top, half, centre}: кромка стекла, полуширина лобового у кромки и её центр по Z (из вершин меша).
// Стекло у крыши заметно уже кузова, иначе края надписи уходят на стойки.
export function applyGlassBanner(material,id,span=DEFAULT_SPAN,paint=null,glass=null){
 const d=liveryById(id);if(!d?.glass?.banner)return;
 const fit=fitOf(span),texture=liveryTexture(id,fit,paint?'#'+new T.Color(paint).getHexString():'#9d2730');
 const g=typeof glass==='number'?{top:glass}:(glass||{});
 const top=(Number.isFinite(g.top)?g.top:fit.height-.04)-.008,bottom=top-.10,half=Number.isFinite(g.half)?g.half:(fit.width||1.65)*.36,centre=g.centre||0;
 const consts=`const vec3 decalFit=vec3(${fit.length.toFixed(3)},${fit.height.toFixed(3)},${(fit.width||1.65).toFixed(3)});const float decalRow=${(1/ROWS).toFixed(6)};const float glassTop=${top.toFixed(3)},glassBottom=${bottom.toFixed(3)},glassHalf=${half.toFixed(3)},glassCentre=${centre.toFixed(3)};`;
 chain(material,shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D decalMap;varying vec3 vDecalPosition;varying vec3 vDecalNormal;'+consts)
   .replace('#include <color_fragment>',`#include <color_fragment>
 vec3 dn=normalize(vDecalNormal);vec3 p=vDecalPosition;
 float top=glassTop,bottom=glassBottom;
 float strip=smoothstep(bottom-.01,bottom+.01,p.y)*(1.-smoothstep(top-.005,top+.005,p.y));
 // Только лобовое: передняя половина, грань смотрит вперёд, а не в бок (боковые стёкла — |z|≈1).
 float windshield=step(p.x,-.05)*step(.3,-dn.x)*(1.-step(.55,abs(dn.z)));
 vec2 uvGlass=vec2(clamp(.5+(p.z-glassCentre)/(2.*glassHalf),.01,.99),(clamp((p.y-bottom)/(top-bottom),0.,1.)*.9+.05+${ROW.glass}.)*decalRow);
 vec4 cG=texture2D(decalMap,uvGlass);float glassCover=strip*windshield*cG.a;
 diffuseColor.rgb=mix(diffuseColor.rgb,cG.rgb,glassCover);diffuseColor.a=max(diffuseColor.a,glassCover*.96);`)
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.55,glassCover);')
   .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,0.,glassCover);');
 },`${DECAL_KEY}-glass-${id}-${consts}`,texture,id,fit);material.userData.glass={top:top+.008,half,centre};
}
