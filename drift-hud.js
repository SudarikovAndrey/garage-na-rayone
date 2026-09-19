import {parkingHint,parkingState,PARKING_METRES} from './parking-course.js';
import {driftCourse} from './ridge-terrain.js';
const fmt=n=>Math.max(0,Math.floor(n)).toLocaleString('ru-RU');
export class DriftHUD{
 constructor(){this.node=document.createElement('div');this.node.className='drift-live';this.node.hidden=true;this.node.innerHTML='<div class="drift-live-label"></div><div class="drift-live-numbers"><b>+0</b><strong>×1</strong></div><div class="drift-live-meter"><i></i></div><small></small>';document.querySelector('#race-screen').append(this.node);this.label=this.node.querySelector('.drift-live-label');this.points=this.node.querySelector('b');this.multi=this.node.querySelector('strong');this.bar=this.node.querySelector('i');this.detail=this.node.querySelector('small');this.goals=document.createElement('div');this.goals.className='parking-goals';this.goals.hidden=true;document.querySelector('#race-screen').append(this.goals);}
 hide(){this.node.hidden=true;this.goals.hidden=true;}
 update(car,rival,phase){
  this.goals.hidden=!(car?.ridge&&driftCourse().terrain==='city'&&['ready','countdown','running'].includes(phase)&&!car.crashed&&!car.finished);if(!this.goals.hidden){const h=parkingHint(car),p=parkingState(car);this.goals.innerHTML='<b>'+h.label+'</b><span>Дуга '+(h.index+1)+'/4 · '+h.metres+'/'+PARKING_METRES+' м в дрифте</span><i>'+p.metres.map((m,i)=>m>=PARKING_METRES-.01?'✓':p.closed[i]?'×':'○').join(' ')+'</i>';}
  const active=car?.ridge&&phase==='running'&&!car.crashed&&!car.finished;this.node.hidden=!active;if(!active)return;
  const d=car.drift;if(!d){this.hide();return;}
  if(this.car!==car){this.car=car;this.display=0;this.serial=d.bankSerial||0;this.bankUntil=0;this.lastTime=car.time;}
  if(this.serial!==(d.bankSerial||0)){this.serial=d.bankSerial;this.bankUntil=car.time+1.15;this.banked=d.lastBank||0;}
  const scoring=!!d.scoring,banked=this.bankUntil>car.time,broken=d.broken&&d.feedbackTime>0;
  const target=broken?0:banked&&!scoring?this.banked:d.pending;
  // Frame-independent count-up follows simulation time, never changes the actual points.
  const dt=Math.max(0,Math.min(.2,car.time-(this.lastTime??car.time)));this.lastTime=car.time;
  this.display=target<this.display?target:this.display+(target-this.display)*(1-Math.exp(-dt*16));
  this.points.textContent=(banked&&!scoring?'✓ +':'+')+fmt(this.display);this.multi.textContent='×'+String(d.multiplier||1).replace('.',',');
  const near=car.ridgeBattle&&Math.abs(car.distance-rival.distance)<7&&Math.abs((car.ridgeSlide||0)-(rival.ridgeSlide||0))<3;
  this.label.textContent=broken?'СЕРИЯ СОРВАНА':scoring?(near?'ДРИФТ РЯДОМ':'ЧИСТЫЙ ДРИФТ'):banked?'ОЧКИ ЗАЧТЕНЫ':d.pending>0?'ПРОДОЛЖАЙ СЕРИЮ':'ЗАЛОЖИ В ДРИФТ';
  this.node.dataset.state=broken?'broken':scoring?'scoring':banked?'banked':d.pending>0?'chain':'idle';
  this.detail.textContent=broken?'Угол или край трассы — серия потеряна':scoring?Math.round(Math.abs(d.angle)*180/Math.PI)+'° · '+Math.round(car.speed*3.6)+' км/ч · '+(d.flowTime||0).toFixed(1)+' с':d.pending>0?'Свяжи следующую дугу':d.mode==='grip'?'Легко — подруливай · дальше — дрифт':'Держи угол в сторону поворота';
  this.bar.style.width=(scoring?Math.min(100,((d.flowTime||0)%2)/2*100):d.pending>0?Math.max(0,1-d.gap/1.65)*100:0)+'%';
 }
}
