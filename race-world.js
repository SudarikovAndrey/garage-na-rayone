import {createOverpassWorld} from './overpass-world.js';
import {repairMaterial,repairGeometry} from './road-repairs.js';
import {createRidgeWorld} from './ridge-world.js';
import {RoadRide} from './road-ride.js';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {WetRoad,puddleGeometry,puddleMaterial} from './wet-road.js';
import {asphaltDetail} from './surface-detail.js';
import {TRACKS} from './tracks.js';
import {configureRaceShadow,isMajorCaster,shadowOnlyMaterial,softenShadowBoundary} from './race-shadows.js';
import {skyDome} from './pbr-renderer.js';
export function createRaceWorld(index,{roadTexture=null,environment=null,textures={},look=null}={}){
 if((look||TRACKS[index])?.check)return createOverpassWorld(look||TRACKS[index],{roadTexture,environment});
 if((look||TRACKS[index])?.bonus)return createRidgeWorld(look||TRACKS[index],{roadTexture,environment});
 const cfg=look||TRACKS[index]||TRACKS[0],scene=new T.Scene();scene.background=new T.Color(cfg.sky);// Туман. Было .009: половина на 92 м, 99% уже на 240 — всё, что дальше, сливалось в ровную заливку, и она
// читалась стеной поперёк дороги, которая едет вместе с игроком (Андрей, 18 сентября). Стало .0065: половина
// на 128 м, 90% на 235, дальний край земли (−350 м) всё равно не виден. Город при этом уходит вдаль ступенями,
// а не обрывается.
 scene.fog=new T.FogExp2(cfg.fog,cfg.night?.016:cfg.wet?.0105:.0065);scene.environment=environment;scene.environmentIntensity=cfg.night?.65:cfg.wet?.85:.75;
 // Купол неба: горизонт, к которому уходит туманящаяся земля. Без него за машиной была плоская заливка.
 const sky=skyDome(cfg);scene.add(sky);
 const wetRoad=cfg.wet?new WetRoad(cfg):null;scene.userData.wetRoad=wetRoad;
 let seed=cfg.seed;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};const moving=[];const ownedTextures=new Set();const mats=new Map();
 function mat(color,rough=.82,metal=0,emissive=0){const k=[color,rough,metal,emissive].join(',');if(!mats.has(k))mats.set(k,softenShadowBoundary(new T.MeshStandardMaterial({color,roughness:rough,metalness:metal,emissive,emissiveIntensity:emissive?1.8:0})));return mats.get(k);}
 const concrete=mat(0x97988d),edge=mat(0xc6c4ac),dark=mat(0x303a3d),steel=mat(0x66787d,.43,.65),rust=mat(0x834d38),brick=mat(0x925c43),green=mat(0x345d4c),wood=mat(0x6a5640),glass=mat(cfg.night?0xe0b676:0x53717b,.19,.4,cfg.night?0x503a18:0);
 for(const [m,prefix] of [[brick,'brick_wall_001'],[concrete,'garage_floor']]){if(textures[prefix+'_Diffuse']){m.map=textures[prefix+'_Diffuse'];m.normalMap=textures[prefix+'_nor_gl'];m.normalScale.set(.4,.4);m.color.set(0xc3c0b4);}}
 const shadowMaterial=shadowOnlyMaterial();mats.set('shadow-only',shadowMaterial);
 const boxGeo=new T.BoxGeometry(1,1,1),cylGeo=new T.CylinderGeometry(1,1,1,12),sphereGeo=new T.SphereGeometry(1,12,8);const temp=new T.Matrix4(),q=new T.Quaternion(),euler=new T.Euler();
 function mesh(g,geometry,size,pos,m,rot=[0,0,0]){const o=new T.Mesh(geometry,m);o.position.set(...pos);o.scale.set(...size);o.rotation.set(...rot);o.castShadow=isMajorCaster(size,geometry===sphereGeo?'sphere':geometry===cylGeo?'cylinder':geometry===boxGeo?'box':'detail');o.receiveShadow=true;g.add(o);return o;}
 const box=(g,size,pos,m=concrete,rot)=>mesh(g,boxGeo,size,pos,m,rot);
 const cyl=(g,r,h,pos,m=steel,rot)=>mesh(g,cylGeo,[r,h,r],pos,m,rot);
 function beam(g,a,b,r=.045,m=steel){const delta=new T.Vector3(...b).sub(new T.Vector3(...a)),o=cyl(g,r,delta.length(),a,m);o.position.addScaledVector(delta,.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;}
 const signCache=new Map();
 function sign(g,text,pos,size=[2.4,.75],bg='#294d4d',fg='#ebe1ba',ry=0){
  const m=softenShadowBoundary(new T.MeshStandardMaterial({color:0xffffff,roughness:.7}));
  // Одна текстура на надпись: «ПОДЪЕЗД 2» висит на каждом доме, и раньше каждый дом заводил свою
  // копию 512×160 — восемнадцать текстур вместо восьми, по 0.42 МБ видеопамяти каждая.
  if(typeof document!=='undefined'){const key=text+'|'+bg+'|'+fg;let tex=signCache.get(key);
   if(!tex){const c=document.createElement('canvas');c.width=512;c.height=160;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,512,160);x.strokeStyle=fg;x.lineWidth=5;x.strokeRect(10,10,492,140);x.fillStyle=fg;x.font='bold 54px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,256,82,470);
    tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;signCache.set(key,tex);ownedTextures.add(tex);}
   m.map=tex;}else m.color.set(bg);
  mats.set('sign'+m.id,m);return box(g,[size[0],size[1],.04],pos,m,[0,ry,0]);
 }
 // Batch each roadside segment by material; dense props remain a few draw calls.
 function batch(g){const shadowGeometries=[];const sourceGeometries=new Set();const buckets=new Map();g.updateMatrixWorld(true);const inverse=g.matrixWorld.clone().invert();g.traverse(o=>{if(o.isMesh){sourceGeometries.add(o.geometry);const a=buckets.get(o.material)||[];const geo=o.geometry.clone();temp.multiplyMatrices(inverse,o.matrixWorld);geo.applyMatrix4(temp);if(o.castShadow)shadowGeometries.push(geo.clone());if(o.material.userData.roadRepair){const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/8+.5,.5-p.getZ(i)/380);}else if(o.material.map&&o.material.normalMap){const p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv.setXY(i,(nx>ny&&nx>nz?p.getZ(i):p.getX(i))/3,(ny>nx&&ny>nz?p.getZ(i):p.getY(i))/3);}}if(geo.index)geo.setIndex(geo.index.clone());a.push(geo);buckets.set(o.material,a);}});for(const geo of sourceGeometries)if(![boxGeo,cylGeo,sphereGeo].includes(geo))geo.dispose();g.clear();for(const [m,gs] of buckets){const merged=mergeGeometries(gs);for(const geo of gs)geo.dispose();const obj=new T.Mesh(merged,m);obj.castShadow=false;obj.receiveShadow=true;g.add(obj);}if(shadowGeometries.length){const proxy=new T.Mesh(mergeGeometries(shadowGeometries),shadowMaterial);for(const geo of shadowGeometries)geo.dispose();proxy.name='SceneryShadow';proxy.castShadow=true;proxy.receiveShadow=false;g.add(proxy);}return g;}
 function segment(z){const g=new T.Group();g.position.z=z;scene.add(g);moving.push({obj:g,start:z,span:360});return g;}
 function window(g,x,y,z,w=1.2,h=1.45){box(g,[w+.16,h+.15,.1],[x,y,z],edge);box(g,[w,h,.12],[x,y,z+.02],glass);box(g,[.045,h,.14],[x,y,z+.04],edge);box(g,[w,.045,.14],[x,y+.16,z+.04],edge);box(g,[w+.23,.08,.3],[x,y-h/2,z+.08],concrete);}
 function block(g,x,z,floors=5){const h=floors*2.65;const b=new T.Group();b.position.set(x,0,z);b.rotation.y=x<0?Math.PI/2:-Math.PI/2;g.add(b);box(b,[16,h,8],[0,h/2,0],concrete);box(b,[16.2,.24,8.2],[0,h,0],dark);for(const xx of [-5,4]){box(b,[1.2,1.7,1.4],[xx,h+.85,0],concrete);box(b,[1.35,.15,1.55],[xx,h+1.75,0],dark);}for(const xx of [-7.5,7.5])cyl(b,.052,h,[xx,h/2,4.15],steel);box(b,[16.1,.9,8.05],[0,.45,0],mat(0x827970));for(let f=0;f<floors;f++){for(let j=0;j<7;j++){const xx=-6.6+j*2.2,yy=1.7+f*2.65;window(b,xx,yy,4.07);if(f>1&&j%4===0){box(b,[.72,.42,.30],[xx+.8,yy-.6,4.3],edge);for(let fin=0;fin<6;fin++)box(b,[.56,.024,.022],[xx+.8,yy-.75+fin*.055,4.47],steel);}if(j%3===1){box(b,[1.7,.15,.85],[xx,yy-.81,4.4],concrete);box(b,[1.68,.77,.06],[xx,yy-.37,4.83],mat(f%2?0x869c94:0xaba892));for(const dx of [-.83,.83])box(b,[.06,.77,.83],[xx+dx,yy-.37,4.42],concrete);}}box(b,[16.05,.027,.012],[0,(f+1)*2.65,4.03],dark);}
 for(let j=0;j<8;j++)box(b,[.018,h,.012],[-7.6+j*2.2,h/2,4.035],dark);box(b,[1.5,2.15,.12],[0,1.08,4.11],green);box(b,[2.6,.16,1.7],[0,2.4,4.7],concrete);sign(b,'ПОДЪЕЗД 2',[0,2.8,4.09],[1.4,.35]);for(let j=0;j<3;j++)box(b,[2.2,.13,1.2-j*.3],[0,.06+j*.12,4.6+j*.16],concrete);}
 function tree(g,x,z,birch=false){const h=4+rand()*2;cyl(g,.10,h,[x,h/2,z],birch?edge:wood);for(let k=0;k<5;k++){const yy=2+k*.6;mesh(g,sphereGeo,[1.2-k*.10,1.1,1.1-k*.1],[x+Math.sin(k)*.3,yy,z],mat(birch?0x69834a:0x3c6045));if(birch)box(g,[.21,.10,.21],[x,.5+k*.52,z],dark);}}
 function fence(g,x,z,length=12,type='steel'){for(let i=0;i<length;i++){if(type==='wood')box(g,[.1,1.45,.7],[x,.72,z+i],wood);else{box(g,[.10,1.7,.09],[x,.85,z+i],steel);for(let k=0;k<2;k++)box(g,[.065,.06,length],[x,.4+k*.8,z+length/2-.5],steel);}}}
 // lit — редкий фонарь, который ночью реально светит: холодный ртутный конус поверх тёплой натриевой улицы.
 function lamp(g,x,z,lit=false){cyl(g,.065,6,[x,3,z],steel);beam(g,[x,5.9,z],[x-Math.sign(x)*1.4,6.15,z]);const cold=cfg.night&&lit;box(g,[.65,.10,.35],[x-Math.sign(x)*1.35,6.12,z],mat(cold?0xe4f1ff:0xf0d9a0,.45,.1,cfg.night?(cold?0xbfe0ff:0xffc273):0));
  if(cold){const light=new T.SpotLight(0xcfe4ff,1100,30,.66,.55,1.5);light.castShadow=false;light.position.set(x-Math.sign(x)*1.35,6.05,z);light.target.position.set(x-Math.sign(x)*3.2,0,z+.6);g.add(light,light.target);}}
 function stop(g,x,z){box(g,[3.1,.16,1.8],[x,.1,z],concrete);box(g,[3.3,.16,2.1],[x,2.65,z],green);for(const dx of [-1.45,1.45])box(g,[.08,2.5,.08],[x+dx,1.35,z+.8],steel);box(g,[3,2.2,.07],[x,1.35,z-.65],mat(0x617d87));box(g,[2.3,.12,.42],[x,.6,z],wood);sign(g,'АВТОБУС',[x,2.36,z+.87],[2.2,.38]);}
 function factory(g,x,z){box(g,[11,5,20],[x,2.5,z],brick);box(g,[11.2,.25,20.2],[x,5,z],dark);for(let j=0;j<5;j++){window(g,x-4+j*2,3.6,z+10.08,1.55,1.4);for(let k=0;k<10;k++)box(g,[11,.025,.02],[x,.3+k*.44,z+10.06],mat(0x66524a));}box(g,[3,2.7,.08],[x,1.35,z+10.1],green);sign(g,'ЗАВОД № 8',[x,5.9,z+10],[5,1.2],'#6b3427');for(let j=0;j<2;j++){const px=x+(j-.5)*3; cyl(g,.64,17,[px,8.5,z-5],mat(0xa96950));for(let k=0;k<8;k++)cyl(g,.65,.17,[px,2+k*1.8,z-5],edge);}for(let j=0;j<3;j++)cyl(g,.31,18,[x-4+j*1.2,1.2,z],rust,[Math.PI/2,0,0]);}
 function crane(g,x,z){const yellow=mat(0xc99a30);for(const dx of [-.6,.6])for(const dz of [-.6,.6])box(g,[.12,18,.12],[x+dx,9,z+dz],yellow);for(let h=1;h<18;h+=2){for(const dx of [-.6,.6])beam(g,[x+dx,h,z-.6],[x+dx,h+2,z+.6],.046,yellow);for(const dz of [-.6,.6])beam(g,[x-.6,h,z+dz],[x+.6,h+2,z+dz],.046,yellow);}box(g,[20,.12,1],[x+5,18,z],yellow);for(let i=0;i<10;i++)beam(g,[x-5+i*2,18,z],[x-4+i*2,19,z],.07,yellow);box(g,[20,.10,1],[x+5,19,z],yellow);box(g,[1.6,1.4,1.5],[x+1.6,17.6,z],yellow);box(g,[.9,.85,1.52],[x+1.5,17.6,z],glass);beam(g,[x+10,18,z],[x+10,8,z],.025,dark);cyl(g,.16,.55,[x+10,7.8,z],dark);box(g,[3.4,1.3,2],[x-4,18,z],concrete);}
 function buildingSite(g,x,z){for(let f=0;f<4;f++){box(g,[11,.26,13],[x,.3+f*3,z],concrete);for(const dx of [-5,0,5])for(const dz of [-6,0,6])box(g,[.4,3,.4],[x+dx,1.8+f*3,z+dz],concrete);}for(let i=0;i<9;i++)box(g,[.18,1.7,.12],[x-5+i*1.2,10.6,z+6],rust);crane(g,x-3,z-10);for(let i=0;i<5;i++)cyl(g,.54,2.4,[x-2+i*1.1,.65,z+11],concrete,[0,0,Math.PI/2]);box(g,[4,.6,2],[x+3,.3,z+10],brick);}
 function cottage(g,x,z){const wall=mat(0x8c7755),b=new T.Group();b.position.set(x,0,z);b.rotation.y=x<0?Math.PI/2:-Math.PI/2;g.add(b);box(b,[6,2.7,6],[0,1.35,0],wall);for(let k=0;k<13;k++)box(b,[6.03,.05,6.02],[0,.1+k*.20,0],wood);for(const s of [-1,1])box(b,[3.9,.12,6.6],[s*1.5,3.4,0],mat(0x576c69),[0,0,-s*.46]);for(const xx of [-1.7,1.7]){window(b,xx,1.55,3.04,.9,1.2);for(const dx of [-.7,.7])box(b,[.35,1.5,.08],[xx+dx,1.55,3.1],mat(0x5d8b9a));}box(b,[.9,2,.1],[0,1,3.05],green);cyl(b,.13,1.7,[1,4.2,-1],brick);}
 function rail(g,z){for(const x of [8.2,9.65,12.2,13.65]){box(g,[.10,.16,60],[x,.21,z],steel);box(g,[.18,.05,60],[x,.29,z],mat(0x9fa5a4,.2,.9));}for(let k=0;k<50;k++)for(const x of [8.9,12.9])box(g,[2.3,.14,.20],[x,.13,z-30+k*1.2],wood);for(const x of [6.8,15]){box(g,[.15,8,.15],[x,4,z],steel);beam(g,[x,7.8,z],[11,7.8,z],.045,steel);}for(const x of [8.9,12.9])box(g,[.025,.025,60],[x,7.25,z],dark);}
 function wagon(g,x,z,type){const c=mat(type?0x416252:0x743b2d);box(g,[2.8,2.9,11],[x,2.45,z],c);box(g,[2.9,.2,11.2],[x,3.96,z],dark);for(let k=0;k<9;k++)for(const s of [-1,1])box(g,[.09,2.85,.1],[x+s*1.43,2.45,z-4.6+k*1.15],steel);for(const zz of [-3.8,-2.8,2.8,3.8])cyl(g,.43,2.8,[x,.64,z+zz],dark,[0,0,Math.PI/2]);sign(g,'СССР  0284',[x-1.48,2.6,z],[2.6,.7],'#3f5246','#cabfa1',-Math.PI/2);}
 const hemi=new T.HemisphereLight(cfg.night?0x8ba6c8:0xd9e9f2,0x504a3e,cfg.ambient);scene.add(hemi);const sun=new T.DirectionalLight(cfg.sun,cfg.intensity);sun.position.set(index===1?-24:12,index===1?7:24,-30);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:24,bottom:-16,far:100});sun.shadow.bias=-.00035;sun.shadow.normalBias=.012;scene.add(sun,sun.target);scene.userData.sun=sun;scene.userData.baseSun=cfg.intensity;configureRaceShadow(sun);
 const roadRide=new RoadRide(cfg.rough||0);scene.userData.roadRide=roadRide;
 const roadMat=mat(cfg.rough?(cfg.wet?0x4a4034:0x7a6a52):cfg.wet?0x687681:0x90938e,cfg.wet?.44:.98,0);if(roadTexture)roadMat.map=roadTexture;const detail=asphaltDetail(cfg.wet);roadMat.normalMap=detail.normal;roadMat.normalScale.set(.38,.38);roadMat.roughnessMap=detail.roughness;roadMat.envMapIntensity=cfg.wet?1.55:.65;ownedTextures.add(detail.normal);ownedTextures.add(detail.roughness);
 if(wetRoad)wetRoad.attach(roadMat);
 const repair=repairMaterial(roadMat);mats.set('road-repair',repair);
 // Полотно и земля уходят и за старт, на 120 м назад. После финиша камера пролёта заходит машине в лоб и смотрит
 // мимо неё назад: при прежней длине 380 (до z=+30) в кадре был виден срез дороги и пустое небо за ним —
 // «кропается фон, нет заднего плана» (Андрей, 18 сентября). Дальний конец не трогаем: там всё съедает туман.
 const road=box(scene,[8,.12,470],[0,-.09,-115],roadMat);road.castShadow=false;box(scene,[100,.2,470],[0,-.24,-115],mat(index===3?0x7b8453:index===4?0x45494a:0x73776c));
 for(let k=0;k<6;k++){
  const g=segment(-k*60);g.name='Scenery_'+cfg.id+'_'+k;
  for(const x of [-3.63,3.63])box(g,[.075,.012,60],[x,.002,0],edge);
  for(let j=0;j<10;j++)box(g,[.10,.014,2.5],[0,.005,-28+j*6],edge);
  // Patched asphalt, tar seams, drainage and utility covers establish human scale.
  for(let j=0;j<8;j++){const x=(rand()-.5)*6.2,z=-28+rand()*55;const patch=mesh(g,repairGeometry(rand),[.5+rand(),1,1+rand()*2],[x,.001,z],repair);roadRide.add(patch,g);}
  if(index!==3){cyl(g,.37,.017,[2.8,.013,14],dark);for(let n=0;n<7;n++)box(g,[.5,.012,.017],[2.8,.026,13.8+n*.06],steel);for(const side of [-1,1]){box(g,[.33,.02,.8],[side*3.6,.022,-8],dark);for(let n=0;n<7;n++)box(g,[.31,.025,.018],[side*3.6,.033,-8.3+n*.09],steel);}}

  if(index!==3)for(const s of [-1,1]){box(g,[1.5,.12,60],[s*4.65,-.02,0],concrete);for(let j=0;j<30;j++)box(g,[.25,.24,1.9],[s*4,.02,-29+j*2],j%3===0?dark:edge);lamp(g,s*5.25,-15,k===1&&s>0);lamp(g,s*5.25,15,k===4&&s<0);}
  if(index===0){for(const s of [-1,1]){block(g,s*12,-9,k%2?9:5);tree(g,s*6.3,9,true);tree(g,s*6.5,22,true);}for(const side of [-1,1]){cyl(g,.24,.73,[side*5.8,.4,4.5],green);cyl(g,.26,.06,[side*5.8,.8,4.5],dark);}if(k%2===0){stop(g,-6.4,17);box(g,[2.8,2.2,2.8],[7,1.1,20],green);sign(g,'ПРОДУКТЫ',[7,2.6,21.42],[3,.55]);}for(const s of [-1,1]){box(g,[.45,.10,2.6],[s*5.8,.65,2],wood);for(const zz of [1,3])box(g,[.33,.65,.09],[s*5.8,.32,zz],dark);}beam(g,[-7,2,25],[-7,3.4,25],.065,mat(0x54788a));beam(g,[-7,3.4,25],[-7,3.4,29],.065,mat(0x54788a));}
  if(index===1){for(const side of [-1,1]){cyl(g,.12,4.5,[side*5.8,2.25,20],rust);}cyl(g,.17,12,[0,4.5,20],rust,[0,0,Math.PI/2]);for(let j=0;j<3;j++)box(g,[.1,.5,.8],[-4+j*4,4.4,20],steel);factory(g,k%2?-13:13,-6);fence(g,k%2?6:-6,-28,45);for(let j=0;j<4;j++)cyl(g,.42,1.1,[k%2?7.2:-7.2,.55,2+j*1.1],j%2?green:rust);box(g,[5,.15,4],[k%2?12:-12,0,20],concrete);for(let j=0;j<3;j++)cyl(g,1.1,6,[k%2?12:-12,1.2,15+j*2.6],steel,[0,0,Math.PI/2]);}
  if(index===2){buildingSite(g,k%2?13:-13,0);for(const s of [-1,1]){fence(g,s*5.6,-29,50);box(g,[.14,2.1,48],[s*5.6,1,-3],mat(0x708279));}sign(g,'СТРОЙКА',[0,4.3,-27],[6,.8],'#ba852f','#262b29');for(const s of [-1,1])box(g,[.13,4.4,.13],[s*4.7,2.2,-27],steel);for(let j=0;j<4;j++){mesh(g,sphereGeo,[1.7,.8,2],[8,.1,12+j*3],mat(0xa99a75));}}
  if(index===3){for(const s of [-1,1]){cottage(g,s*11,-9);fence(g,s*6.5,-25,45,'wood');tree(g,s*7.7,17,true);tree(g,s*12,24);}cyl(g,.14,7,[-5.7,3.5,18],wood);box(g,[2.1,.11,.1],[-5.7,6.4,18],wood);for(const x of [-6.5,-5.7,-4.9]){box(g,[.017,.017,60],[x,6.6,0],dark);cyl(g,.08,.20,[x,6.5,18],edge);}stop(g,6.6,22);sign(g,'МИРНЫЙ',[6.1,2.5,-23],[2.8,.65],'#e0ddce','#292e30',-.22);for(let j=0;j<12;j++)mesh(g,sphereGeo,[.4,.25,.6],[(rand()>.5?1:-1)*(4.4+rand()),.03,-28+rand()*56],mat(0x667646));}
  if(index===4){rail(g,0);for(let j=0;j<3;j++)wagon(g,12.9,-20+j*14,k%2);fence(g,5.8,-29,55);for(let j=0;j<3;j++)tree(g,-7.3,-20+j*17);if(k%2===0){box(g,[3,3,4],[-8,1.5,12],brick);window(g,-8,1.9,14.05,1.4,1.1);sign(g,'ПОСТ 12',[-8,3.5,14],[2.5,.6]);}cyl(g,.07,4.3,[6,2.15,23],steel);box(g,[.42,1.15,.30],[6,3.8,23],dark);mesh(g,sphereGeo,[.13,.13,.10],[6,4,23.2],mat(0xb22116,.3,0,0xe8210b));}
  // Puddles: irregular, soft-edged mirrors of the sky (metal 1, env map) that also stencil the mirrored cars in.
  let water=null;if(cfg.wet)for(let j=0;j<10;j++){const radius=.4+rand()*.5,geo=puddleGeometry(radius,rand);water=mat(0x69767c,.16,.08);/* dark tint: seen from above a puddle reflects only a few percent, the asphalt shows through */if(!water.userData.wetTail){wetRoad.attach(water,true);puddleMaterial(water);water.userData.wetTail=true;}const puddle=mesh(g,geo,[1.4,2.2,1],[(rand()-.5)*7,.019,-28+rand()*56],water,[-Math.PI/2,0,rand()*Math.PI]);puddle.receiveShadow=true;puddle.castShadow=false;wetRoad.addPuddle(puddle,g,radius);}
  district(g);
  batch(g);
  if(water){const merged=g.children.find(o=>o.isMesh&&o.material===water);if(merged){merged.renderOrder=4;merged.onBeforeRender=(renderer,scene)=>wetRoad.mirror.sync(scene,renderer.info.render.frame);}}
 }
 // Дальняя застройка кольцом: силуэт города в дымке. Стоит неподвижно, пока мир едет мимо, — так и ведёт себя
 // далёкий план. Тени не бросает и в снимок окружения идёт как общий тёмный край, а не как отдельные дома.
 // Кварталы по сторонам: коробки разной высоты за придорожной линией домов. Живут внутри сегмента, поэтому
 // едут вместе с миром и параллакс у них правильный. Материалы общие с остальным декором — в пакете сегмента
 // они сливаются с ним и лишних вызовов отрисовки не добавляют. Теней не бросают: они вне кадра карты теней,
 // но прокси всё равно пришлось бы считать.
 function district(g){
  // Только те материалы, что уже есть в сегменте: новый цвет добавил бы по вызову отрисовки на каждый сегмент.
  const walls=[concrete,brick,mat(0x827970),edge];
  for(let i=0;i<15;i++){
   const side=rand()<.5?-1:1,x=side*(19+rand()*42),z=-29+rand()*58;
   const h=5+rand()*rand()*20,w=8+rand()*11,d=8+rand()*11;
   const o=mesh(g,boxGeo,[w,h,d],[x,h/2-.4,z],walls[(rand()*walls.length)|0]);o.castShadow=false;o.receiveShadow=true;
   if(h>9)mesh(g,boxGeo,[w+.5,.3,d+.5],[x,h-.4,z],dark).castShadow=false;// карниз, чтобы коробка не была голой
  }
 }
 function skyline(){
  const g=new T.Group();g.name='Skyline';scene.add(g);
  const far=mat(cfg.night?0x141d28:index===3?0x8a9478:0x869299,.96);
  // Коридор дороги остаётся открытым. Иначе коробка кольца встаёт прямо по оси в сотне метров впереди, и в кадре
  // это плоский серый щит поперёк трассы — то, что Андрей и принял за рубеж отрисовки (18 сентября).
  // Порог 48 м: полуширина самой широкой коробки 14 м, значит её край не ближе 34 м от оси.
  const CORRIDOR=48;
  for(let i=0;i<34;i++){
   const w=11+rand()*17,h=7+rand()*rand()*24;
   let a=0,radius=0,x=0;
   for(let tries=0;tries<12;tries++){
    a=i/34*Math.PI*2+rand()*.09;radius=112+rand()*58;x=Math.sin(a)*radius;
    if(Math.abs(x)>=CORRIDOR)break;
    x=0;
   }
   if(!x)continue;
   const o=mesh(g,boxGeo,[w,h,w*.8],[x,h/2-1,Math.cos(a)*radius],far);o.castShadow=false;o.receiveShadow=false;
  }
  batch(g);
 }
 skyline();
 const strip=(from,to)=>{const g=new T.Group();for(let x=from;x<=to;x++)for(let z=0;z<2;z++)box(g,[.55,.016,.4],[-3.57+x*.55,.019,z*.4],mat((x+z)%2?0x242824:0xd0cdbb));batch(g);scene.add(g);return g;};
 const start=strip(0,13);start.position.z=-3;
 // Финиш разрезан по полосам: в стрелке с форой у каждого своя дистанция, и клетчатая лента во всю
 // дорогу врала — соперник проносился мимо «финиша» и выглядел быстрее, хотя его финиш дальше.
 const finish=strip(0,6),finishRival=strip(7,13);finish.position.z=-405;finishRival.position.z=-405;const treeGroup=new T.Group();cyl(treeGroup,.08,3.4,[0,1.7,0],dark);for(let i=0;i<3;i++)mesh(treeGroup,sphereGeo,[.12,.12,.12],[0,2.1+i*.35,0],mat(i===2?0x92d173:0xe0ac48,.3,0,i===2?0x558a34:0x775014));treeGroup.position.z=-6;scene.add(treeGroup);scene.userData.start=start;scene.userData.finish=finish;scene.userData.tree=treeGroup;scene.userData.track=cfg;
 // These primitives are still used by unbatched ground/start-tree objects; dispose once with scene.
 function dispose(){const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.isMesh||o.isLine||o.isPoints){gs.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])ms.add(m);}});for(const g of gs)g.dispose();for(const m of ms)m.dispose();for(const t of ownedTextures)t.dispose();boxGeo.dispose();cylGeo.dispose();sphereGeo.dispose();sun.shadow.map?.dispose();scene.clear();}
 scene.userData.finishRival=finishRival;
 return {scene,moving,cfg,dispose};
}
