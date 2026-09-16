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

// Раскрываем на весь экран и отдаём управление игре. Тему не трогаем: у игры свой стиль.
export async function bootTelegram(scope=globalThis){
 if(!looksLikeTelegram(scope.location||location,scope))return null;
 try{webApp=await loadSdk(scope);}catch{return null;}
 if(!webApp)return null;
 try{webApp.ready();webApp.expand();webApp.disableVerticalSwipes?.();}catch{}
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
 if(cached){session=cached;return cached;}
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
