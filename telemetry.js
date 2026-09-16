// Телеметрия плейтестов: одна строка на заезд и на покупку в гараже, без личных данных.
// Приёмники: 1) свой Worker — тот же origin, `/api/telemetry` (включается сам на *.chatgpt.site и *.workers.dev);
// 2) Google Apps Script — открыть игру один раз с ?tm=<url скрипта>, адрес запоминается; ?tm= (пусто) выключает.
// Очередь переживает перезагрузку (localStorage), устройство и запуск помечены случайными id.
const KEY='rayon-telemetry',QUEUE_KEY='rayon-telemetry-queue',DEVICE_KEY='rayon-telemetry-device';
const rnd=()=>Math.random().toString(36).slice(2,10);
const isGoogle=url=>/^https:\/\/script\.google\.com\/macros\//.test(url);
function validReceiver(value){try{const u=new URL(value);return isGoogle(value)||(u.protocol==='https:'&&TELEMETRY_SAME_ORIGIN.test(u.hostname)&&u.pathname==='/api/telemetry'&&!u.username&&!u.password);}catch{return false;}}
import {TELEMETRY_RECEIVER,TELEMETRY_LEGACY,TELEMETRY_SAME_ORIGIN} from './features.js';
// Order: ?tm=<url> (remembered) → ?tm= empty (remembered as 'off') → built-in receiver; never on a local dev server.
export function receiverFor(location,storage,fallback=TELEMETRY_RECEIVER,{worker=true}={}){
 let url=null;
 try{const q=new URLSearchParams(location.search);if(q.has('tm')){url=q.get('tm')||'';if(url&&!validReceiver(url))url='';storage.setItem(KEY,url||'off');if(!url)url='off';}else {url=storage.getItem(KEY);if(url&&url!=='off'&&!validReceiver(url))url=null;}}catch{}
 // Устройство помнит прежний адрес того же приёмника — забываем его, чтобы взять текущий из features.js.
 if(url&&url!=='off'&&TELEMETRY_LEGACY.includes(url)){url=null;try{storage.removeItem(KEY);}catch{}}
 if(url==='off')return null;
 if(!url&&/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname||''))return null;
 if(url&&!worker&&!isGoogle(url))url=null;
 return url||(worker&&TELEMETRY_SAME_ORIGIN.test(location.hostname||'')?'/api/telemetry':fallback)||null;
}
export function setupTelemetry({location:loc=location,storage=localStorage,fetchImpl=(...a)=>fetch(...a),now=()=>Date.now()}={}){
 const url=receiverFor(loc,storage);
 let runId='anon',device='anon';
 try{runId=sessionStorage.getItem(KEY+'-run')||rnd();sessionStorage.setItem(KEY+'-run',runId);}catch{}
 try{device=storage.getItem(DEVICE_KEY)||rnd()+rnd();storage.setItem(DEVICE_KEY,device);}catch{}
 let queue=[];try{queue=JSON.parse(storage.getItem(QUEUE_KEY)||'[]');if(!Array.isArray(queue))queue=[];}catch{queue=[];}
 const persist=()=>{try{storage.setItem(QUEUE_KEY,JSON.stringify(queue.slice(-200)));}catch{}};
 let flushing=false;
 async function flush(){if(!url||flushing||!queue.length)return;flushing=true;const rows=queue.slice(0,25);
  try{const sameOrigin=url.startsWith('/'),google=isGoogle(url);const res=await fetchImpl(url,{method:'POST',mode:sameOrigin?'same-origin':google?'no-cors':'cors',keepalive:true,headers:{'Content-Type':google?'text/plain;charset=utf-8':'application/json'},body:JSON.stringify({game:'garage',device,runId,rows})});
   if(!google&&(!res||!res.ok))throw new Error('telemetry '+res?.status);if(!google){const ack=await res.json();if(ack.ok!==true||ack.accepted!==rows.length)throw new Error('telemetry unacknowledged');}queue.splice(0,rows.length);persist();}
  catch{}finally{flushing=false;if(queue.length)setTimeout(flush,8000);}}
 if(url){addEventListener('pagehide',()=>{flush();});if(queue.length)setTimeout(flush,1500);}
 return {enabled:!!url,url,runId,device,pending:()=>queue.length,send(kind,row){if(!url)return;queue.push({...row,...(row.kind&&row.kind!==kind?{kind2:row.kind}:{}),kind,t:now(),runId,eventId:rnd()+rnd()+rnd()});persist();flush();}};
}
