// Экран реплики после заезда: тот же живой портрет и та же вёрстка, что в заставке перед заездом.
//
// Модуль подключается сам и следит за `#rival-line`: как только экран показывают, он ставит в слой
// портрета живой канвас, запускает атмосферу и параллакс, опускает фигуру под облако и говорит
// реплику губами. Когда экран скрывают — всё гасит.
//
// Почему наблюдатель, а не вызов из game.js: логика показа там (`showRivalLine`) только наполняет
// текст и снимает `hidden`, этого достаточно; сам файл в работе у другой сессии, и лезть в него
// ради двух строк нельзя. Если он освободится, наблюдателя можно заменить прямым вызовом open().
import {createLivePortrait} from './live-portrait.js';
import {PORTRAIT_RIGS} from './portrait-rigs.js';
import {characterFor,portraitFor} from './characters.js';
import {buildAtmosphere} from './intro-atmosphere.js';
import {attachParallax,keepFaceClear} from './intro-parallax.js';

const el=document.getElementById('rival-line');
if(el){
 const box=document.getElementById('line-portrait');
 const bubble=document.getElementById('line-bubble');
 let live=null,stopParallax=null,stopResize=null;

 function close(){
  live?.destroy();live=null;
  stopParallax?.();stopParallax=null;
  stopResize?.();stopResize=null;
  el.classList.remove('with-portrait');
 }

 function open(){
  close();
  const name=document.getElementById('line-name')?.textContent?.trim();
  const src=name?portraitFor(name):null;
  const rig=name?PORTRAIT_RIGS[characterFor(name)?.portrait]:null;
  if(!src){box.hidden=true;box.replaceChildren();return;}
  box.hidden=false;
  // Без рига (незнакомое имя) остаётся обычная картинка: движок сам отдаёт запасной вариант.
  const canvas=document.createElement('canvas');
  box.replaceChildren(canvas);
  live=createLivePortrait(canvas,{src,rig,anchor:'bottom'}).start();window.__lineLive=live;
  const text=document.getElementById('line-text')?.textContent||'';
  live.say(Math.min(4,1.2+text.length/16));
  el.classList.add('with-portrait');
  buildAtmosphere(el.querySelector('.intro-fx'),el.querySelector('.intro-dust'));
  stopParallax=attachParallax(el);
  const clear=()=>keepFaceClear(live,box,bubble);
  requestAnimationFrame(()=>requestAnimationFrame(clear));setTimeout(clear,400);
  addEventListener('resize',clear);
  stopResize=()=>removeEventListener('resize',clear);
 }

 new MutationObserver(()=>{el.hidden?close():open();})
  .observe(el,{attributes:true,attributeFilter:['hidden']});
 if(!el.hidden)open();
 window.__lineView={open,close};   // для страницы проверки dist/line-preview.html
 window.__lineLive=null;
}
