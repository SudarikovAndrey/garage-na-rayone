// Товары за Telegram Stars. Единственная правда о цене и составе: этот файл читают и игра, и
// сервер — как event-rules.js и duel-rules.js. Разойтись им негде, а значит цену нельзя подменить
// с клиента: в запросе уезжает только id.
//
// Товаров пока нет, кроме служебного. Наполняется отдельной задачей — см. docs/payments.md.

export const STORE={
 // Валюта Telegram Stars. Никакой другой здесь быть не может.
 currency:'XTR',
 // Потолок на счёт, чтобы опечатка в каталоге не превратилась в счёт на миллион звёзд.
 maxStars:100000,
};

// kind:'pack'   — расходуемое, покупается сколько угодно раз;
// kind:'unlock' — вечное, покупается один раз, лежит в entitlements и восстанавливается на входе;
// dev:true      — видно только в dev-режиме: нужен, чтобы проверить боевой платёж целиком,
//                 не раздавая товар людям.
export const SKUS=[
 {id:'probe',kind:'pack',stars:1,dev:true,title:'Проверка связи',note:'Служебный товар. Один доллар в кошелёк.',grant:{hard:1}},
];

export const skuById=id=>SKUS.find(s=>s.id===id)||null;
export const isUnlock=sku=>sku?.kind==='unlock';
// Что показывать в витрине. dev-товары прячутся везде, кроме dev-режима.
export const visibleSkus=({dev=false}={})=>SKUS.filter(s=>dev||!s.dev);

// Состав начисления. Словарь общий с квитанциями (dist/receipts.js): добавить новый вид товара —
// это дописать одну ветку там и одну строчку сюда.
export const GRANT_KINDS=['cash','hard','scrap','crates','car','paint','neon'];

// Сколько куплено суммарно — для потолков доверия (server/trust.js). Считается по оплаченным и
// невозвращённым покупкам: заплативший не должен выглядеть накрутчиком.
export function purchasedTotals(skuIds=[]){
 const out={cash:0,hard:0,scrap:0,cars:0};
 for(const id of skuIds){
  const grant=skuById(id)?.grant;
  if(!grant)continue;
  for(const key of ['cash','hard','scrap'])if(Number.isFinite(grant[key]))out[key]+=grant[key];
  if(Number.isInteger(grant.car))out.cars++;
 }
 return out;
}

// Каталог, который нельзя выложить сломанным: опечатка в цене или в составе не должна доезжать
// до боевого. Зовётся из проверок, а не из игры.
export function auditCatalog(list=SKUS){
 const problems=[],seen=new Set();
 for(const sku of list){
  const where='SKU «'+(sku?.id||'без id')+'»';
  if(!sku?.id||typeof sku.id!=='string')problems.push(where+': нет id');
  else if(seen.has(sku.id))problems.push(where+': id повторяется');
  else seen.add(sku.id);
  if(!['pack','unlock'].includes(sku?.kind))problems.push(where+': kind должен быть pack или unlock');
  if(!Number.isInteger(sku?.stars)||sku.stars<1||sku.stars>STORE.maxStars)problems.push(where+': цена вне 1…'+STORE.maxStars);
  if(!sku?.title)problems.push(where+': нет названия');
  const keys=Object.keys(sku?.grant||{});
  if(!keys.length)problems.push(where+': пустой состав');
  for(const key of keys)if(!GRANT_KINDS.includes(key))problems.push(where+': неизвестный вид товара «'+key+'»');
  // Вечное обязано быть восстановимым: состав должен называть предмет, а не количество.
  if(sku?.kind==='unlock'&&!keys.some(k=>['car','paint','neon'].includes(k)))
   problems.push(where+': вечное без предмета — восстанавливать будет нечего');
  if(sku?.kind==='pack'&&keys.some(k=>['car','paint','neon'].includes(k)))
   problems.push(where+': предмет в разовой пачке — купится дважды');
 }
 return problems;
}
