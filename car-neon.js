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
 const places=[[across,-(len/2-.30),0],[along,axle,width/2-.03],[across,len/2-.30,0],[along,axle,-(width/2-.03)]];
 const materials=places.map(()=>{const m=new T.MeshStandardMaterial({color:0x0c0d12,roughness:.35,metalness:.2,emissive:color,emissiveIntensity:NEON_TUBE.glowMin});m.name='Neon';m.userData.indicator=true;/* зеркало пола и гараж синхронизируют яркость по этому флагу */return m;});
 places.forEach(([geometry,x,z],k)=>{const mesh=new T.Mesh(geometry,materials[k]);mesh.name='Neon_tube_'+k;mesh.position.set(x,0,z);mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);});
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
