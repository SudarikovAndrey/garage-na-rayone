// Только разговор с сервером стрелок. Ничего про интерфейс: экран и карточка вызова
// пользуются этим модулем и ничего не знают про адреса и заголовки.
//
// Заезд отправляется входами, а не временем. Если сеть отвалилась между финишем и отправкой,
// входы лежат в localStorage и уходят при следующем открытии: иначе непроведённый заезд
// засчитывается поражением, а человек даже не узнает почему.
const PENDING='rayon-challenge-pending';

export function bindChallengeApi({fetchImpl=(...a)=>fetch(...a),headers=()=>({}),storage=globalThis.localStorage}={}){
 let memory=null;

 const call=async(path,body,timeout=12000)=>{
  const r=await fetchImpl('/api'+path,{
   method:body?'POST':'GET',
   headers:{...(body?{'Content-Type':'application/json'}:{}),...headers()},
   body:body?JSON.stringify(body):undefined,
   signal:AbortSignal.timeout(timeout),
  });
  if(!r.headers.get('content-type')?.includes('json'))throw Error('Стрелки сейчас недоступны');
  const data=await r.json();
  if(!r.ok)throw Object.assign(Error(data.error||'Не получилось'),{status:r.status,code:data.code||null});
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

 return {
  // Мои стрелки: {mine, incoming}. Своя одна, чужие — те, куда звали или где я уже отвечал.
  list:()=>call('/challenges'),
  // Забить стрелку. rivalIds — кого зовём, parentId — от какой стрелки это реванш.
  // Прежняя активная закрывается на сервере: активная у человека ровно одна.
  create:body=>call('/challenge',body||{}),
  // Позвать ещё корешей на уже забитую стрелку.
  invite:(id,userIds)=>call('/challenge/'+id+'/invite',{userIds}),
  card:id=>call('/challenge/'+id),
  // Фора сопернику по выбору вызывающего — после своего заезда: без, малая, большая.
  handicap:(id,level)=>call('/challenge/'+id+'/handicap',{level}),
  // Человек разрешил боту писать — сервер запоминает, чтобы игра больше не спрашивала.
  notifyAllowed:()=>call('/notify',{}),
  // Выход на старт. Он же и приём: бронировать место не от кого, отвечать могут все сразу.
  // Сборку сервер замораживает именно здесь — человек мог уйти в гараж и прокачаться.
  start:id=>call('/challenge/'+id+'/start',{}),
  // Баннер приглашения игра рисует сама — со своей машиной — и кладёт рядом со стрелкой.
  // Имя card уже занято чтением стрелки; картинка тяжелее обычного запроса и уходит с телефона,
  // поэтому и ручка своя, и ждём дольше.
  putCard:(id,jpeg)=>call('/challenge/'+id+'/card',{jpeg},30000),
  // Заготовка приглашения с карточкой машины: сервер собирает её у бота, игра только показывает шторку.
  share:id=>call('/challenge/'+id+'/share',{}),
  rematch:id=>call('/challenge/'+id+'/rematch',{}),
  // Подмена: новичок по ссылке едет на тачке кореша (docs/loaner-invite.md). Старт — он же
  // продолжение: сервер помнит, где человек остановился. {warmed:true} — прогрев пройден.
  loaner:(id,body={})=>call('/challenge/'+id+'/loaner',body),
  loanerRun:(id,inputs)=>call('/challenge/'+id+'/loaner/run',{inputs:[...inputs]}),
  loanerPending:()=>call('/loaner'),
  rewards:()=>call('/rewards'),
  referrals:()=>call('/referrals'),
  board:scope=>call('/board?scope='+(scope==='friends'?'friends':'global')),
  claim:id=>call('/rewards/claim',{id}),

  // Заезд. Сохраняем входы до ответа сервера, чтобы пережить обрыв связи.
  async run(id,inputs){
   const payload={id,inputs:[...inputs]};
   writePending(payload);
   const result=await call('/challenge/'+id+'/run',{inputs:payload.inputs});
   writePending(null);
   return result;
  },
  // Досылка после обрыва. Отказы сервера, которые повтор не исправит, гасят очередь:
  // иначе один застрявший заезд будет вечно всплывать ошибкой при каждом входе.
  async flush(){
   const p=readPending();
   if(!p)return null;
   try{
    const result=await call('/challenge/'+p.id+'/run',{inputs:p.inputs});
    writePending(null);
    return result;
   }catch(e){
    if(e.status===400||e.code==='invalid_replay')writePending(null);
    throw e;
   }
  },
  pending:readPending,
  forget:()=>writePending(null),
 };
}
