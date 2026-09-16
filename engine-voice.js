// Голос мотора: во что превращаются установленные апгрейды и уровень мотора.
// Один объект с семью слоями от 0 до 1 — его читает EngineAudio и решает, что подмешивать.
// Сток обязан звучать ровно как раньше: на нулевом миксе все новые слои молчат.
import {installedUpgrades} from './upgrades.js';
export const LAYERS=['spool','wastegate','pops','antilag','depth','idle','hiss'];
export const SILENT=Object.freeze(Object.fromEntries(LAYERS.map(k=>[k,0])));
const clamp01=v=>Math.max(0,Math.min(1,v));
// upgrades — уже установленные на эту машину; levels — эффективные уровни мотора/шин/КПП.
export function mixFor(upgrades=[],levels=[0,0,0]){
 const mix={...SILENT};
 for(const u of upgrades)for(const k in (u.sound||{}))if(k in mix)mix[k]+=u.sound[k];
 // Проточенный мотор гуще сам по себе, но стрелять и свистеть без железа ему нечем.
 mix.depth+=Math.min(.45,(levels[0]||0)*.05);
 for(const k of LAYERS)mix[k]=clamp01(mix[k]);
 return mix;
}
export const voiceFor=(save,levels,car=save?.selected)=>mixFor(installedUpgrades(save,car),levels);
export const isSilentVoice=mix=>LAYERS.every(k=>!mix?.[k]);
