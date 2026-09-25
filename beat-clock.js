// Часы такта: по времени воспроизведения песни радио и её сетке (music-beats.js) говорят, через сколько
// секунд следующая первая доля такта. Молния в грозу бьёт по ним — «прям под музыку» (Андрей, 22 сентября).
//
// Сетка — опорные точки каждые per сильных долей, между ними линейно. Время берём у самого <audio>
// (media.currentTime): это то, что игрок слышит, с поправкой на задержку вывода контекста, которую браузер знает.
import {BEATS} from './music-beats.js';

// Следующая сильная доля строго после t (секунды файла): её время и порядковый номер в сетке; null — сетки нет.
// Чётный номер — первая доля такта, нечётный — третья.
export function nextBeat(grid,t){
 if(!grid||!grid.anchors||grid.anchors.length<2)return null;
 const {anchors,per,tail}=grid,n=anchors.length;
 const gapOf=i=>(anchors[i+1]-anchors[i])/(i===n-2?tail:per),indexOf=i=>i===n-1?(n-2)*per+tail:i*per;
 if(t<anchors[0]){const g=gapOf(0);let b=anchors[0],k=0;while(b-g>t+1e-9){b-=g;k--;}return {time:b,index:k};}
 for(let i=0;i<n-1;i++){
  if(t>=anchors[i+1])continue;
  // 1e-6: t ровно на доле не должно возвращать её же — от ошибки округления floor даёт на единицу меньше.
  const g=gapOf(i),k=Math.floor((t-anchors[i])/g+1e-6)+1,b=anchors[i]+k*g;
  return b>=anchors[i+1]-1e-9?{time:anchors[i+1],index:indexOf(i+1)}:{time:b,index:indexOf(i)+k};
 }
 // За последней точкой — средним темпом, пока песня не кончилась.
 const g=grid.bpm?120/grid.bpm:gapOf(n-2);let b=anchors[n-1],k=indexOf(n-1);while(b<=t){b+=g;k++;}return {time:b,index:k};
}
export function nextStrongBeat(grid,t){const b=nextBeat(grid,t);return b?b.time:null;}
// Следующая первая доля такта.
export function nextDownbeat(grid,t){let b=nextBeat(grid,t);if(!b)return null;if(((b.index%2)+2)%2!==0)b=nextBeat(grid,b.time);return b.time;}
// Все сильные доли в отрезке [from,to): для проверок и для сдвига на несколько долей вперёд.
export function strongBeatsBetween(grid,from,to){const out=[];let t=from-1e-6;for(let i=0;i<4096;i++){const b=nextStrongBeat(grid,t);if(b===null||b>=to)break;out.push(b);t=b;}return out;}

export class BeatClock{
 // context — AudioContext или функция, его возвращающая: в игре контекст появляется после первого касания.
 constructor(radio,context=null){this.radio=radio;this.context=context;this.grids=BEATS;}
 // Что сейчас звучит: сетка и позиция; null — музыки нет или она не в такте с тем, что слышно (пауза, загрузка).
 position(){
  const r=this.radio;if(!r||!r.allowed?.()||r.blocked||r.failed||r.loading)return null;
  const media=r.media;if(!media||media.paused||media.readyState<3)return null;
  const grid=this.grids[r.track?.().id];if(!grid)return null;
  const ctx=typeof this.context==='function'?this.context():this.context;
  const latency=(ctx?.outputLatency||0)+(ctx?.baseLatency||0);
  return {grid,time:media.currentTime-latency};
 }
 // Через сколько секунд следующая первая доля такта (>=0) или null; downbeat=false — любая сильная доля.
 wait(downbeat=true){const p=this.position();if(!p)return null;const b=downbeat?nextDownbeat(p.grid,p.time):nextStrongBeat(p.grid,p.time);return b===null?null:Math.max(0,b-p.time);}
 // Тактовый шаг между сильными долями сейчас, для расписания «через N долей».
 gap(){const p=this.position();if(!p)return null;const a=nextStrongBeat(p.grid,p.time),b=nextStrongBeat(p.grid,a);return b-a;}
}
