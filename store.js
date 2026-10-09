// Магазин за звёзды на стороне игры. Только разговор с сервером и состояния покупки: ничего про
// вёрстку — витрина пользуется этим модулем и не знает ни адресов, ни заголовков.
//
// Покупка за звёзды асинхронная и этим отличается от траты рублей: счёт выставляется, человек уходит
// в окно Telegram, а товар приезжает вебхуком — иногда позже, чем игрок вернулся. Поэтому
// незакрытая покупка лежит в localStorage и досылается при следующем входе. Та же механика, что у
// стрелок (rayon-challenge-pending), и она уже проверена обрывами связи.
import {visibleSkus,skuById} from './store-catalog.js';

const PENDING='rayon-store-pending';

export function bindStore({fetchImpl=(...a)=>fetch(...a),headers=()=>({}),storage=globalThis.localStorage,webApp=null,dev=false}={}){
 let memory=null;

 const call=async(path,body,timeout=15000)=>{
  const r=await fetchImpl('/api/store'+path,{
   method:body?'POST':'GET',
   headers:{...(body?{'Content-Type':'application/json'}:{}),...headers()},
   body:body?JSON.stringify(body):undefined,
   signal:AbortSignal.timeout(timeout),
  });
  if(!r.headers.get('content-type')?.includes('json'))throw Error('Магазин сейчас недоступен');
  const data=await r.json();
  if(!r.ok)throw Object.assign(Error(data.error||'Не получилось'),{status:r.status});
  return data;
 };

 const readPending=()=>{
  if(memory)return memory;
  try{return JSON.parse(storage?.getItem(PENDING)||'null');}catch{return null;}
 };
 const writePending=value=>{
  memory=value;
  try{value?storage?.setItem(PENDING,JSON.stringify(value)):storage?.removeItem(PENDING);}catch{}
 };

 // Окно оплаты Telegram. Отвечает одним словом: paid, cancelled, failed или pending.
 const openInvoice=link=>new Promise((resolve,reject)=>{
  const app=webApp||globalThis.Telegram?.WebApp;
  if(!app?.openInvoice)return reject(Error('Оплата звёздами доступна только в Telegram'));
  try{app.openInvoice(link,status=>resolve(String(status||'')));}catch(e){reject(e);}
 });

 const sync=()=>call('/sync',{});

 // Закрыть очередь, если сервер больше не считает счёт висящим. Возвращает то, что он рассказал:
 // невыданные квитанции применяет вызывающий — вместе с сохранением сейва, а не отдельно от него.
 const settle=async id=>{
  const data=await sync().catch(()=>null);
  if(data&&!(data.open||[]).some(row=>row.id===id))writePending(null);
  return data;
 };

 return {
  // Витрина рисуется из сборки и открывается без сети: каталог уже здесь.
  catalog:()=>visibleSkus({dev}),
  skuById,
  // Что уже куплено и какие счета висят. Один запрос, и тот не держит открытие витрины.
  load:()=>call(''),
  // Забрать начисленное. Применяет квитанции вызывающий через dist/receipts.js: применение
  // обязано случиться вместе с сохранением сейва, иначе выдача снова станет теряться на обрыве.
  sync,
  pending:readPending,
  forget:()=>writePending(null),

  // Покупка целиком. Возвращает {status, receipts} — что показать и что начислить.
  async buy(skuId){
   const invoice=await call('/invoice',{sku:skuId});
   writePending({id:invoice.id,sku:invoice.sku,at:Date.now()});
   let status='pending';
   try{status=await openInvoice(invoice.link);}
   catch(e){writePending(null);throw e;}
   // Отказ и отмена закрывают очередь сразу: ждать нечего, денег не списали.
   if(status==='cancelled'||status==='failed'){writePending(null);return {status,payment:invoice.id,sku:invoice.sku,receipts:[]};}
   // 'paid' от Telegram не означает, что товар уже начислен: вебхук мог не успеть. Решает сервер —
   // закрыт счёт или ещё висит. Не ответил — покупка остаётся в очереди и доедет при следующем входе.
   const data=await settle(invoice.id);
   return {status,payment:invoice.id,sku:invoice.sku,receipts:data?.pending||[]};
  },

  // Досылка после обрыва: зовётся при входе, если в очереди что-то осталось. Пустой ответ на
  // свежую покупку — норма: вебхук в пути, попробуем в следующий раз.
  async flush(){
   const p=readPending();
   if(!p)return null;
   return settle(p.id);
  },
 };
}
