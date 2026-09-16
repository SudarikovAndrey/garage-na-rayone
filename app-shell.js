// Игра как приложение, а не как сайт: полный экран там, где он поддерживается, и подсказка про «Добавить на экран Домой» там,
// где полного экрана нет (iOS). Ничего не делает молча: режим включает игрок, выбор запоминается.
const KEY='rayon-fullscreen';
const el=document.documentElement;
export const standalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;}catch{return false;}};
export const supported=()=>!!(el.requestFullscreen||el.webkitRequestFullscreen);
export const active=()=>!!(document.fullscreenElement||document.webkitFullscreenElement);
export const iOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const remember=v=>{try{localStorage.setItem(KEY,v);}catch{}};
export const wanted=()=>{try{return localStorage.getItem(KEY)==='on';}catch{return false;}};

export async function enter(){
 if(!supported())return false;
 try{await (el.requestFullscreen?.({navigationUI:'hide'})??el.webkitRequestFullscreen?.());}catch{return false;}
 try{await screen.orientation?.lock?.('portrait');}catch{}
 remember('on');return active();
}
export async function exit(){remember('off');try{await (document.exitFullscreen?.()??document.webkitExitFullscreen?.());}catch{}return !active();}
export const toggle=()=>active()?exit():enter();

// Игрок уже просил полный экран — возвращаем его при следующем запуске, но только с первого жеста: без жеста браузер откажет.
export function restoreOnGesture(){
 if(!wanted()||!supported()||active()||standalone())return;
 const once=()=>{remove();enter();};
 const remove=()=>{for(const n of ['pointerdown','keydown'])removeEventListener(n,once);};
 for(const n of ['pointerdown','keydown'])addEventListener(n,once,{once:true});
}

// Текст кнопки и подсказки зависят от устройства: на iOS полного экрана в браузере нет, есть только домашний экран.
export function shellLabel(){
 if(standalone())return 'ИГРА УЖЕ РАЗВЁРНУТА';
 if(supported())return active()?'ВЫЙТИ ИЗ ПОЛНОГО ЭКРАНА':'ВО ВЕСЬ ЭКРАН';
 return iOS()?'КАК ПОСТАВИТЬ НА ЭКРАН':'ПОЛНЫЙ ЭКРАН НЕДОСТУПЕН';
}
export const homeScreenHint=()=>iOS()
 ? 'Safari → «Поделиться» → «На экран «Домой». Игра откроется без адресной строки, как приложение.'
 : 'Меню браузера → «Установить приложение» или «Добавить на главный экран». Игра откроется без адресной строки.';

// Один раз на устройство подсказываем, как убрать адресную строку. Дальше — только через «?».
const SUGGESTED='rayon-shell-hint';
export function suggestOnce(toast){
 if(standalone()||!toast)return false;
 try{if(localStorage.getItem(SUGGESTED))return false;localStorage.setItem(SUGGESTED,'1');}catch{return false;}
 toast(supported()?'Играть удобнее во весь экран: кнопка «Во весь экран» в меню «?»':homeScreenHint());
 return true;
}

export function bindShell(button,toast){
 if(!button)return null;
 const sync=()=>{button.textContent=shellLabel();button.disabled=standalone();};
 button.onclick=async()=>{
  if(standalone())return;
  if(supported()){const ok=await toggle();if(!ok&&!active())toast?.(homeScreenHint());}
  else toast?.(homeScreenHint());
  sync();
 };
 for(const n of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(n,sync);
 sync();return {sync};
}
