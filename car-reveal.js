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
  // Кадр может приехать позже показа: подменяем картинку на месте, без перезапуска анимации.
  setPhoto(src){if(src)$('#reveal-photo').src=src;},
  // Показываем и ждём: заезд и гараж не должны шевелиться, пока машина на экране.
  // opts — тот же экран для вручения, а не только для открытия по чертежам (подмена, октябрь):
  // kicker и cta — свои слова, photo — парадный кадр вместо заводского снимка, note — реплика
  // того, кто вручает, extra — что идёт в довесок (ящик). Без opts всё как раньше.
  show(index,levels=[0,0,0],{kicker='ТВОЯ НОВАЯ ТАЧКА',cta='ПОСТАВИТЬ В ГАРАЖ',photo=null,note='',extra='',hold=false}={}){
   const car=CARS[index];if(!car)return Promise.resolve(false);
   $('#reveal-photo').src=photo||'assets/cars/'+car.id+'.webp';
   $('#reveal-photo').alt=car.name+' · '+car.model;
   $('#reveal-kicker').textContent=kicker;
   $('#reveal-name').textContent=car.name;
   $('#reveal-model').textContent=car.model;
   $('#reveal-specs').innerHTML=revealSpecs(index,levels).map(s=>`<span><i>${s.label}</i><b>${s.value}</b></span>`).join('');
   for(const [id,text] of [['#reveal-note',note],['#reveal-extra',extra]]){const n=$(id);if(!n)continue;n.textContent=text;n.hidden=!text;}
   const go=$('.reveal-cta');if(go)go.textContent=cta;
   buildAtmosphere($('.reveal-fx'),$('.reveal-dust'),reducedMotion?{beams:1,smoke:2,streaksFar:2,dust:6,streaksNear:1,sparks:3}:REVEAL_DENSITY);
   root.hidden=false;
   // Перезапуск анимаций: без этого вторая машина подряд просто появится готовой.
   root.dataset.state='';void root.offsetWidth;root.dataset.state='in';
   sfx?.('fanfare-long');haptics?.('win');
   return new Promise(resolve=>{
    finish=()=>resolve(true);
    // hold — экран ждёт тапа и не гаснет сам: за ним стоит выдача, её нельзя проскочить по таймеру.
    if(!hold)timer=setTimeout(close,reducedMotion?4000:11000);
   });
  },
 };
}
