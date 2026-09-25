// Неоновые трубки под машиной: четыре светящихся бруска по периметру днища. Пульсация считается в neons.js,
// здесь только геометрия. Землю красит световой ковёр (ground-light.js), а не источники света: два точечных
// светили сквозь днище двумя кляксами и меняли число источников в сцене, из-за чего перекомпилировались все
// материалы (стоп на 1,5–2 с при первом показе машины с неоном).
// Контроллер живёт в root.userData.neon; кадр гаража перерисовывается только когда яркость изменилась.
import * as T from 'three';
import {neonById,pulseLevel} from './neons.js';

export const NEON_TUBE={y:.13,thickness:.028,glowMax:6.5,glowMin:1.1,light:4.2,reach:3.4};

export function attachNeon(root,id,{reduced=false,racing=false}={}){
 const neon=neonById(id);if(!neon||!root)return null;
 const len=root.userData.carLength||4,width=root.userData.carWidth||1.65,wheelbase=root.userData.wheelbase||2.46,axle=root.userData.axleOffset||0;
 const group=new T.Group();group.name='Neon_'+neon.id;group.position.y=NEON_TUBE.y;root.add(group);
 const color=new T.Color(neon.color),th=NEON_TUBE.thickness;
 const across=new T.BoxGeometry(th,th,width*.62),along=new T.BoxGeometry(wheelbase*.74,th,th);
 // Порядок совпадает с индексом k у pulseLevel: нос (−X), правый борт (+Z), корма, левый борт.
 // Трубки по порогам не шире колёс: у машин с утопленными колёсами (заводская Копейка) порог шире колеи,
 // и конец трубки торчал бы наружу рядом с шиной.
 let side=width/2-.03;{root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert();root.traverse(o=>{if(!/^Wheel_[FR][LR]$/.test(o.name))return;const b=new T.Box3().setFromObject(o).applyMatrix4(inv);side=Math.min(side,Math.max(Math.abs(b.min.z),Math.abs(b.max.z))-.01);});/* по самой узкой колее: у Копейки задняя уже передней */}
 const places=[[across,-(len/2-.30),0],[along,axle,side],[across,len/2-.30,0],[along,axle,-side]];
 const materials=places.map(()=>{const m=new T.MeshStandardMaterial({color:0x0c0d12,roughness:.35,metalness:.2,emissive:color,emissiveIntensity:NEON_TUBE.glowMin});m.name='Neon';m.userData.indicator=true;/* зеркало пола и гараж синхронизируют яркость по этому флагу */return m;});
 // Трубка крепится к днищу: лучом снизу меряем, где у машины низ над трубкой (с обвесом — его пороги и бамперы),
 // и ставим её вплотную под ним. На постоянной высоте 13 см у машин с высоким порогом она висела в воздухе.
 const under=[];root.traverse(o=>{if(!o.isMesh||o.name.startsWith('Neon')||o.userData.groundLight||o.name==='ContactShadow')return;for(let p=o;p&&p!==root;p=p.parent)if(/^Wheel_[FR][LR]$/.test(p.name))return;under.push(o);});
 const ray=new T.Raycaster(),up=new T.Vector3(0,1,0),mount=(x,z,span,alongX)=>{const hits=[];for(const t of [-.4,-.2,0,.2,.4]){const p=new T.Vector3(alongX?x+t*span:x,.01,alongX?z:z+t*span).applyMatrix4(root.matrixWorld);ray.set(p,up.clone().transformDirection(root.matrixWorld));ray.far=1.2;const h=ray.intersectObjects(under,false)[0];if(h)hits.push(root.worldToLocal(h.point.clone()).y);}if(!hits.length)return NEON_TUBE.y;hits.sort((a,b)=>a-b);/* медиана: концы уходят в бампер или порог, середина прижата */return Math.max(th/2+.02,hits[Math.floor(hits.length/2)]-th/2-.004);};
 group.position.y=0;
 places.forEach(([geometry,x,z],k)=>{const mesh=new T.Mesh(geometry,materials[k]);mesh.name='Neon_tube_'+k;const alongX=k%2===1;mesh.position.set(x,mount(x,z,alongX?wheelbase*.74:width*.62,alongX),z);mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);});
 // Источников света у неона нет: землю красит ковёр под машиной, он же знает габарит днища.
 const ground=root.userData.groundLight||null,lights=[];
 let time=Math.random()*3,last=null;
 const levels=[0,0,0,0];
 function apply(){for(let k=0;k<4;k++)materials[k].emissiveIntensity=T.MathUtils.lerp(NEON_TUBE.glowMin,NEON_TUBE.glowMax,levels[k]);ground?.setNeon(color,levels);}
 const controller={
  id:neon.id,group,materials,lights,
  // Возвращает true, когда картинка изменилась. Ровный свет и режим без движения — один раз выставили и молчим.
  update(dt){
   time+=dt;let changed=last===null;
   for(let k=0;k<4;k++){const v=reduced?.8:pulseLevel(neon.pulse,time,k);if(Math.abs(v-levels[k])>.004)changed=true;levels[k]=v;}
   if(!changed)return false;last=time;apply();return true;
  },
  dispose(){group.removeFromParent();across.dispose();along.dispose();for(const m of materials)m.dispose();ground?.clearNeon();},
 };
 controller.update(0);
 root.userData.neon=controller;return controller;
}
