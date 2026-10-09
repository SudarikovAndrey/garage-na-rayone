// Телефон — только вертикально.
//
// Игра свёрстана под узкий высокий кадр: гараж, заезд и нижние кнопки рассчитаны на портрет.
// Поворот экрана игре не нужен ни в каком виде, и просить игрока «поверни телефон» мы не будем —
// игра держит вертикаль сама.
//
// Два рубежа:
//  1. замок ориентации: манифест (orientation: portrait) для установленного приложения,
//     lockOrientation Телеграма (Bot API 8.0) и screen.orientation.lock в браузере. Там, где замок
//     работает, экран просто не переворачивается;
//  2. вертикальный кадр: если клиент замок не дал (iOS Safari умеет только манифест), а телефон
//     всё-таки лежит боком, игра остаётся портретной — кадр держит вертикальные пропорции
//     и стоит по центру экрана. Разметка и управление при этом не меняются.
//
// Компьютер не трогаем: там широкий экран — нормальный режим игры, а не поломка.

// Телефон, а не планшет и не компьютер: сенсор, грубый указатель и короткая сторона экрана до 600 px.
export const PHONE_SIDE=600;
export function isPhone(scope=globalThis){
 const nav=scope.navigator,screen=scope.screen;
 if(!nav||!screen)return false;
 const touch=(nav.maxTouchPoints||0)>0;
 let coarse=true;try{coarse=scope.matchMedia?.('(pointer: coarse)')?.matches??true;}catch{}
 const side=Math.min(screen.width||0,screen.height||0);
 return touch&&coarse&&side>0&&side<=PHONE_SIDE;
}
export const isLandscape=(scope=globalThis)=>(scope.innerWidth||0)>(scope.innerHeight||0);
// Вертикальный кадр нужен ровно тогда, когда замок не сработал и телефон лежит боком.
export const needsPortraitFit=(scope=globalThis)=>isPhone(scope)&&isLandscape(scope);

// Просим замок у того, кто умеет. Отказ — не ошибка: ниже вертикальный кадр.
export function lockPortrait(scope=globalThis){
 const used=[];
 const webApp=scope.Telegram?.WebApp;
 if(webApp?.lockOrientation){try{webApp.lockOrientation();used.push('telegram');}catch{}}
 const orientation=scope.screen?.orientation;
 if(orientation?.lock){try{const r=orientation.lock('portrait');r?.catch?.(()=>{});used.push('screen');}catch{}}
 return used;
}

// Сам кадр держится в CSS, здесь только признак на <html>.
export function applyPortraitFit(doc=globalThis.document,scope=globalThis){
 const on=needsPortraitFit(scope);
 doc?.documentElement?.toggleAttribute?.('data-portrait-fit',on);
 return on;
}

export function watchPortrait(doc=globalThis.document,scope=globalThis){
 if(!doc)return null;
 lockPortrait(scope);
 const sync=()=>applyPortraitFit(doc,scope);
 sync();
 // Поворот приходит разными событиями на разных телефонах — слушаем все, какие есть.
 for(const name of ['resize','orientationchange'])scope.addEventListener?.(name,sync);
 scope.screen?.orientation?.addEventListener?.('change',sync);
 // SDK Телеграма приезжает позже разметки: пробуем замок ещё раз, когда он появится.
 const retry=setTimeout(()=>lockPortrait(scope),1500);
 return {sync,stop(){clearTimeout(retry);for(const name of ['resize','orientationchange'])scope.removeEventListener?.(name,sync);scope.screen?.orientation?.removeEventListener?.('change',sync);}};
}

if(globalThis.document&&!globalThis.__rayonPortraitTest)watchPortrait();
