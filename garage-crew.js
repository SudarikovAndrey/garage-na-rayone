import {createGLTFLoader} from './gltf.js';
import {addAnimatedGarageCharacter} from './garage-resident.js';
import {WORKSHOP_SPOTS} from './garage-workshop.js';
let pending;
// Гость у чайного угла: АвтоРитет (босс района, SK_Character_Boss_09 из «Рынка Пацана»), игровой Neutral Idle без скольжения стоп.
// Раньше здесь стояли два перекрашенных Heavy 15 (механик у верстака и «друг с музыкой»); механика убрали, чтобы не было двух одинаковых лиц.
export const GARAGE_CREW=['avtoritet','mechanic'];
export function loadGarageCrew(){return pending??=Promise.all(GARAGE_CREW.map(name=>createGLTFLoader().loadAsync('assets/characters/garage-'+name+'.glb'))).catch(error=>{pending=null;throw error;});}
export function addGarageCrew(scene,assets,{reduced=false}={}){
 // Клипы из GLB: Idle — игровой Neutral Idle; эмоции — игровые переносы Mixamo-эмоций с той же арматуры и «семки» из режима захвата.
 // Машины в GLB лежат вдоль X (зад — +X, борта — ±Z), в сцене повёрнуты на π.
 // АвтоРитет у чайного стола: чай и телефон с реквизитом в руке, семки, игровые эмоции. Витёк-механик стоит перед
 // верстаком лицом к нему и почти не простаивает: затяжка болтов, молоток, отвёртка, гаечный ключ — CC0-клипы,
 // перенесённые по направлениям костей.
 const specs=[{name:'GarageAvtoritet',position:WORKSHOP_SPOTS.friend,yaw:Math.PI+.45,clipName:'Idle',emoteEvery:[3,8],
  emotes:['Sip_Tea','Drink_Coffee','Pour_Tea','Phone_Talk','Check_Watch','Looking_Behind','Pointing','Sarcastic_Head_Nod','Angry_Gesture','Shoulder_Rubbing','Seeds'],
  props:{Sip_Tea:'mug',Drink_Coffee:'mug',Phone_Talk:'phone'}},
  {name:'GarageMechanic',position:WORKSHOP_SPOTS.mechanic,yaw:0,clipName:'Idle',emoteEvery:[1,3],
  emotes:['Tighten_Bolts','Hammer','Insert_Bolt','Screwdriver','Tighten_Nut','Place_Wrench','Inspect_Unit','Wipe_Sweat','Neck_Stretching']}];
 const people=(assets||[]).map((asset,i)=>addAnimatedGarageCharacter(scene,asset,{...specs[i],reduced}));
 return {clusters:people.map(p=>p.root),people,update(dt){let changed=false;for(const p of people)changed=p.update(dt)||changed;return changed;},takeShadowDirty(){let dirty=false;for(const p of people)dirty=p.takeShadowDirty()||dirty;return dirty;},dispose(){people.forEach(p=>p.dispose());}};
}
