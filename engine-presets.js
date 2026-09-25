// Пресеты звука по семействам машин. Длины труб в метрах; уровень мотора 0–10, микс голоса и tier
// (full/lite — глушитель из четырёх или двух труб) тянут параметры модели engine-model.js.
// Числа стартовые, подбираются на слух на стенде sound-lab.html.
import {SILENT} from './engine-voice.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const FAMILIES={
 // Ока, СМЗ: две вспышки на оборот, короткие трубы, клапан утекает сильнее — иначе на телефоне один гул.
 twin:   {cylinders:2,spread:.01, intake:.09,runner:.32,extractor:.2, pipe:.9, muffler:[.05,.065,.08,.095],outlet:.12,ignitionTime:.06, pistonGain:.9, exhaustClosedRefl:.35,intakeGain:.55},
 // Копейка, пятёрка, Москвич: ровная четвёрка, длинный глушитель.
 classic:{cylinders:4,spread:.006,intake:.12,runner:.42,extractor:.5, pipe:2.2,muffler:[.06,.08,.1,.12],  outlet:.15,ignitionTime:.05, pistonGain:1,  exhaustClosedRefl:.55,intakeGain:.45},
 // Самара, девятка, 99, десятка: звонче, короче патрубки.
 front:  {cylinders:4,spread:.005,intake:.1, runner:.36,extractor:.42,pipe:1.9,muffler:[.05,.07,.09,.11], outlet:.13,ignitionTime:.045,pistonGain:1,  exhaustClosedRefl:.5, intakeGain:.5},
 // Волга, Нива, УАЗ, Буханка: низкий гул, длинная труба, вялая вспышка.
 heavy:  {cylinders:4,spread:.008,intake:.14,runner:.5, extractor:.6, pipe:2.8,muffler:[.08,.1,.13,.16],  outlet:.18,ignitionTime:.065,pistonGain:1.2,exhaustClosedRefl:.6, intakeGain:.35},
};
export const CAR_FAMILY={kopeyka:'classic',samara:'front',volga:'heavy',twelve:'front',niva:'heavy'};
export const familyFor=carId=>FAMILIES[CAR_FAMILY[carId]]||FAMILIES.front;
export function engineParams(carId,level=0,mix=SILENT,{pitch=1,tier='full'}={}){
 const f=familyFor(carId),k=clamp(level,0,10)/10,straight=(mix.pipe||0)>.5,scale=m=>m*pitch*1.2;
 let muffler=f.muffler.map(scale);
 if(straight)muffler=[muffler[0]*.8];                                   // прямоток: одна короткая труба
 else if(tier==='lite'&&muffler.length>2)muffler=[muffler[0],muffler[muffler.length-1]];
 return {cylinders:f.cylinders,spread:f.spread,intake:scale(f.intake),runner:scale(f.runner),extractor:scale(f.extractor),pipe:scale(f.pipe),muffler,outlet:scale(f.outlet),
  mufflerDamping:straight?.08-.06*mix.pipe:.14,pipeRefl:straight?.06+.1*mix.pipe:.06,outletRefl:.02,
  intakeOpenRefl:.006,intakeClosedRefl:.95,exhaustOpenRefl:-.001,exhaustClosedRefl:Math.min(.9,f.exhaustClosedRefl+.07-.1*k),
  ignitionTime:f.ignitionTime,ignitionGain:(.7+.7*k)*(1+(mix.depth||0)*.1),pistonGain:f.pistonGain,idleFloor:.2,
  blowGain:.2*(1+.5*k)*(straight?1.2:1),pulseGain:.08*(1+3*k)*(straight?.9+.8*mix.pipe:1),blowTime:.065,blowRise:.012+.012*k,jitter:.002*(1+k),cycleVar:.015+.015*k,intakeNoise:.08*(1+k)*(1+(mix.spool||0)*.6),
  exhaustGain:(straight?.9+.7*mix.pipe:1)*.3*(1+.9*k),intakeGain:f.intakeGain*.15,blockGain:.08,outputGain:1,
  crackleBase:(k>.5?(k-.5)*.6:0)+(mix.idle||0)*.06,                                        // треск без прошивки с шестого уровня, .35 на десятом
  popGain:(straight?1.2+.4*mix.pipe:1)*.9*(1+.5*k),crackGain:(straight?1.1+.3*mix.pipe:1)*.1,boomGain:.5*(1+.5*k)*(straight?1.2:1),boomHz:straight?125:145,boomDecay:14,boomDrive:2+k,clickGain:.5+.3*k,
  popDecay:22,crackDecay:140,gateDecay:9.5,flutterDecay:4,hissDecay:4,
  drive:.3+.6*k+(mix.depth||0)*.15,body:2+3*k,bass:.5+.7*k+(mix.depth||0)*.2};
}
