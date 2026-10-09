// Экран «Стрелка»: список соперников — по строке на человека, — и две вкладки вокруг него.
//
// Модуль ничего не знает про заезд и про сервер: вызов и приём он отдаёт наружу, данные берёт
// у challenge-api. Что показать и что предложить нажать — решает не он, а mateState() из общих
// правил: одна функция на клиент и сервер, чтобы слово на кнопке и факт в базе не разъезжались.
import {openDialog,closeDialog} from './motion.js';
import {mateState,scoreLine,matesProgress} from './challenge-rules.js';
import {roadRows} from './referral-road.js';
import {crateArt} from './loot-ui.js';
import {coinIcon} from './currency-icons.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const secs=t=>typeof t==='number'&&t>0?t.toFixed(2)+' с':'—';
// Кнопка «ПОБИТЬ» рядом с чужим временем. Это второй вход в мультиплеер и самый дешёвый:
// ни ссылок, ни приглашений, ни ожидания — увидел время, нажал, поехал.
const beatButton=(challenge,label='ПОБИТЬ')=>challenge?.id
 ?`<button data-act="start" data-id="${esc(challenge.id)}" class="beat">${label}<em>${secs(challenge.time)}</em></button>`:'';

// Подарок новичку — часть сделки, поэтому он стоит рядом с наградой, а не в мелком тексте внизу.
export const MATE_GIFT='3 000 ₽';

// Награду показываем картинкой: ящик своим артом, краска и неон — своим цветом, ресурсы —
// иконками валют. Словами «краска «Мятный»» ценность не читается, цветом — читается сразу.
export const inviteArt=worth=>worth.art.kind==='crate'?crateArt(worth.art.value)
 :worth.art.kind==='paint'||worth.art.kind==='neon'
  ?`<span class="road-swatch road-swatch--${worth.art.kind}" style="--tone:${worth.art.value}"></span>`
  :`<span class="road-coins">${(worth.art.value||[]).map(k=>coinIcon(k)).join('')}</span>`;
const money=n=>Number(n||0).toLocaleString('ru-RU').replace(/ /g,'\u00a0');

// Дорога: одна ступень — одна строка. Текущая крупная, потому что решение принимают по ней:
// арт, цена в магазине, прогресс и сделка «тебе / корешу» прямо под ними.
export function roadMarkup({ladder=[],activated=0,left=0}={}){
 return roadRows({ladder,activated,left}).map(row=>{
  if(row.state==='tail')return `<li class="road-tail"><b>∞</b><span>дальше — ${esc(String(row.title).toLocaleLowerCase('ru-RU'))} за каждые ${row.every===10?'десять':row.every} корешей</span></li>`;
  const art=inviteArt(row.worth),price=row.worth.rubles?`${money(row.worth.rubles)} ₽ в магазине`:'';
  if(row.state==='live'){
   const done=Math.max(0,row.mates-row.left);
   return `<li class="road-live"><i class="road-num">${row.mates}</i>
<div class="road-head"><span class="road-art">${art}</span><div><span class="tiny-label">СЛЕДУЮЩАЯ НАГРАДА</span><b>${esc(row.title)}</b>
${price?`<span class="road-price">${price}</span>`:''}
<span class="road-track"><em>${done}</em><i style="width:${row.mates?Math.round(done/row.mates*100):0}%"></i><em>${row.mates}</em></span>
<span class="road-left">${row.left===1?'остался один кореш':'ещё '+row.left}</span></div></div>
<div class="road-deal"><div><span class="tiny-label">ТЕБЕ</span>${esc(row.title)}</div><div><span class="tiny-label">КОРЕШУ</span>${MATE_GIFT} на старт</div></div></li>`;
  }
  const right=row.state==='claim'?`<button data-claim="${esc(row.rewardId)}">ЗАБРАТЬ</button>`
   :row.state==='done'?'<em>забрано</em>':`<em>ещё ${row.left}</em>`;
  return `<li class="road-row road-${row.state}"><i class="road-num">${row.state==='done'||row.state==='claim'?'✓':row.mates}</i>
<span class="road-art">${art}</span><div><b>${esc(row.title)}</b>${price?`<small>${price}</small>`:''}</div>${right}</li>`;
 }).join('');
}

export function bindChallengeUI({api,onCreate,onDrive,onStart,onShare,onClaim,toast=()=>{}}){
 const dialog=document.createElement('dialog');
 dialog.id='challenge-dialog';dialog.className='meta-dialog';
 dialog.innerHTML=`<header class="meta-header"><div><h2>СТРЕЛКА</h2><small id="challenge-sub">Твоё время против всех</small></div><button class="icon-button" data-close aria-label="Закрыть">✕</button></header>
<div class="challenge-body">
 <button class="primary challenge-call" data-call><b>ПОЗВАТЬ НОВИЧКА</b><em data-progress></em></button>
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
 const label=t=>`<span class="tiny-label">${esc(t)}</span>`;

 // Строка человека. Одна на соперника, сколько бы стрелок между вами ни было: лицо, мощь,
 // счёт личных встреч и ровно одно действие. Слово на кнопке решает последний исход, а не то,
 // чей ход, — так о заездах и говорят вслух.
 const face=m=>{
  const photo=typeof m.photo==='string'&&/^https:\/\//.test(m.photo)?m.photo:null;
  return photo
   ?`<img class="mate-face" src="${esc(photo)}" alt="" width="34" height="34" loading="lazy">`
   :`<i class="mate-face">${esc(String(m.name||'?').trim().slice(0,1).toUpperCase())}</i>`;
 };
 function mateMarkup(m){
  const s=mateState(m),score=scoreLine(m);
  // Ждём — не кнопка: нажимать нечего, пока человек не проехал.
  const tail=s.act
   ?`<button data-act="go" data-mate="${esc(m.id)}" data-id="${esc(m.challenge?.id||'')}" data-name="${esc(m.name)}" data-photo="${esc(m.photo||'')}">${esc(s.action)}</button>`
   :`<em class="mate-wait">${esc(s.action)}</em>`;
  return `<div class="board-row mate-row${s.urgent?' is-urgent':''}"${s.tone?` data-tone="${s.tone}"`:''} data-phase="${s.phase}">
 ${face(m)}
 <div class="mate-who"><strong>${esc(m.name)}</strong><span>⚡ ${m.power||0}</span></div>
 ${score?`<em class="mate-score">${esc(score)}</em>`:''}
 ${tail}
</div>`;
 }

 function renderList(){
  if(!list)return panel.innerHTML=empty('Смотрим, кто на районе…');
  if(!list.people?.length)return panel.innerHTML=empty('Пока никого. Позови новичка — ссылка на стрелку и есть приглашение.');
  panel.innerHTML=list.people.map(mateMarkup).join('');
 }


 // Кореша: лестница до наград. Считается доехавший до финиша, а не открывший ссылку,
 // поэтому в списке у каждого видно, доехал он или только зашёл посмотреть.
 function renderMates(){
  if(!mates)return panel.innerHTML=empty('Считаем корешей…');
  // Позванные — под дорогой. Главное в списке не имена, а те, кто ещё не доехал: их можно
  // дёрнуть, и именно они ближе всех к тому, чтобы стать корешем.
  const who=mates.invited.length
   ?`<div class="tiny-label mates-head">КОГО ПОЗВАЛ</div><ul class="mates-list">${mates.invited.map(i=>`<li${i.activated?' class="on"':''}>${face(i)}<span>${esc(i.name)}</span><em>${i.activated?'доехал':'ещё не ехал'}</em>${
     i.challenge?beatButton(i.challenge)
     :i.id?`<button data-callmate="${esc(i.id)}" data-name="${esc(i.name)}" data-photo="${esc(i.photo||'')}">НАПОМНИТЬ</button>`:''}</li>`).join('')}</ul>`
   :'<p class="mates-note">Пока никого. Позови — ссылка на стрелку и есть приглашение.</p>';
  panel.innerHTML=`<ul class="mates-road">${roadMarkup({ladder:mates.ladder||[],activated:mates.activated||0,left:mates.left||0})}</ul>
${who}
<div class="mates-cta"><button class="primary" data-invite>ПОЗВАТЬ В TELEGRAM</button>
<p class="mates-note">Засчитывается, когда кореш доедет первый заезд</p></div>`;
 }

 // Таблица. Наверху те, кто чаще выигрывал у живых людей. У каждого, кто выставил время, —
 // кнопка «ПОБИТЬ»: таблица это не витрина, а список тех, к кому можно подъехать.
 function renderBoard(){
  if(!board)return panel.innerHTML=empty('Считаем район…');
  const switcher=`<div class="board-scope">${[['global','ВЕСЬ РАЙОН'],['friends','СВОИ']].map(([id,name])=>`<button data-scope="${id}" aria-pressed="${scope===id}">${name}</button>`).join('')}</div>`;
  if(!board.rows.length)return panel.innerHTML=switcher+empty(scope==='friends'?'Своих пока нет. Забей кому-нибудь стрелку.':'Пока никто не выигрывал. Будь первым.');
  const row=r=>`<div class="board-row challenge-board${r.me?' is-me':''}"><b>${r.place}</b><strong>${esc(r.name)}</strong><span>${esc(r.car)}</span><em>${r.wins}</em>${beatButton(r.challenge)}</div>`;
  const tail=board.shown?'':`<p class="mates-note">Ты на ${board.place} месте · побед ${board.wins}</p>`;
  panel.innerHTML=switcher+board.rows.map(row).join('')+tail;
 }

 function render(){
  for(const b of dialog.querySelectorAll('[data-tab]'))b.setAttribute('aria-selected',String(b.dataset.tab===tab));
  dialog.querySelector('[data-call]').hidden=tab==='mates';
  // На кнопке видно, ради чего звать: сколько корешей доехало из нужных и что на следующем рубеже.
  const progress=dialog.querySelector('[data-progress]');
  progress.textContent=matesProgress(list?.mates);
  progress.hidden=!progress.textContent;
  // Своё время — в подзаголовке, а не строкой в списке: список про людей, и лишнего там быть
  // не должно. Побили — говорим об этом сразу, это главная новость экрана.
  const mine=list?.mine&&!list.mine.closed&&list.mine.time>0?list.mine:null;
  dialog.querySelector('#challenge-sub').textContent=mine
   ?(mine.beaten?`Твоё время ${mine.time.toFixed(2)} с · побили`:`Твоё время ${mine.time.toFixed(2)} с`)
   :'Твоё время против всех';
  if(tab==='list')return renderList();
  if(tab==='mates')return renderMates();
  if(tab==='board')return renderBoard();
  panel.innerHTML=empty('…');
 }

 // Каждая вкладка тянет своё и только когда её открыли: лишних запросов на вход не делаем.
 async function load(){
  try{
   if(tab==='list')list=await api.list();
   else if(tab==='mates')mates=await api.referrals();
   else if(tab==='board')board=await api.board(scope);
  }catch(e){panel.innerHTML=empty(e.message);return;}
  render();
 }

 // Возвращаем загруженный список: бейдж над кнопкой в гараже считается по нему же, и незачем
 // ходить за теми же данными второй раз сразу после открытия экрана.
 // Баннер призыва и плашка на результате ведут прямо к корешам, поэтому вкладку выбирает тот,
 // кто открывает окно, а не само окно.
 async function open(startTab='list'){
  openDialog(dialog);list=null;mates=null;board=null;tab=startTab;render();await load();
  return list;
 }

 dialog.querySelector('[data-close]').onclick=()=>closeDialog(dialog);
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);});
 dialog.querySelector('.event-tabs').onclick=e=>{
  const b=e.target.closest('[data-tab]');if(!b||b.dataset.tab===tab)return;
  tab=b.dataset.tab;render();load();
 };

 dialog.querySelector('[data-call]').onclick=async()=>{
  if(busy)return;busy=true;
  // Новичка зовут открытой ссылкой: адресата нет, и спрашивать «кому» нечего.
  try{await onCreate({rivalIds:[],invite:true});}catch(e){toast(e.message);}finally{busy=false;}
 };

 panel.onclick=async e=>{
  const pick=e.target.closest('[data-scope]');
  if(pick&&pick.dataset.scope!==scope){scope=pick.dataset.scope;board=null;render();load();return;}
  const mate=e.target.closest('[data-claim],[data-invite],[data-callmate]');
  if(mate&&!busy){
   busy=true;mate.disabled=true;
   try{
    if(mate.hasAttribute('data-claim')){await onClaim(mate.dataset.claim||mates.rewardId);mates=await api.referrals();render();}
    // Зовём конкретного кореша: его имя уходит прямо в текст вызова.
    else if(mate.hasAttribute('data-callmate'))await onCreate({rivalIds:[mate.dataset.callmate],names:[mate.dataset.name],photos:[mate.dataset.photo||null]});
    else await onCreate({invite:true});
   }catch(err){toast(err.message);mate.disabled=false;}
   finally{busy=false;}
   return;
  }
  const b=e.target.closest('[data-act]');if(!b||busy)return;
  busy=true;b.disabled=true;
  try{
   // У человека висит время — едем бить его. Нет — ставим своё и зовём именно его.
   if(b.dataset.id)await onStart(b.dataset.id);
   else await onCreate({rivalIds:[b.dataset.mate],names:[b.dataset.name],photos:[b.dataset.photo||null]});
  }catch(err){toast(err.message);b.disabled=false;}
  finally{busy=false;}
 };

 return {open,close:()=>closeDialog(dialog),reload:load,dialog,get tab(){return tab;},setTab(t){tab=t;render();}};
}

// Сколько чужих времён ждут моего заезда. Считает бейдж над кнопкой в гараже: человек без
// висящей стрелки ничего от меня не ждёт, и в цифру он попадать не должен.
export const waitingCount=list=>(list?.people||[]).filter(m=>!m.waiting&&m.challenge?.id).length;

// Экран «кому». Он стоит ДО заезда, и это решение Андрея: раньше человек жал «забить стрелку»,
// молча оказывался один на пустой трассе и не понимал, зачем едет. Теперь сначала видно, ради
// кого стараешься, а приглашение всё равно уходит после финиша — вместе со временем и форой.
export function bindChallengePicker({api,toast=()=>{}}){
 const dialog=document.createElement('dialog');
 dialog.id='challenge-picker';dialog.className='meta-dialog';
 dialog.innerHTML=`<header class="meta-header"><div><h2>КОМУ СТРЕЛКА</h2><small>Проедешь — им уйдёт твоё время</small></div><button class="icon-button" data-close aria-label="Закрыть">✕</button></header>
<div class="challenge-body picker-body">
 <div class="picker-list" data-list></div>
 <button class="primary" data-go>ЕХАТЬ</button>
</div>`;
 (document.querySelector('#game')||document.body).append(dialog);
 const listEl=dialog.querySelector('[data-list]');
 let people=[],chosen=new Set(),resolve=null,loaded=false;

 const finish=answer=>{const done=resolve;resolve=null;closeDialog(dialog);done?.(answer);};

 function render(){
  // «В чат» — всегда первым и всегда доступно: у человека может не быть ни одного кореша в игре,
  // и тупик «звать некого» на этом экране недопустим.
  const chat=`<label class="picker-row is-chat"><input type="checkbox" data-chat ${chosen.has('*')?'checked':''}><span><strong>Кинуть в чат</strong><em>Кто откроет — тот и едет</em></span></label>`;
  const rows=people.map(p=>`<label class="picker-row"><input type="checkbox" data-who="${esc(p.id)}" ${chosen.has(p.id)?'checked':''}><span><strong>${esc(p.name)}</strong><em>${p.challenge?'уже выставил '+secs(p.challenge.time):'позовём письмом'}</em></span></label>`).join('');
  listEl.innerHTML=chat+(rows||(loaded?'<p class="mates-note">Корешей в игре пока нет — кидай в чат.</p>':'<p class="event-empty">Смотрим, кто на районе…</p>'));
  dialog.querySelector('[data-go]').textContent=chosen.size?'ЕХАТЬ':'ПРОСТО ПОСТАВИТЬ ВРЕМЯ';
 }

 // Кого вообще можно позвать: те, кого я уже приводил, и мой круг из таблицы «свои».
 async function load(){
  const seen=new Map();
  const add=p=>{if(p?.id&&!seen.has(p.id))seen.set(p.id,p);};
  const [mates,friends]=await Promise.all([api.referrals().catch(()=>null),api.board('friends').catch(()=>null)]);
  for(const m of mates?.invited||[])add({id:m.id,name:m.name,photo:m.photo,challenge:m.challenge});
  for(const r of friends?.rows||[])if(!r.me)add({id:r.id,name:r.name,challenge:r.challenge});
  people=[...seen.values()].slice(0,20);loaded=true;render();
 }

 listEl.onclick=e=>{
  const box=e.target.closest('input[type=checkbox]');if(!box)return;
  const key=box.hasAttribute('data-chat')?'*':box.dataset.who;
  if(box.checked)chosen.add(key);else chosen.delete(key);
  dialog.querySelector('[data-go]').textContent=chosen.size?'ЕХАТЬ':'ПРОСТО ПОСТАВИТЬ ВРЕМЯ';
 };
 dialog.querySelector('[data-close]').onclick=()=>finish(null);
 dialog.addEventListener('cancel',e=>{e.preventDefault();finish(null);});
 dialog.querySelector('[data-go]').onclick=()=>{
  const ids=[...chosen].filter(k=>k!=='*');
  finish({rivalIds:ids,share:chosen.has('*')||!ids.length,
   names:ids.map(id=>people.find(p=>p.id===id)?.name).filter(Boolean),
   photos:ids.map(id=>people.find(p=>p.id===id)?.photo||null)});
 };

 // Открыть и дождаться выбора. null — человек передумал, заезда не будет.
 function pick(){
  chosen=new Set();people=[];loaded=false;render();
  openDialog(dialog);load().catch(e=>toast(e.message));
  return new Promise(done=>{resolve=done;});
 }
 return {pick,dialog,close:()=>finish(null)};
}
