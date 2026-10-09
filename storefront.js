import {visibleSkus} from './store-catalog.js';
import {applyReceipts} from './receipts.js';
const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function storefrontMarkup({busy=false,available=false,message=''}={}){
 return `<section class="stars-store"><p class="crate-note">Быстрее подготовь машину. После покупки открой ящик и поставь деталь в мастерской. Переключения всё равно решают.</p>${visibleSkus().map(s=>`<article class="stars-pack"><h3>${esc(s.title)}</h3><p>${esc(s.note)}</p>${s.id!=='tune-unique'?'<small>Мотор, шины или КПП: выбирается самый слабый из доступных узлов. Новая деталь ранга 1. Повтор → материалы.</small>':'<small>Сначала именная деталь своей машины, пока они не собраны. Затем любая уникальная. Повтор → материалы. Апгрейд — пока есть неоткрытые.</small>'}<button class="primary" data-stars-buy="${s.id}" ${busy||!available?'disabled':''}>${s.stars} ★ · КУПИТЬ</button></article>`).join('')}<p class="crate-note" role="status">${esc(message||(!available?'Открой игру в Telegram и войди, чтобы оплатить звёздами.':'Цена в Stars. Telegram покажет счёт до оплаты.'))}</p><button class="secondary" data-stars-sync ${busy||!available?'disabled':''}>ПРОВЕРИТЬ ПОКУПКУ</button><button class="secondary" data-recovery="training">ЗАРАБОТАТЬ В ТРЕНИРОВКЕ</button><button class="secondary" data-meta-boxes>МОИ ЯЩИКИ</button></section>`;
}
// The invoice callback is not a receipt. Apply only confirmed server payloads, persist together.
export async function receivePurchase(save,store,{sku=null,persist=()=>{}}={}){
 const result=sku?await store.buy(sku):{status:'sync',receipts:(await store.sync()).pending||[]};
 const applied=applyReceipts(save,result.receipts||[]);
 if(applied.applied.length)await persist();
 return {...result,...applied};
}
