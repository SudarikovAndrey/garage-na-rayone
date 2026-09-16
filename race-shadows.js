import * as T from 'three';
// Fixed receiver coverage: the road scrolls, so this light volume must not jump with chunks.
// Объём теней должен накрывать не только полотно, но и застройку по сторонам (дома стоят на x ±13),
// иначе они физически не попадают в карту теней и на дорогу ничего не падает. Длину окна ужали со 150 до 95 м:
// дальше камера всё равно не видит, зато на тексель приходится вдвое меньше метров и тень под машиной резче.
export const SHADOW_ROAD={left:-28,right:28,back:26,ahead:-70,padding:6};
export function configureRaceShadow(light){
 const dir=light.position.clone().sub(light.target.position).normalize();
 const center=new T.Vector3(0,0,(SHADOW_ROAD.ahead+SHADOW_ROAD.back)/2);
 light.target.position.copy(center);light.position.copy(center).addScaledVector(dir,180);
 light.updateMatrixWorld(true);light.target.updateMatrixWorld(true);light.shadow.updateMatrices(light);
 const camera=light.shadow.camera,box=new T.Box3(),p=new T.Vector3();
 for(const x of [SHADOW_ROAD.left,SHADOW_ROAD.right])for(const z of [SHADOW_ROAD.ahead,SHADOW_ROAD.back])box.expandByPoint(p.set(x,0,z).applyMatrix4(camera.matrixWorldInverse));
 Object.assign(camera,{left:box.min.x-SHADOW_ROAD.padding,right:box.max.x+SHADOW_ROAD.padding,bottom:box.min.y-SHADOW_ROAD.padding,top:box.max.y+SHADOW_ROAD.padding,near:1,far:400});
 camera.updateProjectionMatrix();light.shadow.autoUpdate=true;light.shadow.needsUpdate=true;
}
// Windows, joints, thin trim and markings do not need separate shadow draws.
export function isMajorCaster(size,kind){
 if(kind==='detail')return false;
 if(kind==='sphere')return Math.min(...size)>.35;
 if(kind==='cylinder')return size[1]>1&&size[0]>.06;
 // Плоская плита перекрытия ниже 35 см, но это целый этаж дома: по площади она и даёт тень на дорогу.
 if(size[0]>2.5&&size[2]>2.5)return true;
 return size[1]>.35&&((size[0]>.28&&size[2]>.28)||(size[1]>3&&Math.min(size[0],size[2])>.06));
}
export function shadowOnlyMaterial(){return new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,side:T.FrontSide});}
// Feather the outer guard band instead of revealing a straight shadow-map edge on the road.
export function softenShadowBoundary(material){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=function(shader,renderer){
  previous.call(this,shader,renderer);
  const chunk=T.ShaderChunk.shadowmap_pars_fragment.replace('return mix( 1.0, shadow, shadowIntensity );',`float edgeDistance = min(min(shadowCoord.x, 1.0-shadowCoord.x), min(shadowCoord.y, 1.0-shadowCoord.y));
  return mix(1.0, shadow, shadowIntensity * smoothstep(0.0, 0.055, edgeDistance));`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <shadowmap_pars_fragment>',chunk);
 };
 material.customProgramCacheKey=()=> 'race-shadow-guard-v1';
 return material;
}
