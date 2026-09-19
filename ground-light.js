// Световой ковёр под машиной: земля под ней и вокруг красится одним квадом, а не источниками света.
//
// Почему не источники (решение Андрея, 17 сентября). Точечный свет неона не знает, что над ним стоит машина:
// тени от него нет, поэтому днище светилось насквозь, а на асфальте оставались две круглые кляксы — «свет отдельно,
// машина отдельно». На мокром те же две точки читались как два фонарика. Плюс каждое появление машины с неоном
// меняло число источников в сцене и перекомпилировало все материалы: стоп на 1,5–2 с даже на Маке.
//
// Ковёр — плоскость в плоскости дороги, повторяющая габарит днища. Неон считается как свет четырёх трубок по
// периметру (расстояние до отрезка), поэтому под порогами он яркий, под машиной — общий разлив от всех четырёх,
// а наружу уходит экспонентой на метр. Колёса свет перекрывают: трубка идёт по порогу ровно в плоскости колеса,
// и на асфальте под каждым колесом провал, а не сплошная светящаяся полоса — так это и выглядит на фотографиях
// настоящей подсветки. Стопари — красный след строго позади бампера, под машину он не лезет.
// Контактная тень — мягкое затемнение по силуэту днища и пятно под каждым колесом: без него машина висит в воздухе.
//
// Смешивание одно на все три слоя: premultiplied alpha (src=One, dst=OneMinusSrcAlpha). Цвет складывается
// (неон и стопари светят), альфа перемножает фон (тень темнит). Один квад, один вызов отрисовки, ноль источников.
// Материал рисуется в линейный HDR-буфер до тонмаппинга, поэтому цвета здесь линейные и без кодирования.
import * as T from 'three';

export const GROUND={
 y:.036,          // выше всей мелочи на дороге: разметка, заплатки, люки и клетчатый створ финиша
                  // (верх клеток .027). Ниже — и они прорезали в засветке дыры, свет ведь ложится на них, а не под них
 reach:1.0,       // докуда добивает неон за габарит машины, м: экспоненте нужен запас, иначе край квада видно
 trail:1.8,       // длина следа стопарей за бампером, м
 neon:1.35,       // яркость неона у самого порога (линейная, поверх ночной дороги ~0.02)
 fill:.62,        // разлив под днищем: свет трубок переотражается там, где до самой трубки далеко
 tail:.62,        // яркость следа стопарей
 border:.40,      // на этой полосе у края квада всё гаснет в ноль: иначе виден его прямоугольник
 shadow:.55,      // сила контактной тени
 lift:.14,        // с какой высоты машина отрывается от своего света
 drop:.60,        // и на какой он гаснет совсем
};

const VERT=`varying vec2 vGround;varying vec3 vWorld;
void main(){vGround=position.xz;vec4 w=modelMatrix*vec4(position,1.);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;

// hb — половина габарита трубок неона, shadowHalf — половина силуэта днища (тень шире неона: она от кузова).
const FRAG=`precision mediump float;
varying vec2 vGround;varying vec3 vWorld;
uniform vec2 hb;uniform vec2 shadowHalf;uniform float axle;uniform float halfSide;uniform float halfEnd;
uniform vec3 neonColor;uniform vec4 neonLevel;uniform float neonOn;
uniform float tailOn;uniform float lampZ;
uniform float shadowOn;uniform float lift;uniform vec2 edgeLo;uniform vec2 edgeHi;uniform float border;
uniform vec2 wheelX;uniform float wheelZ;uniform vec2 wheelR;
float segDist(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float boxDist(vec2 p,vec2 b){vec2 d=abs(p)-b;return length(max(d,vec2(0.)))+min(max(d.x,d.y),0.);}
void main(){
 vec2 p=vGround;
 // Колёса как преграда. Расстояние до ближайшего из четырёх колёс считается покоординатно: по длине это
 // ближняя ось, по ширине — ближний борт. Трубка идёт по порогу на высоте 13 см, колесо вдвое выше и стоит
 // ровно в её плоскости — наружу оно закрывает почти весь сектор, и тень уходит клином на три четверти метра,
 // а внутрь ниши свет затекает и гаснет за ладонь. Без этого светящаяся полоса шла сквозь колесо насквозь.
 float wheelAlong=min(abs(p.x-wheelX.x),abs(p.x-wheelX.y));
 float wheelAcross=abs(p.y)-wheelZ;
 float wheelSpan=1.-smoothstep(wheelR.x*.85,wheelR.x*1.55,wheelAlong);
 float wheelOut=1.-smoothstep(0.,wheelR.y*2.2,max(wheelAcross,0.));
 float wheelIn=1.-smoothstep(0.,wheelR.y*.62,max(-wheelAcross,0.));
 float wheel=wheelSpan*max(wheelOut*.95,wheelIn*.75);
 // Пятно контакта — только под самой резиной, тень от колеса на земле короче, чем его световой клин.
 float tyre=1.-smoothstep(wheelR.x*.7,wheelR.x*1.5,length(vec2(wheelAlong,wheelAcross)));
 // Четыре трубки: нос (−X), правый борт (+Z), корма (+X), левый борт (−Z) — порядок как у pulseLevel.
 float glow=0.;
 glow+=neonLevel.x*exp(-segDist(p,vec2(-hb.x,-halfEnd),vec2(-hb.x,halfEnd))*5.2);
 glow+=neonLevel.y*exp(-segDist(p,vec2(axle-halfSide,hb.y),vec2(axle+halfSide,hb.y))*5.2);
 glow+=neonLevel.z*exp(-segDist(p,vec2(hb.x,-halfEnd),vec2(hb.x,halfEnd))*5.2);
 glow+=neonLevel.w*exp(-segDist(p,vec2(axle-halfSide,-hb.y),vec2(axle+halfSide,-hb.y))*5.2);
 // Разлив под днищем: свет трубок переотражается в замкнутой нише, поэтому под машиной светло везде, а не
 // только у самих трубок. Без него оставались тёмные углы у носа и кормы, и контактная тень читалась там как
 // пятно поверх неоновой засветки. Считаем от силуэта кузова, а не от прямоугольника трубок: на фотографиях
 // лужа света повторяет обвод машины и выходит из-под бампера, а трубки утоплены на 30 см от носа и кормы.
 float body=boxDist(p,shadowHalf);
 float average=dot(neonLevel,vec4(.25));
 glow=max(glow,average*${GROUND.fill}*exp(-max(body,0.)*4.2));
 // Подтягиваем полутон: иначе яркости хватает только у самой трубки, а метром дальше земля уже чёрная.
 // Без выравнивания степенью: у настоящей подсветки горячий край у порога и быстрый спад, а подтянутый
 // полутон превращал свет в ровную заливку метровой ширины (Андрей: «обрати внимание на градиентность»).
 glow=clamp(glow,0.,1.)*neonOn*(1.-wheel*.90);
 // След стопарей: только позади бампера, две доли от фонарей, расходятся и гаснут к концу следа.
 float behind=max(0.,p.x-hb.x);
 float gate=smoothstep(hb.x-.02,hb.x+.12,p.x);
 float spread=.20+behind*.14;
 float lamp=min(abs(p.y-lampZ),abs(p.y+lampZ));
 float tail=tailOn*gate*exp(-behind*1.85)*exp(-lamp*lamp/(2.*spread*spread))*(1.-wheel*.5);
 // Взгляд вдоль дороги. Плоский квад с косой камеры занимает пол-экрана, и добавочный свет собирается в
 // сплошную заливку — на пролёте камеры после финиша (её съёмки идут с высоты 1.2–2.5 м) это была стена
 // красного. Чем ближе взгляд к плоскости, тем меньше отдаём: у следа стопарей запас меньше, он шире.
 float graze=smoothstep(.05,.40,abs(normalize(cameraPosition-vWorld).y));
 glow*=mix(.55,1.,graze);tail*=mix(.10,1.,graze);
 vec3 add=neonColor*glow+vec3(1.,.09,.04)*tail;
 // Контактная тень по силуэту днища. Освещённая земля не бывает затенённой: там, где лёг свой свет, тень уходит.
 float lit=clamp(max(glow,tail)*1.8,0.,1.);
 float ao=max(1.-smoothstep(-.03,.27,boxDist(p,shadowHalf)),tyre)*shadowOn*mix(.45,1.,graze);
 float occl=ao*(1.-lit);
 // Гасим всё у края квада: экспоненте до нуля не хватает полуметра, и без этого на дороге виден его прямоугольник.
 vec2 lo=smoothstep(edgeLo,edgeLo+vec2(border),p),hi=vec2(1.)-smoothstep(edgeHi-vec2(border),edgeHi,p);
 float fade=min(min(lo.x,lo.y),min(hi.x,hi.y))*lift;
 gl_FragColor=vec4(add*fade,occl*fade);
}`;

// Машина даёт свой свет, только пока стоит на земле: в прыжке ковёр гаснет, а не летит вместе с ней.
// Считаем по модулю: провалиться сквозь настил эстакады — тоже оторваться от дороги.
const liftFade=height=>1-T.MathUtils.smoothstep(Math.abs(height),GROUND.lift,GROUND.drop);
const AXIS_X=new T.Vector3(1,0,0),scratchQ=new T.Quaternion(),yawQ=new T.Quaternion(),flat=new T.Vector3(),
      scratchP=new T.Vector3(),drop=new T.Vector3();

// Положение и размер колёс в системе машины. Берём настоящие меши (root.userData.wheels, их собирает
// modelInstance), потому что катки и резина меняются вместе с тюнингом; если мешей нет — остаются числа парка.
function measureWheels(root,uniforms){
 const wheels=root.userData?.wheels;if(!Array.isArray(wheels)||!wheels.length)return false;
 root.updateWorldMatrix(true,true);
 const toLocal=root.matrixWorld.clone().invert(),box=new T.Box3(),size=new T.Vector3(),centre=new T.Vector3();
 let front=-Infinity,rear=Infinity,across=0,radius=0,half=0,seen=0;
 for(const wheel of wheels){
  box.setFromObject(wheel);if(box.isEmpty())continue;
  box.applyMatrix4(toLocal);box.getSize(size);box.getCenter(centre);
  front=Math.max(front,centre.x);rear=Math.min(rear,centre.x);
  across+=Math.abs(centre.z);radius+=size.x/2;half+=size.z/2;seen++;
 }
 if(!seen||!Number.isFinite(front)||!Number.isFinite(rear))return false;
 uniforms.wheelX.value.set(front,rear);
 uniforms.wheelZ.value=across/seen;
 uniforms.wheelR.value.set(Math.max(.12,radius/seen*.95),Math.max(.16,half/seen)+.18);
 return true;
}

export function attachGroundLight(root,car,{reduced=false,shadow=true,ambient=1}={}){
 if(!root||!car)return null;
 const len=car.length||4.1,width=car.width||1.7,wheelbase=car.wheelbase||2.46,axle=car.axleOffset||0;
 const hb=new T.Vector2(len/2-.30,width/2-.03);
 const uniforms={
  hb:{value:hb},
  shadowHalf:{value:new T.Vector2(len/2-.12,width/2-.02)},
  axle:{value:axle},halfSide:{value:wheelbase*.37},halfEnd:{value:width*.31},
  neonColor:{value:new T.Color(0,0,0)},neonLevel:{value:new T.Vector4()},neonOn:{value:0},
  tailOn:{value:0},lampZ:{value:width*.36},
  wheelX:{value:new T.Vector2(axle+wheelbase/2,axle-wheelbase/2)},wheelZ:{value:width*.5-.04},wheelR:{value:new T.Vector2((car.radius||.3)*.95,.30)},
  shadowOn:{value:shadow?GROUND.shadow:0},lift:{value:1},
  edgeLo:{value:new T.Vector2()},edgeHi:{value:new T.Vector2()},border:{value:GROUND.border},
 };
 const material=new T.ShaderMaterial({
  uniforms,vertexShader:VERT,fragmentShader:FRAG,
  transparent:true,depthWrite:false,depthTest:true,
  blending:T.CustomBlending,blendEquation:T.AddEquation,
  blendSrc:T.OneFactor,blendDst:T.OneMinusSrcAlphaFactor,
  blendSrcAlpha:T.OneFactor,blendDstAlpha:T.OneMinusSrcAlphaFactor,
 });
 const spanX=len/2+GROUND.reach,geometry=new T.PlaneGeometry(spanX+hb.x+GROUND.trail,width+GROUND.reach*2);
 geometry.rotateX(-Math.PI/2);geometry.translate((hb.x+GROUND.trail-spanX)/2,0,0);
 geometry.computeBoundingBox();const {min,max}=geometry.boundingBox;
 uniforms.edgeLo.value.set(min.x,min.z);uniforms.edgeHi.value.set(max.x,max.z);
 // Колёса меряем по самой модели, когда она уже собрана: у обвеса и катков размеры свои, а числа парка — общие.
 measureWheels(root,uniforms);
 const mesh=new T.Mesh(geometry,material);
 mesh.name='GroundLight';mesh.position.y=GROUND.y;mesh.renderOrder=3;
 mesh.castShadow=mesh.receiveShadow=false;mesh.userData.groundLight=true;
 root.add(mesh);
 let dim=ambient,neonScale=0;
 const controller={
  mesh,material,uniforms,
  // Неон зовёт это из своего apply(): цвет один раз, уровни трубок — на каждую смену яркости.
  setNeon(color,levels){
   if(color){uniforms.neonColor.value.copy(color).multiplyScalar(GROUND.neon);neonScale=1;}
   if(levels)uniforms.neonLevel.value.set(levels[0],levels[1],levels[2],levels[3]);
   uniforms.neonOn.value=neonScale*dim;
  },
  clearNeon(){neonScale=0;uniforms.neonOn.value=0;},
  // 0 — фонари не горят, 1 — торможение в ночи.
  setTail(level){uniforms.tailOn.value=Math.max(0,level)*GROUND.tail*dim;},
  // Насколько сцена вообще даёт увидеть свой свет: ночь 1, мокрый день .55, ясный день .3.
  setAmbient(k){dim=k;uniforms.neonOn.value=neonScale*dim;},
  // Высота машины над дорогой — со знаком: на кочке она уходит и в минус, и если это обрезать, ковёр
  // проваливался под полотно и его край скрывался в дороге. Заодно снимаем с ковра крен и тангаж машины:
  // на тряске четырёхметровый квад заваливался концом под асфальт.
  setHeight(height){
   uniforms.lift.value=liftFade(Number.isFinite(height)?height:0);
   root.updateWorldMatrix(true,false);root.matrixWorld.decompose(scratchP,scratchQ,drop);
   flat.copy(AXIS_X).applyQuaternion(scratchQ);flat.y=0;
   if(flat.lengthSq()>1e-8){flat.normalize();yawQ.setFromUnitVectors(AXIS_X,flat);mesh.quaternion.copy(scratchQ).invert().multiply(yawQ);}
   // Смещение задаём в мировых метрах и переводим в систему машины: иначе при крене локальный сдвиг по Y
   // разворачивается вбок, и угол ковра уходит под полотно на миллиметры — а на кочке и на сантиметры.
   drop.set(0,GROUND.y-scratchP.y,0).applyQuaternion(scratchQ.invert());
   mesh.position.copy(drop);
  },
  get visible(){return uniforms.lift.value>0;},
  dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();if(root.userData.groundLight===controller)root.userData.groundLight=null;},
 };
 if(reduced)controller.setAmbient(ambient*.85);
 root.userData.groundLight=controller;
 return controller;
}
