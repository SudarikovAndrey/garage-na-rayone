import {SILENT} from './engine-voice.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const firingHz=(rpm,cylinders=4)=>clamp(rpm,700,9000)*cylinders/120;
// Детерминированные сэмплы: буферы считаются один раз при создании, в кадре ничего не аллоцируется.
export function noiseSamples(rate,seconds=1,seed=4711){const n=Math.round(rate*seconds),d=new Float32Array(n);let s=seed>>>0;
 for(let i=0;i<n;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;d[i]=s/2147483648-1;}return d;}
// «Пш-ш» перепускного клапана: воздух, которому некуда деться, когда газ отпустили.
export function gateSamples(rate){const n=Math.round(rate*.3),d=new Float32Array(n);let s=99;
 for(let i=0;i<n;i++){const t=i/rate;s=(Math.imul(s,1664525)+1013904223)>>>0;d[i]=Math.min(1,t/.004)*(s/2147483648-1)*Math.exp(-t*9.5)*(1-i/n);}return d;}
// Хлопок в выхлоп: низкий бах и треск следом.
export function crackleSamples(rate){const n=Math.round(rate*.2),d=new Float32Array(n);let s=311;
 for(let i=0;i<n;i++){const t=i/rate;s=(Math.imul(s,1664525)+1013904223)>>>0;const noise=s/2147483648-1;
  d[i]=Math.min(1,t/.0015)*(Math.sin(2*Math.PI*(118*t-92*t*t))*.5+noise*.5)*Math.exp(-t*25);}return d;}
// Keep the recorded mechanical texture; combustion follows actual RPM and engine load.
export class EngineAudio{
 constructor(ctx,destination){
  this.ctx=ctx;this.lastGear=1;this.cutUntil=0;this.bus=ctx.createGain();this.bus.gain.value=0;this.bus.connect(destination);
  this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.Q.value=.65;this.filter.frequency.value=1800;this.filter.connect(this.bus);
  this.pulseGain=ctx.createGain();this.pulseGain.gain.value=.13;this.pulseGain.connect(this.filter);
  const real=new Float32Array(25),imag=new Float32Array(25);
  for(let n=1;n<imag.length;n++){real[n]=Math.cos(n*.47)*Math.exp(-n*.08)/Math.pow(n,.8);imag[n]=Math.sin(n*.47)*Math.exp(-n*.08)/Math.pow(n,.8);}
  this.pulse=ctx.createOscillator();this.pulse.setPeriodicWave(ctx.createPeriodicWave(real,imag));this.pulse.frequency.value=firingHz(1000);this.pulse.connect(this.pulseGain);this.pulse.start();
  this.crankGain=ctx.createGain();this.crankGain.gain.value=.05;this.crankGain.connect(this.filter);
  this.crank=ctx.createOscillator();this.crank.type='triangle';this.crank.frequency.value=1000/60;this.crank.connect(this.crankGain);this.crank.start();
  this.recordGain=ctx.createGain();this.recordGain.gain.value=.76;this.recordGain.connect(this.filter);
  // Слои железа идут мимо салонного фильтра: свист и хлопки должны быть яркими, а не глухими.
  this.voice={...SILENT};this.boost=0;this.lastThrottle=1;this.lastBoost=false;this.lastT=0;this.popAt=-1;this.limiting=false;
  this.blow=ctx.createGain();this.blow.gain.value=0;this.blow.connect(destination);
  this.spoolGain=ctx.createGain();this.spoolGain.gain.value=0;this.spoolGain.connect(this.blow);
  this.spool=ctx.createOscillator();this.spool.type='sine';this.spool.frequency.value=1400;this.spool.connect(this.spoolGain);this.spool.start();
  this.samples=typeof ctx.createBuffer==='function'&&typeof ctx.createBufferSource==='function'&&ctx.sampleRate>0;
  if(!this.samples)return;
  const rate=ctx.sampleRate,fill=(seconds,data)=>{const b=ctx.createBuffer(1,Math.max(1,Math.round(rate*seconds)),rate);b.copyToChannel(data,0);return b;};
  this.noiseBuffer=fill(1,noiseSamples(rate));
  this.gateBuffer=fill(.3,gateSamples(rate));
  this.crackleBuffer=fill(.2,crackleSamples(rate));
  // Шум турбины идёт постоянной петлёй: «сипение» поверх свиста, громкость тянет наддув.
  this.spoolNoiseGain=ctx.createGain();this.spoolNoiseGain.gain.value=0;this.spoolNoiseGain.connect(this.blow);
  this.spoolFilter=ctx.createBiquadFilter();this.spoolFilter.type='bandpass';this.spoolFilter.frequency.value=2600;this.spoolFilter.Q.value=1.6;this.spoolFilter.connect(this.spoolNoiseGain);
  this.spoolNoise=ctx.createBufferSource();this.spoolNoise.buffer=this.noiseBuffer;this.spoolNoise.loop=true;this.spoolNoise.connect(this.spoolFilter);this.spoolNoise.start();
 }
 attachRecording(buffer){
  if(this.recording)return;const ctx=this.ctx,overlap=Math.floor(buffer.sampleRate*.04),length=buffer.length-overlap;
  if(length<=overlap)return;const loop=ctx.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);let peak=0;
  for(let c=0;c<buffer.numberOfChannels;c++){const src=buffer.getChannelData(c),out=loop.getChannelData(c);out.set(src.subarray(overlap));
   for(let i=0;i<overlap;i++){const f=i/overlap;out[length-overlap+i]=src[length+i]*(1-f)+src[i]*f;}
   for(const v of out)peak=Math.max(peak,Math.abs(v));
  }
  if(peak>0)for(let c=0;c<loop.numberOfChannels;c++){const out=loop.getChannelData(c);for(let i=0;i<out.length;i++)out[i]*=.85/peak;}
  const source=ctx.createBufferSource();source.buffer=loop;source.loop=true;source.playbackRate.value=.8;source.connect(this.recordGain);source.start();this.recording=source;
 }
 // Голос машины: что именно на неё поставлено. Пустой микс = сток, ни один новый слой не звучит.
 setVoice(mix){this.voice={...SILENT,...(mix||{})};}
 // Разовый выстрел в общий выхлопной канал. Узлы живут ровно столько, сколько звучат.
 oneShot(buffer,{gain=.2,rate=1,at=this.ctx.currentTime,hz=0,q=1,decay=0}={}){
  if(!buffer||!this.blow)return null;const ctx=this.ctx,src=ctx.createBufferSource(),g=ctx.createGain();
  src.buffer=buffer;src.playbackRate.value=rate;g.gain.value=gain;
  let tail=null;
  if(hz){tail=ctx.createBiquadFilter();tail.type='bandpass';tail.frequency.value=hz;tail.Q.value=q;src.connect(tail);tail.connect(g);}
  else src.connect(g);
  g.connect(this.blow);
  if(decay){g.gain.setValueAtTime(gain,at);g.gain.exponentialRampToValueAtTime?.(.0004,at+decay);src.stop?.(at+decay);}
  src.start(at);
  src.onended=()=>{src.disconnect();tail?.disconnect();g.disconnect();};
  return src;
 }
 // Очередь хлопков: прошивка и прямоток растягивают её, антилаг добавляет злую дробь.
 crackle(at,strength){
  const v=this.voice,grains=1+(v.pops>.55?1:0)+(v.antilag>.5?1:0);
  for(let i=0;i<grains;i++)this.oneShot(this.crackleBuffer,{gain:.1+strength*.26/(1+i*.7),rate:.92+i*.14,hz:0,at:at+i*(.045+i*.02)});
 }
 update(car,rpm,load=1,volume=.36){const t=this.ctx.currentTime,cylinders=car?.carId==='oka'?2:4,v=this.voice;
  const dt=clamp(t-this.lastT,0,.25);this.lastT=t;
  const shifted=!!car&&car.gear>this.lastGear;
  if(shifted)this.cutUntil=t+.09;if(car)this.lastGear=car.gear;
  const pedal=clamp(load,0,1),lift=this.lastThrottle-pedal;this.lastThrottle=pedal;
  const throttle=pedal*(t<this.cutUntil?.3:1),rev=clamp(rpm,700,9000);
  // Наддув набирается с оборотами и газом, падает быстрее, чем набирается: отсюда и провал внизу.
  const want=v.spool?clamp((rev-2100)/4300,0,1)*pedal:0;
  this.boost+=(want-this.boost)*clamp(dt*(want>this.boost?2.4:9),0,1);
  // Отсечка: на пределе мотор рубит искру, и звук идёт дробью.
  const redline=car?.redline||0,limiting=!!redline&&rev>=redline-40&&pedal>.7&&(car.gear||1)<(car.maxGear||9);
  const stutter=limiting&&Math.sin(t*2*Math.PI*17)<0?.24:1;
  this.bus.gain.setTargetAtTime(volume*(.45+.55*throttle)*stutter,t,limiting?.006:.045);
  this.pulse.frequency.setTargetAtTime(firingHz(rev,cylinders),t,.035);this.crank.frequency.setTargetAtTime(rev/60,t,.04);
  // Распредвал качает холостой: на низах мотор не стоит смирно.
  const lope=v.idle&&rev<1900?v.idle*.4*(Math.sin(t*2*Math.PI*4.3)*.5+.5):0;
  this.pulseGain.gain.setTargetAtTime((.08+.19*throttle)*(1+v.depth*.3)*(1-lope*.5),t,.05);
  this.crankGain.gain.setTargetAtTime((.025+.045*throttle)*(1+lope),t,.07);
  this.filter.frequency.setTargetAtTime(650+rev*.35+throttle*1450+v.depth*520,t,.065);
  // The recording's firing fundamental is approximately 42 Hz (1260 RPM / four cylinders).
  this.recording?.playbackRate.setTargetAtTime(clamp(rev/1260,.55,7),t,.05);
  this.blow.gain.setTargetAtTime(volume*1.1,t,.05);
  const whistle=1350+this.boost*3150+rev*.11;
  this.spool.frequency.setTargetAtTime(whistle,t,.06);
  this.spoolGain.gain.setTargetAtTime(v.spool*this.boost*this.boost*.05,t,.07);
  this.spoolFilter?.frequency.setTargetAtTime(whistle*1.15,t,.08);
  this.spoolNoiseGain?.gain.setTargetAtTime(v.spool*this.boost*.028,t,.08);
  if(!this.samples)return;
  const released=lift>.3||shifted;
  if(released&&v.wastegate&&this.boost>.18){this.oneShot(this.gateBuffer,{gain:.06+this.boost*v.wastegate*.3,rate:.9+this.boost*.25,hz:2900,q:.8,at:t});this.boost*=.25;}
  if(released&&v.pops&&t-this.popAt>.12){this.popAt=t;this.crackle(t,Math.min(1,v.pops*.75+v.antilag*.45)*(.45+this.boost*.55));}
  // Каждый раз, когда отсечка рубит искру, невыгоревшее долетает до глушителя.
  if(limiting&&!this.limiting&&v.pops)this.crackle(t,v.pops*.5);
  this.limiting=limiting;
  // Нитро: один шипящий выдох на срабатывание, а не постоянный фон.
  const nitro=!!car&&((car.boost||0)>0||!!car.nitroActive);
  if(nitro&&!this.lastBoost&&v.hiss)this.oneShot(this.noiseBuffer,{gain:v.hiss*.075,rate:1,hz:3400,q:.7,at:t,decay:.7});
  this.lastBoost=nitro;
 }
 silence(car){const t=this.ctx.currentTime;this.bus.gain.cancelScheduledValues(t);this.bus.gain.setValueAtTime(0,t);
  this.blow.gain.cancelScheduledValues(t);this.blow.gain.setValueAtTime(0,t);
  this.spoolGain.gain.setValueAtTime(0,t);this.spoolNoiseGain?.gain.setValueAtTime(0,t);
  this.boost=0;this.limiting=false;this.lastBoost=false;this.lastThrottle=1;
  if(car)this.lastGear=car.gear;this.cutUntil=0;}
}
