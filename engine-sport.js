// Licensed engine families, turbine and exhaust recordings; manifests have provenance.
import {engineProfile,exhaustMode} from './engine-profiles.js';
const ROOT=new URL('./assets/audio/engine-sport/',import.meta.url),cache=new WeakMap();
const FAMILY_ROOT=new URL('./assets/audio/engine-refined/',import.meta.url);
const CLEAN_ROOT=new URL('./assets/audio/engine-clean/',import.meta.url);
// New exhaust banks retain their natural register across the game RPM range.
// WRX keeps the approved 1:1 pitch response exactly.
export const FAMILY_PITCH=Object.freeze({street:.81,mustang:.46,coupe:.88});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const SPORT_RPM=Object.freeze([800,1400,2100,2900,3500,4100,4900,5800]);
export const SPORT_FILES=Object.freeze(['idle','low','mid-low','mid','cruise','pull','high','top','spool','blowoff','pop-a','pop-b','pop-c']);
export function sportShare(level=0){const t=clamp(level/10);return t*t*(3-2*t);}
export function loadSportBank(ctx){
 let promise=cache.get(ctx);if(promise)return promise;
 promise=Promise.all(SPORT_FILES.map(async name=>{const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
  try{const r=await fetch(new URL(name+'.wav',ROOT),{signal:abort.signal});if(!r.ok)throw Error(`Sport recording ${name}: HTTP ${r.status}`);return await ctx.decodeAudioData(await r.arrayBuffer());}finally{clearTimeout(timer);}
 })).then(async bank=>{
  // Optional families fail independently: WRX remains an audible fallback.
  const families=await Promise.all(Object.keys(FAMILY_PITCH).map(async family=>{
   try{return await Promise.all(SPORT_FILES.slice(0,8).map(async name=>{
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
    try{const r=await fetch(new URL(family+'-'+name+'.wav',family==='mustang'?FAMILY_ROOT:CLEAN_ROOT),{signal:abort.signal});if(!r.ok)throw Error(r.status);return await ctx.decodeAudioData(await r.arrayBuffer());}finally{clearTimeout(timer);}
   }));}catch{return null;}
  }));bank.families=Object.fromEntries(Object.keys(FAMILY_PITCH).map((name,i)=>[name,families[i]]));return bank;
 }).catch(e=>{cache.delete(ctx);throw e;});cache.set(ctx,promise);return promise;
}
export class SportEngine{
 constructor(ctx,engineDestination,effectsDestination,{buffers=null}={}){
  this.ctx=ctx;this.loaded=false;this.status='loading';this.sources=[];this.familySources={};this.shots=new Set();this.events={pops:0,blowoffs:0};this.lastAt=null;this.lastGear=null;this.peakPedal=0;this.armed=false;this.boost=0;this.heat=0;this.lastRelease=-1;this.lastLimit=-1;this.shotIndex=0;this.carId=null;
  const filter=(type,hz,q=.65,db=0)=>{const n=ctx.createBiquadFilter();n.type=type;n.frequency.value=hz;n.Q.value=q;n.gain.value=db;return n;};
  this.input=ctx.createGain();const hp=filter('highpass',35);this.body=filter('lowshelf',210,.7,2.5);this.input.connect(hp);hp.connect(this.body);
  this.throat=filter('peaking',480,.6,2.5);this.body.connect(this.throat);this.air=filter('lowpass',3200,.6);this.throat.connect(this.air);
  this.output=ctx.createGain();this.output.gain.value=0;this.air.connect(this.output);this.output.connect(engineDestination);
  this.fx=ctx.createGain();this.fx.gain.value=0;const fxHP=filter('highpass',65),fxLP=filter('lowpass',6100,.6);this.fx.connect(fxHP);fxHP.connect(fxLP);fxLP.connect(effectsDestination);
  this.spoolGain=ctx.createGain();this.spoolGain.gain.value=0;this.spoolGain.connect(this.fx);
  this.ready=(buffers?Promise.resolve(buffers):loadSportBank(ctx)).then(bank=>{
   this.buffers=bank;const at=ctx.currentTime;
   for(const [family,buffers] of Object.entries({wrx:bank,...bank.families}))if(buffers)this.familySources[family]=SPORT_RPM.map((rpm,i)=>{const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffers[i];source.loop=true;source.playbackRate.value=(1100/rpm)**(FAMILY_PITCH[family]||1);gain.gain.value=0;source.connect(gain);gain.connect(this.input);source.start(at);return {source,gain};});
   this.sources=this.familySources.wrx;
   this.spool=ctx.createBufferSource();this.spool.buffer=bank[8];this.spool.loop=true;this.spool.connect(this.spoolGain);this.spool.start(at);this.loaded=true;this.status='recorded';return true;
  }).catch(e=>{this.status='fallback';this.error=String(e.message||e);return false;});
 }
 shot(index,at,gain,rate=1){
  // Count overlap at scheduled audio time. Retain every node until onended,
  // including future crackles, so Stop can cancel the whole burst immediately.
  let overlapping=0;for(const shot of this.shots)if(shot.end>at)overlapping++;
  if(overlapping>=6)return false;
  const source=this.ctx.createBufferSource(),amp=this.ctx.createGain();source.buffer=this.buffers[index];source.playbackRate.value=rate;
  amp.gain.setValueAtTime(gain,at);source.connect(amp);amp.connect(this.fx);
  const shot={source,amp,end:at+source.buffer.duration/rate};this.shots.add(shot);
  source.onended=()=>{source.disconnect();amp.disconnect();this.shots.delete(shot);};source.start(at);return true;
 }
 pop(at,gain,rate=1){const i=this.shotIndex++;if(this.shot(10+i%3,at,gain,rate*[.96,1.04,.9][i%3]))this.events.pops++;}
 update(car,rpm,pedal,voice,volume,hold,weights,at){
  if(!this.loaded)return 0;
  const profile=engineProfile(car?.carId);
  if(this.carId!==null&&this.carId!==car?.carId)this.silence(at);
  this.carId=car?.carId;this.activeBank=this.familySources[profile.bank]?profile.bank:'wrx';
  const level=car?.levels?.[0]||0,mix=sportShare(level),stage=clamp(level/15),dt=this.lastAt===null?0:clamp(at-this.lastAt,0,.1),gear=car?.gear||1;
  const shifted=this.lastGear!==null&&gear>this.lastGear;
  const target=voice.spool?clamp((rpm-1900)/3700)*pedal:0;
  this.boost+=(target-this.boost)*(1-Math.exp(-dt*(target>this.boost?3.4:6)));
  this.heat+=(clamp((rpm-1800)/3800)*pedal-this.heat)*(1-Math.exp(-dt*2.2));
  for(const [family,sources] of Object.entries(this.familySources))for(let i=0;i<8;i++){sources[i].source.playbackRate.setTargetAtTime((rpm/SPORT_RPM[i])**(FAMILY_PITCH[family]||1),at,.035);sources[i].gain.gain.setTargetAtTime(family===this.activeBank?weights[i]:0,at,.05);}
  this.body.gain.setTargetAtTime(profile.sportBody,at,.08);
  this.throat.frequency.setTargetAtTime(profile.sportThroat,at,.08);this.throat.gain.setTargetAtTime(1.5+stage*.6+pedal*(1.4+stage*.6)+(voice.pipe||0),at,.06);
  this.air.frequency.setTargetAtTime(profile.sportAir*(1500+pedal*(1500+stage*600)+(voice.pipe||0)*400),at,.055);
  this.output.gain.setTargetAtTime(Math.sin(mix*Math.PI/2)*1.45*profile.sportGain/(1+.2*clamp((rpm-4500)/2000)),at,.08);
  this.fx.gain.setTargetAtTime(volume,at,.025);
  this.spool.playbackRate.setTargetAtTime(.66+this.boost*.65,at,.12);
  this.spoolGain.gain.setTargetAtTime((voice.spool||0)*this.boost*this.boost*.28,at,.06);
  if(pedal>.65){this.armed=true;this.peakPedal=Math.max(this.peakPedal,pedal);}
  const hadLoad=this.armed&&this.heat>.10,release=shifted||(this.armed&&this.peakPedal-pedal>.3),mode=exhaustMode(voice);
  if(release){this.armed=false;this.peakPedal=pedal;
   if(at-this.lastRelease>.22){this.lastRelease=at;
    if(voice.wastegate&&this.boost>.13){this.shot(9,at,(.35+this.boost*.55)*voice.wastegate,.92+this.boost*.14);this.events.blowoffs++;this.boost*=.35;}
    if(hadLoad&&rpm>2200&&mode!=='quiet'){
     const strength=(.38+.55*this.heat)*voice.pops*(.65+.35*voice.pipe);
     const gaps=mode==='antilag'?[0,.07,.165,.285,.43]:mode==='crackle'?[0,.095,.23]:voice.pipe>.55?[0,.13]:[0];
     for(let i=0;i<gaps.length;i++)this.pop(at+gaps[i],strength*[1,.65,.84,.45,.57][i],profile.popRate);
    }
   }
  }
  const limit=hold?(voice.antilag?hold:0):car?.redline||0;
  const interval=[.145,.19,.125,.215][this.shotIndex%4];
  if(limit&&rpm>=limit-40&&(hold||pedal>.7)&&gear<(car?.maxGear||9)&&mode!=='quiet'&&at-this.lastLimit>interval){this.lastLimit=at;this.pop(at,(mode==='antilag'?.48:.23)*voice.pops,profile.popRate);}
  this.peakPedal=Math.max(pedal,this.peakPedal-dt*.35);this.lastAt=at;this.lastGear=gear;return mix;
 }
 silence(t=this.ctx.currentTime){
  for(const gain of [this.output.gain,this.fx.gain,this.spoolGain.gain]){gain.cancelScheduledValues(t);gain.setValueAtTime(0,t);}
  for(const {source,amp} of this.shots){amp.gain.cancelScheduledValues(t);amp.gain.setValueAtTime(0,t);try{source.stop(t);}catch{}}
  this.shots.clear();this.lastAt=null;this.lastGear=null;this.boost=0;this.heat=0;this.peakPedal=0;this.armed=false;this.lastRelease=this.lastLimit=-1;
 }
}
