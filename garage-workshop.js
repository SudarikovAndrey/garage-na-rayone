import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Metres, Y up. The reserved car/lift bay is x ±2.85, z -1.3…2.05.
// Major props have separate roots and a single physical footprint for placement audits.
export const WORKSHOP_SPOTS={bench:[1.35,0,-3.16],rack:[-3.2,0,-3.32],coffee:[-.55,0,3.19],mechanic:[1.0,0,-2.45],friend:[.65,0,2.96]};
export function refineGarageShell(room,level){
 const hide=['Stage_1_1','Stage_4_5002','Props','Upgrade2','Upgrade3'];
 for(const name of hide){const o=room.getObjectByName(name);if(o)o.visible=false;}
 const north=room.getObjectByName('Wall_North');
 for(const name of ['Stage_1_2','Stage_2_2','Stage_3_5001','Stage_5_5001']){const o=north?.getObjectByName(name);if(o)o.visible=false;}
 // West Stage_2_5 mixes shelf contents and dado in one batch; keep only the shell.
 for(const name of ['Stage_2_5','Stage_5_5002']){const o=room.getObjectByName('Wall_West')?.getObjectByName(name);if(o)o.visible=false;}
 room.getObjectByName('Floor')?.traverse(o=>{
  if(!o.isMesh)return;const m=o.material;
  if(m.name==='Fresh workshop cream'){m.color.set(0x8b9290);m.roughness=.79;}
  if(m.name!=='Workshop concrete')return;
  m.color.set(level===1?0x555e63:level===2?0x656e72:0x737b7e);m.roughness=.94;m.metalness=0;
  m.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 shopFloor;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nshopFloor=(modelMatrix*vec4(transformed,1.)).xyz;');
   shader.fragmentShader=`varying vec3 shopFloor;
float floorHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float floorNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(floorHash(i),floorHash(i+vec2(1.,0.)),f.x),mix(floorHash(i+vec2(0.,1.)),floorHash(i+1.),f.x),f.y);}
`+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 fp=shopFloor.xz;float grain=floorNoise(fp*90.);float mottling=.75+.32*floorNoise(fp*2.4)+.12*floorNoise(fp*11.);
float lanes=exp(-pow((abs(fp.y-.4)-.72)*8.,2.))*(1.-smoothstep(2.2,3.6,abs(fp.x)));
float spill=(1.-smoothstep(.18,.65+floorNoise(fp*8.)*.18,length((fp-vec2(1.35,-2.8))*vec2(1.,1.8))));
float cement=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));diffuseColor.rgb=cement*vec3(.94,1.,1.035)*mottling*(.94+.09*grain)*(1.-lanes*.15-spill*.28);
`);
  };m.customProgramCacheKey=()=> 'workshop-aged-concrete-v1';m.needsUpdate=true;
 });
}
export function addWorkshop(scene,room,level){
 const owner=new T.Group();owner.name='WorkshopFurniture';scene.add(owner);
 const clusters=[],wallMeshes=[],buckets=new Map(),textures=[],materials=new Set();
 const mat=(color,roughness=.8,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});materials.add(m);return m;};
 const iron=mat(0x303c3b,.68,.35),steel=mat(0x87918e,.42,.7),wood=mat(level===1?0x635039:0x584838,.91),red=mat(0x6e2820,.73,.25),rubber=mat(0x202324,.96),paper=mat(0x8b7654,.97),cream=mat(0xb0aaa0,.82),blue=mat(0x324b59,.8,.15),green=mat(0x41594c,.85,.1);
 const prop=(name,pos,footprint,yaw=0,parent=owner)=>{const g=new T.Group();g.name=name;g.position.set(...pos);g.rotation.y=yaw;if(footprint)g.userData.footprint=footprint;parent.add(g);clusters.push(g);return g;};
 function add(g,geo,m,p=[0,0,0],rot=[0,0,0]){geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3(...p),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1)));const key=g.uuid+m.uuid;if(!buckets.has(key))buckets.set(key,{g,m,geos:[]});buckets.get(key).geos.push(geo.index?geo.toNonIndexed():geo);if(geo.index)geo.dispose();}
 const box=(g,p,s,m,r=.008,rot=[0,0,0])=>add(g,r?new RoundedBoxGeometry(...s,1,r):new T.BoxGeometry(...s),m,p,rot);
 const rod=(g,a,b,r,m,n=8)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av),geo=new T.CylinderGeometry(r,r,v.length(),n);geo.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()));add(g,geo,m,av.add(bv).multiplyScalar(.5).toArray());};
 const ring=(g,p,major,tube,m,rot=[Math.PI/2,0,0],segments=24)=>add(g,new T.TorusGeometry(major,tube,6,segments),m,p,rot);
 const cylinder=(g,p,r,h,m)=>add(g,new T.CylinderGeometry(r,r,h,16),m,p);
 const label=(g,text,p,w,h,bg='#c1b292',fg='#332d25',rot=[0,0,0])=>{const m=mat(0xffffff);if(typeof document!=='undefined'){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,128);ctx.fillStyle=fg;ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,65,480);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;m.map=t;textures.push(t);}add(g,new T.PlaneGeometry(w,h),m,p,rot);};
 // 2.05 m worktop at 90 cm, two stout frames; all small props touch its top.
 const bench=prop('WorkshopBench',WORKSHOP_SPOTS.bench,[2.05,.68]);
 box(bench,[0,.875,0],[2.05,.055,.68],wood,.018);
 for(const x of [-.85,.85]){for(const z of [-.245,.245])box(bench,[x,.425,z],[.055,.85,.055],level<3?wood:iron);rod(bench,[x,.2,-.245],[x,.2,.245],.023,iron);}
 box(bench,[0,.24,0],[1.75,.035,.48],wood);
 if(level>=3){box(bench,[-.56,.56,.0],[.55,.58,.51],red,.022);for(let j=0;j<4;j++){box(bench,[-.56,.35+j*.135,.267],[.5,.115,.022],red);rod(bench,[-.71,.38+j*.135,.286],[-.41,.38+j*.135,.286],.009,steel);}}
 // Vice with a base, two jaws and a screw, not a single oversized block.
 const vx=.70;box(bench,[vx,.921,.10],[.24,.04,.22],iron);box(bench,[vx,.983,.10],[.11,.09,.12],iron);
 for(const z of [.02,.19])box(bench,[vx,1.045,z],[.20,.07,.035],steel);
 rod(bench,[vx,.995,.10],[vx,.995,.38],.014,steel);rod(bench,[vx-.065,.995,.36],[vx+.065,.995,.36],.008,steel);
 for(let i=0;i<3;i++){const x=-.3+i*.17;box(bench,[x,.908,.05],[.018,.012,.19],steel,.003);ring(bench,[x,.913,-.04],.025,.007,steel);}
 cylinder(bench,[-.79,.963,-.13],.038,.12,cream);ring(bench,[-.735,.962,-.13],.026,.006,cream,[0,Math.PI/2,0]);
 // Toolboard has its own wall attachment so cutaway walls take the board with them.
 if(level>=2){const board=prop('WorkshopToolboard',[1.35,1.66,-3.67],null,0,room.getObjectByName('Wall_North')||owner);
  box(board,[0,0,0],[1.85,.72,.045],wood);for(let i=0;i<10;i++)for(let j=0;j<4;j++)rod(board,[-.78+i*.17,-.25+j*.16,.026],[-.78+i*.17,-.25+j*.16,.032],.006,rubber);
  for(let i=0;i<7;i++){const x=-.66+i*.205,len=.16+i%3*.045;rod(board,[x,.20,.045],[x,.20-len,.045],.012,steel);for(const y of [.20,.20-len])ring(board,[x,y,.045],.022,.006,steel,[0,0,0],12);}
  label(board,'КЛЮЧ НА 10 НЕ ВИДЕЛ?', [0,-.26,.027],1.1,.13);
 }
 // 1.3 × .48 × 1.8 m storage. Each carton/can has an assigned shelf and a real bottom.
 const rack=prop('PartsShelf',WORKSHOP_SPOTS.rack,[1.3,.48]);
 for(const x of [-.625,.625])for(const z of [-.215,.215])box(rack,[x,.9,z],[.035,1.8,.035],iron,.004);
 for(const y of [.12,.66,1.20,1.74])box(rack,[0,y,0],[1.30,.032,.48],level===1?wood:steel,.005);
 for(const [x,y,w] of [[-.35,.66,.43],[.30,.66,.44],[-.35,1.20,.35]]){box(rack,[x,y+.15+.016,0],[w,.30,.34],paper,.01);box(rack,[x,y+.302+.016,0],[.055,.003,.34],wood,0);}
 for(let i=0;i<3;i++){const x=.05+i*.18;box(rack,[x,1.32,.02],[.13,.208,.105],i%2?red:green,.014);cylinder(rack,[x,1.44,.02],.018,.03,rubber);}
 box(rack,[-.15,.275,0],[.28,.278,.19],rubber);for(const x of [-.25,-.05])cylinder(rack,[x,.427,0],.012,.026,steel);
 label(rack,'ЗАПАСНОЕ — НЕ ЛИШНЕЕ',[0,1.76,.247],1.1,.12);
 // Coffee corner: enamel mug, kettle, domino tiles and a discreet garage joke.
 const tea=prop('TeaTable',WORKSHOP_SPOTS.coffee,[.70,.48]);
 box(tea,[0,.67,0],[.70,.045,.48],wood,.015);for(const x of [-.27,.27])for(const z of [-.16,.16])box(tea,[x,.325,z],[.036,.65,.036],iron);
 cylinder(tea,[-.19,.743,.02],.038,.10,cream);ring(tea,[-.135,.75,.02],.023,.006,cream,[0,Math.PI/2,0]);
 cylinder(tea,[.15,.785,-.06],.083,.18,level>2?green:cream);cylinder(tea,[.15,.883,-.06],.086,.016,iron);rod(tea,[.19,.795,-.09],[.285,.84,-.09],.022,cream);ring(tea,[.15,.915,-.06],.068,.009,rubber,[0,0,0]);
 for(let i=0;i<3;i++){box(tea,[-.11+i*.065,.7,.155],[.05,.012,.025],cream,.003);for(const x of [-.011,.011])cylinder(tea,[-.11+i*.065+x,.707,.155],.0025,.001,rubber);}
 label(tea,'НЕ МЕШАЙ. РЕМОНТИРУЮ.',[0,.585,.246],.58,.11);
 // Open wooden tray: flat bottom, four walls, separated bolts and two bearing rings.
 const tray=prop('SortedPartsTray',[-1.65,0,3.18],[.57,.40]);box(tray,[0,.025,0],[.57,.05,.40],wood);
 for(const x of [-.27,.27])box(tray,[x,.13,0],[.03,.21,.40],wood);for(const z of [-.185,.185])box(tray,[0,.13,z],[.51,.21,.03],wood);
 for(const x of [-.125,.10])ring(tray,[x,.066,0],.074,.015,steel);for(let i=0;i<3;i++)rod(tray,[-.18+i*.065,.06,.13],[-.145+i*.065,.06,.13],.007,steel);
 const tyres=prop('SpareTyres',[-3.59,0,2.79],[.65,.65]);for(let i=0;i<(level>=3?3:2);i++){ring(tyres,[0,.10+i*.2,0],.235,.09,rubber);for(let j=0;j<20;j++){const a=j*Math.PI/10;box(tyres,[.322*Math.cos(a),.10+i*.2,.322*Math.sin(a)],[.014,.13,.011],iron,.002,[0,-a,0]);}}
 // Extinguisher on a bracket clear of the gate swing; 52 cm tall, 14 cm diameter.
 const fire=prop('FireExtinguisher',[4.09,0,2.7],[.20,.24]);cylinder(fire,[0,.38,0],.072,.43,red);cylinder(fire,[0,.607,0],.033,.025,iron);box(fire,[0,.64,0],[.08,.025,.045],iron);rod(fire,[.02,.625,0],[.09,.59,0],.009,rubber);rod(fire,[.09,.59,0],[.09,.32,0],.009,rubber);box(fire,[.085,.38,0],[.03,.40,.13],iron);label(fire,'ОП-2',[0,.40,.074],.095,.13,'#dbd4b6','#a32720');
 if(level>=4){const c=prop('AirCompressor',[2.5,0,3.1],[.94,.52]);
  add(c,new T.CapsuleGeometry(.17,.54,4,12),red,[0,.30,0],[0,0,Math.PI/2]);
  for(const x of [-.3,.3])for(const z of [-.20,.20])add(c,new T.CylinderGeometry(.09,.09,.055,12),rubber,[x,.09,z],[Math.PI/2,0,0]);
  box(c,[0,.575,0],[.28,.23,.23],iron,.018);for(let j=0;j<5;j++)box(c,[-.10+j*.05,.58,0],[.015,.22,.28],steel,.002);
  for(let j=0;j<3;j++)ring(c,[-.20,.035+j*.022,.02],.14,.009,rubber);
 }
 if(level>=3){const cabinet=prop('ToolCabinet',[3.50,0,-3.18],[.62,.55]);box(cabinet,[0,.48,0],[.62,.86,.55],red,.02);
  for(let i=0;i<5;i++){box(cabinet,[0,.19+i*.145,.28],[.56,.13,.022],red);rod(cabinet,[-.21,.23+i*.145,.303],[.21,.23+i*.145,.303],.009,steel);}
  for(const x of [-.24,.24])for(const z of [-.20,.20])add(cabinet,new T.CylinderGeometry(.055,.055,.035,12),rubber,[x,.055,z],[0,0,Math.PI/2]);
 }
 const sign=prop('GarageHouseRules',[0,2.60,-3.695],null,0,room.getObjectByName('Wall_North')||owner);box(sign,[0,0,0],[1.5,.28,.025],wood);label(sign,level===1?'ЗАТО СВОЙ ГАРАЖ':'НЕ СТУЧИ — Я ДУМАЮ',[0,0,.014],1.46,.24);
 for(const {g,m,geos} of buckets.values()){
  const merged=mergeGeometries(geos,false);geos.forEach(g=>g.dispose());const actual=m.clone();materials.add(actual);const mesh=new T.Mesh(merged,actual);mesh.name=g.name+'__part';mesh.castShadow=mesh.receiveShadow=true;g.add(mesh);
  if(g.parent?.name==='Wall_North'){actual.transparent=true;wallMeshes.push({mesh,normal:new T.Vector3(0,0,-1)});}
 }
 owner.updateMatrixWorld(true);
 return {owner,clusters,wallMeshes,dispose(){textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());for(const g of clusters){g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});g.removeFromParent();}owner.removeFromParent();}};
}
