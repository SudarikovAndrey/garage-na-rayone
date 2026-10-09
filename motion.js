export const damp=(a,b,dt,rate=8)=>Math.abs(a-b)<.0005?b:a+(b-a)*(1-Math.exp(-rate*Math.max(0,dt)));
const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
const animations=new WeakMap(),closing=new WeakMap();
export function openDialog(dialog){if(dialog.open)return;dialog.showModal();dialog.dataset&&(dialog.dataset.closing='false');if(!dialog.animate||reduced())return;animations.get(dialog)?.cancel();const a=dialog.animate([{opacity:0,transform:'translateY(18px) scale(.985)'},{opacity:1,transform:'none'}],{duration:260,easing:'cubic-bezier(.2,.7,.2,1)'});animations.set(dialog,a);}
export function closeDialog(dialog){if(closing.has(dialog))return closing.get(dialog);if(!dialog.open)return Promise.resolve();if(!dialog.animate||reduced()){dialog.close();return Promise.resolve();}animations.get(dialog)?.cancel();dialog.dataset.closing='true';const a=dialog.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(12px) scale(.99)'}],{duration:160,easing:'ease-in',fill:'forwards'});const p=a.finished.catch(()=>{}).then(()=>{dialog.close();a.cancel();dialog.dataset.closing='false';closing.delete(dialog);});closing.set(dialog,p);return p;}
export function animateContent(element){if(!element?.animate||reduced())return;const dialog=element.closest?.('dialog'),before=dialog?.open?dialog.getBoundingClientRect().height:0;if(before)queueMicrotask(()=>{if(!dialog.open)return;const after=dialog.getBoundingClientRect().height;if(Math.abs(after-before)>2)dialog.animate([{height:before+'px'},{height:after+'px'}],{duration:220,easing:'cubic-bezier(.2,.7,.2,1)'});});animations.get(element)?.cancel();const a=element.animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:170,easing:'ease-out'});animations.set(element,a);}
export class SceneTransition{
 constructor(root,cover,{reduced=false,paint=()=>{},frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),exempt=null}={}){this.root=root;this.cover=cover;this.reduced=reduced;this.paint=paint;this.frames=frames;this.exempt=exempt;this.busy=false;}
 // Анимация шторки не должна держать переход вечно: если finished не пришёл (вкладка в фоне, вебвью
 // без кадров), отпускаем по таймеру — иначе экран остаётся inert, и окно знакомства не получает ни одного тапа.
 async fade(from,to,duration){this.cover.style.opacity=String(to);if(this.cover.animate){const ms=this.reduced?65:duration,a=this.cover.animate([{opacity:from},{opacity:to}],{duration:ms,easing:'ease-in-out'});let settled=false;const timer=setTimeout(()=>{if(!settled)try{a.finish?.();}catch{}},ms+250);await a.finished.catch(()=>{});settled=true;clearTimeout(timer);}}
 // inert ставим на детей корня, а не на корень: окно знакомства с боссом (exempt) — тоже ребёнок корня и должно
 // принимать нажатия сразу, ещё под шторкой. Корень целиком — только если детей нет (тесты, заглушки).
 lock(){
  const kids=this.root.children?[...this.root.children].filter(c=>!(this.exempt&&c.matches?.(this.exempt))):null;
  if(!kids){const prev=this.root.inert;this.root.inert=true;let done=false;return()=>{if(done)return;done=true;this.root.inert=prev;};}
  const prev=kids.map(k=>k.inert);for(const k of kids)k.inert=true;let done=false;return()=>{if(done)return;done=true;kids.forEach((k,i)=>k.inert=prev[i]);};
 }
 // covered — окно, которое должно встать поверх ещё чёрного экрана: знакомство с боссом, например.
 // Показываем его до снятия шторки, шторку убираем под ним, а ждём закрытия уже над готовой сценой.
 // Так человек не видит ни трассу, мелькнувшую перед боссом, ни черноту после него.
 async run(work,{covered=null}={}){if(this.busy)return false;this.busy=true;const unlock=this.lock();this.root.dataset.transitioning='true';this.cover.hidden=false;
  try{
   await this.fade(0,1,170);
   const value=await work();
   this.paint();await this.frames();
   const held=covered?covered():null;
   if(held)await this.frames();
   await this.fade(1,0,320);
   // Пока окно ждёт человека, нажатия ему нужны: inert со всего экрана снимаем, а от сцены под
   // окном защищает сама шторка — она ещё на месте, просто прозрачная.
   if(held){unlock();await held;}
   return value;
  }finally{this.cover.hidden=true;this.cover.style.opacity='0';unlock();this.root.dataset.transitioning='false';this.busy=false;}}
}
export class GarageMotion{
 constructor(){this.initialized=false;}
 update({yaw,span,height,offset=0,targetX=0,targetZ=0,elevation=8},dt,reduced=false){if(!this.initialized||reduced){Object.assign(this,{yaw,span,height,offset,targetX,targetZ,elevation,initialized:true});return false;}let moving=false;for(const [key,target] of Object.entries({yaw,span,height,offset,targetX,targetZ,elevation})){const next=damp(this[key],target,dt,8);if(next!==this[key])moving=true;this[key]=next;}return moving;}
}
