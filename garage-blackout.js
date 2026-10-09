// Выключатель света в гараже. Гасит бокс и оставляет только то, что светит на самой машине: фары, габариты,
// поворотники и неон под днищем. Нужен, чтобы посмотреть, как всё это работает, — в освещённом боксе своего
// света машины почти не видно (Андрей, 17 сентября).
//
// Свет гаснет не разом, а по светильникам, с задержкой в долю секунды: сначала одна трубка, потом следующая,
// потом переноска. Общий свет бокса и снимок окружения идут следом за долей ещё горящих светильников, поэтому
// с каждой погасшей трубкой комната темнеет ступенькой. Свет не гасится в ноль: остаётся 2.5% общего, иначе
// кузов сливается с чернотой и смотреть не на что. Телевизор в углу продолжает светиться — гаснет только то,
// что ярче порога свечения ламп.
//
// Включение обратное: трубки дневного света разгораются с перемигиванием (рисунок срывов у каждой свой),
// лампа накаливания в переноске просто наливается за десятую секунды.
//
// Фары — два прожектора, по одному на фару (Андрей, 22 сентября: «два пучка света нужны»). Каждый встаёт в центр
// своего стекла (car-lamps.js: стекло фар часто один меш на обе стороны, делим по знаку z). Оба создаются сразу
// вместе с гаражом и только меняют накал, поэтому число источников при щелчке выключателя не меняется и
// шейдеры не перекомпилируются.
import * as T from 'three';
import {headCentres} from './car-lamps.js';

export const BLACKOUT={
 room:.025,        // сколько остаётся от общего света бокса
 environment:.10,  // и от снимка окружения: иначе лак отражает освещённую мастерскую
 lamp:.04,         // накал светящихся ламп
 glow:.8,          // ярче этого меш считается лампой и гаснет; телевизор и экранчики тусклее и остаются
 head:3.2,         // накал стёкол фар: выше порога свечения композита, но без широкого ореола
 tail:.5,          // габариты
 beam:{color:0xfff0d2,intensity:34,distance:18,angle:.38,penumbra:.45,decay:1.3},
 neonAmbient:1,    // в темноте неон на полу читается как ночью, добавлять ему нечего
 step:.11,         // задержка между соседними светильниками
 bulb:.10,         // постоянная времени лампы накаливания
 ignite:.42,       // сколько разгорается трубка дневного света
 carDelay:.16,     // пауза между последним погасшим светильником и своим светом машины
 carFade:.12,      // фары наливаются примерно как лампа накаливания, они и есть лампы накаливания
};

// Разгорающаяся трубка дневного света: пара срывов, потом ровный свет. Пары «сколько держится, какой накал».
// Рисунок у каждой трубки сдвинут на свой шаг, иначе они моргают в унисон и это читается как сбой кадра.
const STRIKE=[[.03,.85],[.05,0],[.04,1],[.06,0],[.05,.5],[.04,0],[.07,1],[.04,.25]];
function strike(t,seed){
 let time=0;
 for(let i=0;i<STRIKE.length;i++){
  const [span,level]=STRIKE[(i+seed)%STRIKE.length];
  if(t<time+span)return level;
  time+=span;
 }
 return 1;
}
const FORWARD=new T.Vector3(-1,0,0);// нос машины смотрит в −X её системы, как у трубок неона

export function createGarageBlackout(scene,{ambient=1,lamps:room=null,reduced=false}={}){
 const cfg=BLACKOUT.beam;
 const beam=new T.SpotLight(cfg.color,0,cfg.distance,cfg.angle,cfg.penumbra,cfg.decay);
 beam.name='Headlight';beam.castShadow=false;beam.position.set(0,.6,3);
 scene.add(beam,beam.target);
 const beam2=new T.SpotLight(cfg.color,0,cfg.distance,cfg.angle,cfg.penumbra,cfg.decay);
 beam2.name='Headlight';beam2.castShadow=false;beam2.position.set(0,.6,3);scene.add(beam2,beam2.target);
 // Светильники, которые гаснут по очереди: трубки и переноска. Порядок — от дальнего угла к ближнему.
 const fixtures=(room?.fixtures||[]).map((f,i)=>({
  kind:f.kind,light:f.light,materials:f.materials,
  baseLight:f.light?.intensity??0,baseGlow:f.materials.map(m=>m.emissiveIntensity),
  order:(f.at?.[0]??0)+(f.at?.[2]??0),seed:i,level:1,from:1,
 })).sort((a,b)=>a.order-b.order);
 const own=new Set(fixtures.flatMap(f=>[f.light,...f.materials]));
 // Всё остальное — общий свет бокса: полусфера, ключ, заполнение, контровой, свет из проёма и лампы декора.
 // Он не гаснет сам по себе, а следует за долей ещё горящих светильников.
 const fill=[],glows=[];
 scene.traverse(o=>{
  if(o===beam)return;
  if(o.isLight&&o.intensity>0&&!own.has(o))fill.push({light:o,base:o.intensity});
  const materials=o.isMesh?(Array.isArray(o.material)?o.material:[o.material]):[];
  for(const m of materials)if(m&&!own.has(m)&&m.emissiveIntensity>=BLACKOUT.glow&&!glows.some(g=>g.material===m))glows.push({material:m,base:m.emissiveIntensity});
 });
 const environment=scene.environmentIntensity;
 let dark=false,car=null,carLamps=[],elapsed=0,running=false,carLevel=0,carFrom=0,carAt=0;

 // Фары и габариты самой машины: меши ищем по имени материала, как это делает заезд.
 function bindCar(next){
  car=next||null;carLamps=[];
  if(!car)return;
  const box=new T.Box3(),centre=new T.Vector3();
  car.traverse(o=>{
   if(!o.isMesh)return;const name=o.material?.name||'';
   if(/headlight/i.test(name))carLamps.push({material:o.material,colour:0xffdfaa,level:BLACKOUT.head,mesh:o});
   else if(/^Red lens(?:\.\d+)?$/.test(name))carLamps.push({material:o.material,colour:0xff2010,level:BLACKOUT.tail,mesh:o});
  });
  // Прожектор ставим ровно на фары и отводим чуть вперёд, чтобы он не светил изнутри бампера.
  const heads=carLamps.filter(l=>l.level===BLACKOUT.head).map(l=>l.mesh);
  if(heads.length){
   box.makeEmpty();for(const mesh of heads)box.expandByObject(mesh);box.getCenter(centre);
   const forward=FORWARD.clone().applyQuaternion(car.getWorldQuaternion(new T.Quaternion()));forward.y=0;
   if(forward.lengthSq()<1e-8)forward.set(0,0,1);else forward.normalize();
   beam.position.copy(centre).addScaledVector(forward,.18);
   beam.target.position.copy(centre).addScaledVector(forward,6).setY(.02);
   beam.target.updateMatrixWorld();
   const sides=headCentres(T,car,heads);
   [beam,beam2].forEach((b,i)=>{const at=sides?.[i]??centre;b.position.copy(at).addScaledVector(forward,.18);b.target.position.copy(at).addScaledVector(forward,6).setY(.02);b.target.updateMatrixWorld();});
  }
  paint();
 }

 // Раскладываем посчитанные уровни по сцене. Общий свет и снимок окружения — по доле горящих светильников.
 function paint(){
  let lit=0;
  for(const f of fixtures){
   lit+=f.level;
   if(f.light)f.light.intensity=f.baseLight*Math.max(f.level,BLACKOUT.lamp);
   f.materials.forEach((m,i)=>{m.emissiveIntensity=f.baseGlow[i]*Math.max(f.level,BLACKOUT.lamp);});
  }
  const share=fixtures.length?lit/fixtures.length:(dark?0:1);
  const level=BLACKOUT.room+(1-BLACKOUT.room)*share;
  for(const {light,base} of fill)light.intensity=base*level;
  for(const {material,base} of glows)material.emissiveIntensity=base*(BLACKOUT.lamp+(1-BLACKOUT.lamp)*share);
  scene.environmentIntensity=environment*(BLACKOUT.environment+(1-BLACKOUT.environment)*share);
  beam.intensity=beam2.intensity=carLamps.length?cfg.intensity*carLevel:0;
  for(const {material,colour,level:full} of carLamps){
   material.emissive.set(carLevel>0?colour:0x000000);material.emissiveIntensity=full*carLevel;
  }
  car?.userData.groundLight?.setAmbient(ambient+(BLACKOUT.neonAmbient-ambient)*carLevel);
 }

 // Позиции на общей шкале: гаснут по очереди, свет машины — после последнего; при включении наоборот.
 const slot=i=>i*BLACKOUT.step;
 const lastSlot=()=>fixtures.length?slot(fixtures.length-1):0;
 function settle(){
  for(const f of fixtures)f.level=dark?0:1;
  carLevel=dark?1:0;running=false;paint();
 }
 function step(dt){
  if(!running)return false;
  elapsed+=dt;let done=true;
  fixtures.forEach((f,i)=>{
   const at=dark?slot(i):slot(fixtures.length-1-i),t=elapsed-at;
   let target;
   if(t<=0)target=dark?1:0;
   else if(dark)target=f.kind==='bulb'?Math.exp(-t/BLACKOUT.bulb):0;
   else target=f.kind==='tube'?strike(t,f.seed):1-Math.exp(-t/BLACKOUT.bulb);
   // Идём строго в одну сторону от того, где застали: повторный щелчок посреди перехода не дёргает свет.
   f.level=dark?Math.min(f.from,target):Math.max(f.from,target);
   if(dark?f.level>.002:f.level<.998)done=false;
  });
  const t=elapsed-carAt,ramp=t<=0?0:1-Math.exp(-t/BLACKOUT.carFade);
  const want=dark?ramp:1-ramp;
  carLevel=dark?Math.max(carFrom,want):Math.min(carFrom,want);
  if(dark?carLevel<.998:carLevel>.002)done=false;
  // Экспонента до единицы не доходит, поэтому в конце доводим уровни ровно до края: иначе фары всегда
  // остаются чуть тусклее положенного, а общий свет — чуть ярче.
  if(done)settle();else paint();
  return true;
 }

 return {
  beam,beams:[beam,beam2],fixtures,
  get dark(){return dark;},
  get busy(){return running;},
  set(next){
   const want=!!next;if(want===dark)return false;
   dark=want;
   for(const f of fixtures)f.from=f.level;
   carFrom=carLevel;
   carAt=dark?lastSlot()+BLACKOUT.carDelay:0;
   elapsed=0;running=true;
   if(reduced)settle();else paint();
   return true;
  },
  // Возвращает true, пока картинка меняется: кадр гаража рисуется только по изменению.
  update(dt){return step(dt);},
  setCar:bindCar,
  dispose(){dark=false;settle();beam.removeFromParent();beam.target.removeFromParent();beam2.removeFromParent();beam2.target.removeFromParent();fixtures.length=fill.length=glows.length=carLamps.length=0;car=null;},
 };
}
