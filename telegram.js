// Единственное место, где игра знает про Telegram. Всё остальное работает как раньше:
// в обычном браузере модуль тихо выключается и ничего не грузит.
const SDK='https://telegram.org/js/telegram-web-app.js';
const TOKEN_KEY='rayon-tg-session';
let webApp=null,session=null;

// Telegram кладёт initData в хеш адреса и подставляет свой мост. Без этих признаков SDK не грузим.
export const looksLikeTelegram=(loc=location,scope=globalThis)=>
 /tgWebApp/.test(loc.hash||'')||!!scope.TelegramWebviewProxy||!!scope.Telegram?.WebApp?.initData;

export async function loadSdk(scope=globalThis){
 if(scope.Telegram?.WebApp)return scope.Telegram.WebApp;
 await new Promise((resolve,reject)=>{
  const el=document.createElement('script');el.src=SDK;el.async=true;
  el.onload=resolve;el.onerror=()=>reject(Error('Telegram SDK не загрузился'));
  document.head.append(el);
 });
 return scope.Telegram?.WebApp||null;
}

// Полный экран. С Bot API 8.0 мини-апп может занять весь экран, включая место под шапкой Telegram,
// и для игры это единственно верный режим: гараж и трасса рисуются во всю высоту. Старые клиенты
// метода не знают — там остаётся expand(), как было.
//
// В полном экране игра заезжает под системную строку и под кнопки Telegram, поэтому их отступы
// Telegram отдаёт сам: перекладываем их в CSS-переменные и повторяем при каждом изменении.
// Отступы вычитаются из высоты экрана игры (pitstop.css), а не из всего окна: фон остаётся во весь
// экран, а кнопки живут в видимой части. Высоту у Telegram не спрашиваем — viewportStableHeight на
// части клиентов меньше видимого, и игра ужималась до состояния «кнопок нет».
export function applyInsets(webApp=globalThis.Telegram?.WebApp,root=globalThis.document?.documentElement){
 if(!webApp||!root?.style)return false;
 const safe=webApp.safeAreaInset||{},content=webApp.contentSafeAreaInset||{};
 const top=Math.max(0,Number(safe.top)||0)+Math.max(0,Number(content.top)||0);
 const bottom=Math.max(0,Number(safe.bottom)||0)+Math.max(0,Number(content.bottom)||0);
 root.style.setProperty('--tg-top',top+'px');
 root.style.setProperty('--tg-bottom',bottom+'px');
 return true;
}
// Наличие самого метода и есть проверка версии: сверяться ещё и с номером — лишний способ
// промахнуться, у части клиентов он отстаёт от реальных возможностей.
export function goFullscreen(webApp=globalThis.Telegram?.WebApp){
 if(!webApp?.requestFullscreen)return false;
 if(webApp.isFullscreen)return true;
 try{webApp.requestFullscreen();return true;}catch{return false;}
}
// Сами разворачиваем игру только на телефоне: там мини-апп и должен занимать экран целиком.
// На компьютере Telegram открывает игру окном, и отнимать это окно нельзя — с Bot API 8.0 выйти из
// полного экрана можно только изнутри игры, своей кнопки выхода у клиента нет. Выбор игрока
// («?» → «Во весь экран») сильнее обоих правил и переживает перезаход.
const FULLSCREEN_KEY='rayon-tg-fullscreen';
const MOBILE=['android','android_x','ios'];
export const mobileClient=(webApp=globalThis.Telegram?.WebApp)=>MOBILE.includes(webApp?.platform||'');
const fullscreenChoice=(storage=globalThis.localStorage)=>{try{return storage?.getItem(FULLSCREEN_KEY)||null;}catch{return null;}};
export const wantsFullscreen=(webApp=globalThis.Telegram?.WebApp,storage=globalThis.localStorage)=>{
 const choice=fullscreenChoice(storage);return choice?choice==='on':mobileClient(webApp);};
// Признак полного экрана на <html>: по нему вёрстка снимает настольный потолок высоты (pitstop.css).
export function markFullscreen(webApp=globalThis.Telegram?.WebApp,root=globalThis.document?.documentElement){
 const on=!!webApp?.isFullscreen;
 try{root?.setAttribute?.('data-tg-fullscreen',on?'1':'0');}catch{}
 return on;
}
export function exitFullscreen(webApp=globalThis.Telegram?.WebApp){
 if(!webApp?.exitFullscreen)return false;
 try{webApp.exitFullscreen();return true;}catch{return false;}
}
export function toggleFullscreen(webApp=globalThis.Telegram?.WebApp,storage=globalThis.localStorage){
 const on=!!webApp?.isFullscreen;
 try{storage?.setItem(FULLSCREEN_KEY,on?'off':'on');}catch{}
 return on?exitFullscreen(webApp):goFullscreen(webApp);
}
// Переходник для app-shell: внутри Телеграма кнопка «во весь экран» управляет полным экраном
// Телеграма, а не браузера. SDK приезжает позже разметки, поэтому webApp берётся на каждый вызов.
const fullscreenWatchers=new Set();
export function fullscreenShell(){
 return {
  available:()=>!!webApp?.requestFullscreen,
  active:()=>!!webApp?.isFullscreen,
  toggle:()=>toggleFullscreen(webApp),
  watch(handler){fullscreenWatchers.add(handler);},
 };
}
// Почему полный экран не включился — видно только на телефоне игрока, поэтому причина уезжает
// в телеметрию: там и версия клиента, и отказ Telegram, если он был.
export function fullscreenState(webApp=globalThis.Telegram?.WebApp){
 return {can:!!webApp?.requestFullscreen,on:!!webApp?.isFullscreen,version:webApp?.version||null,platform:webApp?.platform||null};
}

// Раскрываем на весь экран и отдаём управление игре. Тему не трогаем: у игры свой стиль.
export async function bootTelegram(scope=globalThis){
 if(!looksLikeTelegram(scope.location||location,scope))return null;
 try{webApp=await loadSdk(scope);}catch{return null;}
 if(!webApp)return null;
 try{webApp.ready();webApp.expand();webApp.disableVerticalSwipes?.();}catch{}
 if(wantsFullscreen(webApp))goFullscreen(webApp);
 markFullscreen(webApp);
 applyInsets(webApp);
 // Часть клиентов игнорирует просьбу, пока приложение не «устоялось» или пока человек не коснулся
 // экрана. Поэтому пробуем ещё дважды: через кадр и по первому касанию. Лишние вызовы безвредны —
 // когда экран уже полный, goFullscreen ничего не делает.
 try{
  const retry=()=>{if(wantsFullscreen(webApp))goFullscreen(webApp);};
  setTimeout(retry,450);
  scope.document?.addEventListener?.('pointerdown',retry,{once:true});
  webApp.onEvent?.('fullscreenChanged',()=>{markFullscreen(webApp);for(const handler of fullscreenWatchers)try{handler();}catch{}});
  webApp.onEvent?.('fullscreenFailed',e=>console.warn('Полный экран не дали:',e?.error||e));
 }catch{}
 // Отступы меняются на лету: поворот экрана, выход из полного экрана, шторка Telegram.
 for(const event of ['fullscreenChanged','safeAreaChanged','contentSafeAreaChanged','viewportChanged'])
  try{webApp.onEvent?.(event,()=>applyInsets(webApp));}catch{}
 return webApp;
}
export const app=()=>webApp;
export const initData=()=>webApp?.initData||'';
// Только для отрисовки: имя и аватар. Всё, чему верим, приходит с сервера.
export const unsafeUser=()=>webApp?.initDataUnsafe?.user||null;
export const startParam=()=>webApp?.initDataUnsafe?.start_param||null;

const readToken=storage=>{try{const t=JSON.parse(storage.getItem(TOKEN_KEY)||'null');return t&&t.exp>Date.now()+60000?t:null;}catch{return null;}};
const writeToken=(storage,t)=>{try{storage.setItem(TOKEN_KEY,JSON.stringify(t));}catch{}};

// Вход: меняем initData на свой короткий токен. Подпись проверяет сервер, клиенту верить нечему.
export async function signIn({fetchImpl=(...a)=>fetch(...a),storage=localStorage,source=null}={}){
 if(!webApp?.initData)return null;
 const cached=readToken(storage);
 if(cached){
  session=cached;
  // Токен живёт 12 часов, и по нему раньше возвращался только он сам — без серверного сейва.
  // Игра в этот момент считала, что на сервере пусто, и заливала туда своё: на втором устройстве
  // прогресс откатывался к тому, что лежало в его памяти. Поэтому спрашиваем сейв отдельно.
  try{
   const r=await fetchImpl('/api/me',{headers:{Authorization:'Bearer '+cached.token}});
   if(r.ok){const mine=await r.json();return {...cached,user:mine.user||cached.user,save:mine.save,revision:mine.revision};}
  }catch{}
  return cached;
 }
 const r=await fetchImpl('/api/auth/telegram',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:webApp.initData,source})});
 if(!r.ok)throw Object.assign(Error('Telegram не пустил в игру'),{status:r.status});
 const data=await r.json();
 session={token:data.token,exp:Date.now()+11*60*60*1000,user:data.user,created:!!data.created};
 writeToken(storage,session);
 return {...session,startParam:data.startParam,save:data.save,revision:data.revision};
}
export const authHeader=()=>session?.token?{Authorization:'Bearer '+session.token}:{};
export const me=()=>session?.user||null;
export const signedIn=()=>!!session?.token;
export function forgetSession(storage=localStorage){session=null;try{storage.removeItem(TOKEN_KEY);}catch{}}
// Разрешение боту писать. Без него ни одно уведомление не дойдёт: Telegram не пропускает
// сообщения тем, кто не начинал диалог с ботом. Спрашиваем нативным окном и только по делу —
// когда человек сам завёл стрелку и ждёт ответа.
export function requestWriteAccess(){
 return new Promise(resolve=>{
  if(!webApp?.requestWriteAccess)return resolve(false);
  try{
   if(webApp.isVersionAtLeast&&!webApp.isVersionAtLeast('6.9'))return resolve(false);
   webApp.requestWriteAccess(ok=>resolve(!!ok));
  }catch{resolve(false);}
 });
}
// Готовое сообщение от бота: карточка с машиной и кнопкой вместо ссылки текстом. Заготовку собирает
// сервер (savePreparedInlineMessage), здесь только шторка выбора чата. Версии до 8.0 метода не знают —
// тогда возвращаем false, и вызывающий уходит на обычную ссылку.
export function shareMessage(messageId){
 if(!messageId||!webApp?.shareMessage)return false;
 try{if(webApp.isVersionAtLeast&&!webApp.isVersionAtLeast('8.0'))return false;webApp.shareMessage(String(messageId));return true;}catch{return false;}
}
// Поделиться ссылкой средствами Telegram: шторка выбора чата, а не наш собственный UI.
export function share(url,text){
 if(webApp?.openTelegramLink){webApp.openTelegramLink('https://t.me/share/url?url='+encodeURIComponent(url)+'&text='+encodeURIComponent(text));return true;}
 return false;
}
export const haptic=kind=>{try{webApp?.HapticFeedback?.impactOccurred?.(kind);}catch{}};
