import * as T from 'three';
import {createGLTFLoader} from './gltf.js';
import {softenShadowBoundary} from './race-shadows.js';
import {industrialMaterial} from './industrial-weathering.js';
let asset=null,pending=null;
export function loadIndustrialKit(){
 if(asset)return Promise.resolve(asset);
 if(!pending)pending=createGLTFLoader().loadAsync(new URL('./assets/industrial/factory-kit.glb',import.meta.url).href).then(g=>asset=g.scene).catch(e=>{pending=null;throw e;});
 return pending;
}
export function getIndustrialKit(){return asset;}
// Geometry/material copies belong to the world; original GLB and atlas textures
// stay in the session cache and are reused across races.
export class IndustrialKit{
 constructor(source,{scenery,materials,box,cyl}){
  this.source=source;this.scenery=scenery;this.materials=materials;this.box=box;this.cyl=cyl;this.copies=new Map();this.sources=new Map();this.count=0;this.used=new Set();this.batches=[];this.atlas=null;source.traverse(o=>{if(o.material?.name==='Ground atlas')this.atlas=o.material.map;});
  this.far=industrialMaterial(softenShadowBoundary(new T.MeshStandardMaterial({color:0x696963,roughness:.95})),{far:true});materials.set('industrial-far',this.far);
  this.backdrop=softenShadowBoundary(new T.MeshStandardMaterial({color:0x777a73,roughness:.96}));materials.set('industrial-backdrop',this.backdrop);
 }
 material(src,small,far=false){const key=src.uuid+small+far;if(!this.copies.has(key)){const m=src.clone();m.vertexColors=true;m.envMapIntensity=.65;m.userData={...src.userData};industrialMaterial(softenShadowBoundary(m),{small,far});this.copies.set(key,m);this.sources.set(m.uuid,src);this.materials.set('industrial-'+key,m);}return this.copies.get(key);}
 add(g,name,x,z,{angle=0,scale=1,small=false,shadow=false,far=false,variant=0,y=0,lodName=null}={}){
  if(name==='poplar-12m'&&shadow)shadow='geometry';
  const root=this.source.getObjectByName(name);if(!root)throw Error('Missing industrial model: '+name);
  const instance=root.clone(true);instance.name='Industrial_'+name;instance.position.set(x,y,z);instance.rotation.y=angle;instance.scale.setScalar(scale);
  instance.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();o.geometry.deleteAttribute('tangent');
   if(variant&&o.material.name==='Ground atlas'){
    const uv=o.geometry.attributes.uv,col=o.geometry.attributes.color;
    for(let i=0;i<uv.count;i++)if(uv.getX(i)>.5&&uv.getY(i)>.5){
     if(variant===1)uv.setY(i,uv.getY(i)-.5);
     if(col){const tone=variant===1?[.87,.89,.84]:[1.16,.91,.72];for(let c=0;c<3;c++)col.array[i*col.itemSize+c]*=tone[c];}
    }
   }
   o.material=this.material(o.material,small);o.castShadow=shadow==='geometry';o.receiveShadow=true;});g.add(instance);instance.updateWorldMatrix(true,true);this.count++;this.used.add(name);
  if(far){const distant=lodName?this.source.getObjectByName(lodName).clone(true):instance.clone(true);distant.name+='Far';const remove=[];
   if(lodName){this.used.add(lodName);distant.position.copy(instance.position);distant.rotation.copy(instance.rotation);distant.scale.copy(instance.scale);}
   distant.traverse(o=>{if(!o.isMesh)return;const original=o.geometry,pos=original.attributes.position,keep=[];
    const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
    for(let i=0;i<pos.count;i+=3){a.fromBufferAttribute(pos,i);b.fromBufferAttribute(pos,i+1).sub(a);c.fromBufferAttribute(pos,i+2).sub(a);if(lodName||b.cross(c).length()*.5>.28)keep.push(i,i+1,i+2);}
    if(!keep.length){remove.push(o);return;}const geo=new T.BufferGeometry();
    for(const [key,attr] of Object.entries(original.attributes)){const array=new attr.array.constructor(keep.length*attr.itemSize);for(let i=0;i<keep.length;i++)for(let c=0;c<attr.itemSize;c++)array[i*attr.itemSize+c]=attr.array[keep[i]*attr.itemSize+c];geo.setAttribute(key,new T.BufferAttribute(array,attr.itemSize,attr.normalized));}
    geo.deleteAttribute('tangent');o.geometry=geo;o.material=this.material(lodName?o.material:this.sources.get(o.material.uuid),false,true);o.castShadow=false;o.receiveShadow=true;
   });for(const o of remove)o.removeFromParent();g.add(distant);
  }
  const bounds=new T.Box3().setFromObject(instance),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  if(shadow!=='geometry'&&(shadow||far)){const local=center.clone().sub(g.position),shape=/tank|silos|chimney|tower|poplar/.test(name)?this.cyl(g,size.x*.45,size.y,[local.x,size.y/2,local.z],this.far):this.box(g,[size.x,size.y,size.z],[local.x,size.y/2,local.z],this.far);
   if(shadow){this.scenery.footprints.push({x:center.x,z:center.z,hx:size.x/2,hz:size.z/2});shape.castShadow=true;}
   shape.userData.shadowProxy=true;
  }
 }
 register(g){for(const o of g.children)if(o.material?.userData.industrial){o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;this.batches.push({o,center:b.getCenter(new T.Vector3()),radius:b.getSize(new T.Vector3()).length()/2});}}
 prepare(camera){for(const {o,center,radius} of this.batches){const distance=Math.hypot(center.x+o.parent.position.x-camera.position.x,center.z+o.parent.position.z-camera.position.z);o.visible=o.material.userData.industrialFar?distance+radius>145:distance-radius<(o.material.userData.industrialSmall?70:175);}}
 chunk(g,k){
  // Alternating yards, not one identical building repeated every 60 metres.
  const add=(name,x,z,options)=>this.add(g,name,x,z,options);
  const buildings=['brick-workshop','factory-hall-22m','administration-block-4f','sawtooth-factory-30m','boiler-house-18m','loading-depot-32m','stepped-utility-tower','long-brick-mill-30m'];
  add(buildings[k%8],k%2?-23:-15,-3,{angle:k%3===2?0:Math.PI/2,shadow:true,far:true,variant:k%3===1?1:0});
  add(k%2?'freight-warehouse-18m':'brick-workshop',k%2?13:21,17,{angle:-Math.PI/2,shadow:true,far:true,variant:k%3===0?1:0});
  // A second row sits behind the alternating foreground yards. Quarter-turns
  // expose side elevations on later passes, without duplicating asset textures.
  add(buildings[(k+3)%8],k%2?35:-36,12,{angle:k%2?0:Math.PI/2,far:true,variant:k%3});
  for(const side of [-1,1])for(let j=0;j<3;j++){
   const h=9+((k*7+j*5+(side>0?3:0))%17),x=side*(j===2?68:46),z=j===2?0:-17+j*34;
   const o=this.box(g,[j===2?24:22,h,j===2?62:34],[x,h/2-.2,z],this.backdrop);o.castShadow=false;
   const roof=this.box(g,[j===2?24.5:22.5,.45,j===2?62:34],[x,h-.2,z],this.backdrop);roof.castShadow=false;
  }
  add('pipe-rack-12m',-9,-23,{shadow:'geometry',far:true});
  add('rusty-overhead-pipe',0,20,{scale:1.1,shadow:'geometry'});
  add('asphalt-module-7x5',-16,23,{y:-.046,small:true});
  add(['storage-tank-8m','twin-silos-14m','horizontal-tank-10m','heat-exchanger-skid'][k%4],11,-17,{shadow:true,far:true});
  add(k%3===0?'cooling-tower-16m':k%3===1?'factory-chimney-24m':'loading-gantry-12m',k%2?-28:28,-13,{far:true,shadow:true});
  if(k%2===0)add('storage-tank-8m',-26,20,{far:true,shadow:true,scale:1.3});
  for(const side of [-1,1]){
   add('poplar-12m',side*5.05,-17,{scale:.78+(k%3)*.06,far:true,lodName:'poplar-12m-lod1',shadow:true});
   add('broken-concrete-3x3',side*9,-10,{small:true,y:-.043,angle:k*.9});
   add('dirty-shoulder-3x3',side*5,23,{small:true,y:-.042,scale:.55,angle:k*.4});
   add('oil-stain',side*10,21,{small:true,y:-.041,scale:1.5,angle:k*.8});
   for(let n=0;n<8;n++)add('chainlink-fence-3m',side*6.1,-29+n*3,{angle:Math.PI/2});
   for(let j=0;j<3;j++)add('concrete-pipe',side*8,6+j*1.3,{small:true,angle:Math.PI/2});
   add('weathered-pallet',side*8,12,{small:true,angle:k*.51});
   add('rusted-barrel',side*7.3,16,{small:true});
   for(let j=0;j<12;j++)add(j%2?'dry-grass':'roadside-weeds',side*(4.3+(j%3)*.64),-27+j*4.7,{small:true,scale:.45+(j%4)*.11,angle:j*2.399+k});
  }
 }
}
