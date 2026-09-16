// Экран «Стрелка»: одна кнопка вызова и три вкладки. Окно собрано из тех же кусков, что
// «Запчасти» и «На районе», поэтому своего оформления здесь почти нет.
//
// Модуль ничего не знает про заезд и про сервер: вызов и приём он отдаёт наружу, данные
// берёт у challenge-api. Так его можно проверить без игры.
import {openDialog,closeDialog} from './motion.js';
import {STATUS} from './challenge-rules.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const secs=t=>typeof t==='number'&&t>0?t.toFixed(2)+' с':'—';

// Что показывать про каждую стрелку и что предлагать сделать. Одна таблица вместо россыпи
// условий по всему рендеру: статусов пять, и они обязаны читаться с одного взгляда.
export function rowState(c){
 if(c.status===STATUS.done){
  const iWon=c.mine?c.winner==='a':c.winner==='b';
  return c.winner==='draw'
   ?{note:'Ничья',action:'РЕВАНШ',act:'rematch'}
   :{note:iWon?'Ты вывез':'Тебя объехали',action:'РЕВАНШ',act:'rematch',tone:iWon?'win':'lose'};
 }
 if(c.mine){
  if(c.status===STATUS.open)return {note:'Ты ещё не проехал',action:'ПРОЕХАТЬ',act:'drive'};
  return {note:c.rival?'Ждём ответа':'Ссылка ждёт кореша',action:'КИНУТЬ ССЫЛКУ',act:'share'};
 }
 // Принятая, но не отъезженная стрелка: человек ушёл в гараж прокачиваться и возвращается сюда за стартом.
 if(c.status===STATUS.accepted)return {note:'Принята · можно прокачаться',action:'В ЗАЕЗД',act:'start'};
 return {note:'Тебе забили стрелку',action:'ПРИНЯТЬ',act:'accept'};
}

// Одна строка на человека. Стрелки с одним и тем же корешем копятся сами собой — реванш за
// реваншем, несколько приглашений подряд, — и список превращается в кашу из одинаковых строк.
// Поэтому по каждому сопернику показываем то, что от тебя ждут прямо сейчас, а остальные его
// стрелки сворачиваем в счётчик. Срочность важнее свежести: принять чужой вызов нужнее, чем
// кинуть ссылку по своему.
const URGENCY={accept:1,start:2,drive:3,share:4,rematch:5};
export function groupChallenges(list=[]){
 const groups=new Map();
 for(const c of list){
  // Открытые ссылки без соперника — это одна очередь «кто откликнется», а не пять разных людей.
  const key=c.rival?.id||'open';
  const rank=URGENCY[rowState(c).act]??9,at=c.at||0;
  const group=groups.get(key);
  if(!group){groups.set(key,{key,lead:c,rank,at,waiting:c.status===STATUS.done?0:1});continue;}
  if(c.status!==STATUS.done)group.waiting++;
  if(rank<group.rank||(rank===group.rank&&at>group.at)){group.lead=c;group.rank=rank;group.at=at;}
 }
 // Наверху — то, где ход за тобой.
 return [...groups.values()].sort((a,b)=>a.rank-b.rank||b.at-a.at)
  .map(g=>({id:g.lead.id,rival:g.lead.rival,head:g.lead.head,state:rowState(g.lead),more:Math.max(0,g.waiting-1)}));
}

export function bindChallengeUI({api,onCreate,onDrive,onAccept,onStart,onShare,onClaim,toast=()=>{}}){
 const dialog=document.createElement('dialog');
 dialog.id='challenge-dialog';dialog.className='meta-dialog';
 dialog.innerHTML=`<header class="meta-header"><div><h2>СТРЕЛКА</h2><small id="challenge-sub">Вызов один на один</small></div><button class="icon-button" data-close aria-label="Закрыть">✕</button></header>
<div class="challenge-body">
 <button class="primary challenge-call" data-call>ЗАБИТЬ СТРЕЛКУ</button>
 <div class="event-tabs" role="tablist">
  <button role="tab" data-tab="list" aria-selected="true">СТРЕЛКИ</button>
  <button role="tab" data-tab="mates" aria-selected="false">КОРЕША</button>
  <button role="tab" data-tab="board" aria-selected="false">ТАБЛИЦА</button>
 </div>
 <div class="challenge-panel" data-panel></div>
</div>`;
 (document.querySelector('#game')||document.body).append(dialog);
 const panel=dialog.querySelector('[data-panel]');
 let tab='list',busy=false,list=null,mates=null,board=null,scope='global';

 const empty=text=>`<p class="event-empty">${esc(text)}</p>`;

 function renderList(){
  if(!list)return panel.innerHTML=empty('Смотрим, кто на районе…');
  if(!list.length)return panel.innerHTML=empty('Пока пусто. Забей стрелку и кинь ссылку корешу.');
  panel.innerHTML=groupChallenges(list).map(row=>{
   const s=row.state;
   const head=row.head&&row.head.races?`<em class="challenge-score">${esc(row.head.line)}</em>`:'';
   const more=row.more?`<i class="challenge-more">ещё ${row.more}</i>`:'';
   return `<div class="board-row challenge-row"${s.tone?` data-tone="${s.tone}"`:''}>
 <div class="challenge-who"><strong>${esc(row.rival?.name||'Кто откликнется')}</strong><span>${esc(s.note)}${more}</span></div>
 ${head}
 <button data-act="${s.act}" data-id="${esc(row.id)}">${esc(s.action)}</button>
</div>`;
  }).join('');
 }

 // Кореша: три галочки до редкого ящика. Считается доехавший до финиша, а не открывший ссылку,
 // поэтому в списке у каждого видно, доехал он или только зашёл посмотреть.
 function renderMates(){
  if(!mates)return panel.innerHTML=empty('Считаем корешей…');
  const ticks=Array.from({length:mates.goal},(_,i)=>`<i${i<mates.activated?' class="on"':''}></i>`).join('');
  // Позвать — главное действие вкладки, поэтому оно стоит первым и ничем не заслонено.
  // Шторка Telegram сама позволяет отметить сразу несколько чатов.
  const invite=`<button class="primary" data-invite>${mates.invited.length?'ПОЗВАТЬ ЕЩЁ':'ПОЗВАТЬ КОРЕШЕЙ'}</button>`;
  const prize=mates.done
   ?'<p class="mates-note">Ящик забран. Зови ещё — стрелки никто не отменял.</p>'
   :mates.rewardId
    ?'<button class="secondary" data-claim>ЗАБРАТЬ РЕДКИЙ ЯЩИК</button>'
    :'';
  const who=mates.invited.length
   ?`<ul class="mates-list">${mates.invited.map(i=>`<li${i.activated?' class="on"':''}><span>${esc(i.name)}</span><em>${i.activated?'доехал':'ещё не ехал'}</em>${i.id?`<button data-callmate="${esc(i.id)}" data-name="${esc(i.name)}" data-photo="${esc(i.photo||'')}">ПОЗВАТЬ</button>`:''}</li>`).join('')}</ul>`
   :'<p class="mates-note">Пока никого. Позови — ссылка на стрелку и есть приглашение.</p>';
  panel.innerHTML=`<div class="mates-card">${invite}
<span class="tiny-label">ТРОЕ ДОЕДУТ — РЕДКИЙ ЯЩИК</span>
<div class="mates-ticks" aria-label="Доехало ${mates.activated} из ${mates.goal}">${ticks}</div>
<p class="mates-goal">${mates.activated} из ${mates.goal}</p>
${prize}</div>${who}`;
 }

 // Таблица. Наверху те, кто чаще выигрывал у живых людей. Своё место видно всегда,
 // даже когда до него не долистать.
 function renderBoard(){
  if(!board)return panel.innerHTML=empty('Считаем район…');
  const switcher=`<div class="board-scope">${[['global','ВЕСЬ РАЙОН'],['friends','СВОИ']].map(([id,name])=>`<button data-scope="${id}" aria-pressed="${scope===id}">${name}</button>`).join('')}</div>`;
  if(!board.rows.length)return panel.innerHTML=switcher+empty(scope==='friends'?'Своих пока нет. Забей кому-нибудь стрелку.':'Пока никто не выигрывал. Будь первым.');
  const row=r=>`<div class="board-row challenge-board${r.me?' is-me':''}"><b>${r.place}</b><strong>${esc(r.name)}</strong><span>${esc(r.car)}</span><em>${r.wins}</em></div>`;
  const tail=board.shown?'':`<p class="mates-note">Ты на ${board.place} месте · побед ${board.wins}</p>`;
  panel.innerHTML=switcher+board.rows.map(row).join('')+tail;
 }

 function render(){
  for(const b of dialog.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===tab));
  // На вкладке корешей вызов и есть приглашение: две одинаковые кнопки подряд спорят друг с другом.
  dialog.querySelector('[data-call]').hidden=tab==='mates';
  if(tab==='list')return renderList();
  if(tab==='mates')return renderMates();
  if(tab==='board')return renderBoard();
  panel.innerHTML=empty('…');
 }

 // Каждая вкладка тянет своё и только когда её открыли: лишних запросов на вход не делаем.
 async function load(){
  try{
   if(tab==='list')list=(await api.list()).list;
   else if(tab==='mates')mates=await api.referrals();
   else if(tab==='board')board=await api.board(scope);
  }catch(e){panel.innerHTML=empty(e.message);return;}
  render();
 }

 async function open(){
  openDialog(dialog);list=null;mates=null;board=null;tab='list';render();await load();
 }

 dialog.querySelector('[data-close]').onclick=()=>closeDialog(dialog);
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);});
 dialog.querySelector('.event-tabs').onclick=e=>{
  const b=e.target.closest('[data-tab]');if(!b||b.dataset.tab===tab)return;
  tab=b.dataset.tab;render();load();
 };

 dialog.querySelector('[data-call]').onclick=async()=>{
  if(busy)return;busy=true;
  try{await onCreate();}catch(e){toast(e.message);}finally{busy=false;}
 };

 panel.onclick=async e=>{
  const pick=e.target.closest('[data-scope]');
  if(pick&&pick.dataset.scope!==scope){scope=pick.dataset.scope;board=null;render();load();return;}
  const mate=e.target.closest('[data-claim],[data-invite],[data-callmate]');
  if(mate&&!busy){
   busy=true;mate.disabled=true;
   try{
    if(mate.hasAttribute('data-claim')){await onClaim(mates.rewardId);mates=await api.referrals();render();}
    // Зовём конкретного кореша: его имя уходит прямо в текст вызова.
    else if(mate.hasAttribute('data-callmate'))await onCreate({invite:true,rivalId:mate.dataset.callmate,names:[mate.dataset.name],photos:[mate.dataset.photo||null]});
    else await onCreate({invite:true});
   }catch(err){toast(err.message);mate.disabled=false;}
   finally{busy=false;}
   return;
  }
  const b=e.target.closest('[data-act]');if(!b||busy)return;
  busy=true;b.disabled=true;
  const id=b.dataset.id;
  try{
   if(b.dataset.act==='drive')await onDrive(id);
   else if(b.dataset.act==='accept')await onAccept(id);
   else if(b.dataset.act==='start')await onStart(id);
   else if(b.dataset.act==='share')await onShare(id);
   else if(b.dataset.act==='rematch'){const r=await api.rematch(id);await onCreate({rivalId:r.rivalId,parentId:r.parentId});}
  }catch(err){toast(err.message);b.disabled=false;}
  finally{busy=false;}
 };

 return {open,close:()=>closeDialog(dialog),reload:load,dialog,get tab(){return tab;},setTab(t){tab=t;render();}};
}
