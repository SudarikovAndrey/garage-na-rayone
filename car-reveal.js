// Открытие новой машины: она въезжает на весь экран, а не появляется плиткой в отчёте о заезде.
// Собрана здесь же, чтобы её можно было открыть отдельной страницей-превью и смотреть без заезда.
import {CARS} from './fleet.js';
import {vehicleStats} from './vehicle-dynamics.js';
import {buildAtmosphere,DENSITY} from './intro-atmosphere.js';
// Реже, чем на заставке босса: там фон работает на характер, тут всё внимание на машину.
export const REVEAL_DENSITY={...DENSITY,beams:2,smoke:4,streaksFar:5,dust:16,streaksNear:3,sparks:12};
export function revealSpecs(index,levels=[0,0,0]){
 const car=CARS[index];if(!car)return null;
 const stats=vehicleStats(car.id,levels);
 return [
  {label:'МОЩЬ',value:String(stats.rating)},
  {label:'СТУПЕНЕЙ',value:String(stats.gears)},
  {label:'ПОТОЛОК',value:stats.topSpeed+' км/ч'},
 ];
}
export function bindCarReveal({root,sfx,haptics,reducedMotion=false}={}){
 if(!root)return {show:async()=>false,close(){}};
 const $=s=>root.querySelector(s);
 let finish=null,timer=0;
 function close(){
  if(!finish)return;
  const done=finish;finish=null;clearTimeout(timer);
  root.hidden=true;root.dataset.state='';root.onclick=null;
  done();
 }
 root.addEventListener('click',close);
 return {
  close,
  // Показываем и ждём: заезд и гараж не должны шевелиться, пока машина на экране.
  show(index,levels=[0,0,0]){
   const car=CARS[index];if(!car)return Promise.resolve(false);
   $('#reveal-photo').src='assets/cars/'+car.id+'.webp';
   $('#reveal-photo').alt=car.name+' · '+car.model;
   $('#reveal-name').textContent=car.name;
   $('#reveal-model').textContent=car.model;
   $('#reveal-specs').innerHTML=revealSpecs(index,levels).map(s=>`<span><i>${s.label}</i><b>${s.value}</b></span>`).join('');
   buildAtmosphere($('.reveal-fx'),$('.reveal-dust'),reducedMotion?{beams:1,smoke:2,streaksFar:2,dust:6,streaksNear:1,sparks:3}:REVEAL_DENSITY);
   root.hidden=false;
   // Перезапуск анимаций: без этого вторая машина подряд просто появится готовой.
   root.dataset.state='';void root.offsetWidth;root.dataset.state='in';
   sfx?.('fanfare-long');haptics?.('win');
   return new Promise(resolve=>{
    finish=()=>resolve(true);
    timer=setTimeout(close,reducedMotion?4000:11000);
   });
  },
 };
}
