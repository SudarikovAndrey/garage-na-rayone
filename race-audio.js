import {tireSlip,exhaustPower} from './vehicle-effects.js';
const tireBytes=typeof window==='undefined'?Promise.resolve(null):fetch(new URL('./assets/audio/tire-skid.wav',import.meta.url)).then(r=>r.ok?r.arrayBuffer():null).catch(()=>null);
// Cached friction and combustion waveforms: no audio buffers are allocated per frame.
export function frictionSamples(rate,duration=1){
 const data=new Float32Array(Math.round(rate*duration)),noise=new Float32Array(data.length);let seed=712;
 for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed/2147483648-1;}
 // Periodic FM and cyclic noise: no silent loop edges or fast amplitude tremolo.
 const cycle=Math.PI*2,base=Math.round(1650*duration),upper=Math.round(2340*duration);
 for(let i=0;i<data.length;i++){const t=i/data.length;
  data[i]=.39*Math.sin(cycle*base*t+3*Math.sin(cycle*3*t))+.19*Math.sin(cycle*upper*t+1.1*Math.sin(cycle*7*t))+.24*(noise[i]+noise[(i+data.length-1)%data.length])*.5;
 }
 return data;
}
export function backfireSamples(rate){const data=new Float32Array(Math.round(rate*.22));for(let i=0;i<data.length;i++){const t=i/rate,attack=Math.min(1,t/.002);data[i]=attack*(Math.sin(2*Math.PI*(130*t-130*t*t))*.55+(Math.random()*2-1)*.45)*Math.exp(-t*29);}return data;}
export function contactSamples(rate){const data=new Float32Array(Math.round(rate*.32));let seed=912,low=0;for(let i=0;i<data.length;i++){const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;low=low*.85+noise*.15;data[i]=Math.min(1,t/.002)*(.55*Math.sin(t*2*Math.PI*78)*Math.exp(-t*18)+.3*low*Math.exp(-t*14)+.13*noise*Math.exp(-t*45)+.12*Math.sin(t*2*Math.PI*690)*Math.exp(-t*30));}return data;}
export class RaceAudio{
 constructor(ctx,destination){this.ctx=ctx;this.lastGear=1;this.bus=ctx.createGain();this.bus.gain.value=0;this.bus.connect(destination);this.tires=ctx.createGain();this.tires.gain.value=0;this.tires.connect(this.bus);
  this.filter=ctx.createBiquadFilter();this.filter.type='bandpass';this.filter.frequency.value=2300;this.filter.Q.value=.85;this.filter.connect(this.tires);
  const buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);buffer.copyToChannel(frictionSamples(ctx.sampleRate),0);
  this.source=ctx.createBufferSource();this.source.buffer=buffer;this.source.loop=true;this.sourceGain=ctx.createGain();this.sourceGain.gain.value=1;this.sourceGain.connect(this.filter);this.source.connect(this.sourceGain);this.source.start();
  tireBytes.then(bytes=>bytes?ctx.decodeAudioData(bytes.slice(0)):null).then(buffer=>{if(buffer)this.attachTires(buffer);}).catch(()=>{});
  this.pop=ctx.createBuffer(1,Math.round(ctx.sampleRate*.22),ctx.sampleRate);this.pop.copyToChannel(backfireSamples(ctx.sampleRate),0);
  this.contactBuffer=ctx.createBuffer(1,Math.round(ctx.sampleRate*.32),ctx.sampleRate);this.contactBuffer.copyToChannel(contactSamples(ctx.sampleRate),0);
  const rough=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),samples=new Float32Array(ctx.sampleRate);let seed=812,low=0;for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;low=low*.7+(seed/2147483648-1)*.3;samples[i]=low;}rough.copyToChannel(samples,0);
  this.scrape=ctx.createGain();this.scrape.gain.value=0;this.scrape.connect(this.bus);this.scrapeSource=ctx.createBufferSource();this.scrapeSource.buffer=rough;this.scrapeSource.loop=true;const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1100;filter.Q.value=.65;this.scrapeSource.connect(filter);filter.connect(this.scrape);this.scrapeSource.start();this.contactCar=null;this.contactId=0;
 }
 attachTires(buffer){
  // Crossfade into the recording once decoded; leave the fallback silent but reusable.
  const ctx=this.ctx,t=ctx.currentTime,source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
  const old=this.source,oldGain=this.sourceGain,nextGain=ctx.createGain();nextGain.gain.value=0;nextGain.connect(this.filter);source.connect(nextGain);source.start();
  oldGain.gain.setTargetAtTime(0,t,.04);nextGain.gain.setTargetAtTime(1,t,.04);old.stop(t+.3);old.onended=()=>{old.disconnect();oldGain.disconnect();};this.source=source;this.sourceGain=nextGain;this.recorded=true;
  this.filter.type='lowpass';this.filter.Q.value=.45;this.filter.frequency.setTargetAtTime(4200,t,.15);
 }
 silence(car){this.contactCar=car;this.contactId=car?.battle?.contact?.id||0;this.scrape.gain.setValueAtTime(0,this.ctx.currentTime);const t=this.ctx.currentTime;this.bus.gain.cancelScheduledValues(t);this.bus.gain.setValueAtTime(0,t);this.tires.gain.cancelScheduledValues(t);this.tires.gain.setValueAtTime(0,t);if(car)this.lastGear=car.gear;}
 update(car,phase){if(!car)return;const t=this.ctx.currentTime;this.bus.gain.setTargetAtTime(1,t,.025);const slip=tireSlip(car,phase);this.tires.gain.setTargetAtTime(slip*(this.recorded?.78:car.ridge?.28:.24),t,slip>.1?.07:.22);this.filter.frequency.setTargetAtTime(this.recorded?2400+slip*2600:(car.ridge?1100:1700)+slip*1000,t,.08);this.source.playbackRate.setTargetAtTime(this.recorded?.93+Math.min(car.speed,45)*.0018+slip*.045:.85+Math.min(car.speed,car.ridge?40:19)*(car.ridge?.012:.02),t,.08);
  const b=car.battle,e=b?.contact,active=['running','coasting'].includes(phase);
  if(this.contactCar!==car){this.contactCar=car;this.contactId=0;}
  if(e&&e.id!==this.contactId){this.contactId=e.id;if(active&&(b.clock||0)-e.clock<.15){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.contactBuffer;gain.gain.value=.3+e.strength*.65;source.playbackRate.value=.92+e.strength*.12;source.connect(gain);gain.connect(this.bus);source.start();source.onended=()=>{source.disconnect();gain.disconnect();};}}
  this.scrape.gain.setTargetAtTime(active&&b&&(b.clock||0)-(b.touchClock??-10)<.08?(b.scrape||0)*.22:0,t,.045);
  if(phase==='running'&&car.gear>this.lastGear&&exhaustPower(car)>0){const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=this.pop;gain.gain.value=.18+exhaustPower(car)*.14;source.connect(gain);gain.connect(this.bus);source.start();source.onended=()=>{source.disconnect();gain.disconnect();};}
  this.lastGear=car.gear;
 }
}
