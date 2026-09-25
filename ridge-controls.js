import {driftCourse} from './ridge-terrain.js';
import {driftState,driftCue,setDriftSteer,DRIFT_TARGET} from './ridge-drift.js';
export function ridgeOpponent(opp){return {...opp,id:0,practice:true,name:'ГРЕБЕНЬ',paint:'ivory',car:0,levels:[2,2,1],map:5,distance:804,shift:6250,launchRpm:6100,reaction:0,startAssist:false,boss:false,captain:false,requiredPerfect:0,beat:'ДРИФТ · ЦЕЛЬ '+DRIFT_TARGET+' ОЧКОВ',decal:'',window:1,launchAuto:0};}
export const sliderSteer=(x,left,width)=>Math.max(-1,Math.min(1,(x-left-width/2)/Math.max(1,width/2-24)));
export class RidgeControls{
 constructor(getRace,onStart=()=>{}){
  this.getRace=getRace;this.onStart=onStart;this.pointer=null;this.keys=new Set();this.node=document.createElement('div');this.node.className='ridge-controls';this.node.hidden=true;
  this.node.innerHTML='<div class="ridge-warning"><b></b><span></span></div><div class="drift-angle" role="meter" aria-label="Угол заноса" aria-valuemin="0" aria-valuemax="90"><i></i><em></em></div><div class="drift-scale"><span>0°</span><span>ДЕРЖИ ДУГУ</span><span>90°</span></div>';
  const bottom=document.querySelector('.race-bottom');bottom.prepend(this.node);this.meter=this.node.querySelector('.drift-angle');
  this.pad=document.createElement('div');this.pad.className='drift-steering';this.pad.hidden=true;this.pad.innerHTML='<div class="drift-steering-labels"><span>← ЛЕВО</span><b>ТЯНИ В СТОРОНУ</b><span>ПРАВО →</span></div><div class="drift-steering-rail"><i></i><input id="drift-steer" type="range" min="-100" max="100" step="1" value="0" aria-label="Руль: середина — перестроение, внешняя зона — дрифт" aria-valuetext="Прямо"></div>';
  bottom.append(this.pad);this.slider=this.pad.querySelector('input');
  const move=e=>{const r=this.slider.getBoundingClientRect();this.set(sliderSteer(e.clientX,r.left,r.width));};
  this.slider.addEventListener('pointerdown',e=>{if(e.isPrimary===false||this.pointer!==null||!this.active())return;e.preventDefault();this.keys.clear();this.pointer=e.pointerId;this.slider.setPointerCapture(e.pointerId);this.begin();move(e);});
  this.slider.addEventListener('pointermove',e=>{if(e.pointerId===this.pointer){e.preventDefault();move(e);}});
  const release=e=>{if(e.pointerId===this.pointer)this.reset();};for(const name of ['pointerup','pointercancel','lostpointercapture'])this.slider.addEventListener(name,release);
  this.slider.addEventListener('input',()=>{this.begin();this.set(Number(this.slider.value)/100);});
 }
 active(){const r=this.getRace();return r.screen==='race'&&!!r.player?.ridge&&(r.phase==='running'||r.player.ridgeBattle&&r.phase==='ready');}
 begin(){const {player,phase}=this.getRace();if(player?.ridgeBattle&&phase==='ready')this.onStart();}
 set(value){const {player}=this.getRace();const steer=this.getRace().phase==='running'&&this.active()?Number(value)||0:0;setDriftSteer(player,steer);const v=player?.ridge?driftState(player).steer:0;this.slider.value=String(Math.round(v*100));this.slider.setAttribute('aria-valuetext',Math.abs(v)<.045?'Прямо':(v<0?'Влево ':'Вправо ')+Math.round(Math.abs(v)*100)+'%');}
 reset(){const pointer=this.pointer;this.pointer=null;this.keys.clear();this.set(0);if(pointer!==null&&this.slider.hasPointerCapture(pointer))this.slider.releasePointerCapture(pointer);}
 key(code,down){if(!['ArrowLeft','ArrowRight','KeyA','KeyD','Home'].includes(code)||!this.active())return false;
  if(code==='Home'){this.reset();return true;}if(this.pointer!==null)return true;
  if(down){this.begin();this.keys.add(code);}else this.keys.delete(code);const left=this.keys.has('ArrowLeft')||this.keys.has('KeyA'),right=this.keys.has('ArrowRight')||this.keys.has('KeyD');this.set((Number(right)-Number(left))*.86);/* выше порога входа в занос: на .66 клавиатура не срывала машину вовсе */return true;
 }
 update(){
  const {player,rival,phase,screen}=this.getRace(),active=screen==='race'&&!!player?.ridge,running=active&&phase==='running';document.querySelector('#game').dataset.drift=String(active);
  this.node.hidden=!active||!['ready','countdown','launch','running'].includes(phase);const battlePad=active&&player.ridgeBattle&&['ready','countdown','launch','running'].includes(phase);this.pad.hidden=!running&&!battlePad;document.querySelector('#shift-button').hidden=running||battlePad;if(!running&&!battlePad)this.reset();if(!active)return;
  const d=driftState(player),cue=driftCue(player),angle=Math.abs(d.angle)*180/Math.PI,edge=Math.abs((player.ridgeLane??0)+(player.ridgeSlide||0)),danger=angle>53||edge>driftCourse().width-1.2;
  const valid=d.scoring;
  if(this.node.dataset.multiplier!==String(d.multiplier))this.node.dataset.multiplier=String(d.multiplier);
  this.node.querySelector('b').textContent=!running?'ТЯНИ БЕГУНОК В СТОРОНУ':danger?'УМЕНЬШИ УГОЛ':valid?'ДЕРЖИ ДУГУ':cue.sign?(cue.sign>0?'ПРАВЫЙ ПОВОРОТ →':'← ЛЕВЫЙ ПОВОРОТ'):'ПРЯМАЯ · БЕГУНОК В ЦЕНТР';
  this.node.querySelector('.ridge-warning span').textContent=!running?'Газ и передачи — авто':d.feedbackTime>0?d.feedback:d.pending>0?'СЕРИЯ +'+Math.floor(d.pending)+' · ×'+d.multiplier:driftCourse().terrain==='city'?'4 ДУГИ · ПО 40 М':'СОБИРАЙ ДЛИННУЮ СЕРИЮ';
  if(player.ridgeBattle&&rival){const gap=player.distance-rival.distance;this.node.querySelector('.ridge-warning span').textContent=!running?(player.battle?.lead?'ТЫ ВПЕРЕДИ · ДЕРЖИ ДУГУ':'ТЫ ПОЗАДИ · ДРИФТИ РЯДОМ'):rival.crashed?'СОПЕРНИК ВЫЛЕТЕЛ':player.time-(player.battle?.lastHit??-10)<.6?'УДАР · ДЕРЖИ РУЛЬ':Math.abs(gap)<6&&valid?'РЯДОМ · БОНУС К ОЧКАМ':Math.abs(gap)<2?'БОК О БОК':gap>0?'ТЫ ВПЕРЕДИ · '+Math.round(gap)+' М':'БОТ ВПЕРЕДИ · '+Math.round(-gap)+' М';}
  this.node.dataset.action=danger?'danger':valid?'release':'flow';this.pad.dataset.danger=String(danger);this.meter.querySelector('em').style.left=Math.min(98,angle/90*100)+'%';this.meter.setAttribute('aria-valuenow',String(Math.round(angle)));
  this.pad.querySelector('b').textContent=player.ridgeBattle&&phase==='ready'?'ТРОНЬ РУЛЬ — ПОЕХАЛИ':Math.abs(d.steer)<.045?'ЦЕНТР — ПРЯМО':d.mode==='recover'?'ЛОВИ МАШИНУ · ПЛАВНО РУЛИ':d.drifting?'ДРИФТ · ДЕРЖИ УГОЛ':'ПОВОРОТ · ШИНЫ ДЕРЖАТ';
 }
}
