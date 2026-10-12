import {openDialog,closeDialog} from './motion.js';
import {CARS} from './fleet.js';
import {normalizeDuelBuild,duelClassFor,chooseBot,verifyReplay,ratingChange,DUEL,DUEL_BOTS} from './duel-rules.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const remote=async(path='',body)=>{const r=await fetch('/api/duels'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});if(!r.headers.get('content-type')?.includes('json'))throw Error('Дуэли сейчас недоступны');const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'Не удалось связаться с сервером'),{code:d.code,status:r.status});return d;};
// Без аккаунта сервер отвечает 401 — раньше дуэли на этом заканчивались. Теперь подбор идёт локально: те же
// боты и те же правила рейтинга, только без записей живых игроков; профиль лежит в localStorage. Вошёл через
// Telegram — сервер подключается сам, и в подборе появляются люди.
const LOCAL_KEY='rayon-duel-local';
const localProfile=()=>{try{return {rating:1000,races:0,wins:0,losses:0,best:null,lastOpponent:null,pending:null,...JSON.parse(localStorage.getItem(LOCAL_KEY)||'{}')};}catch{return {rating:1000,races:0,wins:0,losses:0,best:null,lastOpponent:null,pending:null};}};
const saveLocal=p=>{try{localStorage.setItem(LOCAL_KEY,JSON.stringify(p));}catch{}};
export function localDuels(){
 return {
  offline:true,
  async get(){const p=localProfile();return {profile:{rating:p.rating,races:p.races,wins:p.wins,losses:p.losses,best:p.best,pending:!!p.pending},participants:DUEL_BOTS.length,players:0,bots:DUEL_BOTS.length,board:[],contract:DUEL,offline:true};},
  async start(build){const p=localProfile();if(p.pending?.opponent){p.rating=Math.max(0,p.rating+ratingChange(p.rating,p.pending.opponent.rating,0));p.races++;p.losses++;}
   const player=normalizeDuelBuild(build),o=chooseBot(p,player),ticket='local-'+Math.random().toString(36).slice(2,10);
   p.pending={ticket,created:Date.now(),player,opponent:{name:o.name,rating:o.rating,time:o.time,isBot:true,id:o.userId}};saveLocal(p);
   return {ticket,contract:DUEL,player,opponent:{name:o.name,rating:o.rating,time:o.time,inputs:o.inputs,build:o.build,isBot:true}};},
  async finish(ticket,inputs){const p=localProfile(),t=p.pending;if(!t||t.ticket!==ticket)throw Object.assign(Error('Этот заезд уже закрыт. Начни новый'),{code:'closed_ticket'});
   let run;try{run=verifyReplay(inputs,t.player);}catch(e){e.code='invalid_replay';throw e;}
   const o=t.opponent,draw=Math.abs(run.time-o.time)<DUEL.step,won=run.time<o.time-DUEL.step,delta=ratingChange(p.rating,o.rating,draw?.5:won?1:0);
   p.rating=Math.max(0,p.rating+delta);p.races++;p.wins+=won?1:0;p.losses+=!won&&!draw?1:0;p.lastOpponent=o.id;if(!p.best||run.time<p.best)p.best=run.time;p.pending=null;saveLocal(p);
   return {ticket,...run,won,draw,delta,rating:p.rating,qualification:false,opponentTime:o.time,opponentIsBot:true,offline:true};},
 };
}
const local=localDuels();
// Сервер первым; без аккаунта или без сервера — локальный район.
const api=async(path='',body)=>{try{return await remote(path,body);}catch(e){if(e.status===401||e.status===503||e.message==='Дуэли сейчас недоступны'||e.name==='TimeoutError'||e instanceof TypeError){if(path==='')return local.get();if(path==='/start')return {result:await local.start(body.build)};if(path==='/finish')return {result:await local.finish(body.ticket,body.inputs)};}throw e;}};
export function bindDuels({startRace,getBuild,toast}){
 const dialog=document.createElement('dialog');dialog.id='duel-dialog';dialog.className='meta-dialog';dialog.innerHTML='<header class="meta-header"><h2>ДУЭЛИ</h2><button class="icon-button" data-close aria-label="Закрыть">✕</button></header><div class="duel-body"></div>';document.body.append(dialog);const body=dialog.querySelector('.duel-body');let busy=false,data=null,pendingMemory=null;
 const readPending=()=>{if(pendingMemory)return pendingMemory;try{return JSON.parse(localStorage.getItem('rayon-duel-pending')||'null');}catch{return null;}};
 function clearPending(ticket){if(readPending()?.ticket!==ticket)return;pendingMemory=null;try{localStorage.removeItem('rayon-duel-pending');}catch{}}
 async function flush(){const p=readPending();if(!p)return null;try{const r=await api('/finish',p);clearPending(p.ticket);return r.result;}catch(e){if(['expired_ticket','closed_ticket','invalid_replay'].includes(e.code))clearPending(p.ticket);throw e;}}
 async function open(){openDialog(dialog);body.innerHTML='<p class="event-empty">Ищем гонщиков…</p>';try{data=await api();render();}catch(e){body.innerHTML='<p class="event-empty">'+esc(e.message)+'</p><button class="primary" data-retry>ПОВТОРИТЬ</button>';}}
 function render(){const p=data.profile,build=normalizeDuelBuild(getBuild()),car=CARS[build.car],cls=duelClassFor(build.power);body.innerHTML=`<div class="race-modes"><button data-campaign>КАМПАНИЯ</button><button class="active" aria-pressed="true">ДУЭЛИ · PvP</button></div><div class="duel-car"><img src="assets/cars/${car.id}.webp" width="320" height="200" alt="${car.model}"><b>${car.name} · КЛАСС ${cls.id}</b><span>Мощь ${build.power} · 402 м · сухой асфальт</span></div><div class="event-stats"><div><b>${p.rating}</b><small>РЕЙТИНГ</small></div><div><b>${p.wins}/${p.races}</b><small>ПОБЕДЫ</small></div><div><b>${p.best?p.best.toFixed(2):'—'}</b><small>ЛУЧШЕЕ, С</small></div></div><p class="route-note">${data.offline?'Ты не вошёл через Telegram, поэтому район офлайн: в подборе '+data.bots+' ботов с разными машинами и стилем езды. Войдёшь — появятся записи живых гонщиков.':'В подборе '+data.bots+' ботов и '+data.players+' игроков. Соперник получает другую сборку того же класса и мощность рядом с твоей.'}</p><button class="primary" data-start>${readPending()?'СОХРАНИТЬ ПРОШЛЫЙ ФИНИШ':'НАЙТИ ЗАЕЗД'}</button><details class="event-rules"><summary>Правила дуэли</summary><p>Машины и тюнинг могут отличаться. Подбор держит один класс и близкую мощь, а характер машины, старт и переключения решают исход.</p><p>Боты чередуют спокойные, ровные и жёсткие заезды. Подходящая запись реального игрока тоже может попасться. Прерванная дуэль считается поражением при старте следующей.</p><p>Сервер повторяет запись заезда. Дуэли не расходуют деньги и не меняют прогресс кампании.</p></details>${data.board.length?'<div class="event-board">'+data.board.map((r,i)=>`<div class="board-row ${r.me?'is-me':''}"><b>${i+1}</b><span>${esc(r.name)} ${r.me?'· ТЫ':''}</span><strong>${r.rating}</strong></div>`).join('')+'</div>':''}`;}
 dialog.querySelector('[data-close]').onclick=()=>closeDialog(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);});
 body.onclick=async e=>{const b=e.target.closest('button');if(!b||busy)return;if(b.hasAttribute('data-retry'))return open();if(b.hasAttribute('data-campaign')){await closeDialog(dialog);document.querySelector('#race-button').click();return;}if(!b.hasAttribute('data-start'))return;busy=true;b.disabled=true;try{const saved=await flush();if(saved){toast('Прошлый результат сохранён');await open();return;}const r=await api('/start',{build:getBuild()});await closeDialog(dialog);await startRace(r.result);}catch(e){toast(e.message);if(data)render();}finally{busy=false;b.disabled=false;}};
 async function finish(ticket,inputs){if(String(ticket).startsWith('local-'))return local.finish(ticket,inputs);/* локальный заезд считается сразу, без очереди досылки */const payload={ticket,inputs};pendingMemory=payload;try{localStorage.setItem('rayon-duel-pending',JSON.stringify(payload));}catch{}const r=await api('/finish',payload);clearPending(ticket);return r.result;}
 return {open,finish,flush};
}
