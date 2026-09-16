import {availableDriftBonuses} from './drift-bonuses.js';
import {PARTS,canInstall} from './progression.js';
import {nextGarage,garageRequirement} from './garage-levels.js';
import {CRATES,crateCount} from './crates.js';
import {TRACKS,trackIndex} from './tracks.js';
import {UNLOCKS} from './unlocks.js';

// Separate presentation ledger: never modify the player's progression or inventory.
export const NOTICE_KEY='rayon-notices-v1';
export function noticeEntries(s){
 const out=[];const add=(key,version,groups,selector,ready=false,count=1)=>out.push({key,version:String(version),groups,selector,ready,count});
 for(const p of PARTS)if(s.inventory?.[p.id])add('part:'+p.id,canInstall(s,p.id).ok?'available':'stored',['tuning',['engine','tires','gearbox'].includes(p.slot)?'power':'body',p.slot],`[data-custom-part="${p.id}"]`);
 for(const id of s.ownedPaints||[])add('paint:'+id,1,['tuning','paint'],`[data-paint="${id}"]`);
 for(const id of new Set((s.ownedDecals||[]).flat()))add('decal:'+id,1,['tuning','paint'],`[data-decal="${id}"]`);
 (s.unlockedCars||[]).forEach((open,i)=>{const shards=s.carShards?.[i]||0;if(open||shards)add('car:'+i,`${!!open}:${shards}`,['cars'],`[data-car="${i}"],[data-shard-car="${i}"]`);});
 for(const c of CRATES){const n=crateCount(s,c.id)||0;if(n)add('crate:'+c.id,n,['boxes'],`[data-open-box="${c.id}"]`,true,n);}
 TRACKS.forEach((t,i)=>{if(!t.bonus&&i<=trackIndex(s.rank))add('track:'+i,1,['career'],`[data-track="${i}"]`);});
 for(const u of UNLOCKS)if(u.when(s)){
  const group={customize:'tuning',fleet:'cars',crates:'boxes',garage:'garage',shop:'shop',training:'career',duels:'career'}[u.id];
  if(group)add('unlock:'+u.id,1,[group],null);
 }
 for(const t of availableDriftBonuses(s))add('drift-bonus:'+t.key,1,['career'],`[data-bonus-drift="${t.key}"]`,true);
 const garage=nextGarage(s);if(garage&&garageRequirement(s).ok)add('garage:'+garage.level,1,['garage'],'#garage-upgrade');
 return out;
}
export function reconcileNotices(previous,entries){
 const valid=previous?.version===1&&previous.seen&&typeof previous.seen==='object';
 const seen={};for(const e of entries)if(!e.ready){if(!valid)seen[e.key]=e.version;else if(Object.hasOwn(previous.seen,e.key))seen[e.key]=String(previous.seen[e.key]);}
 return {version:1,seen};
}
export const unreadNotice=(ledger,e)=>e.ready||ledger.seen[e.key]!==e.version;
export function acknowledgeNotice(ledger,entry){if(entry&&!entry.ready)ledger.seen[entry.key]=entry.version;}

export function bindNotifications(){
 const game=document.querySelector('#game');if(!game)return;
 let ledger,entries=[],pending=0,lastSave='',save=null;const watched=new Set(),timers=new Map(),intersecting=new Set();
 const read=key=>{try{return JSON.parse(localStorage.getItem(key));}catch{return null;}};
 ledger=read(NOTICE_KEY);
 const write=()=>{try{localStorage.setItem(NOTICE_KEY,JSON.stringify(ledger));}catch{/* Marks remain usable for this session. */}};
 const visible=node=>{
  if(!node.isConnected||document.hidden||node.closest('[hidden],[inert],[aria-hidden="true"]'))return false;
  if(document.querySelector('#celebration:not([hidden]),#boss-intro:not([hidden]),#scene-transition:not([hidden])'))return false;
  const dialog=document.querySelector('dialog[open]');if(dialog&&!dialog.contains(node))return false;
  const r=node.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(node).visibility!=='hidden';
 };
 function mark(key){const entry=entries.find(e=>e.key===key);if(!entry||!unreadNotice(ledger,entry))return;acknowledgeNotice(ledger,entry);write();schedule();}
 const observer=new IntersectionObserver(changes=>{for(const c of changes){const node=c.target;clearTimeout(timers.get(node));timers.delete(node);if(c.isIntersecting&&c.intersectionRatio>=.55){intersecting.add(node);if(visible(node))timers.set(node,setTimeout(()=>{timers.delete(node);if(intersecting.has(node)&&visible(node))mark(node.dataset.noticeItem);},1200));}else intersecting.delete(node);}}, {threshold:[0,.55]});
 function badge(node,label){
  let b=node.querySelector(':scope > .notice-mark');
  if(!label){b?.remove();node.classList.remove('notice-host');return;}
  node.classList.add('notice-host');if(!b){b=document.createElement('span');b.className='notice-mark';b.setAttribute('role','img');node.append(b);}
  const text=label==='new'?'':'!';if(b.textContent!==text)b.textContent=text;
  const name=label==='new'?'Есть новое':'Есть награда: '+label;if(b.getAttribute('aria-label')!==name)b.setAttribute('aria-label',name);
 }
 function refresh(){
  pending=0;const next=read('rayon-drag-v2');if(!next)return;const raw=JSON.stringify(next);
  if(raw!==lastSave){save=next;entries=noticeEntries(save);ledger=reconcileNotices(ledger,entries);lastSave=raw;write();}
  const wanted=new Map(),unread=entries.filter(e=>unreadNotice(ledger,e));
  const groupSelectors={tuning:'#configure-button',power:'[data-custom-group="power"]',body:'[data-custom-group="body"]',paint:'[data-custom-group="paint"]',cars:'#switch-car',boxes:'[data-meta="boxes"]',career:'[data-meta="rivals"]',shop:'[data-meta="shop"]',garage:'#garage-upgrade'};
  for(const p of PARTS)groupSelectors[p.slot]=`[data-custom-slot="${p.slot}"]`;
  for(const [group,selector] of Object.entries(groupSelectors)){
   const list=unread.filter(e=>e.groups.includes(group));if(list.length)for(const node of document.querySelectorAll(selector))wanted.set(node,list.some(e=>e.ready)?String(list.reduce((n,e)=>n+(e.ready?e.count:0),0)):'new');
  }
  for(const e of unread)if(e.selector)for(const node of document.querySelectorAll(e.selector)){
   wanted.set(node,e.ready?String(e.count):'new');
   if(!e.ready){node.dataset.noticeItem=e.key;if(!watched.has(node)){watched.add(node);observer.observe(node);}}
  }
  // Server-backed rewards already expose eligibility. Never invent or poll server state.
  const claims=[...document.querySelectorAll('[data-event-claim]:not(:disabled),[data-claim-goal]:not(:disabled)')];
  for(const node of claims)wanted.set(node,'1');
  if(document.querySelector('#event-button.has-reward')||claims.some(n=>n.hasAttribute('data-event-claim')))for(const node of document.querySelectorAll('#event-button,[data-event-tab="pass"]'))wanted.set(node,'1');
  for(const node of document.querySelectorAll('.notice-host'))if(!wanted.has(node))badge(node,null);
  for(const [node,label] of wanted)badge(node,label);
  for(const node of intersecting)if(watched.has(node)&&!timers.has(node)&&visible(node))timers.set(node,setTimeout(()=>{timers.delete(node);if(intersecting.has(node)&&visible(node))mark(node.dataset.noticeItem);},1200));
  for(const node of watched)if(!node.isConnected||!wanted.has(node)){observer.unobserve(node);watched.delete(node);intersecting.delete(node);clearTimeout(timers.get(node));timers.delete(node);}
 }
 function schedule(){if(!pending)pending=setTimeout(refresh,80);}
 const mutation=new MutationObserver(records=>{
  if(records.every(r=>r.target.closest?.('.notice-mark')||r.type==='childList'&&[...r.addedNodes,...r.removedNodes].every(n=>n.nodeType===1&&n.classList.contains('notice-mark'))))return;
  schedule();
 });
 for(const selector of ['#garage-screen','#meta-dialog','#event-dialog','#result-dialog','#cash','#hard']){const node=document.querySelector(selector);if(node)mutation.observe(node,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['open','hidden','inert','data-panel','disabled']});}
 new MutationObserver(schedule).observe(game,{attributes:true,attributeFilter:['data-screen']});
 document.addEventListener('click',e=>{
  const node=e.target.closest('button');if(!node||node.disabled)return;
  const group=node.id==='configure-button'?'tuning':node.id==='switch-car'?'cars':node.id==='garage-upgrade'?'garage':node.dataset.meta==='boxes'?'boxes':node.dataset.meta==='shop'?'shop':node.hasAttribute('data-practice-open')?'training':node.hasAttribute('data-pvp-open')?'duels':null;
  if(group)for(const entry of entries)if(entry.key.startsWith('unlock:')&&(entry.groups.includes(group)||entry.key==='unlock:'+group))mark(entry.key);
  if(node.dataset.noticeItem)mark(node.dataset.noticeItem);
  schedule();
 },true);
 window.addEventListener('storage',e=>{if(e.key===NOTICE_KEY){ledger=read(NOTICE_KEY);schedule();}else if(e.key==='rayon-drag-v2'||e.key===null){if(!read('rayon-drag-v2')){ledger=null;lastSave='';}schedule();}});
 document.addEventListener('visibilitychange',schedule);document.addEventListener('scroll',schedule,true);
 refresh();
}
if(typeof document!=='undefined')bindNotifications();
