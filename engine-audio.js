// Shared game/lab engine. Recorded RPM bands carry the engine; the worklet adds
// gearbox, boost and exhaust events. Native Web Audio covers older browsers.
import {SILENT} from './engine-voice.js';
import {benchmark} from './engine-model.js';
import {engineParams} from './engine-presets.js';
import {EngineAudio as LegacyEngineAudio} from './engine-audio-legacy.js';
import {RecordedEngine} from './engine-recording.js';
export {firingHz} from './engine-audio-legacy.js';
const WORKLET_URL=new URL('./engine-worklet.js',import.meta.url);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const curve=(k,n=1024)=>Float32Array.from({length:n},(_,i)=>Math.tanh(k*(i/(n-1)*2-1))/Math.tanh(k));
const moduleLoads=new WeakMap(),probes=new Map();
export function engineTier(rate){if(!probes.has(rate)){const load=benchmark(rate,engineParams('samara',10,{...SILENT,spool:1,pops:1,antilag:1}),.25);probes.set(rate,{load,tier:load<25?'full':load<60?'lite':'legacy'});}return probes.get(rate);}
export class EngineAudio{
 constructor(ctx,destination,{legacy=false,recorded=true}={}){
  this.ctx=ctx;this.bus=ctx.createGain();this.bus.gain.value=0;this.bus.connect(destination);
  this.voice={...SILENT};this.voiceKey=JSON.stringify(this.voice);this.voiceCar=null;this.lastGear=null;this.lastBoost=false;this.lastKey='';this.lastLimit='';
  this.params=null;this.node=null;this.inner=null;this.pending=[];this.tier='loading';this.load=0;this.ready=Promise.resolve();this.tweaks={model:{},master:{}};this.muted=true;this.latest=null;
  this.sourceMode=recorded?'recorded':'synthetic';
  // Stubs / offline DSP checks need no network. Real browsers share one decoded
  // bank per AudioContext; a failed download leaves the previous voice available.
  this.recording=typeof ctx.decodeAudioData==='function'?new RecordedEngine(ctx,this.bus):null;
  this.recording?.setEnabled(recorded);
  this.recordingReady=this.recording?.ready.then(()=>{this.lastKey='';this.inner?.setRecordedMode(this.recordedActive);this.inner?.setRecordedEvents(this.recordedEvents);
   if(!this.muted&&this.latest){const a=this.latest;this.update(a.car,a.rpm,a.pedal,a.volume,a.hold);}
   return this.recordedActive;
  })||Promise.resolve(false);
  const supported=!legacy&&typeof ctx.audioWorklet?.addModule==='function'&&typeof AudioWorkletNode!=='undefined';
  if(!supported){this.useLegacy();return;}
  const t=engineTier(ctx.sampleRate);this.tier=t.tier;this.load=t.load;
  if(this.tier==='legacy'){this.useLegacy();return;}
  this.buildMastering();
  let loading=moduleLoads.get(ctx);if(!loading){loading=Promise.resolve().then(()=>ctx.audioWorklet.addModule(WORKLET_URL));moduleLoads.set(ctx,loading);}
  this.ready=loading.then(()=>{
   this.node=new AudioWorkletNode(ctx,'engine-v2',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});this.node.connect(this.input);
   this.node.onprocessorerror=()=>{this.node?.disconnect();this.node=null;this.useLegacy();};
   for(const m of this.pending)this.node.port.postMessage(m);this.pending.length=0;
   this.node.port.postMessage({type:'voice',voice:this.voice});
   if(!this.muted&&this.latest){const a=this.latest;this.node.parameters.get('rpm').setValueAtTime(a.rpm,ctx.currentTime);this.node.parameters.get('throttle').setValueAtTime(a.pedal,ctx.currentTime);this.post({type:'active',value:true});}
   else this.post({type:'active',value:false});
  }).catch(()=>{moduleLoads.delete(ctx);this.node?.disconnect();this.node=null;this.useLegacy();});
 }
 useLegacy(){if(this.inner)return;this.tier='legacy';this.pending.length=0;this.lp2?.disconnect();this.inner=new LegacyEngineAudio(this.ctx,this.bus);this.inner.setVoice(this.voice);
  this.inner.setRecordedMode(this.recordedActive);
  this.inner.setRecordedEvents(this.recordedEvents);
  this.bus.gain.cancelScheduledValues(this.ctx.currentTime);this.bus.gain.setValueAtTime(1,this.ctx.currentTime);
  if(this.recordingBuffer)this.inner.attachRecording(this.recordingBuffer);
  if(!this.muted&&this.latest){const a=this.latest;this.update(a.car,a.rpm,a.pedal,a.volume,a.hold);}else this.inner.silence();
 }
 get recordedActive(){return this.sourceMode==='recorded'&&!!this.recording?.loaded;}
 get recordedEvents(){return this.recordedActive&&!!this.recording?.sport.loaded;}
 setSourceMode(mode){this.sourceMode=mode==='synthetic'?'synthetic':'recorded';this.recording?.setEnabled(this.sourceMode==='recorded');this.lastKey='';this.inner?.setRecordedMode(this.recordedActive);this.inner?.setRecordedEvents(this.recordedEvents);}
 buildMastering(){const ctx=this.ctx,f=(type,hz,q=.7,gain=0)=>{const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=hz;b.Q.value=q;b.gain.value=gain;return b;};
  this.input=ctx.createGain();this.input.gain.value=1;
  // Keep the exhaust fundamental for headphones. A quiet parallel harmonic layer translates to phones.
  const split=f('lowpass',240);this.input.connect(split);const sub=f('highpass',45);split.connect(sub);
  this.bassDrive=ctx.createGain();this.bassDrive.gain.value=1.5;sub.connect(this.bassDrive);
  const bshaper=ctx.createWaveShaper();bshaper.curve=curve(1.2);bshaper.oversample='2x';this.bassDrive.connect(bshaper);
  const bhp=f('highpass',180);bshaper.connect(bhp);const blp=f('lowpass',850);bhp.connect(blp);
  this.bassMix=ctx.createGain();this.bassMix.gain.value=.12;blp.connect(this.bassMix);
  this.hp=f('highpass',38);this.input.connect(this.hp);
  this.drive=ctx.createGain();this.drive.gain.value=1;this.hp.connect(this.drive);
  const shaper=ctx.createWaveShaper();shaper.curve=curve(.7);shaper.oversample='2x';this.drive.connect(shaper);
  this.makeup=ctx.createGain();this.makeup.gain.value=1;shaper.connect(this.makeup);
  this.peak=f('peaking',210,.65,2);this.makeup.connect(this.peak);this.bassMix.connect(this.peak);
  this.lp=f('lowpass',4400);this.peak.connect(this.lp);this.lp2=f('lowpass',5200);this.lp.connect(this.lp2);this.lp2.connect(this.bus);
 }
 setTweaks({model={},master={}}={}){this.tweaks={model:{...model},master:{...master}};this.lastKey='';const m=this.tweaks.master;
  if(this.hp){this.hp.frequency.value=m.highpassHz??38;this.lp.frequency.value=m.lowpassHz??4400;this.lp2.frequency.value=m.lowpassHz??5200;this.bassDrive.gain.value=m.bassDrive??1.5;}}
 // Retain only state while loading. Never replay a backlog of shifts/pops when audio becomes ready.
 post(m){if(this.node){this.node.port.postMessage(m);return;}if(['shift','nitro'].includes(m.type))return;
  const i=this.pending.findIndex(p=>p.type===m.type);if(i>=0)this.pending[i]=m;else this.pending.push(m);}
 setVoice(mix){const v={...SILENT,...(mix||{})},key=JSON.stringify(v);if(key===this.voiceKey)return;
  this.voice=v;this.voiceKey=key;this.lastKey='';if(this.inner)this.inner.setVoice(v);else this.post({type:'voice',voice:v});}
 update(car,rpm,load=1,volume=.36,hold=0){
  const pedal=clamp(Number.isFinite(load)?load:0,0,1),rev=clamp(Number.isFinite(rpm)?rpm:0,0,12000);
  const wasMuted=this.muted;this.muted=false;this.latest={car,rpm:rev,pedal,volume,hold};
  this.recording?.update(car,rev,pedal,this.voice,this.inner?volume*2.2:1,hold);
  if(this.inner){if(wasMuted)this.inner.lastGear=car?.gear??null;this.inner.update(car,rev,pedal,volume,hold);return;}
  const t=this.ctx.currentTime,carId=car?.carId||'samara',level=car?.levels?.[0]||0,gearbox=car?.levels?.[2]||0,pitch=car?.handling?.pitch||1;
  const key=carId+'|'+level+'|'+gearbox+'|'+pitch+'|'+this.tier+'|'+this.voiceKey+'|'+this.recordedActive;
  if(key!==this.lastKey){this.lastKey=key;this.params={...engineParams(carId,level,this.voice,{pitch,tier:this.tier,gearbox}),...this.tweaks.model,recorded:this.recordedActive,recordedEvents:this.recordedEvents};this.post({type:'configure',params:this.params});}
  // Launch control is an ECU feature. A stock engine must not hammer the limiter throughout countdown.
  const launchLimit=hold&&this.voice.antilag>0,limit=launchLimit?hold:(!hold&&car&&(car.gear||1)<(car.maxGear||9)?car.redline||0:0),lk=limit+'|'+!!launchLimit;
  if(lk!==this.lastLimit){this.lastLimit=lk;this.post({type:'limit',rpm:limit,hold:!!launchLimit});}
  const gear=car?.gear||1;if(!wasMuted&&this.lastGear!=null&&gear>this.lastGear)this.post({type:'shift',seconds:car?.shiftPause||.12});
  if(gear!==this.lastGear){this.post({type:'gear',gear});this.lastGear=gear;}
  // boost is also the perfect-shift reward in physics; only nitroActive means nitrous injection.
  const nitro=!!car&&!!car.nitroActive;if(nitro&&!this.lastBoost)this.post({type:'nitro'});this.lastBoost=nitro;
  if(wasMuted)this.post({type:'active',value:true});
  if(this.node){this.node.parameters.get('rpm').setTargetAtTime(rev,t,.022);this.node.parameters.get('throttle').setTargetAtTime(pedal,t,.018);}
  const m=this.tweaks.master;this.peak.gain.setTargetAtTime(m.presenceDb??this.params.body??2,t,.1);
  this.bassMix.gain.setTargetAtTime(m.bassMix??this.params.bass??.12,t,.1);
  this.drive.gain.setTargetAtTime(m.driveGain??(.9+this.params.drive*.25),t,.05);
  this.bus.gain.setTargetAtTime(volume*(m.busGain??2.2),t,.035);
 }
 silence(car){if(this.muted)return;this.muted=true;this.lastBoost=false;this.lastLimit='';this.lastGear=car?.gear??null;
  this.recording?.silence();
  if(this.inner){this.inner.silence(car);return;}
  const t=this.ctx.currentTime;this.bus.gain.cancelScheduledValues(t);this.bus.gain.setValueAtTime(0,t);this.post({type:'silence'});
 }
 attachRecording(buffer){this.recordingBuffer=buffer;this.inner?.attachRecording(buffer);}
}
