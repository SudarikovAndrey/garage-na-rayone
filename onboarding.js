export const LESSONS=['drag-auto','drag-manual','drift'];
export function restoreLessons(value){return Object.fromEntries(LESSONS.filter(id=>value?.[id]===true).map(id=>[id,true]));}
export const lessonHit=(position)=>position>=.70&&position<=.88;
// Что человек уже знает. За пробег говорит сам пробег: кто ездил, тому «Стартуй на зелёный»
// показывать не надо, даже если флаг не доехал — сейв пришёл с другого устройства или из Telegram.
// Дрифт не трогаем: отдельная механика, её урок появляется на своей трассе и в первый раз.
export const lessonsSeen=save=>{
 const seen={...(save?.tutorials||{})};
 if((save?.races||0)>0||(save?.rank||0)>0){seen['drag-auto']=true;seen['drag-manual']=true;}
 return seen;
};
export class Onboarding{
 constructor({seen,complete,createCar,reduced=false}){
  this.createCar=createCar;this.sceneToken=0;this.seen=seen;this.complete=complete;this.reduced=reduced;this.active=false;this.frameId=0;
  this.dialog=document.createElement('dialog');this.dialog.id='driving-lesson';this.dialog.setAttribute('aria-labelledby','lesson-title');
  this.dialog.innerHTML=`<section class="lesson-card"><header><span>ПЕРВЫЙ ЗАЕЗД</span><button data-skip aria-label="Пропустить обучение">×</button></header><div class="lesson-steps" aria-label="Шаг обучения"><i></i><i></i><i></i></div><div class="lesson-copy"><small data-step></small><h2 id="lesson-title"></h2><p data-description></p></div><div class="lesson-demo" aria-hidden="true"><div class="lesson-road"><img alt="" src="assets/lesson-race.webp"></div><div class="lesson-lights"><i></i><i></i><i></i><b></b></div><div class="lesson-tach"><div><span>ОБОРОТЫ</span><b data-gear>1 → 2</b></div><div class="lesson-track"><i></i><em></em></div><div class="lesson-zone-label">↑ ЗЕЛЁНАЯ ЗОНА</div></div></div><div class="lesson-steering"><label for="lesson-steer">ВЛЕВО <b>ПРЯМО</b> ВПРАВО</label><input id="lesson-steer" type="range" min="-100" max="100" value="0" aria-label="Попробуй повернуть вправо"></div><p class="lesson-response" role="status" aria-live="polite"></p><button class="lesson-action"></button><footer>Тренировка · без соперника и потери наград</footer></section>`;
  document.body.append(this.dialog);this.action=this.dialog.querySelector('.lesson-action');this.range=this.dialog.querySelector('input');
  this.dialog.querySelector('[data-skip]').onclick=()=>this.finish();this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.finish();});
  this.dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.code==='Space'&&e.target===this.action){e.preventDefault();if(!e.repeat)this.act();}});
  this.action.onclick=()=>this.act();this.range.oninput=()=>this.steer(Number(this.range.value)/100);
  const release=()=>{this.range.value='0';this.steer(0);};this.range.addEventListener('pointerup',release);this.range.addEventListener('pointercancel',release);this.range.addEventListener('blur',release);
 }
 open({mode,car='samara',force=false}){if(this.active||!LESSONS.includes(mode)||(!force&&this.seen()[mode]))return false;
  this.mode=mode;this.lastHit=false;this.step=0;this.car=car;this.returnFocus=document.activeElement;this.active=true;this.dialog.showModal();this.render();this.prepareScene();this.last=0;this.frameId=requestAnimationFrame(t=>this.tick(t));return true;
 }
 async prepareScene(){const token=++this.sceneToken;if(this.mode!=='drift'||!this.createCar)return;const road=this.dialog.querySelector('.lesson-road');road.dataset.preview='loading';try{const {LessonDriveScene}=await import('./onboarding-scene.js');if(!this.active||token!==this.sceneToken)return;this.driveScene=new LessonDriveScene(road,this.createCar());road.dataset.preview='ready';}catch(error){console.warn('Driving lesson preview',error);road.dataset.preview='unavailable';}}
 render(){const drift=this.mode==='drift',manual=this.mode==='drag-manual';this.time=0;this.position=0;this.qualified=false;this.steerValue=0;this.driveScene?.reset(this.step===2);
  const titles=drift?['Немного руля — поворот','Сильнее — и в занос','Поймай машину после заноса']:manual?['Стартуй на зелёный','Поймай зелёную зону','Теперь твой заезд']:['Газ — автоматически','Поймай зелёную зону','Теперь твой заезд'];
  const copy=drift?['Потяни бегунок немного вправо. Машина повернёт без заноса.','Уведи бегунок дальше, во внешнюю зону: начнётся дрифт. Держи угол и скорость: идут очки. Каждые 2 секунды чистого дрифта множитель растёт до ×4.','Зад продолжает скользить по инерции. Плавно верни руль, чуть подрули против заноса и выровняй: резкая перекладка снова сорвёт машину.']:manual?['Дождись зелёного сигнала и нажми «Старт». Попробуй здесь.','Бегунок движется по шкале. Нажми «Переключить», когда он войдёт в зелёную зону. Попробуй здесь.','Точное переключение даёт рывок. Газ — автоматический. Лови бегунок в зелёной зоне.']:['Ты слева. Первые три заезда — автостарт. Твоя задача — вовремя переключать передачи.','Бегунок движется по шкале. Нажми «Переключить», когда он войдёт в зелёную зону. Попробуй здесь.','Точное переключение даёт рывок. Газ — автоматический. Лови бегунок в зелёной зоне.'];
  this.dialog.dataset.mode=this.mode;this.dialog.dataset.step=String(this.step);
  this.dialog.querySelector('[data-step]').textContent=`${this.step+1} / 3 · ${drift?'ДРИФТ':'ЗАЕЗД'}`;
  this.dialog.querySelector('h2').textContent=titles[this.step];this.dialog.querySelector('[data-description]').textContent=copy[this.step];
  this.dialog.querySelectorAll('.lesson-steps i').forEach((el,i)=>el.classList.toggle('done',i<=this.step));
  this.dialog.querySelector('.lesson-response').textContent='';this.action.disabled=drift&&this.step<2;
  this.action.textContent=this.step===2?'К ЗАЕЗДУ':drift?'ДАЛЬШЕ':this.step===1?'↑ ПЕРЕКЛЮЧИТЬ':manual?'СТАРТ':'ПОПРОБОВАТЬ';
  this.dialog.querySelector('.lesson-steering').hidden=!drift||this.step===2;this.range.value='0';this.range.setAttribute('aria-label',this.step===0?'Попробуй немного повернуть вправо':'Потяни вправо во внешнюю зону для дрифта');
  this.dialog.querySelector('header span').textContent=drift?'ПОЧУВСТВУЙ МАШИНУ':'УЧИМСЯ НА ХОДУ';this.action.focus();
 }
 respond(text,success=false){const el=this.dialog.querySelector('.lesson-response');el.textContent=text;el.dataset.success=String(success);}
 steer(value){this.steerValue=Math.max(-1,Math.min(1,value));this.dialog.querySelector('.lesson-steering b').textContent=Math.abs(value)<.05?'ПРЯМО':Math.abs(value)<.72?'ПОВОРОТ':'ДРИФТ';
  const correct=this.step===0?value>=.16&&value<=.45:value>=.74&&value<=.90;
  if(correct){this.qualified=true;this.action.disabled=false;this.respond(this.step===0?'Есть! Поворот с зацепом.':'Есть! Держишь машину в заносе.',true);}
  else if(value<-.1&&!this.qualified)this.respond('Для пробы потяни вправо →');else if(value>.85&&!this.qualified)this.respond('Чуть меньше: самый край — риск вылета.');
 }
 act(){if(!this.active||this.action.disabled)return;if(this.step===2){this.finish();return;}
  if(this.mode==='drag-manual'&&this.step===0&&this.time<3){this.respond('Рано. Дождись зелёного сигнала.');return;}
  if(this.mode!=='drift'&&this.step===1&&!lessonHit(this.position)){this.respond(this.position<.70?'Рано — дождись зелёной кнопки.':'Поздно — попробуй на следующем проходе.');return;}
  if(this.mode!=='drift'&&this.step===1)this.lastHit=true;this.step++;this.render();if(this.lastHit)this.respond('ИДЕАЛЬНО! Именно так.',true);
 }
 tick(now){if(!this.active)return;const dt=this.last?Math.min(.05,(now-this.last)/1000):0;this.last=now;if(!document.hidden)this.time+=dt;
  this.position=this.reduced?.79:(this.time%3.1)/3.1;
  this.dialog.querySelector('.lesson-track em').style.left=this.position*100+'%';
  const cue=this.mode!=='drift'&&this.step===1&&lessonHit(this.position)?'perfect':'wait';if(this.action.dataset.shiftCue!==cue)this.action.dataset.shiftCue=cue;
  this.dialog.querySelector('.lesson-lights').dataset.go=String(this.time>=3);
  this.dialog.querySelectorAll('.lesson-lights i').forEach((el,i)=>el.classList.toggle('lit',this.time>=i));
  this.dialog.querySelector('.lesson-lights b').textContent=this.time>=3?'ЖМИ!':String(Math.max(1,3-Math.floor(this.time)));
  if(this.driveScene&&!document.hidden)this.driveScene.update(dt,this.step===2?0:this.steerValue,this.step,this.reduced);
  this.frameId=requestAnimationFrame(t=>this.tick(t));
 }
 finish(){if(!this.active)return;this.complete(this.mode);this.active=false;this.sceneToken++;this.driveScene?.dispose();this.driveScene=null;delete this.dialog.querySelector('.lesson-road').dataset.preview;cancelAnimationFrame(this.frameId);this.dialog.close();if(this.returnFocus?.isConnected)this.returnFocus.focus();}
}
