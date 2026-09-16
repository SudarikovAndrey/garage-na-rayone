import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {pbrMaterial} from './pbr-renderer.js';
import {partById} from './progression.js';
import {PAINTS} from './paints.js';
import {decalById} from './decals.js';
import {buildSculptedFenders,buildSculptedSkirts} from './sculpted-body-kit.js';
import {buildBukhankaKit} from './bukhanka-kit.js';
import {buildBumperKit} from './bumper-kit.js';
import {buildUnderbody} from './car-underbody.js';
export {PAINTS} from './paints.js';
import {applyFullBodyDecal,bindDecalSpace} from './decal-projection.js';
export {DECAL_KEY,bindDecalSpace} from './decal-projection.js';
export function applyCustomization(root,car,equipment={},paintId=null,decalId=null){
 const fit=car.userData.fit||{wheelbase:2.53,width:1.676,radius:.354,spoilerX:car.userData.samaraProfile?1.93:1.57,spoilerY:car.userData.samaraProfile?1:1.06};
 const paintColor=PAINTS.find(p=>p.id===paintId)?.color||'#9d2730',geometries=new Set(),materials=new Set(),paint=new T.MeshPhysicalMaterial({color:paintColor,metalness:.28,roughness:.29,clearcoat:1,clearcoatRoughness:.12});paint.name='Paint_Bodykit';paint.envMapIntensity=1.05;materials.add(paint);if(decalById(decalId))applyFullBodyDecal(paint,decalId);
 const dark=new T.MeshStandardMaterial({color:0x20242a,metalness:.4,roughness:.34});materials.add(dark);
 car.traverse(o=>{if(!o.isMesh)return;const original=o.material;o.material=pbrMaterial(original,true);materials.add(o.material);if(original.name.startsWith('Paint')){if(paintId)o.material.color.set(paintColor);else paint.color.copy(original.color);if(decalById(decalId))applyFullBodyDecal(o.material,decalId);o.material.clearcoat=1;o.material.clearcoatRoughness=.12;}});
 const underside=buildUnderbody(fit);car.add(underside);underside.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});
 const kit=new T.Group();kit.name='InstalledKit';car.add(kit);
 const add=(g,name,geometry,mat,pos)=>{geometries.add(geometry);const m=new T.Mesh(geometry,mat);m.name=name;m.position.set(...pos);m.castShadow=true;g.add(m);return m;};
 const box=(g,name,size,pos,mat=paint)=>add(g,name,new RoundedBoxGeometry(...size,fit.id==='bukhanka'?1:2,.012),mat,pos);
 const stage=slot=>{const p=partById(equipment[slot]);return p&&p.slot===slot?p.rarity:null;};
 const vanKit=(slot,rarity)=>buildBukhankaKit({slot,rarity,partId:equipment[slot],fit,car,kit,add,paint,dark,materials,racing:root.userData.racing});
 const bumpers=stage('bumpers');if(bumpers!==null&&fit.id==='bukhanka')vanKit('bumpers',bumpers);else if(bumpers!==null)buildBumperKit({car,fit,rarity:bumpers,partId:equipment.bumpers,kit,add,box,paint,dark});
 const spoiler=stage('spoiler');if(spoiler!==null&&fit.id==='bukhanka')vanKit('spoiler',spoiler);else if(spoiler!==null){const stock=car.getObjectByName('StockSpoiler');if(stock)stock.visible=false;const g=new T.Group();g.name='Kit_spoiler';g.position.set(fit.spoilerX-1.57,fit.spoilerY-1.06,0);g.scale.z=fit.width/1.676;g.userData.partId=equipment.spoiler;kit.add(g);const height=.10+spoiler*.12,width=1.6+spoiler*.12;
 for(const z of [-.55,.55])box(g,'Wing support',[.075,height,.055],[1.57,1.06+height/2,z],dark);
 const shape=new T.Shape();shape.moveTo(-.2,0);shape.quadraticCurveTo(-.08,.065,.2,.025);shape.lineTo(.2,.002);shape.quadraticCurveTo(-.08,.017,-.2,0);const geo=new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelThickness:.007,bevelSize:.006,bevelSegments:2,steps:1});geo.translate(0,0,-width/2);add(g,'Wing blade',geo,spoiler>=2?dark:paint,[1.56,1.06+height,0]);
 if(spoiler>=1)for(const z of [-width/2,width/2])box(g,'Wing endplate',[.42,.13,.025],[1.56,1.09+height,z],dark);
 }
 const skirts=stage('skirts'),fenders=stage('fenders');
 if(skirts!==null)buildSculptedSkirts({car,fit,rarity:skirts,flareRarity:fenders,partId:equipment.skirts,kit,add,paint,dark,racing:root.userData.racing});
 if(fenders!==null){let flarePaint=paint;if(fit.id==='bukhanka'&&fenders>0){flarePaint=paint.clone();delete flarePaint.userData.decal;flarePaint.color.set(0x343a3d);flarePaint.roughness=.45;materials.add(flarePaint);}buildSculptedFenders({car,fit,rarity:fenders,partId:equipment.fenders,kit,add,paint:flarePaint,racing:root.userData.racing});}
 const rims=stage('rims');if(rims!==null){const metal=new T.MeshStandardMaterial({color:fit.id==='bukhanka'?0x343c40:[0xbac3cb,0x343941,0xd0a458,0xd8dfeb][rims],metalness:.88,roughness:fit.id==='bukhanka'?.34:.22});materials.add(metal);car.traverse(o=>{if(/^Wheel_[FR][LR]$/.test(o.name)){for(const child of o.children)if(child.isMesh&&child.material.name.startsWith('Machined aluminium'))child.visible=false;const side=o.position.z<0?-1:1,g=new T.Group();g.name='Kit_rims';g.userData.partId=equipment.rims;o.add(g);const z=side*.126;add(g,'Rim lip',new T.TorusGeometry(.256,.017,10,48),metal,[0,0,z]);add(g,'Rim hub',new T.CylinderGeometry(.056,.056,.035,20),metal,[0,0,z]).rotation.x=Math.PI/2;const count=[5,6,8,10][rims];for(let i=0;i<count;i++){const a=i/count*Math.PI*2,m=box(g,'Alloy spoke',[.212,rims>1?.027:.044,.025],[Math.cos(a)*.14,Math.sin(a)*.14,z],metal);m.rotation.z=a+.1*rims;}for(let i=0;i<5;i++){const a=i/5*Math.PI*2;add(g,'Wheel bolt',new T.SphereGeometry(.008,6,4),fit.id==='bukhanka'?metal:dark,[Math.cos(a)*.039,Math.sin(a)*.039,z+side*.023]);}}});}
 if(root.userData.racing||fit.id==='bukhanka'){const groups=[];car.traverse(o=>{if(o.name.startsWith('Kit_'))groups.push(o);});for(const g of groups){const buckets=new Map();for(const o of [...g.children]){if(!o.isMesh)continue;o.updateMatrix();const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix),a=buckets.get(o.material)||[];a.push(geo);buckets.set(o.material,a);g.remove(o);o.geometry.dispose();geometries.delete(o.geometry);}for(const [m,gs] of buckets){const geo=mergeGeometries(gs);for(const x of gs)x.dispose();geometries.add(geo);const mesh=new T.Mesh(geo,m);mesh.name='BatchedKit';mesh.castShadow=true;g.add(mesh);}}}
 const contact=new T.Mesh(new T.PlaneGeometry(fit.wheelbase+.8,fit.width+.32),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;void main(){vec2 p=abs(v-.5)*2.;float a=(1.-smoothstep(.25,1.,p.x))*(1.-smoothstep(.25,1.,p.y));gl_FragColor=vec4(.015,.02,.025,a*.5);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));contact.name='ContactShadow';contact.rotation.x=-Math.PI/2;contact.position.y=.012;contact.renderOrder=1;car.add(contact);geometries.add(contact.geometry);materials.add(contact.material);
 if(decalById(decalId))bindDecalSpace(car,geometries);
 root.userData.equipment={...equipment};root.userData.paint=paintId;root.userData.decal=decalId;root.userData.disposeCustomization=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();};return root;
}
export function disposeCustomizedCar(root){root?.userData.disposeCustomization?.();}
