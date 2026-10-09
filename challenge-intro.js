// Карточка «тебе забили стрелку». Это первое, что видит человек, пришедший по ссылке:
// никакого меню до неё нет. Вёрстка и классы взяты у заставки босса, чтобы вызов от живого
// кореша читался тем же языком, что и вызов главаря.
import {ACCEPT_LABEL,challengeState,PHASE} from './challenge-rules.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function bindChallengeIntro(){
 const el=document.createElement('div');
 el.id='challenge-intro';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-labelledby','challenge-intro-name');
 el.innerHTML=`<div class="intro-glow" aria-hidden="true"></div>
<div class="intro-stack">
 <div class="intro-plate">
  <span class="tiny-label">ТЕБЕ ЗАБИЛИ СТРЕЛКУ</span>
  <h2 id="challenge-intro-name"></h2>
  <i class="intro-rule" aria-hidden="true"></i>
  <p class="intro-power" data-power></p>
 </div>
 <div class="intro-bubble"><p data-taunt></p></div>
 <img data-avatar alt="" hidden>
</div>
<div class="intro-car"><span class="tiny-label">ЕГО ТАЧКА</span><h3 data-car></h3><p data-time></p></div>
<div class="challenge-intro-actions"><button class="primary" data-accept></button><button class="text-button" data-later>ПОТОМ</button></div>`;
 (document.querySelector('#game')||document.body).append(el);

 let resolve=null;
 const finish=answer=>{const done=resolve;resolve=null;el.hidden=true;done?.(answer);};

 el.querySelector('[data-accept]').onclick=()=>finish(true);
 el.querySelector('[data-later]').onclick=()=>finish(false);

 // Показываем карточку и ждём ответа. true — принял, false — отложил.
 //
 // Карточка обязана знать всё, что может пойти не так: стрелку перезабили, неделя вышла, я на неё
 // уже отвечал. Раньше она этого не знала — человек жал «ПРИНЯТЬ» и ловил тост с ошибкой.
 function show(card){
  const name=card.challenger?.name||'Пацан';
  const car=card.car||{};
  const state=challengeState({mine:false,rival:card.challenger,rivalTime:card.rivalTime??card.time,closed:card.closed,nextId:card.nextId,my:card.my});
  el.querySelector('#challenge-intro-name').textContent=name;
  el.querySelector('[data-power]').textContent='МОЩЬ '+(card.challenger?.power??car.power??0);
  el.querySelector('[data-taunt]').textContent='«'+(card.text||name+' ждёт на районе.')+'»';
  el.querySelector('[data-car]').textContent=card.challenger?.car?.name||card.challenger?.car?.model||'ТАЧКА СОПЕРНИКА';
  el.querySelector('[data-time]').textContent=state.note;
  el.setAttribute('data-phase',state.phase);
  // Ехать можно только с живой стрелки. В остальных случаях кнопка говорит правду и ведёт туда,
  // куда есть смысл идти: на свежую стрелку того же кореша или в гараж.
  el.querySelector('[data-accept]').textContent=state.phase===PHASE.open?ACCEPT_LABEL:state.action;
  el.querySelector('[data-later]').hidden=state.phase!==PHASE.open;
  const avatar=el.querySelector('[data-avatar]');
  if(card.challenger?.photo){avatar.src=card.challenger.photo;avatar.hidden=false;}else avatar.hidden=true;
  el.hidden=false;
  return new Promise(done=>{resolve=done;});
 }

 // Если карточку не удалось загрузить, честно говорим об этом и не держим человека в пустом экране.
 function fail(message){
  el.querySelector('#challenge-intro-name').textContent='СТРЕЛКА НЕ ОТКРЫЛАСЬ';
  el.querySelector('[data-power]').textContent='';
  el.querySelector('[data-taunt]').textContent='«'+message+'»';
  el.querySelector('[data-car]').textContent='';
  el.querySelector('[data-time]').textContent='';
  el.querySelector('[data-accept]').textContent='В ГАРАЖ';
  el.querySelector('[data-later]').hidden=true;
  el.hidden=false;
  return new Promise(done=>{resolve=()=>done(false);});
 }

 return {show,fail,el,hide:()=>finish(false),get open(){return !el.hidden;},esc};
}
