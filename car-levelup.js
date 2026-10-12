// Повышение уровня машины — событие, а не строчка в логе: свет бьёт в гараже, камера дёргается,
// вокруг машины вспыхивают искры, и крупно выезжает новый уровень с тем, что он открыл.
// Сама сцена остаётся игровой: мы только подмешиваем вспышку и рывок камеры через колбэки.
import {buildAtmosphere} from './intro-atmosphere.js';
export const LEVEL_UP_SPARKS={beams:2,smoke:2,streaksFar:4,dust:26,streaksNear:6,sparks:22};
// Что именно открыл уровень — строкой, понятной без таблиц.
export function levelUpLines({level,rankCap,upgradeRarity,rarityName}){
 const lines=[`Ранг деталей до ${rankCap}`];
 if(rarityName)lines.push(`Апгрейды: ${rarityName.toLowerCase()} и ниже`);
 return lines;
}
export function bindCarLevelUp({root,sfx,haptics,punch,reducedMotion=false}={}){
 if(!root)return {show:async()=>false};
 const $=s=>root.querySelector(s);
 let done=null,timer=0;
 function close(){
  if(!done)return;
  const finish=done;done=null;clearTimeout(timer);
  root.hidden=true;root.dataset.state='';
  finish();
 }
 root.addEventListener('click',close);
 return {
  close,
  show({level,name,rankCap,lines=[]}){
   $('#levelup-car').textContent=name||'';
   $('#levelup-level').textContent=String(level);
   $('#levelup-gains').innerHTML=lines.map(line=>`<li>${line}</li>`).join('');
   buildAtmosphere($('.levelup-fx'),$('.levelup-dust'),reducedMotion?{beams:1,smoke:1,streaksFar:1,dust:6,streaksNear:1,sparks:4}:LEVEL_UP_SPARKS);
   root.hidden=false;
   root.dataset.state='';void root.offsetWidth;root.dataset.state='in';
   sfx?.('fanfare-long');haptics?.('win');punch?.();
   return new Promise(resolve=>{done=()=>resolve(true);timer=setTimeout(close,reducedMotion?2200:5200);});
  },
 };
}
