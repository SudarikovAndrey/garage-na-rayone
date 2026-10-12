// Журнал наигранного: последние заезды и покупки в сейве, читаемый текст для передачи в чат и краткая сводка.
// Нужен, пока нет приёмника телеметрии, и как резерв потом: игрок сам решает, чем поделиться.
import {CARS} from './fleet.js';
export const PLAYED_LIMIT=150;
export function restorePlayed(s,d){s.played=Array.isArray(d.played)?d.played.filter(r=>r&&typeof r==='object'&&Number.isFinite(r.t)).slice(-PLAYED_LIMIT):[];}
export function recordRace(s,{opp,won,perfect=0,time,fresh=false,drop=null,rivalTime=null}){s.played??=[];s.played.push({t:Date.now(),k:opp.drift?'drift':opp.practice?'training':'race',r:opp.id,n:opp.name,car:s.selected,w:won?1:0,p:perfect,s:+(time||0).toFixed(2),o:rivalTime==null?null:+rivalTime.toFixed(2),f:fresh?1:0,rq:opp.requiredPerfect||0,b:opp.boss?1:opp.captain?2:0,d:drop?.id||null});if(s.played.length>PLAYED_LIMIT)s.played.splice(0,s.played.length-PLAYED_LIMIT);}
export function recordGarage(s,level){s.played??=[];s.played.push({t:Date.now(),k:'garage',lvl:level,r:s.rank,cash:s.cash});if(s.played.length>PLAYED_LIMIT)s.played.splice(0,s.played.length-PLAYED_LIMIT);}
const when=t=>{const d=new Date(t);return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
// Attempts per campaign stage: consecutive campaign races at the same rank.
export function attemptsByStage(s){const out=new Map();for(const r of s.played||[]){if(r.k!=='race')continue;out.set(r.r,(out.get(r.r)||0)+1);}return out;}
export const medianGap=s=>{const g=(s.played||[]).filter(r=>r.k==='race'&&r.o!=null).map(r=>(r.o-r.s)/r.o);if(!g.length)return null;g.sort((a,b)=>a-b);return +(g[Math.floor(g.length/2)]*100).toFixed(1);};
export function playedSummary(s){const races=(s.played||[]).filter(r=>r.k==='race'),wins=races.filter(r=>r.w).length,walls=[...attemptsByStage(s)].filter(([,n])=>n>=4).map(([r,n])=>`${r}×${n}`);const days=new Set(races.map(r=>new Date(r.t).toDateString())).size;return {races:races.length,wins,walls,days,training:(s.played||[]).filter(r=>r.k==='training').length,drift:(s.played||[]).filter(r=>r.k==='drift').length};}
export function statsText(s,{version='',now=Date.now()}={}){
 const sum=playedSummary(s),lines=[];
 lines.push(`ГАРАЖ НА РАЙОНЕ · наигранное · ${when(now)}${version?' · '+version:''}`);
 lines.push(`ранг ${s.rank} · гараж ${s.garage} · ${s.cash} ₽ · ${s.scrap} ⚒ · ${s.hard} $ · машина ${CARS[s.selected]?.name||s.selected} · машин открыто ${(s.unlockedCars||[]).filter(Boolean).length}`);
 lines.push(`заездов кампании ${sum.races}, побед ${sum.wins}, тренировок ${sum.training}, дрифтов ${sum.drift}, дней ${sum.days}${sum.walls.length?' · стены (ранг×попыток): '+sum.walls.join(', '):''}`);
 const gapM=medianGap(s);lines.push(`всего попыток ${s.campaignAttempts||0} · поражений подряд сейчас ${s.campaignLosses||0} · серия побед ${s.streak||0}${gapM!=null?' · медианный отрыв от соперника '+gapM+' %':''}`);
 lines.push('---');
 for(const r of (s.played||[]).slice(-80)){
  if(r.k==='garage'){lines.push(`${when(r.t)} гараж → ${r.lvl} на ранге ${r.r}, осталось ${r.cash} ₽`);continue;}
  const kind=r.k==='drift'?'дрифт':r.k==='training'?'трен':r.b===1?'БОСС':r.b===2?'главарь':'этап';
  const gap=r.o!=null?` (соперник ${r.o} с, отрыв ${(r.o-r.s>=0?'+':'')+(r.o-r.s).toFixed(2)})`:'';lines.push(`${when(r.t)} ${kind} ${r.r} ${r.n} · ${CARS[r.car]?.name||r.car} · ${r.w?'победа':'поражение'} ${r.s} с${gap} · чётких ${r.p}${r.rq?' (нужно '+r.rq+')':''}${r.f?' · новый ранг':''}${r.d?' · деталь '+r.d:''}`);
 }
 return lines.join('\n');
}
