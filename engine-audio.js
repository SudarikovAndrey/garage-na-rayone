// Мотор v2: обёртка над AudioWorklet «engine-v2» с мастерингом под динамик телефона.
// API прежний: update(car,rpm,load,volume,hold) / setVoice(mix) / silence(car) / поле bus.
// Без AudioWorklet или на слабом устройстве делегирует в старый граф engine-audio-legacy.js.
import {SILENT} from './engine-voice.js';
import {benchmark} from './engine-model.js';
import {engineParams} from './engine-presets.js';
import {EngineAudio as LegacyEngineAudio} from './engine-audio-legacy.js';
const WORKLET_URL=new URL('./engine-worklet.js',import.meta.url);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const curve=(k,n=1024)=>{const c=new Float32Array(n);for(let i=0;i<n;i++)c[i]=Math.tanh(k*(i/(n-1)*2-1));return c;};
let moduleLoad=null,probe=null;
// Замер один раз на страницу: до 25 % реального времени — полный пресет, до 60 % — две трубы глушителя, иначе старый граф.
export function engineTier(rate){if(!probe){const load=benchmark(rate,engineParams('samara',10,{...SILENT,spool:1,pops:1,antilag:1}),.25);probe={load,tier:load<25?'full':load<60?'lite':'legacy'};}return probe;}
export class EngineAudio{
 constructor(ctx,destination,{legacy=false}={}){
  this.ctx=ctx;this.bus=ctx.createGain();this.bus.gain.value=0;this.bus.connect(destination);
  this.voice={...SILENT};this.voiceKey=JSON.stringify(this.voice);this.voiceCar=null;this.lastGear=1;this.lastBoost=false;this.lastKey='';this.lastLimit='';
  this.params=null;this.node=null;this.inner=null;this.pending=[];this.tier='loading';this.load=0;this.ready=Promise.resolve();this.tweaks={model:{},master:{}};
  const supported=!legacy&&typeof ctx.audioWorklet?.addModule==='function'&&typeof AudioWorkletNode!=='undefined';
  if(!supported){this.useLegacy();return;}
  const t=engineTier(ctx.sampleRate);this.tier=t.tier;this.load=t.load;
  if(this.tier==='legacy'){this.useLegacy();return;}
  this.buildMastering();
  this.ready=(moduleLoad||(moduleLoad=ctx.audioWorklet.addModule(WORKLET_URL))).then(()=>{
   this.node=new AudioWorkletNode(ctx,'engine-v2',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[1]});this.node.connect(this.input);
   this.node.port.postMessage({type:'voice',voice:this.voice});for(const m of this.pending)this.node.port.postMessage(m);this.pending.length=0;
  }).catch(()=>{moduleLoad=null;this.node=null;this.useLegacy();});
 }
 useLegacy(){this.tier='legacy';this.inner=new LegacyEngineAudio(this.ctx,this.bus);this.bus.gain.value=1;this.inner.setVoice(this.voice);}
 buildMastering(){const ctx=this.ctx,f=(type,hz,q=.7,gain=0)=>{const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=hz;b.Q.value=q;b.gain.value=gain;return b;};
  this.input=ctx.createGain();this.input.gain.value=1;
  // Динамик телефона играет примерно от 300–400 Гц. Основной тон мотора (40–250 Гц) он не воспроизводит: если оставить
  // его в сигнале, получится «гудёж» и потраченный запас лимитера. Поэтому низ идёт в генератор гармоник, а на выход —
  // его 2–8-я гармоники в 300–1200 Гц: мозг дорисовывает бас по ним (эффект недостающей основной частоты).
  const split=f('lowpass',260);this.input.connect(split);const sub=f('highpass',60);split.connect(sub);
  this.bassDrive=ctx.createGain();this.bassDrive.gain.value=4.5;sub.connect(this.bassDrive);
  const bshaper=ctx.createWaveShaper();bshaper.curve=curve(3);bshaper.oversample='2x';this.bassDrive.connect(bshaper);
  const bhp=f('highpass',300,.9);bshaper.connect(bhp);const blp=f('lowpass',1300,.8);bhp.connect(blp);
  this.bassMix=ctx.createGain();this.bassMix.gain.value=.7;blp.connect(this.bassMix);
  // Основной канал: хайпасс 150 Гц, мягкий драйв, срез выше 5 кГц (шипение), без пиков.
  this.hp=f('highpass',150);this.input.connect(this.hp);
  this.drive=ctx.createGain();this.drive.gain.value=1;this.hp.connect(this.drive);
  const shaper=ctx.createWaveShaper();shaper.curve=curve(1.3);shaper.oversample='2x';this.drive.connect(shaper);
  this.makeup=ctx.createGain();this.makeup.gain.value=.8/Math.tanh(1.3*.6);shaper.connect(this.makeup);
  this.peak=f('peaking',600,.8,0);this.makeup.connect(this.peak);this.bassMix.connect(this.peak);
  this.lp=f('lowpass',5000);this.peak.connect(this.lp);this.lp2=f('lowpass',5000);this.lp.connect(this.lp2);this.lp2.connect(this.bus);}
 // Ручки стенда: model — абсолютные значения параметров модели поверх пресета, master — драйв/присутствие/фильтры.
 setTweaks({model,master}={}){this.tweaks={model:{...this.tweaks.model,...(model||{})},master:{...this.tweaks.master,...(master||{})}};this.lastKey='';
  const m=this.tweaks.master;if(this.hp){if(m.highpassHz)this.hp.frequency.value=m.highpassHz;if(m.presenceDb!=null)this.peak.gain.value=m.presenceDb;if(m.lowpassHz){this.lp.frequency.value=m.lowpassHz;this.lp2.frequency.value=m.lowpassHz;}if(m.bassDrive)this.bassDrive.gain.value=m.bassDrive;}}
 // Пока ворклет грузится, сообщения копятся; configure/limit/silence хранятся в одном экземпляре.
 post(m){if(this.node){this.node.port.postMessage(m);return;}
  const i=(m.type==='configure'||m.type==='limit'||m.type==='silence')?this.pending.findIndex(p=>p.type===m.type):-1;
  if(i>=0)this.pending[i]=m;else this.pending.push(m);}
 setVoice(mix){this.voice={...SILENT,...(mix||{})};this.voiceKey=JSON.stringify(this.voice);this.lastKey='';
  if(this.inner)this.inner.setVoice(this.voice);else this.post({type:'voice',voice:this.voice});}
 // hold — обороты удержания на старте: отсечка на них и при полугазе (два-степ с прошивкой).
 update(car,rpm,load=1,volume=.36,hold=0){
  if(this.inner){this.inner.update(car,rpm,load,volume);return;}
  const t=this.ctx.currentTime,pedal=clamp(load,0,1),carId=car?.carId||'samara',level=car?.levels?.[0]||0,pitch=car?.handling?.pitch||1;
  const key=carId+'|'+level+'|'+pitch+'|'+this.tier+'|'+this.voiceKey;
  if(key!==this.lastKey){this.lastKey=key;this.params={...engineParams(carId,level,this.voice,{pitch,tier:this.tier}),...this.tweaks.model};this.post({type:'configure',params:this.params});}
  const limit=hold||(car&&(car.gear||1)<(car.maxGear||9)?car.redline||0:0),lk=limit+'|'+(hold?1:0);
  if(lk!==this.lastLimit){this.lastLimit=lk;this.post({type:'limit',rpm:limit,hold:!!hold});}
  if(car&&car.gear>this.lastGear)this.post({type:'shift'});if(car)this.lastGear=car.gear;
  const nitro=!!car&&((car.boost||0)>0||!!car.nitroActive);if(nitro&&!this.lastBoost)this.post({type:'nitro'});this.lastBoost=nitro;
  if(this.node){this.node.parameters.get('rpm').setTargetAtTime(clamp(rpm,0,12000),t,.03);this.node.parameters.get('throttle').setTargetAtTime(pedal,t,.03);}
  const drive=(this.params?.drive||.3)+.25*pedal,m=this.tweaks.master;
  if(m.presenceDb==null)this.peak.gain.setTargetAtTime(0,t,.1);
  this.bassMix.gain.setTargetAtTime(m.bassMix??(this.params?.bass??.7),t,.1);
  this.drive.gain.setTargetAtTime(m.driveGain||(.7+drive*.45),t,.05);
  this.bus.gain.setTargetAtTime(volume*(m.busGain||2.8),t,.045);}
 silence(car){if(this.inner){this.inner.silence(car);return;}
  const t=this.ctx.currentTime;this.bus.gain.cancelScheduledValues(t);this.bus.gain.setValueAtTime(0,t);this.post({type:'silence'});
  this.lastBoost=false;this.lastLimit='';if(car)this.lastGear=car.gear;}
 // Совместимость со старым вызовом из game.js: запись мотора нужна только резервному графу.
 attachRecording(buffer){this.inner?.attachRecording?.(buffer);}
}
