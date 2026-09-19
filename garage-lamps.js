// Свет гаража, которого нет в GLB: длинные люминесцентные трубки, переноска на полу и
// поворотники машины. Трубки — светящиеся меши плюс один точечный источник на трубку, чтобы
// длинные блики легли на лак и в отражение в полу. Поворотники работают как аварийка: четыре
// угла вспыхивают вместе, янтарные линзы разгораются и подсвечивают пол и стены рядом.
import * as T from 'three';

export const BLINK={period:.92,duty:.48,lensOn:4.2,lensOff:.22,light:4.5,reach:2.6};

// Раскладка по уровням гаража в мировых метрах. Машина стоит в (0,0,.4) вдоль X, задняя стена
// на z≈−3.8, потолок на y≈3.3. Трубки на полу — «нижний свет» первого бокса: лежат под задней
// стеной и бьют по кирпичу и по корме снизу. С третьего уровня появляется нормальный потолочный свет.
const LAYOUT={
 1:{floor:[[-2.35,-3.45,1.2],[1.15,-3.45,1.2]],ceiling:[],worklamp:[2.45,2.35]},
 2:{floor:[[-2.35,-3.45,1.2]],ceiling:[[.3,.4,2.4]],worklamp:[2.45,2.35]},
 3:{floor:[[-2.6,-3.45,1.2]],ceiling:[[0,-.55,2.4],[0,1.35,2.4]],worklamp:null},
 4:{floor:[],ceiling:[[0,-.55,2.4],[0,1.35,2.4]],worklamp:null},
 5:{floor:[],ceiling:[[0,-.55,3.6],[0,1.35,3.6]],worklamp:null},
};
export const lampLayout=level=>LAYOUT[Math.max(1,Math.min(5,level|0))];

export function addGarageLamps(scene,level=1){
 const layout=lampLayout(level),group=new T.Group();group.name='GarageLamps';
 const owned=[],lights=[],fixtures=[];
 const own=x=>(owned.push(x),x);
 // У каждой трубки свой материал: выключатель гасит и разжигает их по очереди, а общий материал гас бы разом.
 // Лишних вызовов отрисовки это не добавляет — меши всё равно отдельные.
 const coldTube=()=>own(new T.MeshStandardMaterial({color:0xdff3ff,emissive:0xd8f0ff,emissiveIntensity:3.6,roughness:.4}));
 const warm=own(new T.MeshStandardMaterial({color:0xffe2b8,emissive:0xffd39a,emissiveIntensity:3.2,roughness:.4}));
 const dark=own(new T.MeshStandardMaterial({color:0x2a2c2e,metalness:.55,roughness:.55}));
 const cage=own(new T.MeshStandardMaterial({color:0x8a8d90,metalness:.8,roughness:.4}));
 const tubeGeo=own(new T.CylinderGeometry(.021,.021,1,10)),capGeo=own(new T.CylinderGeometry(.026,.026,.05,8)),channelGeo=own(new T.BoxGeometry(1,.05,.09));
 const tube=(x,y,z,len,material)=>{
  const m=new T.Mesh(tubeGeo,material);m.rotation.z=Math.PI/2;m.scale.y=len;m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=false;group.add(m);
  for(const s of [-1,1]){const cap=new T.Mesh(capGeo,dark);cap.rotation.z=Math.PI/2;cap.position.set(x+s*len/2,y,z);group.add(cap);}
  return m;
 };
 // Трубки под задней стеной: лежат на полу, свет идёт снизу вверх по кирпичу.
 for(const [x,z,len] of layout.floor){
  const material=coldTube();tube(x,.028,z,len,material);
  const light=new T.PointLight(0xcfe6ff,13,6,1.8);light.position.set(x,.3,z+.25);lights.push(light);group.add(light);
  fixtures.push({kind:'tube',light,materials:[material],at:[x,.028,z]});
 }
 // Потолочные трубки в узком канале: длинный блик через всю крышу.
 for(const [x,z,len] of layout.ceiling){
  const channel=new T.Mesh(channelGeo,dark);channel.scale.x=len+.12;channel.position.set(x,3.16,z);group.add(channel);
  const material=coldTube();tube(x,3.11,z,len,material);
  const light=new T.PointLight(0xdcefff,20,7.5,1.7);light.position.set(x,2.98,z);lights.push(light);group.add(light);
  fixtures.push({kind:'tube',light,materials:[material],at:[x,3.11,z]});
 }
 // Студийный свет для лака: две полосы над машиной, видимые только снимку окружения (probe). Камере они не нужны —
 // щит над крышей загородил бы саму машину, — а лаку нужны: ровная засветка комнаты даёт плоское пятно цвета, и
 // форма кузова пропадает. Длинный блик вдоль борта, наоборот, идёт по изгибу и показывает её (Андрей, 17 сентября).
 // Схема каталожная: длинная яркая полоса над дальним бортом и вторая, слабее и короче, над ближним.
 const studio=new T.Group();studio.name='Studio';studio.visible=false;group.add(studio);
 {const strip=(x,z,len,across,level,tilt)=>{
   const material=own(new T.MeshStandardMaterial({color:0xfff6ea,emissive:0xfff3e6,emissiveIntensity:level,roughness:.6}));
   const mesh=new T.Mesh(own(new T.BoxGeometry(len,.05,across)),material);
   mesh.position.set(x,3.24,z);mesh.rotation.x=tilt;mesh.castShadow=mesh.receiveShadow=false;studio.add(mesh);
  };
  // Накал высокий: снимок окружения идёт с интенсивностью .39, и рядом с освещённой комнатой полоса при 4-5
  // растворяется. При 26 она читается на лаке длинной лентой по борту и крыше, а на экране её всё равно нет.
  strip(.1,-1.30,5.6,.22,26,.30);  // ключевая полоса над дальним бортом, с наклоном внутрь
  strip(.1,1.45,4.2,.18,9,-.30);   // подсветка ближнего борта: слабее и короче, иначе блик двоится
 }
 // Переноска на полу у машины: тёплый низкий свет сбоку, как когда батя лезет под крыло.
 if(layout.worklamp){
  const [x,z]=layout.worklamp,lamp=new T.Group();lamp.position.set(x,.1,z);lamp.rotation.set(0,-.8,.45);
  const bulb=new T.Mesh(own(new T.CapsuleGeometry(.032,.11,4,8)),warm);bulb.rotation.z=Math.PI/2;lamp.add(bulb);
  const grid=new T.Mesh(own(new T.CylinderGeometry(.052,.052,.2,10,1,true)),own(new T.MeshStandardMaterial({color:0x9a9da0,metalness:.8,roughness:.35,wireframe:true})));grid.rotation.z=Math.PI/2;lamp.add(grid);
  const handle=new T.Mesh(own(new T.CylinderGeometry(.024,.028,.16,8)),cage);handle.rotation.z=Math.PI/2;handle.position.x=-.17;lamp.add(handle);
  group.add(lamp);
  const light=new T.PointLight(0xffbe76,8,5,1.9);light.position.set(x-.2,.32,z-.2);lights.push(light);group.add(light);
  // Переноска — лампа накаливания: она не моргает при розжиге, а плавно разгорается и так же гаснет.
  fixtures.push({kind:'bulb',light,materials:[warm],at:[x,.1,z]});
 }
 scene.add(group);
 return {group,lights,studio,fixtures,dispose(){scene.remove(group);for(const x of owned)x.dispose();}};
}

// Поворотники: все меши с материалом «Amber lens» одной машины. Углы берём из габаритов линз в
// пространстве корня машины, поэтому у любой модели лампы встают на свои фонари.
// lights:false — только линзы, без точечных ламп: на мокром асфальте их блики ложатся в случайные места позади машины.
export function bindIndicators(root,{reduced=false,lights:withLights=true}={}){
 const meshes=[];root.traverse(o=>{if(o.isMesh&&/^Amber lens/.test(o.material?.name||''))meshes.push(o);});
 if(!meshes.length)return null;
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),box=new T.Box3(),v=new T.Vector3();
 for(const m of meshes){m.geometry.computeBoundingBox();const b=m.geometry.boundingBox,local=new T.Matrix4().multiplyMatrices(inverse,m.matrixWorld);
  for(let c=0;c<8;c++){v.set(c&1?b.max.x:b.min.x,c&2?b.max.y:b.min.y,c&4?b.max.z:b.min.z).applyMatrix4(local);box.expandByPoint(v);}}
 const materials=[...new Set(meshes.map(m=>m.material))];
 for(const m of materials){m.emissive.set(0xff8a14);m.emissiveIntensity=BLINK.lensOff;m.userData.indicator=true;}
 const y=(box.min.y+box.max.y)/2,lights=[];
 if(!reduced&&withLights)for(const sx of [-1,1])for(const sz of [-1,1]){
  const light=new T.PointLight(0xffa02c,0,BLINK.reach,2);
  light.position.set(sx>0?box.max.x-.1:box.min.x+.1,y,sz>0?box.max.z+.14:box.min.z-.14);
  light.name='Indicator';root.add(light);lights.push(light);
 }
 let time=0,level=0;
 return {
  materials,lights,
  // Возвращает true, когда яркость изменилась и кадр надо перерисовать. Лампа накаливания не щёлкает,
  // а разгорается за несколько десятков миллисекунд — поэтому уровень догоняет цель плавно.
  update(dt){
   if(reduced)return false;
   time+=dt;const target=(time%BLINK.period)<BLINK.period*BLINK.duty?1:0;
   const next=T.MathUtils.lerp(level,target,1-Math.exp(-Math.min(dt,.1)*26));
   if(Math.abs(next-level)<.004&&Math.abs(next-target)<.004)return false;
   level=next;
   for(const m of materials)m.emissiveIntensity=T.MathUtils.lerp(BLINK.lensOff,BLINK.lensOn,level);
   for(const l of lights)l.intensity=BLINK.light*level;
   return true;
  },
  dispose(){for(const l of lights)l.removeFromParent();},
 };
}
