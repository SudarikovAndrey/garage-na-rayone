// Сейв на сервере. localStorage остаётся кешем: игра обязана открываться без сети и без Telegram.
// Сервер — источник правды при расхождении; спор решаем по updatedAt, как уже делают профили.
const DEBOUNCE=8000;
export function bindCloudSave({fetchImpl=(...a)=>fetch(...a),headers=()=>({}),onAdopt=null,now=()=>Date.now()}={}){
 let revision=0,timer=null,inFlight=false,queued=null,enabled=false;
 const post=async body=>{
  const r=await fetchImpl('/api/save',{method:'POST',headers:{'Content-Type':'application/json',...headers()},body:JSON.stringify(body)});
  if(!r.ok)throw Object.assign(Error('Не удалось сохранить на сервере'),{status:r.status});
  return r.json();
 };
 async function flush(save){
  if(!enabled||inFlight)return null;
  inFlight=true;
  try{
   const data=await post({save,revision});
   revision=data.revision??revision;
   // Пока мы сохраняли, кто-то записал раньше: берём серверную версию, если она новее.
   if(data.conflict&&data.save&&(data.save.updatedAt||0)>(save.updatedAt||0))onAdopt?.(data.save,revision);
   return data;
  }finally{
   inFlight=false;
   if(queued){const next=queued;queued=null;flush(next);}
  }
 }
 return {
  get enabled(){return enabled;},
  get revision(){return revision;},
  // Вход выполнен: сервер прислал свою копию. Если она новее локальной — принимаем её.
  start({save:remote,revision:rev=0,local}){
   enabled=true;revision=rev;
   if(remote&&(remote.updatedAt||0)>(local?.updatedAt||0)+1000){onAdopt?.(remote,revision);return true;}
   if(local)this.push(local);
   return false;
  },
  // Дребезг 8 секунд: в заезде сейв пишется часто, сервер дёргать на каждый чих незачем.
  push(save){
   if(!enabled)return;
   queued=save;clearTimeout(timer);
   timer=setTimeout(()=>{const next=queued;queued=null;flush(next).catch(()=>{queued=next;});},DEBOUNCE);
  },
  // Уход со страницы и конец заезда: пишем немедленно.
  flushNow(save){clearTimeout(timer);queued=null;return flush(save).catch(()=>null);},
  _state:()=>({revision,pending:!!queued,inFlight,at:now()}),
 };
}
