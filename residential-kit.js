import * as T from 'three';
import {createGLTFLoader} from './gltf.js';
import {softenShadowBoundary} from './race-shadows.js';
import {applyIndustrialWeathering} from './location-weathering.js';
let asset=null,pending=null;
export function loadResidentialKit(){
 if(asset)return Promise.resolve(asset);
 if(!pending)pending=Promise.all([
  createGLTFLoader().loadAsync(new URL('./assets/residential/neighbourhood-v7.glb?v=3447683',import.meta.url).href),
  fetch(new URL('./assets/residential/layout.json?v=3447683',import.meta.url)).then(r=>{if(!r.ok)throw Error('Residential layout '+r.status);return r.json();})
 ]).then(([g,layout])=>asset={scene:g.scene,layout}).catch(e=>{pending=null;throw e;});
 return pending;
}
export function getResidentialKit(){return asset;}
// Cache only source resources. Every race owns its copies; textures stay shared.
export class ResidentialKit{
 constructor(source,{materials,box,cyl,scenery}){
  Object.assign(this,{source,materials,box,cyl,scenery});this.copies=new Map();this.atlas=null;
  source.scene.traverse(o=>{if(o.material?.name==='Ground atlas')this.atlas=o.material.map;});
  this.shadow=softenShadowBoundary(new T.MeshStandardMaterial({color:0x656966,roughness:1}));materials.set('residential-proxy',this.shadow);
  // The balcony/roof silhouette uses back faces; a wall-sized front-face core
  // also occludes foundations inside that larger volume. It never draws color.
  this.coreShadow=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,depthTest:false,shadowSide:T.FrontSide});materials.set('residential-core-shadow',this.coreShadow);
 }
 material(src){
  if(!this.copies.has(src)){
   const m=softenShadowBoundary(src.clone());m.userData={...src.userData,residential:true};m.envMapIntensity=.65;
   if(src.name.startsWith('Residential courtyard')){m.vertexColors=false;m.metalness=0;m.roughness=1;m.emissive.set(0);m.envMapIntensity=.25;}
   applyIndustrialWeathering(m);this.copies.set(src,m);this.materials.set('residential-'+src.uuid,m);
  }return this.copies.get(src);
 }
 chunk(g,k){
  const n=[0,1,2,3,4,1,2,3][k],source=this.source.scene.getObjectByName('residential-chunk-'+n);
  if(!source)throw Error('Missing residential chunk '+n);
  const root=source.clone(true);root.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();o.geometry.deleteAttribute('tangent');o.material=this.material(o.material);o.castShadow=o.material.name==='Poplar and weeds cutout';o.receiveShadow=true;}});g.add(root);
  for(const p of this.source.layout.shadowProxies[n]){
   const [x,y,z]=p.center,[w,h,d]=p.size;
   if(p.tree){
    // Crown uses the visible GLB leaf cards and their alpha mask. Only the
    // narrow hidden trunk needs a proxy; never fill the crown with solid lobes.
    const base=y-h/2,trunk=this.cyl(g,.105,h*.31,[x,base+h*.155,z],this.shadow);
    trunk.castShadow=true;trunk.userData.shadowProxy=true;continue;
   }
   if(p.core){const core=this.box(g,p.core.size,p.core.center,this.coreShadow);core.castShadow=true;core.userData.shadowProxy=true;}
   const o=this.box(g,[w,h,d],[x,y,z],this.shadow);
   o.castShadow=true;o.userData.shadowProxy=true;
   if(!p.tree)this.scenery.footprints.push({x,z:z+g.position.z,hx:w/2,hz:d/2});
  }
 }
}
