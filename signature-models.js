// Модели именных деталей (dist/signature-parts.js). Одна модель на все места, где деталь видно: иконка
// в гараже, витрине и наградах (снимается scripts/render-signature-icons.mjs) и рентген мотора в тюнинге
// (dist/powertrain-xray.js). Собраны из примитивов, как и обычные узлы рентгена, но на дорогих материалах:
// хром, золото, кованый чёрный металл и красное свечение — тот же красный, что окантовка «Уникальной».
//
// Размер — как у обычного узла рентгена: мотор около 0.6 м в ширину, коробка около 0.5 м в длину,
// колесо радиусом 0.3. Центр модели — в нуле.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const MATS={
 chrome:()=>new T.MeshStandardMaterial({color:0xe9edf0,metalness:1,roughness:.14}),
 gold:()=>new T.MeshStandardMaterial({color:0xd9a843,metalness:1,roughness:.24}),
 steel:()=>new T.MeshStandardMaterial({color:0xa9b1b6,metalness:.85,roughness:.32}),
 black:()=>new T.MeshStandardMaterial({color:0x1b1d20,metalness:.55,roughness:.42}),
 carbon:()=>new T.MeshStandardMaterial({color:0x2b2f34,metalness:.3,roughness:.55}),
 red:()=>new T.MeshStandardMaterial({color:0xc4262a,metalness:.35,roughness:.3}),
 glow:()=>new T.MeshStandardMaterial({color:0x7a0d04,emissive:0xff2a0c,emissiveIntensity:1.05,metalness:.2,roughness:.35}),/* раскалённо-красный: ярче — тональная кривая уводит в персик */
 blue:()=>new T.MeshStandardMaterial({color:0x2d63c8,metalness:.4,roughness:.3}),
 white:()=>new T.MeshStandardMaterial({color:0xf1ede3,metalness:.1,roughness:.45}),
 rubber:()=>new T.MeshStandardMaterial({color:0x17181a,metalness:0,roughness:.86}),
};

function kit(){
 const group=new T.Group(),cache={};
 const m=name=>cache[name]??=MATS[name]();
 const add=(geo,mat,pos=[0,0,0],rot=[0,0,0],parent=group)=>{const mesh=new T.Mesh(geo,m(mat));mesh.position.set(...pos);mesh.rotation.set(...rot);mesh.castShadow=true;parent.add(mesh);return mesh;};
 return {group,m,add,
  box:(size,mat,pos,rot,parent)=>add(new RoundedBoxGeometry(...size,2,Math.min(...size)*.18),mat,pos,rot,parent),
  cyl:(r,h,mat,pos,rot,seg=32,parent)=>add(new T.CylinderGeometry(r,r,h,seg),mat,pos,rot,parent),
  cone:(r1,r2,h,mat,pos,rot,parent)=>add(new T.CylinderGeometry(r1,r2,h,28),mat,pos,rot,parent),
  torus:(r,t,mat,pos,rot,arc=Math.PI*2,parent)=>add(new T.TorusGeometry(r,t,12,40,arc),mat,pos,rot,parent),
  ball:(r,mat,pos,parent)=>add(new T.SphereGeometry(r,20,14),mat,pos,[0,0,0],parent),
 };
}
const X=[0,0,Math.PI/2],Z=[Math.PI/2,0,0];

// Треугольник Рело — профиль ротора Ванкеля.
function rotorShape(r){const s=new T.Shape(),pts=[0,1,2].map(i=>{const a=Math.PI/2+i*2*Math.PI/3;return [Math.cos(a)*r,Math.sin(a)*r];});
 const side=r*Math.sqrt(3);s.moveTo(...pts[0]);for(let i=0;i<3;i++){const a=pts[i],b=pts[(i+1)%3],c=pts[(i+2)%3];
  const from=Math.atan2(a[1]-c[1],a[0]-c[0]),to=Math.atan2(b[1]-c[1],b[0]-c[0]);s.absarc(c[0],c[1],side,from,to,false);}return s;}

// ── Моторы ──
function arkan(){const k=kit(),body=new T.Group();k.group.add(body);
 // Двухсекционный роторный корпус. Лицом к зрителю — окно, в котором горит треугольный ротор Ванкеля.
 k.cyl(.27,.24,'black',[0,0,-.03],Z,48,body);k.cyl(.285,.05,'chrome',[0,0,-.13],Z,48,body);k.cyl(.285,.05,'chrome',[0,0,.07],Z,48,body);
 k.cyl(.22,.02,'carbon',[0,0,.1],Z,48,body);
 k.add(new T.ExtrudeGeometry(rotorShape(.17),{depth:.035,bevelEnabled:true,bevelSize:.01,bevelThickness:.01,bevelSegments:2}),'glow',[0,0,.095],[0,0,.32],body);
 k.torus(.225,.018,'gold',[0,0,.11],[0,0,0],Math.PI*2,body);k.cyl(.04,.06,'gold',[0,0,.15],Z,24,body);
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2;k.cyl(.014,.03,'gold',[Math.cos(a)*.25,Math.sin(a)*.25,.11],Z,10,body);}
 // Впуск — два хромированных раструба сверху, выпуск — раскалённая труба вбок.
 for(const z of [-.08,.04]){k.cone(.055,.036,.13,'chrome',[0,.33,z],[0,0,0],body);k.torus(.055,.009,'gold',[0,.395,z],[Math.PI/2,0,0],Math.PI*2,body);}
 k.cyl(.042,.24,'glow',[.36,-.08,-.03],X,24,body);k.cyl(.05,.05,'steel',[.49,-.08,-.03],X,24,body);
 body.rotation.y=.72;/* окно ротора — к зрителю: камера иконки смотрит из (+x,+z) */
 return k.group;}

function kamaz(){const k=kit();
 k.box([.52,.28,.32],'black',[0,-.02,0]);k.box([.54,.08,.34],'red',[0,.16,0]);
 for(let i=0;i<4;i++)k.cyl(.026,.06,'chrome',[-.19+i*.125,.22,0]);
 // Турбина-улитка: холодная половина в полированной стали, горячая — раскалена.
 k.torus(.1,.055,'steel',[.36,.04,.06],[0,Math.PI/2,0]);k.torus(.085,.05,'glow',[.36,.04,-.07],[0,Math.PI/2,0]);
 k.cyl(.06,.1,'gold',[.36,.04,.18],Z);k.torus(.062,.01,'chrome',[.36,.04,.23],[0,0,0]);
 // Патрубок интеркулера через крышку.
 k.torus(.2,.025,'chrome',[.17,.16,.2],[0,0,0],Math.PI*.6);
 for(let i=0;i<4;i++)k.cyl(.03,.14,'steel',[-.19+i*.125,-.02,.2],Z);
 return k.group;}

function dogonyalka(){const k=kit();
 k.box([.5,.18,.3],'black',[0,-.1,0]);
 // Два ряда по четыре — V8. Хромированные клапанные крышки.
 for(const side of [-1,1]){k.box([.5,.12,.13],'black',[0,.03,side*.1],[side*.55,0,0]);k.box([.48,.05,.12],'chrome',[0,.1,side*.15],[side*.55,0,0]);
  for(let i=0;i<4;i++)k.cyl(.012,.08,'red',[-.18+i*.12,.1,side*.21],[side*.9,0,0],8);}
 // Большой круглый фильтр — визитная карточка «Чайки».
 k.cyl(.19,.05,'chrome',[0,.2,0],[0,0,0],48);k.cyl(.198,.035,'black',[0,.17,0],[0,0,0],48);k.ball(.035,'chrome',[0,.24,0]);
 k.cyl(.07,.06,'steel',[.29,-.07,0],X);k.torus(.07,.012,'black',[.32,-.07,0],[0,Math.PI/2,0]);
 return k.group;}

function kompressor(){const k=kit();
 k.box([.5,.28,.3],'carbon',[0,-.04,0]);
 // Нагнетатель: полированный корпус с рёбрами и красным заборником.
 k.box([.44,.12,.2],'chrome',[0,.16,0]);for(let i=0;i<6;i++)k.box([.012,.13,.21],'steel',[-.18+i*.072,.16,0]);
 k.box([.16,.07,.13],'red',[0,.255,0]);k.box([.12,.02,.1],'black',[0,.29,0]);
 // Шкив и ремень спереди.
 k.cyl(.07,.04,'red',[.29,.12,0],X);k.cyl(.05,.05,'steel',[.29,-.06,0],X);k.torus(.075,.012,'black',[.31,.03,0],[0,Math.PI/2,0]);
 return k.group;}

// ── КПП ──
function gearbox(k,len,mat){k.cyl(.14,len,mat,[0,0,0],X,40);k.cone(.17,.14,.1,mat,[-len/2-.03,0,0],[0,0,Math.PI/2]);k.cyl(.035,.12,'steel',[len/2+.06,0,0],X);}
function semistupka(){const k=kit();gearbox(k,.5,'black');
 for(let i=0;i<7;i++)k.torus(.147,.012,'gold',[-.2+i*.067,0,0],[0,Math.PI/2,0]);
 k.torus(.15,.016,'glow',[.24,0,0],[0,Math.PI/2,0]);
 k.cyl(.012,.28,'gold',[.02,.27,0]);k.ball(.04,'red',[.02,.42,0]);k.box([.08,.03,.08],'chrome',[.02,.14,0]);
 return k.group;}
function korotkohod(){const k=kit();gearbox(k,.34,'chrome');
 for(let i=0;i<3;i++)k.torus(.147,.012,'steel',[-.1+i*.1,0,0],[0,Math.PI/2,0]);
 k.cyl(.014,.12,'chrome',[0,.2,0]);k.ball(.045,'red',[0,.27,0]);k.box([.1,.03,.1],'black',[0,.14,0]);
 return k.group;}
function kontora(){const k=kit();gearbox(k,.44,'black');
 for(const x of [-.12,.12])k.torus(.148,.016,'chrome',[x,0,0],[0,Math.PI/2,0]);
 k.cyl(.012,.34,'chrome',[0,.31,0]);k.ball(.042,'black',[0,.49,0]);k.box([.1,.03,.1],'chrome',[0,.15,0]);
 return k.group;}
function sekvental(){const k=kit();
 k.box([.46,.24,.26],'carbon',[0,0,0]);k.box([.46,.03,.27],'red',[0,-.06,0]);
 // Секвентальная кулиса: прорезь и рычаг с Т-ручкой.
 k.box([.06,.03,.2],'chrome',[0,.135,0]);k.box([.02,.032,.15],'black',[0,.15,0]);
 k.cyl(.014,.24,'chrome',[0,.27,.03],[-.25,0,0]);k.cyl(.02,.1,'red',[0,.39,.06],X);
 k.cyl(.035,.12,'steel',[.29,0,0],X);
 return k.group;}

// ── Шины ──
// Покрышка — настоящий профиль (тело вращения) с открытым центром: сквозь него виден диск. Плоский
// цилиндр закрывал диск целиком, и колесо читалось чёрным блином со спицами.
function tireGeometry(width){const w=width/2,pts=[[.205,-w+.02],[.215,-w],[.262,-w-.014],[.292,-w+.012],[.302,-w*.45],[.302,w*.45],[.292,w-.012],[.262,w+.014],[.215,w],[.205,w-.02]].map(([r,y])=>new T.Vector2(r,y));
 const g=new T.LatheGeometry(pts,72);g.rotateX(Math.PI/2);return g;}
function wheel(k,{tire='rubber',rim='chrome',spokes=5,spokeMat=rim,cap='steel',tread=false,wall=null,stripe=null,lip=null,width=.2,caliper=null,dish=null}){
 const g=new T.Group();k.group.add(g);const w=width/2,face=w+.016;
 k.add(tireGeometry(width),tire,[0,0,0],[0,0,0],g);
 if(tread)for(let i=0;i<40;i++){const a=i/40*Math.PI*2;k.add(new T.BoxGeometry(.03,.014,width*.92),tire,[Math.cos(a)*.305,Math.sin(a)*.305,0],[0,0,a],g);}
 if(wall)k.add(new T.RingGeometry(.228,.268,72),wall,[0,0,face],[0,0,0],g);
 if(stripe)k.add(new T.RingGeometry(.272,.288,72),stripe,[0,0,face-.004],[0,0,0],g);
 // Диск: обод, полка и лицевая чаша, на ней спицы.
 k.cyl(.205,width*.9,rim,[0,0,0],Z,56,g);k.cyl(.19,.02,dish||rim,[0,0,w-.02],Z,56,g);
 if(lip)k.torus(.2,.014,lip,[0,0,w+.002],[0,0,0],Math.PI*2,g);
 for(let i=0;i<spokes;i++){const a=i/spokes*Math.PI*2;const sp=new T.Mesh(new RoundedBoxGeometry(.036,.16,.04,2,.012),k.m(spokeMat));sp.position.set(Math.cos(a)*.1,Math.sin(a)*.1,w);sp.rotation.z=a-Math.PI/2;g.add(sp);}
 k.cyl(.052,.05,cap,[0,0,w+.01],Z,28,g);
 if(caliper)k.box([.07,.13,.06],caliper,[.12,.08,w-.06],[0,0,-.5],g);
 return g;}
const vfts=()=>{const k=kit();wheel(k,{rim:'white',dish:'carbon',spokes:6,cap:'blue',tread:true,lip:'blue'});return k.group;};
const suhari=()=>{const k=kit();wheel(k,{rim:'gold',dish:'black',spokes:5,cap:'gold',width:.24,caliper:'red',lip:'gold'});return k.group;};
const obkom=()=>{const k=kit();wheel(k,{rim:'chrome',spokes:0,cap:'chrome',wall:'white',width:.22});k.ball(.11,'chrome',[0,0,.12]);return k.group;};
const koltsevye=()=>{const k=kit();wheel(k,{rim:'black',dish:'carbon',spokes:10,spokeMat:'steel',cap:'red',stripe:'red',wall:'white',lip:'red',width:.24,caliper:'gold'});return k.group;};

const BUILDERS={arkan,kamaz,dogonyalka,kompressor,semistupka,korotkohod,kontora,sekvental,vfts,suhari,obkom,koltsevye};
export const hasSignatureModel=key=>!!BUILDERS[key];
// Модель именной детали по её ключу (signature в dist/signature-parts.js).
export function signatureModel(key){const build=BUILDERS[key];if(!build)return null;const g=build();g.name='Signature_'+key;g.userData.signature=key;return g;}
export function disposeSignatureModel(g){const seen=new Set();g?.traverse(o=>{if(o.isMesh){o.geometry.dispose();if(!seen.has(o.material)){seen.add(o.material);o.material.dispose();}}});}
