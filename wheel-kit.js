// Диски обвеса (23–24 сентября, Андрей: «поюзать модель колёс, лоуполи, протектор в текстуру, диски разного цвета»;
// «очень мало колёс на выбор, в игре было больше; нужны варианты с низкопрофильной резиной, крупными цветными суппортами»).
// Восемь литых дисков из набора (в файле 20; штамповка, колпаки, битые, со своим суппортом и многоугольным ободом — 6, 8…16, 18, 19 — не используются), Rims_N_Tyres_kit_1.0 (britdawgmasterfunk, Sketchfab, CC-BY-4.0), упрощены до ≤6 тыс.
// треугольников с нормалями оригинала; три профиля лоупольной шины с запечённым протектором; суппорт из того же набора.
// У каждой дисковой детали игры (редкость × вариант, 27 штук) свой облик: диск, цвет, профиль резины, суппорт.
// Сетки и материал шины общие для всех машин игры: их не удаляют вместе с машиной.
import * as T from 'three';
import {createGLTFLoader} from './gltf.js';

// Профили шины набора: внутренний радиус в долях внешнего — чем больше, тем ниже профиль и крупнее диск.
export const TYRE_PROFILES=[.70,.77,.84];
// Облик: d — диск набора, c — цвет, m/r — металл и шероховатость, p — профиль (0…2), cal — цвет суппорта или null.
const L=(d,c,p=0,cal=null,m=.9,r=.24)=>({design:d,color:c,metalness:m,roughness:r,profile:p,caliper:cal});
// По редкости, первым — базовый вариант (id без «~k»), дальше варианты по порядку PARTS.
export const RIM_LOOKS_BY_RARITY=[
 // Все пять редкостей по названиям — литьё («Литьё с рынка», «Понты на литье»…): штамповки и колпаков в наборе нет.
 // Обычная: литьё с рынка — серебро, графит, чёрный, белый; заводской профиль, суппортов не видно.
 [L(0,0xc4cad0),L(1,0xc9ced3),L(7,0xc2c7cc),L(5,0xb8bec4),L(17,0x8e959c),L(17,0xd8dde2),L(0,0x1d1f22,0,null,.6,.35),
  L(1,0xeeeeea,0,null,.35,.3),L(7,0x4a4f55),L(1,0x18191b,0,null,.6,.34),L(0,0xd4d8dc),L(5,0xc9ced3),L(2,0xb5bbc1)],
 // Редкая: спорт — графит, белый, бронза, чёрный; профиль ниже, у всех — крупный суппорт яркого цвета, не в цвет диска.
 [L(1,0x2f3338,1,0xd81f26,.78,.3),L(7,0xf1f1ee,1,0xd81f26,.4,.28),L(7,0xa9824f,1,0x1f6fd8,.9,.3),L(3,0x4a4f55,1,0xffc21a),L(17,0x141517,1,0xffc21a,.6,.3),
  L(0,0x8c6a3f,1,0x1f6fd8,.9,.28),L(2,0x141517,1,0xd81f26,.55,.32)],
 // Эпическая: цвет и низкий профиль, крупные суппорты в контраст.
 [L(2,0xb0164e,1,0xffd21a,.55,.28),L(5,0xeceeee,1,0x1f6fd8,.5,.26),L(17,0xd9dee4,1,0xff7a00,.95,.18),L(1,0x2bd66a,1,0xd81f26,.6,.28)],
 // Легендарная: золото и чёрный хром, самые крупные суппорты.
 [L(3,0xd6a54a,1,0xd81f26,.95,.2),L(2,0x0d0e10,1,0xffd21a,.8,.22)],
 // Уникальная: «Диски Кисули» — конфетный розовый, белые суппорты.
 [L(4,0xff4f9a,1,0xffffff,.5,.22)],
];
// Прежний API: цвет базового варианта по редкости.
export const RIM_LOOKS=RIM_LOOKS_BY_RARITY.map(v=>({color:v[0].color,metalness:v[0].metalness,roughness:v[0].roughness}));
// Облик по id детали «rims-<редкость>[~вариант]».
export function rimLookFor(partId){
 if(typeof window!=='undefined'&&window.__rimLook)return window.__rimLook;// студия: просмотр дисков набора по одному
 const m=/^rims-(\d)(?:~(\d+))?$/.exec(partId||'');const r=m?Number(m[1]):0,v=m?Number(m[2]||0):0,list=RIM_LOOKS_BY_RARITY[r]||RIM_LOOKS_BY_RARITY[0];
 return list[v%list.length];
}
// Для проверок и старого кода: внутренний радиус базового профиля.
export const KIT_TYRE_INNER=TYRE_PROFILES[0];

let kit=null,loading=null;
// Ревизия файла набора: меняется вместе с wheel-kit.glb, чтобы вкладки не держали прежний.
export const WHEEL_KIT_REV=13;
// Сцена набора → общие сетки. Узлы у сжатой модели несут масштаб квантования — храним его матрицей.
export function useWheelKit(scene){
 scene.updateMatrixWorld(true);
 const part=o=>{if(!o?.isMesh)return null;const matrix=o.matrixWorld.clone();const box=(o.geometry.boundingBox??(o.geometry.computeBoundingBox(),o.geometry.boundingBox)).clone().applyMatrix4(matrix);return {geometry:o.geometry,material:o.material,matrix,front:box.max.z,back:box.min.z};};
 // Посадочная полка шины: самый малый радиус и где он по оси — туда встаёт обод диска (в долях R и ширины).
 const bead=t=>{const p=t.geometry.attributes.position,v=new T.Vector3();let minR=9;const pts=[];for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(t.matrix);const r=Math.hypot(v.x,v.y);pts.push([r,Math.abs(v.z)]);if(r<minR)minR=r;}
  t.inner=minR;t.bead=Math.max(...pts.filter(q=>q[0]<minR+.015).map(q=>q[1]));return t;};
 const rims=[];for(let i=0;scene.getObjectByName('Rim_'+i);i++)rims.push(part(scene.getObjectByName('Rim_'+i)));
 const tyres=TYRE_PROFILES.map((_,i)=>part(scene.getObjectByName('Tyre_'+i)));
 for(const t of tyres)if(t){t.material.name='Tyre';bead(t);}
 const caliper=part(scene.getObjectByName('Caliper'));
 kit=rims.length&&tyres.every(Boolean)?{rims,tyres,tyre:tyres[0],caliper}:null;return kit;
}
export const wheelKit=()=>kit;
export function loadWheelKit(){
 return loading??=createGLTFLoader().loadAsync(new URL('./assets/parts/wheel-kit.glb?v='+WHEEL_KIT_REV,import.meta.url).href).then(g=>useWheelKit(g.scene));
}
if(typeof window!=='undefined')loadWheelKit().catch(()=>{loading=null;});

// Тормоз (24 сентября, Андрей: «суппорт должен быть плоским, как на спорткарах; тормозной диск не на всё колесо;
// фактура — не вертикальные линии, трение радиальное, сверловка в радиальном ритме»).
// Диск — круг с текстурой: тёмный колокол, кольцевые следы трения, три ряда сверловки со сдвигом (спираль).
function discTexture(){const N=512,d=new Uint8Array(N*N*4),arms=24,holes=[.56,.66,.76,.86];
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){const u=(x+.5)/N*2-1,v=(y+.5)/N*2-1,r=Math.hypot(u,v),a=Math.atan2(v,u);let c=0,al=255;
  if(r>1)al=0;else if(r<.42)c=r<.16?18:r<.38?48:30;// колокол со ступицей
  else if(r>.975)c=78;else{c=158+9*Math.sin(r*300)+5*Math.sin(r*113);// кольцевые риски трения
   // сверловка: 24 луча по 4 отверстия, луч слегка закручен — как на спортивных дисках
   for(let j=0;j<holes.length;j++){const rr=holes[j],step=Math.PI*2/arms,off=j*.07,aa=((a-off)%step+step)%step-step/2;const dd=Math.hypot(r-rr,aa*rr);if(dd<.024)c=dd<.017?16:70;}}
  const i=(y*N+x)*4;d[i]=d[i+1]=d[i+2]=Math.max(0,Math.min(255,c));d[i+3]=al;}
 const t=new T.DataTexture(d,N,N,T.RGBAFormat);t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;return t;}
let brake=null;
const brakeParts=()=>brake??={disc:new T.CircleGeometry(1,48),
 // Суппорт — плоский сектор кольца со скруглением: обнимает край диска, по оси всего 0.06 радиуса обода.
 caliper:(()=>{const s=new T.Shape(),a0=-.42,a1=.42,r0=.52,r1=.78;s.absarc(0,0,r1,a0,a1,false);s.absarc(0,0,r0,a1,a0,true);s.closePath();
  const g=new T.ExtrudeGeometry(s,{depth:.05,bevelEnabled:true,bevelThickness:.012,bevelSize:.02,bevelSegments:2,curveSegments:16});g.translate(0,0,-.025);return g;})(),
 map:discTexture(),
 // Закраина обода: гладкое кольцо (72 сегмента) поверх края диска набора — у упрощённых дисков край многоугольный,
 // а между ним и шиной оставалась щель (Андрей: «диск не прилегает к резине, угловатый, не круглый»).
 // Профиль в долях обода: радиус и глубина от плоскости лица (минус — внутрь колеса); заходит под борт шины.
 flange:(()=>{const g=new T.LatheGeometry([[.9,0],[.94,.012],[.985,.014],[1.0,.004],[1.006,-.012],[1.006,-.16]].map(([r,z])=>new T.Vector2(r,z)),72);g.rotateX(Math.PI/2);g.computeVertexNormals();return g;})()};
// Поставить диск, шину и тормоз набора в колесо. o — узел Wheel_XX (ось колеса Z, центр — узел; крутится по Z).
// radius — внешний радиус шины, half — полуширина, cz — центр шины по оси, side — борт (±1, наружу).
// tyreMaterials — копии материала шины на одну машину (Map профиль → материал): общий модульный материал нельзя
// отдавать машине — гараж (garage-selection.js) дописывает свой шейдер в материалы машины при каждой сборке, и на
// общем материале вставки копились, шейдер переставал собираться, резина пропадала (Андрей: «в гараже пропала резина»).
export function mountKitWheel(o,{partId,rarity,radius,half,cz,side,scale=1,material,caliperMaterial=null,discMaterial=null,tyreMaterials=null,own=m=>m}){
 const look=partId?rimLookFor(partId):rimLookFor('rims-'+(rarity|0));
 const g=new T.Group();g.name='WheelKit_rims';o.add(g);
 const put=(p,mat)=>{const m=new T.Mesh(p.geometry,mat);m.matrixAutoUpdate=false;m.matrix.copy(p.matrix);m.castShadow=true;return m;};
 const tyre=kit.tyres[look.profile]||kit.tyres[0];
 let tm=tyreMaterials?.get(look.profile);if(!tm){tm=own(tyre.material.clone());tm.name='Tyre';tyreMaterials?.set(look.profile,tm);}
 const t=new T.Group();t.position.z=cz;t.scale.set(radius,radius,half*2);t.add(put(tyre,tm));g.add(t);
 // Диск: обод — ровно по посадочной полке шины (радиус и плоскость), глубина — не больше ширины шины между полками.
 // Раньше лицо стояло на 1 см снаружи шины, а глубокий диск вылезал за резину внутрь (Андрей, 24 сентября).
 const rim=kit.rims[Math.min(kit.rims.length-1,Math.max(0,look.design|0))],r=radius*tyre.inner*1.004,beadZ=tyre.bead*2*half;
 const depth=rim.front-rim.back,sz=Math.min(r,beadZ*2*.97/Math.max(.01,depth));
 const d=new T.Group();d.scale.set(r,r,sz);d.rotation.y=side<0?Math.PI:0;d.position.z=cz+side*(beadZ-.002-rim.front*sz);d.add(put(rim,material));g.add(d);
 const lip=new T.Mesh(brakeParts().flange,material);lip.name='WheelKit_flange';lip.castShadow=true;lip.scale.set(r,r,r);lip.rotation.y=side<0?Math.PI:0;lip.position.z=cz+side*(beadZ-.002);g.add(lip);
 // Тормоз за спицами: диск крутится с колесом, суппорт — нет (перед отрисовкой снимаем вращение узла по Z,
 // поворот руля по Y остаётся). Передний суппорт стоит сзади колеса, задний — спереди.
 if(look.caliper!==null&&caliperMaterial){const b=brakeParts();
  if(discMaterial&&!discMaterial.map){discMaterial.map=b.map;discMaterial.transparent=false;discMaterial.alphaTest=.5;discMaterial.needsUpdate=true;}
  const disc=new T.Mesh(b.disc,discMaterial||caliperMaterial);disc.name='WheelKit_disc';disc.scale.set(r*.62,r*.62,1);/* тормозной диск .62 обода: .66 — «огромный», .5 — «очень маленький» */disc.rotation.y=side<0?Math.PI:0;disc.position.z=cz-side*beadZ*.05;disc.castShadow=true;g.add(disc);
  const holder=new T.Group();holder.name='WheelKit_caliper';holder.position.z=cz+side*beadZ*.08;g.add(holder);
  const c=new T.Mesh(b.caliper,caliperMaterial);c.castShadow=true;const a=o.name[6]==='F'?Math.PI*.18:Math.PI*.82;
  c.rotation.z=a;c.scale.set(r*.95,r*.95,r);/* сектор .49–.74 обода: обнимает край тормозного диска (.62) */if(side<0)c.rotation.y=Math.PI;holder.add(c);
  c.onBeforeRender=()=>{holder.rotation.z=-o.rotation.z;holder.updateMatrixWorld(true);};
 }
 return g;
}
