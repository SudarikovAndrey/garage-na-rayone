import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {pbrMaterial} from './pbr-renderer.js';
import {partById} from './progression.js';
import {PAINTS} from './paints.js';
import {decalById} from './decals.js';
import {rimLookFor,wheelKit,loadWheelKit,mountKitWheel} from './wheel-kit.js';
import {buildSculptedFenders,buildSculptedSkirts,wheelOffset,bodyDrop,tyreScale,bodyWidthAt} from './sculpted-body-kit.js';
import {buildSpoilerKit} from './spoiler-kit.js';
import {buildBumperKit} from './bumper-kit.js';
import {buildUnderbody} from './car-underbody.js';
export {PAINTS} from './paints.js';
import {applyFullBodyDecal,applyGlassBanner,bindDecalSpace,retainDecal,releaseDecal} from './decal-projection.js';
import {paintFinish} from './paints.js';
export {DECAL_KEY,bindDecalSpace} from './decal-projection.js';
// Зона козырька на стекле: верхняя кромка и ширина лобового у неё — по вершинам меша стекла (корень ещё не
// повёрнут, мировые координаты совпадают с координатами покоя). Лобовое — передняя половина машины.
export function glassBand(mesh){
 mesh.updateWorldMatrix(true,false);const g=mesh.geometry;if(!g.attributes.normal)g.computeVertexNormals();
 const pos=g.attributes.position,nor=g.attributes.normal,nm=new T.Matrix3().getNormalMatrix(mesh.matrixWorld),v=new T.Vector3(),n=new T.Vector3();
 // Лобовое — вершины, чья нормаль смотрит вперёд (боковые стёкла смотрят в бок и в выборку не попадают).
 const front=[];for(let i=0;i<pos.count;i++){n.fromBufferAttribute(nor,i).applyMatrix3(nm).normalize();if(n.x>-.3||Math.abs(n.z)>.55)continue;v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);if(v.x<-.05)front.push([v.y,v.z]);}
 if(!front.length)return null;
 const top=Math.max(...front.map(p=>p[0]));const band=front.filter(p=>p[0]>top-.14);
 const zMin=Math.min(...band.map(p=>p[1])),zMax=Math.max(...band.map(p=>p[1]));
 return {top,half:Math.max(.3,(zMax-zMin)/2-.03),centre:(zMax+zMin)/2};
}
// Хамелеон: базовый цвет уходит по кривой A→B→C с ростом угла между нормалью и взглядом. Хук встаёт в цепочку
// после уже навешанных (декали, отражения гаража): предыдущий onBeforeCompile вызывается первым, ключ программы дополняется.
function applyColorShift(material,finish){
 if(!finish?.shift)return;const [a,b,c]=finish.shift.map(h=>new T.Color(h));
 const previous=material.onBeforeCompile,key=material.customProgramCacheKey.bind(material);
 material.onBeforeCompile=(shader,renderer)=>{previous.call(material,shader,renderer);
  shader.uniforms.chamA={value:a};shader.uniforms.chamB={value:b};shader.uniforms.chamC={value:c};
  shader.fragmentShader='uniform vec3 chamA,chamB,chamC;\n'+shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\n{float chamF=pow(1.0-saturate(dot(normalize(normal),normalize(vViewPosition))),1.35);diffuseColor.rgb=mix(mix(chamA,chamB,smoothstep(0.0,0.55,chamF)),chamC,smoothstep(0.55,1.0,chamF));}');};
 material.customProgramCacheKey=()=>key()+'-color-shift-v1';material.needsUpdate=true;
}
export function applyCustomization(root,car,equipment={},paintId=null,decalId=null){
 const fit=car.userData.fit||{wheelbase:2.53,width:1.676,radius:.354,spoilerX:car.userData.samaraProfile?1.93:1.57,spoilerY:car.userData.samaraProfile?1:1.06};
 const paintColor=PAINTS.find(p=>p.id===paintId)?.color||'#9d2730',geometries=new Set(),materials=new Set(),finish=paintFinish(paintId),decalSpan=fit.length?fit:[4,1.4],paint=new T.MeshPhysicalMaterial({color:paintColor});/* финиш краски (металлик/эмаль/рояльный лак/матовый) — из paints.js, общий для кузова и обвеса */Object.assign(paint,finish);delete paint.shift;paint.name='Paint_Bodykit';materials.add(paint);/* пока эта машина жива, атлас ливреи держим за ней: без хозяина его выбрасывают, чтобы память не росла с каждым цветом */let decalToken=decalById(decalId)?retainDecal(decalId,decalSpan,paintColor):null;if(decalById(decalId))applyFullBodyDecal(paint,decalId,decalSpan,paintColor);
 const dark=new T.MeshStandardMaterial({color:0x20242a,metalness:.4,roughness:.34});materials.add(dark);
 const light=new T.MeshStandardMaterial({color:0xe6eaec,metalness:.05,roughness:.28});light.name='Light block';materials.add(light);
 car.traverse(o=>{if(!o.isMesh)return;const original=o.material;o.material=pbrMaterial(original,true);materials.add(o.material);if(original.name.startsWith('Paint')){if(paintId)o.material.color.set(paintColor);else paint.color.copy(original.color);Object.assign(o.material,finish);delete o.material.shift;if(decalById(decalId))applyFullBodyDecal(o.material,decalId,decalSpan,paintColor);applyColorShift(o.material,finish);}
  // Козырёк ливреи — на лобовом стекле: у полной оклейки он такая же часть образа, как полоса на борту.
  else if(decalById(decalId)&&/smoked glass/i.test(original.name)){applyGlassBanner(o.material,decalId,decalSpan,paintColor,glassBand(o));}});
 // Своё днище у моделей, где оно есть (fit.ownUnderbody: новые Копейка и Восьмёрка) — игровое не подкладываем, иначе под машиной «второе дно».
 if(!fit.ownUnderbody){const underside=buildUnderbody(fit);car.add(underside);underside.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});}
 // Колёсные ниши: у моделей их нет, и сквозь арку виден фон. Тёмный полуцилиндр вокруг колеса плюс внутренняя стенка, четыре штуки, один draw call.
 {const wells=[],liner=new T.MeshStandardMaterial({color:0x14161a,roughness:.95,metalness:0,side:T.BackSide});liner.name='Wheel well';materials.add(liner);
  const well=fit.radius+.11,depth=.34;for(const rear of [false,true])for(const side of [-1,1]){const axle=(rear?1:-1)*fit.wheelbase/2+(fit.axleOffset||0),outer=bodyWidthAt(fit,axle,fit.radius+.1)+.02,inner=outer-depth;
   /* Полуцилиндр накрывает только верх арки. Без поворота вокруг Z он вставал боком: нижняя кромка
      уходила на 11 см под землю и торчала из-под колеса чёрным полукругом. */
   const shell=new T.CylinderGeometry(well,well,depth,18,1,true,0,Math.PI);shell.rotateX(Math.PI/2);shell.rotateZ(Math.PI/2);shell.translate(axle,fit.radius,side*(outer+inner)/2);
   // Внешняя кромка — по кузову в каждой точке дуги, на 6 мм внутри крыла: по одной ширине на высоте оси она торчала
   // за крыло тёмной дугой в верху арки (Восьмёрка — до 2.8 см; Андрей: «артефактный элемент крыла»).
   {const p=shell.attributes.position;for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i)-side*outer)<1e-4)p.setZ(i,side*Math.max(inner+.05,Math.min(outer,bodyWidthAt(fit,p.getX(i),Math.max(p.getY(i),(fit.body?.floor||.25)+.02))-.006)));p.needsUpdate=true;}
   wells.push(shell);
   const wall=new T.CircleGeometry(well,18,0,Math.PI);wall.rotateY(side>0?Math.PI:0);wall.translate(axle,fit.radius,side*inner);wells.push(wall);}
  const geo=mergeGeometries(wells);for(const w of wells)w.dispose();geometries.add(geo);const mesh=new T.Mesh(geo,liner);mesh.name='WheelWells';car.add(mesh);}
 const kit=new T.Group();kit.name='InstalledKit';car.add(kit);
 const add=(g,name,geometry,mat,pos)=>{geometries.add(geometry);const m=new T.Mesh(geometry,mat);m.name=name;m.position.set(...pos);m.castShadow=true;g.add(m);return m;};
 const box=(g,name,size,pos,mat=paint)=>add(g,name,new RoundedBoxGeometry(...size,2,.012),mat,pos);
 const stage=slot=>{const p=partById(equipment[slot]);return p&&p.slot===slot?p.rarity:null;},styleOf=slot=>partById(equipment[slot])?.style||null;
 const fendersStage=stage('fenders'),drop=bodyDrop(fendersStage);
 const bumpers=stage('bumpers');if(bumpers!==null)buildBumperKit({car,fit,rarity:bumpers,partId:equipment.bumpers,kit,add,paint,dark,light,drop,style:styleOf('bumpers'),fenderRarity:fendersStage,fenderStyle:styleOf('fenders')});
 const spoiler=stage('spoiler');if(spoiler!==null)buildSpoilerKit({car,fit,rarity:spoiler,partId:equipment.spoiler,kit,add,paint,dark,style:styleOf('spoiler')});
 const skirts=stage('skirts'),fenders=stage('fenders');
 if(skirts!==null)buildSculptedSkirts({car,fit,rarity:skirts,flareRarity:fenders,partId:equipment.skirts,kit,add,paint,dark,racing:root.userData.racing,drop,style:styleOf('skirts')});
 if(fenders!==null){let flarePaint=paint;if(styleOf('fenders')==='soyuz'){flarePaint=new T.MeshStandardMaterial({color:0x1f2124,roughness:.55,metalness:.1});flarePaint.name='Arch plastic';materials.add(flarePaint);}buildSculptedFenders({car,fit,rarity:fenders,partId:equipment.fenders,kit,add,paint:flarePaint,dark,racing:root.userData.racing,drop,style:styleOf('fenders')});}
 // Колёса: резина шире по редкости крыльев, диск в плоскости резины, вылет до кромки арки. Только визуально: физика и fit.width не меняются.
 // Кромка накладки арки над колесом: самая внешняя точка накладки в верхней половине арки у этой оси (в системе машины).
 const flareLip=(x,side)=>{let lip=null;const v=new T.Vector3(),inv=car.matrixWorld.clone().invert();kit.traverse(o=>{if(!o.isMesh)return;let p=o;while(p&&!/^Kit_fenders/.test(p.name))p=p.parent;if(!p)return;
  const m=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(m);if(Math.abs(v.x-x)<.22&&v.y>fit.radius+.08&&Math.sign(v.z)===side)lip=Math.max(lip??0,Math.abs(v.z));}});return lip;};
 car.updateMatrixWorld(true);car.traverse(o=>{if(!/^Wheel_[FR][LR]$/.test(o.name))return;const scale=tyreScale(fenders,o.name[6]==='R',stage('rims'));let tyreHalf=.09,cz=0;
  // Меши колеса повёрнуты по-своему, поэтому меряем в системе группы: центр шины и её полуширина вдоль оси.
  for(const m of o.children){if(m.isMesh&&/^Tyre/.test(m.material.name)){const bb=new T.Box3().setFromObject(m);tyreHalf=(bb.max.z-bb.min.z)/2;cz=(bb.min.z+bb.max.z)/2-o.position.z;}}
  const side=(o.position.z+cz)<0?-1:1,tyreOuter=tyreHalf*scale;Object.assign(o.userData,{tyreOuter,tyreCenter:cz,tyreScale:scale});
  // Диск — в плоскость резины: грань на 2 см снаружи борта шины (стоковый торчал на 5). Колпак Black trim лежит на самой грани, спицы должны выйти из-под него.
  for(const m of o.children){if(!m.isMesh||!m.material.name.startsWith('Machined aluminium'))continue;const bb=new T.Box3().setFromObject(m),outer=side>0?bb.max.z-o.position.z-cz:o.position.z+cz-bb.min.z;m.position.z+=side*((tyreOuter+.02)-outer*scale)/scale;}
  o.scale.z*=scale;/* шина шире по редкости крыльев */
  // Вылет колеса — вровень с настоящей кромкой накладки арки над колесом (Андрей, 24 сентября: «у Копейки колёса не
  // выдвигаются вровень с крыльями»). Формула по ширине кузова на высоте оси не видит завала бортов и верха арки.
  if(fenders!==null){const lip=flareLip(o.position.x,side);const now=Math.abs(o.position.z+cz*scale)+tyreOuter;
   o.position.z+=side*(lip!==null?Math.max(0,lip-.006-now):wheelOffset(fit,fenders,o.name[6]==='R',tyreOuter,o.position.z+cz*scale,styleOf('fenders')));}});
 // Диски обвеса — из набора wheel-kit.js: диск по редкости своего цвета и низкопрофильная шина с запечённым протектором.
 // Набор грузится один раз на игру; если ещё не пришёл, колёса дособерутся, когда придёт.
 const rims=stage('rims');if(rims!==null){const look=rimLookFor(equipment.rims),metal=new T.MeshStandardMaterial({color:look.color,metalness:look.metalness,roughness:look.roughness,side:T.DoubleSide});metal.name='Kit rim';materials.add(metal);
  // Крупный цветной суппорт и тормозной диск — у дисков, где их видно (облик детали, wheel-kit.js).
  const caliper=look.caliper===null?null:new T.MeshStandardMaterial({color:look.caliper,metalness:.3,roughness:.32}),disc=look.caliper===null?null:new T.MeshStandardMaterial({color:0xffffff,metalness:.8,roughness:.42});
  if(caliper){caliper.name='Kit caliper';disc.name='Brake steel';materials.add(caliper);materials.add(disc);}
  const wheels=[];car.traverse(o=>{if(/^Wheel_[FR][LR]$/.test(o.name))wheels.push(o);});
  const fit_=()=>{for(const o of wheels){if(o.getObjectByName('WheelKit_rims'))continue;const ts=o.userData.tyreScale||1,cz=o.userData.tyreCenter||0,half=(o.userData.tyreOuter||.09)/ts,side=(o.position.z+cz)<0?-1:1;
   for(const child of o.children)if(child.isMesh&&(child.material.name.startsWith('Machined aluminium')||/^Tyre/.test(child.material.name)||(caliper&&/^Brake steel/.test(child.material.name))))child.visible=false;/* у дисков с тормозом набора штатная ступица прячется */
   mountKitWheel(o,{partId:equipment.rims,rarity:rims,radius:fit.radius,half,cz,side,scale:ts,material:metal,caliperMaterial:caliper,discMaterial:disc}).userData.partId=equipment.rims;}};
  if(wheelKit())fit_();else loadWheelKit().then(k=>{if(k)fit_();}).catch(()=>{});}
 if(root.userData.racing){const groups=[];car.traverse(o=>{if(o.name.startsWith('Kit_'))groups.push(o);});for(const g of groups){const buckets=new Map();for(const o of [...g.children]){if(!o.isMesh)continue;o.updateMatrix();const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix),a=buckets.get(o.material)||[];a.push(geo);buckets.set(o.material,a);g.remove(o);o.geometry.dispose();geometries.delete(o.geometry);}for(const [m,gs] of buckets){const geo=mergeGeometries(gs);for(const x of gs)x.dispose();geometries.add(geo);const mesh=new T.Mesh(geo,m);mesh.name='BatchedKit';mesh.castShadow=true;g.add(mesh);}}}
 if(drop)for(const o of car.children)if(!/^Wheel_[FR][LR]$/.test(o.name))o.position.y-=drop;/* занижение: кузов, днище и обвес к колёсам, колёса и тень на земле */
 const contact=new T.Mesh(new T.PlaneGeometry(fit.wheelbase+.8,fit.width+.32),new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 v;void main(){vec2 p=abs(v-.5)*2.;float a=(1.-smoothstep(.25,1.,p.x))*(1.-smoothstep(.25,1.,p.y));gl_FragColor=vec4(.015,.02,.025,a*.5);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));contact.name='ContactShadow';contact.rotation.x=-Math.PI/2;contact.position.y=.012;contact.renderOrder=1;car.add(contact);geometries.add(contact.geometry);materials.add(contact.material);
 applyColorShift(paint,finish);
 if(decalById(decalId))bindDecalSpace(car,geometries);
 root.userData.equipment={...equipment};root.userData.paint=paintId;root.userData.decal=decalId;root.userData.disposeCustomization=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();releaseDecal(decalToken);decalToken=null;};return root;
}
export function disposeCustomizedCar(root){root?.userData.neon?.dispose?.();root?.userData.groundLight?.dispose?.();root?.userData.disposeCustomization?.();}
