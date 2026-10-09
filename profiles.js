// Игровые профили по имени, без пароля (плейтест среди своих). Активный сейв всегда лежит в SAVE_KEY, чтобы остальная
// игра ничего не знала о профилях; копии профилей — в SAVE_KEY+':'+имя. Облако — тот же приёмник Apps Script, что и
// телеметрия (?tm=): POST {kind:'save', profile, save}, GET ?profile=Имя. На старте берём то, что новее по updatedAt.
import {TELEMETRY_RECEIVER} from './features.js';
import {receiverFor} from './telemetry.js';
import {effectiveLevels,rating} from './progression.js';
import {CARS} from './fleet.js';
import {avatarSrc,validAvatar} from './avatar.js';
export const SAVE_KEY='rayon-drag-v2',INDEX_KEY='rayon-profiles',CLOUD_KEY='rayon-profiles-cloud',RECEIVER_KEY='rayon-telemetry';
// Мощь считаем той же формулой, что и в гараже, — по надетым деталям выбранной машины. Сейв из облака
// бывает старого формата, поэтому любая осечка просто означает «мощь неизвестна», а не падение списка.
export const savePower=s=>{try{return rating(effectiveLevels(s),CARS[s?.selected??0]?.id)||0;}catch{return 0;}};
export const cleanName=n=>String(n||'').trim().replace(/\s+/g,' ').slice(0,24);
export function createProfiles({storage=localStorage,fetchImpl=(...a)=>fetch(...a),now=()=>Date.now(),reload=()=>location.reload()}={}){
 const read=k=>{try{return JSON.parse(storage.getItem(k)||'null');}catch{return null;}},write=(k,v)=>{try{storage.setItem(k,JSON.stringify(v));}catch{}};
 const index=()=>{const i=read(INDEX_KEY)||{current:null,list:[]};if(!Array.isArray(i.list))i.list=[];return i;};
 const receiver=()=>{try{return receiverFor(typeof location==='undefined'?{search:'',hostname:''}:location,storage,TELEMETRY_RECEIVER,{worker:false});}catch{return null;}};
 const summary=s=>({rank:s?.rank||0,garage:s?.garage||1,cash:s?.cash||0,updatedAt:s?.updatedAt||0,power:savePower(s),races:s?.races||0,wins:s?.wins||0});
 function touch(name,save){const i=index();const item=i.list.find(p=>p.name===name)||(i.list.push({name}),i.list.at(-1));Object.assign(item,summary(save));i.current=name;write(INDEX_KEY,i);}
 let pushTimer=null,lastPushed='';
 async function push(name,save){const url=receiver();if(!url||!name)return false;const body=JSON.stringify({game:'garage',kind:'save',profile:name,save});if(body===lastPushed)return true;try{await fetchImpl(url,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain;charset=utf-8'},body});lastPushed=body;return true;}catch{return false;}}
 async function pull(name){const url=receiver();if(!url||!name)return null;try{const r=await fetchImpl(url+'?profile='+encodeURIComponent(name),{method:'GET'});const text=await r.text();if(!text||text==='no')return null;const data=JSON.parse(text);return data&&typeof data==='object'?data:null;}catch{return null;}}
 // Список из облака идёт через Apps Script и думает несколько секунд, поэтому последний ответ помним:
 // окно профиля открывается сразу со знакомыми именами, а свежий список подъезжает следом.
 async function listCloud(){const url=receiver();if(!url)return [];try{const r=await fetchImpl(url+'?profiles=1');const data=JSON.parse(await r.text());if(!Array.isArray(data))return [];write(CLOUD_KEY,data);return data;}catch{return [];}}
 return {
  receiver,index,current:()=>index().current,summary,
  // Called after every persist: keeps the profile copy and index fresh, pushes to the cloud at most once per 8 s.
  afterPersist(save){const name=index().current;if(!name)return;write(SAVE_KEY+':'+name,save);touch(name,save);clearTimeout(pushTimer);pushTimer=setTimeout(()=>push(name,save),8000);},
  flush(save){const name=index().current;if(name)return push(name,save);},
  // Name the current unnamed save (first run) or create a fresh profile; switching archives the active save first.
  create(name){name=cleanName(name);if(!name)return null;const i=index();if(!i.list.some(p=>p.name===name)){i.list.push({name,rank:0,garage:1,cash:0,updatedAt:0});write(INDEX_KEY,i);write(SAVE_KEY+':'+name,null);}return name;},
  adopt(name,activeSave){name=cleanName(name);if(!name)return null;write(SAVE_KEY+':'+name,activeSave);touch(name,activeSave);return name;},
  // Ввод имени на устройстве, где уже есть безымянный прогресс: если в облаке под этим именем прогресс дальше,
  // берём его, а не затираем (у одного игрока бывает два телефона с разными сейвами).
  async adoptOrContinue(name,activeSave){name=cleanName(name);if(!name)return null;const cloud=await pull(name);
   if(cloud&&(cloud.rank||0)>(activeSave?.rank||0)){write(SAVE_KEY,cloud);write(SAVE_KEY+':'+name,cloud);touch(name,cloud);reload();return {name,continued:true,rank:cloud.rank||0};}
   write(SAVE_KEY+':'+name,activeSave);touch(name,activeSave);push(name,activeSave);return {name,continued:false,rank:activeSave?.rank||0};},
  async select(name,activeSave){name=cleanName(name);const i=index();if(i.current&&activeSave)write(SAVE_KEY+':'+i.current,activeSave);let next=read(SAVE_KEY+':'+name);const cloud=await pull(name);if(cloud&&(!next||(cloud.updatedAt||0)>(next.updatedAt||0)))next=cloud;if(next)write(SAVE_KEY,next);else{try{storage.removeItem(SAVE_KEY);}catch{}}touch(name,next);reload();return next;},
  reset(name){name=cleanName(name);try{storage.removeItem(SAVE_KEY);storage.removeItem(SAVE_KEY+':'+name);}catch{}const i=index();const item=i.list.find(p=>p.name===name);if(item)Object.assign(item,{rank:0,garage:1,cash:0,updatedAt:0});write(INDEX_KEY,i);reload();},
  // On start: if the cloud copy of the current profile is newer, take it (once per tab to avoid loops).
  async syncOnStart(activeSave,session=sessionStorage){const name=index().current;if(!name||!receiver())return false;try{if(session.getItem('rayon-profile-synced')===name)return false;session.setItem('rayon-profile-synced',name);}catch{}const cloud=await pull(name);if(cloud&&(cloud.updatedAt||0)>(activeSave?.updatedAt||0)+1000){write(SAVE_KEY,cloud);write(SAVE_KEY+':'+name,cloud);touch(name,cloud);reload();return true;}if(activeSave)push(name,activeSave);return false;},
  listCloud,pull,push,
  cloudCache(){const c=read(CLOUD_KEY);return Array.isArray(c)?c:[];},
  // Чужой профиль в списке — одно имя и дата. Чтобы в строке были ранг, мощь и заезды, тянем сейвы
  // тех, про кого ещё ничего не знаем, разом и запоминаем в индексе: во второй раз список уже готов.
  async describe(names=[]){
   const known=index();
   const unknown=[...new Set(names.map(cleanName).filter(Boolean))].filter(n=>known.list.find(p=>p.name===n)?.power===undefined);
   if(!unknown.length)return known.list;
   const saves=await Promise.all(unknown.map(n=>pull(n).catch(()=>null)));
   const fresh=index();
   unknown.forEach((name,k)=>{const s=saves[k];if(!s)return;const item=fresh.list.find(p=>p.name===name)||(fresh.list.push({name}),fresh.list.at(-1));Object.assign(item,summary(s));});
   write(INDEX_KEY,fresh);
   return fresh.list;
  },
 };
}
// Экран профиля. Игроку здесь — его лицо, имя и чем он живёт: ранг, победы, машины.
// Всё остальное (позывные, «Наигранное», облако, сброс) — наладка, и её видно только после
// десяти тапов по заголовку. photo — аватар из Telegram, name — имя оттуда же.
export function profileMarkup(profiles,save,cloudList=[],{required=false,dev=false,photo=null,name=null}={}){
 const i=profiles.index(),url=profiles.receiver(),names=new Set(i.list.map(p=>p.name));for(const c of cloudList)if(!names.has(c.name))i.list.push({name:c.name,cloud:true,updatedAt:Date.parse(c.updated)||0});
 const when=t=>t?new Date(t).toLocaleString('ru-RU',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
 const current=i.current,others=i.list.filter(p=>p.name!==current);
 const emblem='<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true"><circle cx="24" cy="17" r="9" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 42c2-9 8-13 16-13s14 4 16 13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
 const who=name||current||'ГОНЩИК';
 const face=avatarSrc(save,photo);
 const portrait=`<div class="profile-emblem${face?' has-photo':''}">${face?`<img src="${esc(face)}" alt="" width="88" height="88">`:emblem}</div>`;
 const heading=`<div class="event-season"><span data-dev-tap>ПРОФИЛЬ</span><b>${esc(who)}</b><small>${dev?(url?'НАЛАДКА · ПРОГРЕСС В ОБЛАКЕ ПО ПОЗЫВНОМУ':'НАЛАДКА · ТОЛЬКО В ЭТОМ БРАУЗЕРЕ'):'ГОНЩИК С РАЙОНА'}</small></div>`;
 // Своё фото перекрывает телеграмовское; вернуть исходное можно, пока оно есть.
 const photoButtons=`<div class="profile-photo-actions"><button class="secondary" data-avatar-pick>${validAvatar(save?.avatar)?'ДРУГОЕ ФОТО':'СВОЁ ФОТО'}</button>${validAvatar(save?.avatar)?`<button class="secondary" data-avatar-clear>${photo?'ВЕРНУТЬ ИЗ TELEGRAM':'УБРАТЬ ФОТО'}</button>`:''}</div>`;
 const tabs=`<div class="event-tabs" role="tablist"><button role="tab" aria-selected="true">ПРОФИЛЬ</button><button role="tab" aria-selected="false" data-share-stats>НАИГРАННОЕ</button></div>`;
 const stats=`<div class="event-stats"><div><b>${save?.rank||0}</b><small>РАНГ</small></div><div><b>${save?.wins||0}/${save?.races||0}</b><small>ПОБЕДЫ</small></div><div><b>${(save?.unlockedCars||[]).filter(Boolean).length}</b><small>МАШИН</small></div></div>`;
 // Строка профиля должна отвечать на «сколько там наиграно», а не только «он есть в облаке».
 const races=n=>n+' '+(n%10===1&&n%100!==11?'заезд':[2,3,4].includes(n%10)&&![12,13,14].includes(n%100)?'заезда':'заездов');
 const progress=p=>p.power===undefined
  ?[p.cloud?'в облаке':'ранг '+(p.rank||0)+' · гараж '+(p.garage||1),p.updatedAt?when(p.updatedAt):'']
  :[['ранг '+(p.rank||0),p.power?'мощь '+p.power:'','гараж '+(p.garage||1)].filter(Boolean).join(' · '),[p.races?races(p.races):'ещё не гонял',p.updatedAt?when(p.updatedAt):''].filter(Boolean).join(' · ')];
 const list=others.length?`<div class="profile-list">${others.map(p=>{const [head,tail]=progress(p);return `<button class="profile-row" data-profile-play="${esc(p.name)}"><span class="profile-row-emblem">${emblem}</span><span class="profile-row-text"><b>${esc(p.name)}</b><small>${esc(head)}</small>${tail?`<small>${esc(tail)}</small>`:''}</span><span class="profile-row-go">ИГРАТЬ</span></button>`;}).join('')}</div>`:'';
  if(required){
  // Первый запуск — выдача номера: на столе лежит пустая пластина, игрок вписывает позывной и
  // код региона. Экран про одно, поэтому ни портрета, ни статистики здесь нет.
  // Позывной — десять знаков (дальше буквы мельче подписи), регион — три цифры без «RUS»:
  // игрок может быть не из России.
  const pick=list?`<div class="callsign-who"><span class="tiny-label">УЖЕ ИГРАЛ?</span>${list}</div>`:'';
  return `<section class="callsign">
  <i class="callsign-wood" aria-hidden="true"></i><i class="callsign-grain" aria-hidden="true"></i>
  <i class="callsign-lamp" aria-hidden="true"></i><i class="callsign-vignette" aria-hidden="true"></i>
  <img class="callsign-logo" src="assets/logo-garage.png" alt="Гараж на районе" data-dev-tap>
  <form class="callsign-form" data-profile-create>
   <label class="callsign-ask" for="profile-name">Впиши позывной</label>
   <div class="plate-wrap">
    <div class="plate">
     <input class="plate-name" id="profile-name" name="name" maxlength="10" placeholder="АНДРЕЙ"
      autocomplete="off" spellcheck="false" required autofocus>
     <input class="plate-region" name="region" maxlength="3" inputmode="numeric" placeholder="63" autocomplete="off"
      aria-label="Код региона">
     <i class="plate-gloss" aria-hidden="true"></i><i class="plate-frame" aria-hidden="true"></i>
     <i class="plate-split" aria-hidden="true"></i>
     <i class="plate-bolt plate-bolt--l" aria-hidden="true"></i><i class="plate-bolt plate-bolt--r" aria-hidden="true"></i>
    </div>
   </div>
   <span class="callsign-region-label">РЕГИОН</span>
   <button class="primary callsign-go" type="submit">В ГАРАЖ <b aria-hidden="true">→</b></button>
  </form>
  <p class="callsign-note">${url?'Позывной вместо пароля — вход с любого телефона':'Позывной живёт только в этом браузере'}</p>
  ${pick}</section>`;
 }
 // Обычный игрок видит себя: лицо, имя, чем живёт. Ниже — только наладка.
 const card=`<section class="event-profile profiles">${portrait}<h3>${esc(who)}</h3><span class="event-league">СВОЙ НА РАЙОНЕ · ГАРАЖ ${['','Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ'][save?.garage||1]}</span>${stats}${photoButtons}</section>`;
 if(!dev)return heading+card;
 return heading+tabs+card+`<section class="event-profile profiles dev-tools"><span class="tiny-label">НАЛАДКА</span>
 <form class="profile-new" data-profile-create><label for="profile-name">${current?'НОВЫЙ ПРОФИЛЬ':'ПОЗЫВНОЙ'}</label><input id="profile-name" name="name" maxlength="24" placeholder="${current?'имя нового профиля':'например, Андрей'}" autocomplete="off" spellcheck="false" required><button class="primary" type="submit">${current?'СОЗДАТЬ ПРОФИЛЬ':'СОХРАНИТЬ'}</button></form>
 ${list}
 ${url?'<button class="secondary" data-profile-cloud>ПОКАЗАТЬ ПРОФИЛИ ИЗ ОБЛАКА</button>':''}
 <p class="event-note">${url?'Сейв уходит в облако после каждого заезда. На другом телефоне выбери это имя — и продолжай.':'Приёмник выключен на этом устройстве: имена живут только здесь.'}</p>
 ${current?'<button class="reset-progress" data-profile-reset>СБРОСИТЬ ПРОГРЕСС ЭТОГО ПРОФИЛЯ</button><p class="reset-progress-note">Кампания, гараж, машины и детали этого профиля начнутся заново. Другие профили не тронет.</p>':''}</section>`;
}

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
