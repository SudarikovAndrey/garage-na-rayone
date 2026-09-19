// Квитанции: то, что сервер начислил, а игра применила к сейву.
//
// Правило одно и оно важнее остального кода здесь: **выданным считается то, что сервер увидел в
// сейве**, а не то, что он отправил. Поэтому id квитанции ложится в сам сейв, и повторное
// применение ничего не делает. Телефон умер между начислением и сохранением — квитанция приедет
// снова и применится снова, а второй пачки не будет.
//
// До этого модуля выдача жила в game.js и умела только ящики, причём помечала право выданным
// раньше, чем сейв уезжал на сервер: обрыв связи в этой щели терял приз. Разбор — docs/payments.md.
import {addPart,partById,refreshUnlocks,isCarUnlocked,RECEIPTS_KEPT} from './progression.js';
import {grantCrate} from './crates.js';
import {ownsPaint,paintById} from './paints.js';
import {addNeon,ownsNeon} from './neons.js';

// Потолок списка живёт в progression.js: это свойство сейва, а не выдачи. Здесь он только виден наружу.
export {RECEIPTS_KEPT};

export const receiptIds=save=>Array.isArray(save?.receipts)?save.receipts:[];
export const hasReceipt=(save,id)=>receiptIds(save).includes(id);

// Что начислить. Словарь общий с каталогом (dist/store-catalog.js, GRANT_KINDS): новый вид товара —
// это одна ветка здесь и одна строчка там. Возвращает, что реально прибавилось: интерфейсу нужно
// показать именно это, а не то, что было обещано.
function applyGrant(save,grant,reason){
 const got={cash:0,hard:0,scrap:0,crates:[],cars:[],paints:[],neons:[],parts:[]};
 if(!grant||typeof grant!=='object')return got;
 for(const key of ['cash','hard','scrap']){
  const amount=Math.floor(Number(grant[key])||0);
  if(amount>0){save[key]=(Number(save[key])||0)+amount;got[key]+=amount;}
 }
 for(const id of Array.isArray(grant.crates)?grant.crates:[]){
  grantCrate(save,id,reason);got.crates.push({id});
 }
 for(const id of Array.isArray(grant.parts)?grant.parts:[]){
  if(partById(id))got.parts.push(addPart(save,id));
 }
 // Вечное. Машина за реальные деньги встаёт в гараж мимо чертежей и мимо свободных мест: место —
 // это игровое ограничение, а купленное обязано быть у человека. Потолок «машин больше, чем мест»
 // сервер поднимает на купленное (server/trust.js), иначе покупка пометила бы плательщика.
 if(Number.isInteger(grant.car)&&save.unlockedCars?.[grant.car]!==undefined&&!isCarUnlocked(save,grant.car)){
  save.unlockedCars[grant.car]=true;
  // Пусть покажется во весь экран, как любая новая машина.
  if(Array.isArray(save.revealedCars))save.revealedCars[grant.car]=false;
  got.cars.push(grant.car);
 }
 if(grant.paint&&paintById(grant.paint)&&!ownsPaint(save,grant.paint)){
  save.ownedPaints.push(grant.paint);got.paints.push(grant.paint);
 }
 if(grant.neon&&!ownsNeon(save,grant.neon)){
  try{addNeon(save,grant.neon);got.neons.push(grant.neon);}catch{}
 }
 refreshUnlocks(save);
 return got;
}

const empty=()=>({cash:0,hard:0,scrap:0,crates:[],cars:[],paints:[],neons:[],parts:[]});

// Применить список квитанций с сервера. Возвращает {applied, got}: applied — id, которые сервер
// увидит в сейве и на этом успокоится; got — что показать человеку.
//
// Порядок важен: сначала начисляем, потом отмечаем. Упадём посередине одной квитанции — id не
// попадёт в сейв, и она приедет снова.
export function applyReceipts(save,list=[]){
 if(!save)return {applied:[],got:empty()};
 const known=new Set(receiptIds(save));
 const applied=[],got=empty();
 for(const receipt of Array.isArray(list)?list:[]){
  const id=receipt?.id;
  if(typeof id!=='string'||!id||known.has(id))continue;
  const part=applyGrant(save,receipt.payload,receipt.source==='payment'?'Покупка за звёзды':'Награда');
  for(const key of ['cash','hard','scrap'])got[key]+=part[key];
  for(const key of ['crates','cars','paints','neons','parts'])got[key].push(...part[key]);
  known.add(id);applied.push(id);
 }
 if(applied.length)save.receipts=[...receiptIds(save),...applied].slice(-RECEIPTS_KEPT);
 return {applied,got};
}

// Было ли что показывать. Пустая выдача — нормальный случай: квитанцию могли применить на другом
// устройстве, и второй раз она ничего не прибавит.
export const gotSomething=got=>!!got&&(got.cash>0||got.hard>0||got.scrap>0||
 got.crates.length>0||got.cars.length>0||got.paints.length>0||got.neons.length>0||got.parts.length>0);

// Вечное, восстановленное с сервера. Права на купленное живут отдельно от сейва и сверяются на
// каждом входе: сейв теряется, конфликтует и приезжает со второго устройства, а купленная за
// деньги машина обязана вернуться при любом раскладе. Идемпотентно по построению — applyGrant
// проверяет наличие перед выдачей.
export function restoreEntitlements(save,grants=[]){
 const got=empty();
 for(const grant of Array.isArray(grants)?grants:[]){
  const part=applyGrant(save,grant,'Восстановление покупки');
  for(const key of ['crates','cars','paints','neons','parts'])got[key].push(...part[key]);
 }
 return got;
}
