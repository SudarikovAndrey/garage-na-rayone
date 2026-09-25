// Голос мотора: во что превращаются установленные апгрейды и уровень мотора.
// Один объект с семью слоями от 0 до 1 — его читает EngineAudio и решает, что подмешивать.
// Сток обязан звучать ровно как раньше: на нулевом миксе все новые слои молчат.
import {installedUpgrades,upgradeRank,upgradeRankCap} from './upgrades.js';
export const LAYERS=['spool','wastegate','pops','antilag','depth','idle','hiss','pipe'];
export const SILENT=Object.freeze(Object.fromEntries(LAYERS.map(k=>[k,0])));
const clamp01=v=>Math.max(0,Math.min(1,v));
// upgrades — уже установленные на эту машину; levels — эффективные уровни мотора/шин/КПП;
// ranks — {id: 0..1}, доля ранга апгрейда от потолка: первый ранг даёт 60 % слоя, потолок — 100 %.
export function mixFor(upgrades=[],levels=[0,0,0],ranks=null){
 const mix={...SILENT};
 for(const u of upgrades){const k=ranks&&ranks[u.id]!=null?.4+.6*clamp01(ranks[u.id]):1;for(const key in (u.sound||{}))if(key in mix)mix[key]+=u.sound[key]*k;}
 // Проточенный мотор гуще сам по себе, но стрелять и свистеть без железа ему нечем.
 mix.depth+=Math.min(.45,(levels[0]||0)*.05);
 for(const k of LAYERS)mix[k]=clamp01(mix[k]);
 return mix;
}
export const voiceFor=(save,levels,car=save?.selected)=>{const list=installedUpgrades(save,car);
 return mixFor(list,levels,Object.fromEntries(list.map(u=>[u.id,(upgradeRank(save,u.id)-1)/Math.max(1,upgradeRankCap(u)-1)])));};
export const isSilentVoice=mix=>LAYERS.every(k=>!mix?.[k]);
