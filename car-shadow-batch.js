import * as T from 'three';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
// Exact original triangles, grouped only under the SAME parent. Wheel rotation,
// body pitch and parent visibility therefore remain identical. No silhouette LOD.
export function batchCarShadows(root){
 const buckets=new Map(),sources=[],proxies=[],poses=[];let disposed=false;
 root.traverse(o=>{
  if(!o.isMesh||!o.castShadow||!o.visible||o.isSkinnedMesh||o.isInstancedMesh||o.morphTargetInfluences||Array.isArray(o.material)||o.customDepthMaterial||o.customDistanceMaterial)return;
  const m=o.material;if(o.geometry.drawRange.start!==0||Number.isFinite(o.geometry.drawRange.count)||m.alphaTest>0||m.alphaMap||m.displacementMap||m.clippingPlanes?.length)return;
  const parent=o.parent,side=m.shadowSide??(m.side===T.FrontSide?T.BackSide:m.side===T.BackSide?T.FrontSide:T.DoubleSide);
  let bySide=buckets.get(parent);if(!bySide){bySide=new Map();buckets.set(parent,bySide);}
  const items=bySide.get(side)||[];items.push(o);bySide.set(side,items);
 });
 for(const [parent,bySide] of buckets)for(const [side,items] of bySide){
  if(items.length<2)continue;
  const geometries=[];
  for(const o of items){
   o.updateMatrix();const position=o.geometry.attributes.position;
   // GLTFLoader often returns interleaved attributes. mergeVertices allocates
   // via attribute.constructor, which is invalid for InterleavedBufferAttribute.
   const points=new Float32Array(position.count*3);
   for(let i=0;i<position.count;i++)points.set([position.getX(i),position.getY(i),position.getZ(i)],i*3);
   let g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(points,3));if(o.geometry.index)g.setIndex(o.geometry.index.clone());
   // Depth needs positions only. Welding UV/normal seams reduces vertex work
   // without changing triangle coverage or replacing the tuned car's outline.
   for(const key of Object.keys(g.attributes))if(key!=='position')g.deleteAttribute(key);
   const welded=mergeVertices(g,1e-6);g.dispose();g=welded;g.applyMatrix4(o.matrix);geometries.push(g);
  }
  const geometry=mergeGeometries(geometries);for(const g of geometries)g.dispose();
  if(!geometry)continue;
  const material=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,shadowSide:side});
  const proxy=new T.Mesh(geometry,material);proxy.onBeforeRender=()=>geometry.setDrawRange(0,0);proxy.onAfterRender=()=>geometry.setDrawRange(0,Infinity);
  proxy.name='CarShadowBatch';proxy.castShadow=true;proxy.userData.shadowProxy=true;parent.add(proxy);proxies.push(proxy);
  for(const o of items){sources.push(o);poses.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});o.castShadow=false;}
 }
 return {sources,proxies,update(){if(!disposed&&poses.some(({o,p,q,s})=>!o.visible||!p.equals(o.position)||!q.equals(o.quaternion)||!s.equals(o.scale)))this.dispose();},dispose(){if(disposed)return;disposed=true;for(const o of sources)o.castShadow=true;for(const o of proxies){o.removeFromParent();o.geometry.dispose();o.material.dispose();}}};
}
