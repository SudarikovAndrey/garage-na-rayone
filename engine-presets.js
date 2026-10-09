// Пресеты звука по семействам машин. Длины труб в метрах; эффективный уровень мотора, микс голоса и tier
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
export function engineParams(carId,level=0,mix=SILENT,{pitch=1,tier='full',gearbox=0}={}){
 const f=familyFor(carId),k=1-Math.exp(-Math.max(0,level)/7),g=1-Math.exp(-Math.max(0,gearbox)/7),pipe=clamp(mix.pipe||0,0,1),straight=pipe>0,scale=m=>m*pitch*1.2;
 let muffler=f.muffler.map(scale);
 if(straight)muffler=[muffler[0]*(1-.2*pipe)];                                   // прямоток: одна короткая труба
 else if(tier==='lite'&&muffler.length>2)muffler=[muffler[0],muffler[muffler.length-1]];
 return {cylinders:f.cylinders,spread:f.spread,intake:scale(f.intake),runner:scale(f.runner),extractor:scale(f.extractor),pipe:scale(f.pipe),muffler,outlet:scale(f.outlet),
  mufflerDamping:.14-.12*pipe,pipeRefl:.06+.07*pipe,outletRefl:.02,
  intakeOpenRefl:.006,intakeClosedRefl:.95,exhaustOpenRefl:-.001,exhaustClosedRefl:Math.min(.9,f.exhaustClosedRefl+.07-.1*k),
  ignitionTime:f.ignitionTime,ignitionGain:(.7+.7*k)*(1+(mix.depth||0)*.1),pistonGain:f.pistonGain,idleFloor:.2,
  blowGain:.2*(1+.5*k)*(straight?1.2:1),pulseGain:.08*(1+3*k)*(straight?.9+.8*mix.pipe:1),blowTime:.065,blowRise:.012+.012*k,jitter:.002*(1+k),cycleVar:.015+.015*k,intakeNoise:.08*(1+k)*(1+(mix.spool||0)*.6),
  exhaustGain:(straight?.9+.7*mix.pipe:1)*.3*(1+.9*k),intakeGain:f.intakeGain*.15,blockGain:.08,outputGain:1,
  crackleBase:level>5?Math.min(.3,(level-5)*.06):0,                                        // треск без прошивки с шестого уровня, .30 на десятом
  popGain:.28+.12*k+.14*pipe,crackGain:.045+.035*pipe,boomGain:.22+.09*k+.1*pipe,boomHz:straight?105:135,boomDecay:25,boomDrive:1.3,clickGain:.1+.08*pipe,
  popDecay:34,crackDecay:110,gateDecay:11,flutterDecay:7,hissDecay:4,
  // Combustion pulse body carries the fundamental; pipes add a quiet mechanical texture.
  combustionGain:.85+.14*k+.16*pipe,pulseWidth:(carId==='volga'?.32:carId==='kopeyka'?.26:carId==='niva'?.29:carId==='twelve'?.19:.23)-.07*k-.025*pipe,
  exhaustHz:(carId==='volga'?850:carId==='kopeyka'?1000:carId==='twelve'?1550:1250)+k*750+pipe*500,
  textureGain:.16+.07*k,engineTune:k,
  gearboxTune:g,gearWhine:.004+.046*g,shiftClack:.025+.065*g,
  drive:.14+.18*k,body:1.5+1.8*k,bass:.10+.06*k+(mix.depth||0)*.03};
}
