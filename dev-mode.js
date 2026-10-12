// Наладка. Всё, что нужно нам для плейтестов и не нужно игроку: профили по позывному,
// «Наигранное», сброс прогресса, эталонный кадр. В обычной игре этого нет вовсе.
//
// Открывается десятью тапами по заголовку «ПРОФИЛЬ» и живёт на устройстве, а не в сейве:
// это свойство телефона разработчика, а не игрока. Повторные десять тапов закрывают обратно.
const KEY='rayon-dev';
export const DEV_TAPS=10;
export const DEV_TAP_GAP=2500;

export function devMode(storage=globalThis.localStorage){try{return storage?.getItem(KEY)==='on';}catch{return false;}}
export function setDevMode(on,storage=globalThis.localStorage){try{if(on)storage?.setItem(KEY,'on');else storage?.removeItem(KEY);}catch{}return !!on;}

// Счётчик тапов: десять подряд, между ними не больше паузы. Случайно попасть нельзя,
// специально — за пару секунд.
export function tapCounter({taps=DEV_TAPS,gap=DEV_TAP_GAP,now=()=>Date.now()}={}){
 let count=0,last=0;
 return ()=>{
  const t=now();
  count=t-last>gap?1:count+1;
  last=t;
  if(count<taps)return false;
  count=0;
  return true;
 };
}
