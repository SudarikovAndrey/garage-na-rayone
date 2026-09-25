// AudioWorklet «engine-v2»: тонкая обёртка над EngineModel. rpm/throttle — a-rate параметры, остальное сообщениями:
// configure {params} — пресет машины; voice {voice} — микс слоёв; limit {rpm,hold} — отсечка и удержание на старте;
// shift / nitro — разовые события; silence — очистить трубы и заглушить.
import {EngineModel} from './engine-model.js';
class EngineProcessor extends AudioWorkletProcessor{
 static get parameterDescriptors(){return [
  {name:'rpm',defaultValue:1000,minValue:0,maxValue:12000,automationRate:'a-rate'},
  {name:'throttle',defaultValue:0,minValue:0,maxValue:1,automationRate:'a-rate'}];}
 constructor(options){super();this.model=new EngineModel(sampleRate);const o=options?.processorOptions||{};
  if(o.params)this.model.configure(o.params);if(o.voice)this.model.setVoice(o.voice);
  this.port.onmessage=e=>{const m=e.data||{};switch(m.type){
   case 'configure':this.model.configure(m.params);break;
   case 'voice':this.model.setVoice(m.voice);break;
   case 'limit':this.model.setLimit(m.rpm,m.hold);break;
   case 'shift':this.model.shift();break;
   case 'nitro':this.model.nitro();break;
   case 'silence':this.model.silence();break;}};}
 process(inputs,outputs,parameters){const out=outputs[0]?.[0];if(!out)return true;const rpm=parameters.rpm,th=parameters.throttle;
  this.model.control(rpm[0],th[0],out.length/sampleRate);
  this.model.render(out,rpm.length>1?rpm:rpm[0],th.length>1?th:th[0]);return true;}
}
registerProcessor('engine-v2',EngineProcessor);
