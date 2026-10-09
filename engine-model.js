// Модель мотора v2: цилиндры, волноводы труб, глушитель и события выхлопа. Чистый JS без Web Audio —
// одна и та же модель крутится в AudioWorklet, в замере на главном потоке и в проверке под Node.
// По Baldan et al. 2015 и открытым реализациям Antonio-R1 / DasEtwas (MIT); код свой.
const SPEED_OF_SOUND=343,PI2=Math.PI*2,PI4=Math.PI*4;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const SILENT_VOICE=Object.freeze({spool:0,wastegate:0,pops:0,antilag:0,depth:0,idle:0,hiss:0,pipe:0});
// Мягкий клип держит обратную связь труб в узде (как WAVEGUIDE_MAX_AMP у DasEtwas).
const soft=v=>{const a=Math.abs(v);return a>4?Math.sign(v)*(5-1/(a-3)):v;};
// Линия задержки на кольце: read() отдаёт то, что записали length сэмплов назад.
class Delay{constructor(length){this.data=new Float32Array(Math.max(1,length|0));this.i=0;}
 read(){return this.data[this.i];}write(v){this.data[this.i]=v;if(++this.i>=this.data.length)this.i=0;}clear(){this.data.fill(0);this.i=0;}}
// Волновод: труба длиной length сэмплов, отражения rL/rR на концах. В каждом сэмпле сначала pop() — что
// дошло до концов, потом push(inL,inR) — что вошло. outL/outR — прошедшее наружу, отражённое идёт назад.
export class Waveguide{
 constructor(length,rL,rR){this.up=new Delay(length);this.down=new Delay(length);this.rL=rL;this.rR=rR;this.outL=0;this.outR=0;this.rawL=0;this.rawR=0;}
 pop(){const r=soft(this.up.read()),l=soft(this.down.read());this.rawR=r;this.rawL=l;this.outR=r*(1-this.rR);this.outL=l*(1-this.rL);}
 push(inL,inR){this.up.write(inL+this.rawL*this.rL);this.down.write(inR+this.rawR*this.rR);}
 clear(){this.up.clear();this.down.clear();this.outL=this.outR=this.rawL=this.rawR=0;}
}
class LP{constructor(hz,rate){this.rate=rate;this.set(hz);this.y=0;}set(hz){this.a=1-Math.exp(-PI2*hz/this.rate);}run(x){return this.y+=this.a*(x-this.y);}}
class HP{constructor(hz,rate){this.lp=new LP(hz,rate);}run(x){return x-this.lp.run(x);}}
class LP2{constructor(hz,rate){this.a=new LP(hz,rate);this.b=new LP(hz,rate);}set(hz){this.a.set(hz);this.b.set(hz);}run(x){return this.b.run(this.a.run(x));}get y(){return this.b.y;}set y(v){this.a.y=this.b.y=v;}}
// xorshift32: детерминированный шум без Math.random в горячем цикле.
class Noise{constructor(seed){this.s=(seed>>>0)||1;}next(){let s=this.s;s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;this.s=s;return s/2147483648-1;}}
const exhaustValve=x=>x>.75?-Math.sin(PI4*x):0,intakeValve=x=>x<.25?Math.sin(PI4*x):0,ignition=(x,t)=>x<t*.5?Math.sin(PI2*x/t):0;
// Выпуск: при открытии клапана давление цилиндра рвётся в патрубок резким импульсом — фронт мгновенный, спад за blowTime цикла.
const blowdown=(x,t,rise)=>x>.75?Math.exp(-(x-.75)/t)*(1-Math.exp(-(x-.75)/rise)):0;

export class EngineModel{
 constructor(rate){
  this.rate=rate;this.dt=1/rate;this.params=null;this.key='';this.voice={...SILENT_VOICE};this.coreMix=1;
  this.noise=new Noise(4711);this.crankNoise=new Noise(99);this.phase=0;this.time=0;this.lastThrottle=0;this.pedalPeak=0;this.liftArmed=false;this.lastRelease=-1;
  this.cyl=[];this.pipe=null;this.muffler=[];this.outlet=null;
  this.crankLP=new LP(8,rate);this.blockLP=new LP(125,rate);this.intakeLP=new LP2(2500,rate);this.dc=new HP(20,rate);
  this.burstLP=new LP2(650,rate);this.crackLP=new LP2(800,rate);this.gateLP=new LP(3000,rate);this.gateHP=new HP(1200,rate);this.flutterHP=new HP(900,rate);this.hissHP=new HP(2000,rate);this.blowLP=new LP2(2200,rate);
  this.whistleLo=new LP2(2000,rate);this.whistleHi=new LP2(2000,rate);
  this.boost=0;this.limitRpm=0;this.hold=false;this.limiting=false;this.cutting=false;
  this.crackleLeft=0;this.crackleRate=0;this.popShare=0;this.crackEnv=0;this.popEnv=0;
  this.gateEnv=0;this.flutterEnv=0;this.flutterHz=40;this.flutterPhase=0;this.hissEnv=0;this.nitroLeft=0;this.whistlePhase=0;this.events=0;this.gear=1;this.gearPhase=0;this.shiftLeft=0;this.shiftEnv=0;this.gearLP=new LP(1800,rate);this.combustionLP=new LP2(1600,rate);this.bodyLP=new LP(220,rate);this.pulseDC=new HP(35,rate);
  this.popMul=this.crackMul=this.gateMul=this.flutterMul=this.hissMul=this.boomMul=0;this.boomEnv=0;this.boomPhase=0;this.boomHz=170;this.boomSweep=0;this.clickEnv=0;this.clickMul=0;this.duck=0;this.duckMul=0;this.clickLP=new LP2(3000,rate);this.lastPop=-1;
 }
 // Пересборка труб только при смене структуры (длины, число цилиндров/труб); скаляры обновляются на месте.
 configure(p){
  if(!this.params)this.coreMix=p.recorded?0:1;
  this.params=p;const rate=this.rate,L=m=>Math.max(2,Math.round(m/SPEED_OF_SOUND*rate));
  const key=[p.cylinders,p.intake,p.runner,p.extractor,p.pipe,p.muffler.join(','),p.outlet].join('|');
  if(key!==this.key){this.key=key;this.cyl=[];
   for(let c=0;c<p.cylinders;c++){const spread=p.spread?((c*.618)%1-.5)*p.spread:0;
    this.cyl.push({offset:c/p.cylinders+spread,lastX:0,skip:0,muted:false,strength:1,chamber:new Waveguide(10,.75,.75),intake:new Waveguide(L(p.intake),.01,p.intakeOpenRefl),
     exhaust:new Waveguide(L(p.runner),p.exhaustClosedRefl,.01),extractor:new Waveguide(L(p.extractor),.01,.01)});}
   this.pipe=new Waveguide(L(p.pipe),p.pipeRefl,p.pipeRefl);this.muffler=p.muffler.map(m=>new Waveguide(L(m),0,p.mufflerDamping));this.outlet=new Waveguide(L(p.outlet),p.outletRefl,p.outletRefl);}
  this.pipe.rL=this.pipe.rR=p.pipeRefl;for(const m of this.muffler)m.rR=p.mufflerDamping;this.outlet.rL=this.outlet.rR=p.outletRefl;
  this.popMul=Math.exp(-p.popDecay/rate);this.crackMul=Math.exp(-p.crackDecay/rate);this.gateMul=Math.exp(-p.gateDecay/rate);this.flutterMul=Math.exp(-p.flutterDecay/rate);this.hissMul=Math.exp(-p.hissDecay/rate);this.boomMul=Math.exp(-(p.boomDecay??11)/rate);this.boomSweep=Math.exp(-(p.boomSweep??22)/rate);this.clickMul=Math.exp(-220/rate);this.duckMul=Math.exp(-20/rate);this.shiftMul=Math.exp(-85/rate);
 }
 setVoice(v){this.voice={...SILENT_VOICE,...(v||{})};}
 // Отсечка: rpm предела и режим удержания на старте (тогда рубит и при полугазе).
 setLimit(rpm,hold){this.limitRpm=rpm||0;this.hold=!!hold;}
 queue(seconds,rate,popShare){this.crackleLeft=Math.max(this.crackleLeft,seconds);this.crackleRate=Math.max(this.crackleRate,rate);this.popShare=Math.max(this.popShare,popShare);}
 misfireAll(){for(const k of this.cyl)k.skip=1;}
 misfireNext(){let best=null;for(const k of this.cyl)if(!best||k.lastX>best.lastX)best=k;if(best)best.skip=1;}
 // Хлопок: удар в коллектор и низкий бух со случайной высотой — на телефоне слышен именно бух.
 pop(gain){const p=this.params,rapid=this.time-this.lastPop<.16;this.lastPop=this.time;
  this.popEnv=Math.min(1.2,this.popEnv+gain);this.boomEnv=Math.min(1,this.boomEnv+gain*(p.boomGain??.5)*(rapid?.6:1));
  this.boomHz=(p.boomHz??140)*(.9+.2*(this.noise.next()+1)*.5);
  this.clickEnv=Math.min(.4,this.clickEnv+gain*(p.clickGain??.5)*(rapid?.35:1));this.duck=rapid?Math.max(this.duck,.06):Math.min(.25,.1+gain*.15);}
 // Антилаг: короткая плотная очередь взрывов на переключении — «бр-р-рап», а не одиночный хлопок.
 release(rpm=this.lastRpm||0){
  if(rpm<2200||this.time-this.lastRelease<.22)return;
  this.lastRelease=this.time;const v=this.voice,p=this.params;if(!p)return;
  const heat=clamp((rpm-2200)/3800,0,1),crackle=(p.crackleBase||0)+v.pops*.8;
  if(crackle>0){this.pop(p.popGain*(.35+.45*heat));this.events++;this.queue(.28+.2*v.pops,3+crackle*6,.7);}
  if(v.wastegate&&this.boost>.12){this.gateEnv=Math.min(1,(.25+this.boost)*v.wastegate);this.flutterEnv=this.boost*v.wastegate*.55;this.flutterHz=24;this.boost*=.25;this.events++;}
 }
 shift(seconds=.12){this.misfireAll();this.release();this.shiftLeft=clamp(seconds||.12,.05,.5);this.shiftEnv=this.params?.shiftClack??.025;
  if(this.voice.antilag)this.queue(.16,22,.8);}
 setGear(gear){this.gear=clamp(gear||1,1,10);}
 nitro(seconds=.7){this.hissEnv=Math.max(this.hissEnv,this.voice.hiss);this.nitroLeft=seconds;}
 silence(){for(const k of this.cyl){k.chamber.clear();k.intake.clear();k.exhaust.clear();k.extractor.clear();k.skip=0;k.muted=false;}
  this.pipe?.clear();for(const m of this.muffler)m.clear();this.outlet?.clear();
  for(const f of [this.crankLP,this.blockLP,this.intakeLP,this.dc.lp,this.burstLP,this.crackLP,this.gateLP,this.gateHP.lp,this.flutterHP.lp,this.hissHP.lp,this.whistleLo,this.whistleHi,this.blowLP,this.gearLP,this.combustionLP,this.bodyLP,this.pulseDC.lp,this.clickLP])f.y=0;
  this.boost=0;this.crackleLeft=this.crackleRate=this.popShare=0;this.crackEnv=this.popEnv=this.gateEnv=this.flutterEnv=this.hissEnv=this.boomEnv=this.clickEnv=this.duck=0;this.nitroLeft=0;this.shiftLeft=this.shiftEnv=0;this.lastPop=-1;this.limiting=this.cutting=false;this.lastThrottle=0;this.pedalPeak=0;this.liftArmed=false;this.lastRelease=-1;}
 // Управление раз в блок: наддув, отсечка, очередь треска. dtb — длительность блока в секундах.
 control(rpm,throttle,dtb){
  const p=this.params;if(!p)return;const v=this.voice,r=clamp(rpm,0,12000),th=clamp(throttle,0,1);this.lastRpm=r;this.lastThrottle=th;
  // Detect a complete lift, not a >.3 jump inside a 128-sample block: AudioParam smoothing hides that jump.
  if(th>.65){this.liftArmed=true;this.pedalPeak=Math.max(this.pedalPeak,th);}
  if(this.liftArmed&&this.pedalPeak-th>.3){this.release(r);this.liftArmed=false;this.pedalPeak=th;}
  this.pedalPeak=Math.max(th,this.pedalPeak-dtb*.35);
  this.combustionLP.set(Math.min(this.rate*.35,(p.exhaustHz||1400)*(.48+.52*th)+r*.07));
  this.shiftLeft=Math.max(0,this.shiftLeft-dtb);
  const want=v.spool?clamp((r-2100)/4300,0,1)*th:0;this.boost+=(want-this.boost)*clamp(dtb*(want>this.boost?2.4:9),0,1);
  const limiting=this.limitRpm>0&&r>=this.limitRpm-40&&(this.hold||th>.7),cutting=limiting&&Math.sin(this.time*PI2*17)<0;
  if(cutting&&!this.cutting){this.misfireAll();if(v.pops){this.pop(p.popGain*(.5+.5*v.pops));this.events++;}}
  this.limiting=limiting;this.cutting=cutting;
  if(this.crackleLeft>0){this.crackleLeft-=dtb;const pEvent=this.crackleRate*dtb*(this.crackleLeft>.15?1:Math.max(0,this.crackleLeft)/.15),u=(this.noise.next()+1)*.5;
   if(u<pEvent){this.events++;if((this.noise.next()+1)*.5<this.popShare){this.misfireNext();this.pop(p.popGain*(.6+.2*(this.noise.next()+1)));}else this.crackEnv+=p.crackGain*(.5+.25*(this.noise.next()+1));}
   if(this.crackleLeft<=0){this.crackleRate=0;this.popShare=0;}}
  if(this.nitroLeft>0)this.nitroLeft-=dtb;
  if(this.flutterEnv>1e-4)this.flutterHz+=(10-this.flutterHz)*clamp(dtb*4,0,1);
  if(v.spool){const hz=1350+this.boost*3150+r*.11;this.whistleLo.set(hz*1.3);this.whistleHi.set(hz*.7);}
 }
 // Синтез: rpm/throttle — число или массив на сэмпл (a-rate). В цикле ничего не создаётся.
 render(out,rpm,throttle,start=0,end=out.length){
  const p=this.params;if(!p){out.fill(0,start,end);return;}
  const v=this.voice,dt=this.dt,cyl=this.cyl,n=cyl.length,pipe=this.pipe,muf=this.muffler,outlet=this.outlet,mc=muf.length,rpmA=rpm.length?rpm:null,thA=throttle.length?throttle:null;
  for(let i=start;i<end;i++){
   const r=clamp(rpmA?rpmA[i]:rpm,0,12000),th=clamp(thA?thA[i]:throttle,0,1);this.time+=dt;
   const flow=Math.min(1,r/6000)*(.25+.75*th),crank=this.crankLP.run(this.crankNoise.next())*p.jitter,inNoise=this.intakeLP.run(this.noise.next())*p.intakeNoise*flow*(1+this.boost*.8);
   const lope=v.idle&&r<1900?v.idle*v.idle*.55*(Math.sin(this.time*PI2*4.3)*.5+.5):0;
   const cut=this.shiftLeft>0?.35:1;
   const ign=cut*p.ignitionGain*(p.idleFloor+(1-p.idleFloor)*th)*(1-lope*.5)*(this.nitroLeft>0?1.35:1)*(this.cutting?0:1);
   pipe.pop();outlet.pop();let mufL=0,mufR=0;for(let m=0;m<mc;m++){const w=muf[m];w.pop();mufL+=w.outL;mufR+=w.outR;}
   for(let c=0;c<n;c++){const k=cyl[c];k.chamber.pop();k.intake.pop();k.exhaust.pop();k.extractor.pop();}
   let block=0,intakeOut=0,collector=0,combustion=0;
   for(let c=0;c<n;c++){const k=cyl[c];let x=this.phase+k.offset+crank;x-=Math.floor(x);
    // Новый цикл: снимаем пропуск и разыгрываем силу этой вспышки — у живого мотора вспышки не одинаковые.
    if(x<k.lastX){k.muted=k.skip>0;if(k.skip>0)k.skip--;k.strength=1+this.noise.next()*(p.cycleVar??.12);}k.lastX=x;
    // Rounded exhaust-pressure pulse, one per firing. Unequal cylinder strengths give a four-stroke
    // rumble without detuned oscillators. Cam overlap moves energy into the half-order at idle.
    const age=(x+.25)%1, width=(p.pulseWidth||.2)/n, envelope=age<width?Math.sin(Math.PI*age/width)**2:0;
    const cylinderWeight=1+(c%2?-.06:.06)*(1+v.idle*3*clamp((2200-r)/1300,0,1));
    combustion+=envelope*k.strength*cylinderWeight*(k.muted?.3:1);

    const ev=exhaustValve(x),iv=intakeValve(x),piston=Math.cos(PI4*x)*p.pistonGain,fire=k.muted?0:ignition(x,p.ignitionTime)*ign*k.strength;block+=piston+fire;
    // В трубу поршень качает только через открытый клапан, иначе его ровная синусоида забивает вспышки.
    // Продувка: при открытии выпускного клапана давление рвётся наружу шумом — это и есть «рык» и верхи выхлопа.
    const load=(p.idleFloor+(1-p.idleFloor)*th)*cut,amp=fire*1.5+piston*(.1+.9*ev),pulse=blowdown(x,p.blowTime||.04,p.blowRise||.008)*(p.pulseGain??1)*load*k.strength*(k.muted?.3:1)*(this.cutting?.3:1);
    const blow=pulse+this.blowLP.run(this.noise.next())*ev*(1-ev)*1.5*p.blowGain*load*flow*(k.muted?.4:1);
    const rIn=p.intakeClosedRefl+(p.intakeOpenRefl-p.intakeClosedRefl)*iv,rEx=p.exhaustClosedRefl+(p.exhaustOpenRefl-p.exhaustClosedRefl)*ev;
    k.intake.rR=rIn;k.chamber.rL=rIn;k.exhaust.rL=rEx;k.chamber.rR=rEx;
    collector+=k.extractor.outR;intakeOut+=k.intake.outL;
    k.extractor.push(k.exhaust.outR,pipe.outL/n);k.exhaust.push(k.chamber.outR+blow,k.extractor.outL);k.chamber.push(amp+k.intake.outR,k.extractor.outL);k.intake.push(inNoise*iv,k.chamber.outL);}
   // Хлопки и треск летят в коллектор и звучат той же трубой, что и мотор.
   const burst=this.popEnv*(.8+.7*this.burstLP.run(this.noise.next()))+this.crackEnv*(.6+.8*this.crackLP.run(this.noise.next()));this.popEnv*=this.popMul;this.crackEnv*=this.crackMul;
   pipe.push(collector+burst,mufL);for(let m=0;m<mc;m++)muf[m].push(pipe.outR/mc,outlet.outL/mc);outlet.push(mufR,0);
   let extra=0;
   if(v.spool&&this.boost>.01){this.whistlePhase+=(1350+this.boost*3150+r*.11)*dt;if(this.whistlePhase>1)this.whistlePhase-=1;const ph=this.whistlePhase*PI2,nz=this.noise.next();
    extra+=v.spool*this.boost*this.boost*(Math.sin(ph)*.011+(this.whistleLo.run(nz)-this.whistleHi.run(nz))*.14);}
   if(this.gateEnv>1e-4){extra+=this.gateHP.run(this.gateLP.run(this.noise.next()))*this.gateEnv*.5;this.gateEnv*=this.gateMul;}
   if(this.flutterEnv>1e-4){this.flutterPhase+=this.flutterHz*dt;if(this.flutterPhase>1)this.flutterPhase-=1;extra+=this.flutterHP.run(this.noise.next())*(.55+.45*Math.sin(this.flutterPhase*PI2))*this.flutterEnv*.2;this.flutterEnv*=this.flutterMul;}
   if(this.boomEnv>1e-4){this.boomPhase+=this.boomHz*dt;if(this.boomPhase>1)this.boomPhase-=1;
    extra+=(Math.sin(this.boomPhase*PI2)+.3*Math.sin(this.boomPhase*PI2*1.61))*.5*this.boomEnv;this.boomEnv*=this.boomMul;}
   if(this.clickEnv>1e-4){extra+=this.clickLP.run(this.noise.next())*this.clickEnv*.6;this.clickEnv*=this.clickMul;}
   // Real turbo/backfire samples replace these synthetic events when available.
   // Continue decaying their state, so changing source cannot replay old tails.
   if(p.recordedEvents)extra=0;
   if(this.hissEnv>1e-4){extra+=this.hissHP.run(this.noise.next())*this.hissEnv*.12;this.hissEnv*=this.hissMul;}
   if(this.duck>1e-3)this.duck*=this.duckMul;
   // Gear mesh follows shaft RPM and the engaged ratio. A stock helical box is almost inaudible;
   // upgraded close-ratio/racing hardware brings a restrained mechanical whine and a firmer clack.
   const meshHz=r/60*(10.5-this.gear*.55);this.gearPhase=(this.gearPhase+meshHz*dt)%1;
   extra+=Math.sin(this.gearPhase*PI2)*(p.gearWhine||0)*(p.recorded?.35:1)*(.18+.82*th)*clamp((r-900)/3000,0,1)*cut;
   if(this.shiftEnv>1e-5){extra+=this.gearLP.run(this.noise.next())*this.shiftEnv;this.shiftEnv*=this.shiftMul;}
   const pressure=this.pulseDC.run(combustion)*(p.combustionGain??0)*(.3+.7*th)*(1-lope*.35)*cut*(this.cutting?.18:1);
   const core=this.combustionLP.run(pressure),body=this.bodyLP.run(pressure);
   const texture=outlet.outR*p.exhaustGain+intakeOut*p.intakeGain+this.blockLP.run(block)*p.blockGain;
   // The recorded bank replaces the pitched synth completely. Smooth a live
   // A/B switch or a bank finishing its download; retain only the event layers.
   this.coreMix+=((p.recorded?0:1)-this.coreMix)*Math.min(1,dt/.025);
   const y=(core*.95+body*.4+texture*(p.textureGain??1))*(1-this.duck*.5)*this.coreMix+extra*(p.recorded?.8:1);

   out[i]=Math.tanh(this.dc.run(y)*p.outputGain);
   this.phase+=r/120*dt;if(this.phase>=1)this.phase-=1;
  }
 }
}
// Замер: сколько процентов реального времени съедает секунда звука на этом устройстве.
export function benchmark(rate,params,seconds=.5){const m=new EngineModel(rate);m.configure(params);m.setVoice({spool:1,pops:1,antilag:1});
 const out=new Float32Array(128),n=Math.round(rate*seconds/128),t0=(globalThis.performance||Date).now();
 for(let i=0;i<n;i++){m.control(6500,1,128/rate);m.render(out,6500,1);}
 return ((globalThis.performance||Date).now()-t0)/(seconds*1000)*100;}
