// Real four-cylinder recording, split into eight RPM bands. See the bank's
// manifest and CREDITS.md. Native buffer playback also works without AudioWorklet.
import {SportEngine} from './engine-sport.js';
import {engineProfile} from './engine-profiles.js';
const ROOT=new URL('./assets/audio/engine-recorded/',import.meta.url);
export const ENGINE_BANDS=Object.freeze([
 ['idle',800],['low',1400],['mid-low',2100],['mid',2900],
 ['cruise',3500],['pull',4100],['high',4900],['top',5800],
].map(([name,rpm])=>Object.freeze({name,rpm})));
const banks=new WeakMap(),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function loadEngineBank(ctx){
 let bank=banks.get(ctx);if(bank)return bank;
 bank=Promise.all(ENGINE_BANDS.map(async band=>{
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
  try{const response=await fetch(new URL(band.name+'.wav',ROOT),{signal:abort.signal});
   if(!response.ok)throw new Error(`Engine sample ${band.name}: HTTP ${response.status}`);
   return await ctx.decodeAudioData(await response.arrayBuffer());
  }finally{clearTimeout(timer);}
 })).catch(error=>{banks.delete(ctx);throw error;});banks.set(ctx,bank);return bank;
}
// Adjacent bands only; logarithmic spacing keeps their pitch stretch balanced.
// The same function is used by runtime, offline auditions and the range checks.
export function bandMix(rpm,out=new Float32Array(ENGINE_BANDS.length)){
 out.fill(0);const last=ENGINE_BANDS.length-1;
 if(rpm<=ENGINE_BANDS[0].rpm){out[0]=1;return out;}
 if(rpm>=ENGINE_BANDS[last].rpm){out[last]=1;return out;}
 for(let i=0;i<last;i++)if(rpm<ENGINE_BANDS[i+1].rpm){
  const a=ENGINE_BANDS[i].rpm,b=ENGINE_BANDS[i+1].rpm,k=Math.log(rpm/a)/Math.log(b/a);
  out[i]=Math.cos(k*Math.PI/2);out[i+1]=Math.sin(k*Math.PI/2);break;
 }return out;
}
export class RecordedEngine{
 constructor(ctx,destination,{buffers=null,sportBuffers=null}={}){
  this.ctx=ctx;this.status='loading';this.loaded=false;this.enabled=true;this.active=false;
  this.sources=[];this.weights=new Float32Array(ENGINE_BANDS.length);this.last=null;this.lastGear=null;this.cutUntil=0;
  const filter=(type,hz,q=.7,db=0)=>{const n=ctx.createBiquadFilter();n.type=type;n.frequency.value=hz;n.Q.value=q;n.gain.value=db;return n;};
  this.input=ctx.createGain();this.hp=filter('highpass',42);this.input.connect(this.hp);
  this.body=filter('lowshelf',240,.7,1);this.hp.connect(this.body);
  // Broad, low-Q resonances give the cars different exhaust bodies without
  // detuning the firing order or turning one engine into a pitch-shifted cartoon.
  this.presence=filter('peaking',650,.65,-5);this.body.connect(this.presence);
  this.air=filter('lowpass',1100,.65);this.presence.connect(this.air);
  this.muffler=filter('lowpass',1600,.6);this.air.connect(this.muffler);
  this.output=ctx.createGain();this.output.gain.value=0;this.muffler.connect(this.output);this.output.connect(destination);
  // Tuned exhaust opens a separate path around the stock muffler. Its harmonics
  // come from the recorded combustion, never another oscillator or detuned loop.
  const low=filter('lowpass',950,.6),dc=filter('highpass',65);this.hp.connect(low);low.connect(dc);
  this.exhaustDrive=ctx.createGain();dc.connect(this.exhaustDrive);
  const shaper=ctx.createWaveShaper();shaper.curve=Float32Array.from({length:2048},(_,i)=>Math.tanh((i/2047*2-1)*2)/Math.tanh(2));shaper.oversample='2x';this.exhaustDrive.connect(shaper);
  this.exhaustTone=filter('lowpass',1800,.55);shaper.connect(this.exhaustTone);
  this.exhaust=ctx.createGain();this.exhaust.gain.value=0;this.exhaustTone.connect(this.exhaust);this.exhaust.connect(this.output);
  // The underhood recording already contains induction texture. Reveal it only
  // under load, with a broad band and a soft top to avoid a thin electronic rasp.
  const inlet=filter('highpass',850,.55),inletTop=filter('lowpass',3000,.55);this.hp.connect(inlet);inlet.connect(inletTop);
  this.intake=ctx.createGain();this.intake.gain.value=0;inletTop.connect(this.intake);this.intake.connect(this.output);
  this.sport=new SportEngine(ctx,this.output,destination,{buffers:sportBuffers});this.sportMix=0;
  this.ready=Promise.all([buffers?Promise.resolve(buffers):loadEngineBank(ctx),this.sport.ready]).then(([bank])=>{
   const at=ctx.currentTime;
   // All loops run on the same crank clock, even at zero gain. No nodes or
   // buffers are allocated by update(), including when crossing an RPM band.
   this.sources=bank.map((buffer,i)=>{const source=ctx.createBufferSource(),gain=ctx.createGain();
    source.buffer=buffer;source.loop=true;source.playbackRate.value=1100/ENGINE_BANDS[i].rpm;
    gain.gain.value=0;source.connect(gain);gain.connect(this.input);source.start(at);return {source,gain};});
   this.loaded=true;this.status='recorded';
   if(this.active&&this.last)this.update(...this.last);
   return true;
  }).catch(error=>{this.status='fallback';this.error=String(error.message||error);return false;});
 }
 setEnabled(enabled){this.enabled=!!enabled;if(!enabled)this.silence();}
 // Explicit time supports repeatable OfflineAudioContext auditions too.
 update(car,rpm,pedal,voice={},volume=1,hold=0,at=this.ctx.currentTime){
  this.last=[car,rpm,pedal,voice,volume,hold];this.active=this.enabled;
  if(!this.loaded||!this.enabled)return;
  const rev=clamp(rpm,700,9000),load=clamp(pedal,0,1),level=Math.max(0,car?.levels?.[0]||0),tune=clamp(Math.pow(level/15,.85),0,1.25),pipe=clamp(voice.pipe||0,0,1);
  const gear=car?.gear||1;if(this.lastGear!=null&&gear>this.lastGear)this.cutUntil=at+(car?.shiftPause||.12);this.lastGear=gear;
  const shift=at<this.cutUntil?.48:1,limit=hold?(voice.antilag?hold:0):car?.redline||0;
  const limiting=limit>0&&rev>=limit-40&&(hold||load>.7)&&gear<(car?.maxGear||9);
  const cut=limiting&&Math.sin(at*Math.PI*34)<0?.4:1;
  const lope=(voice.idle||0)*clamp((1900-rev)/900,0,1)*(.5+.32*Math.sin(at*Math.PI*8.6)+.18*Math.sin(at*Math.PI*5.3))*.3;
  bandMix(rev,this.weights);
  this.sportMix=this.sport.update(car,rev,load,voice,volume,hold,this.weights,at);
  this.input.gain.setTargetAtTime(Math.cos(this.sportMix*Math.PI/2),at,.08);
  const profile=engineProfile(car?.carId);
  for(let i=0;i<this.sources.length;i++){
   const n=this.sources[i];n.source.playbackRate.setTargetAtTime(rev*profile.stockRate/ENGINE_BANDS[i].rpm,at,.035);
   n.gain.gain.setTargetAtTime(this.weights[i],at,.05);
  }
  this.body.gain.setTargetAtTime(profile.stockBody+tune*2.3+(voice.depth||0)*1.5,at,.08);
  this.presence.frequency.setTargetAtTime(profile.stockCenter,at,.08);
  this.presence.gain.setTargetAtTime(-5+tune*6+load*tune*1.5+pipe*1.8,at,.06);
  const color=profile.stockColor;
  this.air.frequency.setTargetAtTime(color*(600+load*350+tune*(1170+load*1300)+pipe*550),at,.055);
  this.muffler.frequency.setTargetAtTime(color*(1000+load*400+tune*3100+pipe*1000),at,.055);
  const grit=tune*(.16+.13*load)+pipe*(.13+.12*load);
  this.exhaustDrive.gain.setTargetAtTime(.85+tune*.65+pipe*.25,at,.06);
  this.exhaustTone.frequency.setTargetAtTime(1200+tune*700+load*400+pipe*300,at,.055);
  this.exhaust.gain.setTargetAtTime(grit,at,.06);
  this.intake.gain.setTargetAtTime((.02+tune*.52)*load*load,at,.06);
  // Compensate the added paths/body so upgrading changes color, not just level.
  this.output.gain.setTargetAtTime(volume*1.55*(.48+.52*load)*(1-lope)*shift*cut*(1+(profile.stockGain-1)*(1-this.sportMix))/(1+tune*.55+grit*.8),at,limiting?.005:.025);
 }
 silence(){this.active=false;this.lastGear=null;this.cutUntil=0;this.sport.silence();const t=this.ctx.currentTime;
  this.output.gain.cancelScheduledValues(t);this.output.gain.setValueAtTime(0,t);}
}
