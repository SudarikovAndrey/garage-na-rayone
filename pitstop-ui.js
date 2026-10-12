// Presentation only: buttons, save data and driving input retain their original handlers.
const game=document.querySelector('#game');
const icons={
 wrench:'M14 5a6 6 0 0 0-7 7L2 17l5 5 5-5a6 6 0 0 0 7-7l-4 4-4-4 4-4Z',
 box:'M3 6h18v5H3ZM5 11v10h14V11M3 6l3-3h12l3 3M9 15h6',
 trophy:'M7 3h10v7a5 5 0 0 1-10 0ZM7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v6m-4 0h8',
 cart:'M2 3h3l3 12h11l3-9H6M9 20h.01M18 20h.01',
 flag:'M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0M10 4v10m5-9v10M5 9c5-4 9 4 15 0',
 // Две встречные стрелки: вызов, а не «поехали».
 strelka:'M3 8h13m-4-4 4 4-4 4M21 16H8m4-4-4 4 4 4'
};
for(const button of document.querySelectorAll('[data-pit-icon]')){
 button.insertAdjacentHTML('afterbegin',`<svg class="pitstop-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[button.dataset.pitIcon]}"/></svg>`);
}
document.querySelector('#home-sheet').append(document.querySelector('#garage-radio'));
const help=document.querySelector('#help');
help.classList.add('pitstop-help');document.querySelector('#garage-radio').append(help);

document.querySelector('.dashboard').insertAdjacentHTML('beforeend','<div class="pitstop-multiplier"><span>СЕРИЯ</span><b>×1</b></div>');
document.querySelector('#race-screen').insertAdjacentHTML('beforeend','<div class="pitstop-scores"><div><span>ТЫ</span><b>0</b></div><div><span>ЦЕЛЬ</span><b>0</b></div></div>');
const time=document.querySelector('#time');
const scores=document.querySelectorAll('.pitstop-scores>div'),multi=document.querySelector('.pitstop-multiplier b');
let lastScore='',lastLabel='',lastMulti='';
function instruments(){
 const shift=document.querySelector('#shift-button'),needle=parseFloat(document.querySelector('#rpm-needle').style.left)||0,zone=document.querySelector('.perfect-zone');
 const lo=parseFloat(zone.style.left)||73,hi=lo+(parseFloat(zone.style.width)||13);
 const cue=needle>=lo&&needle<=hi?'perfect':needle>hi?'late':'wait';
 if(shift.dataset.shiftCue!==cue)shift.dataset.shiftCue=cue;
 if(game.dataset.drift!=='true')return;
 const label=document.querySelector('.time>span').textContent;
 if(time.textContent!==lastScore||label!==lastLabel){
  lastScore=time.textContent;lastLabel=label;const battle=lastScore.includes('/'),parts=lastScore.split('/');
  scores[0].querySelector('b').textContent=parts[0].trim();
  scores[1].querySelector('span').textContent=battle?'РЫЖИЙ':'ЦЕЛЬ';
  scores[1].querySelector('b').textContent=battle?parts[1].trim():label.replace('ЦЕЛЬ','').trim();
 }
 const multiplier=document.querySelector('.ridge-controls')?.dataset.multiplier||'1';
 if(multiplier!==lastMulti){lastMulti=multiplier;multi.textContent='×'+multiplier;}
}
new MutationObserver(instruments).observe(document.querySelector('.race-bottom'),{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-multiplier','style']});
const sound=document.querySelector('#sound'),soundHome=document.createComment('sound control home');
sound.before(soundHome);
new MutationObserver(()=>{const parent=game.dataset.screen==='race'?document.querySelector('.race-top'):soundHome.parentNode;if(sound.parentNode!==parent){if(parent===soundHome.parentNode)soundHome.after(sound);else parent.append(sound);}}).observe(game,{attributes:true,attributeFilter:['data-screen']});
instruments();

// Two short transients: a low switch body on press and a lighter latch on release.
// One cached noise buffer, no network audio, no auto-play and no continuous audio loop.
let audio,noise,bus,lastClick=0;
const voices=new Set();
const audible=()=>!document.hidden&&sound.querySelector('i').hidden;
function stopVoices(){for(const node of voices){try{node.stop();}catch{}}voices.clear();}
function clickSound(release=false){
 if(!audible())return;
 const now=performance.now();if(!release&&now-lastClick<35)return;lastClick=now;
 try{
  if(!audio){
   const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   audio=new Context();bus=audio.createGain();bus.gain.value=.55;bus.connect(audio.destination);
   noise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.035),audio.sampleRate);
   const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/data.length*7);
  }
  if(audio.state==='suspended')audio.resume().catch(()=>{});
  const t=audio.currentTime,source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
  source.buffer=noise;source.playbackRate.value=release?1.3:.88;filter.type='bandpass';filter.frequency.value=release?1900:1250;filter.Q.value=.7;gain.gain.value=release?.16:.29;
  source.connect(filter);filter.connect(gain);gain.connect(bus);voices.add(source);source.start(t);source.onended=()=>{voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect();};
  if(!release){const body=audio.createOscillator(),g=audio.createGain();body.type='sine';body.frequency.setValueAtTime(175,t);body.frequency.exponentialRampToValueAtTime(72,t+.045);g.gain.setValueAtTime(.17,t);g.gain.exponentialRampToValueAtTime(.001,t+.052);body.connect(g);g.connect(bus);voices.add(body);body.start(t);body.stop(t+.055);body.onended=()=>{voices.delete(body);body.disconnect();g.disconnect();};}
 }catch{/* Sound is optional; the controls always work. */}
}
new MutationObserver(()=>{if(!audible())stopVoices();}).observe(sound,{subtree:true,attributes:true,attributeFilter:['hidden']});
const held=new Map();
function press(key,node){if(held.has(key))return;held.set(key,node);node.classList.add('pitstop-pressed');clickSound();}
function release(key,withSound=true){const node=held.get(key);if(!node)return;held.delete(key);if(![...held.values()].includes(node))node.classList.remove('pitstop-pressed');if(withSound)clickSound(true);}
document.addEventListener('pointerdown',e=>{if(e.button!==0||e.isPrimary===false)return;const node=e.target.closest('button:not(:disabled),#drift-steer');if(node&&(game.contains(node)||node.closest('dialog')))press(e.pointerId,node);},{capture:true,passive:true});
document.addEventListener('pointerup',e=>release(e.pointerId),{capture:true,passive:true});
document.addEventListener('pointercancel',e=>release(e.pointerId,false),{capture:true,passive:true});
document.addEventListener('keydown',e=>{
 if(e.repeat||!['Space','Enter'].includes(e.code))return;
 let node=e.target.closest('button:not(:disabled)');
 if(!node&&e.code==='Space'&&game.dataset.screen==='race'&&!document.querySelector('dialog[open]'))node=document.querySelector('#shift-button:not(:disabled):not([hidden])');
 if(node)press(e.code,node);
},{capture:true});
document.addEventListener('keyup',e=>release(e.code),{capture:true});
function clear(){for(const key of held.keys())release(key,false);stopVoices();}
window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();audio?.suspend().catch(()=>{});}});
window.addEventListener('pagehide',e=>{clear();if(e.persisted)audio?.suspend().catch(()=>{});else{audio?.close().catch(()=>{});audio=null;}});
