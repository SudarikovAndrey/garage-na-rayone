// Вибрация телефона. Одно место на всю игру: длительности не разъезжаются по коду,
// и выключается всё разом. Правило простое — вибрируем там, где игрок и так ждёт отдачи,
// и никогда фоном: телефон в кармане не должен гудеть сам по себе.
const PATTERNS={
 perfect:[22],          // поймал зелёную зону
 good:[10],
 missed:[26,40,26],     // промах ощущается рвано
 nitro:[14,26,46],      // баллон: короткий вдох и длинный толчок
 launch:[34],
 'drift-enter':[16],    // машина сорвалась в занос
 contact:[45,30,20],    // притёрлись бортами
 crash:[60,50,90],
 win:[26,60,26,60,70],
 lose:[90],
};
let enabled=true;
export const setHaptics=on=>{enabled=!!on;};
export const hapticsEnabled=()=>enabled;
export function haptics(kind){
 if(!enabled)return false;
 const pattern=PATTERNS[kind];if(!pattern)return false;
 const n=globalThis.navigator;
 if(!n||typeof n.vibrate!=='function')return false;
 // До первого касания браузер всё равно откажет, а часть движков ещё и ругается в консоль.
 if(n.userActivation&&!n.userActivation.hasBeenActive)return false;
 try{return !!n.vibrate(pattern);}catch{return false;}
}
export const hapticPattern=kind=>PATTERNS[kind]||null;
