// One playlist for the whole game: the song keeps playing through garage, tuning and races.
// Level is constant; only pause, mute, background and manual skips fade the music.
// Порядок перетасован, новые песни стоят внутри плейлиста, а не хвостом:
// иначе их услышит только тот, кто досидит до конца списка.
export const TRACKS=[
  {id:'rvala',title:'Моя тачка всех рвала'},
  {id:'bratya',title:'Братья, жми'},
  {id:'oka',title:'Ока, Ока'},
  {id:'kopeyka',title:'Чёрная копейка'},
  {id:'rubezh',title:'Два друга — один рубеж'},
  {id:'niva',title:'Моя Нива'},
  {id:'motor',title:'Любовь заводит мотор'},
  {id:'volga',title:'Волга без прописки'},
  {id:'pobeg',title:'Побег продолжается'},
].map(t=>({...t,src:'assets/audio/music/'+t.id+'.m4a'}));
export const GARAGE_TRACKS=TRACKS;
export const MUSIC_LEVEL=.5;
const FADE=480;
const ICONS={play:'<path d="m8 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',retry:'<path d="M20 7v5h-5M19 12a7 7 0 1 0-2 5"/>'};
export class GarageRadio {
  constructor({root,getState,prepare,storage=localStorage,media=new Audio(),autostart=false}) {
    this.root=root;this.getState=getState;this.prepare=prepare;this.storage=storage;this.media=media;
    let saved;try{saved=JSON.parse(storage.getItem('rayon-radio')||'null');}catch{}
    this.index=Number.isInteger(saved?.index)&&saved.index>=0&&saved.index<TRACKS.length?saved.index:0;
    // Music never starts on its own: only the ▶ button (or a skip) unlocks it in a session.
    // Исключение — вход через Телеграм (autostart): там игра ведёт себя как приёмник в машине и
    // начинает играть сама. На тестовой сборке и в браузере автостарта нет: музыка на каждой
    // перезагрузке при отладке достаёт. Выбор игрока сильнее автостарта — выключил, значит молчим.
    this.autostart=autostart===true;
    this.enabled=saved?saved.enabled===true:this.autostart;this.unlocked=false;this.blocked=false;this.failed=false;this.loading=false;
    this.key=null;this.loadedKey=null;this.pendingKey=null;this.generation=0;this.playingRequest=false;
    // Stream just the selected AAC file; never decode entire songs into game memory.
    media.preload='none';media.setAttribute('playsinline','');
    for(const name of ['playing','pause','waiting','stalled','ended','error'])media.addEventListener(name,()=>{
      if(name==='playing'){this.loading=false;this.blocked=false;}
      if(name==='waiting'||name==='stalled')this.loading=true;
      if(name==='error'){this.failed=true;this.loading=false;}
      if(name==='ended'&&this.allowed())this.next(1,false);
      this.render();
    });
    root.querySelector('[data-radio="play"]').onclick=()=>{
      prepare();if(this.failed||this.blocked||!this.unlocked)this.enabled=true;else this.enabled=!this.enabled;
      this.unlocked=true;this.persist();this.gesture();
    };
    for(const [name,step] of [['prev',-1],['next',1]])root.querySelector('[data-radio="'+name+'"]').onclick=()=>{prepare();this.unlocked=true;this.next(step,true);};
    this.render();
  }
  // Автостарт при входе через Телеграм. Браузер может не дать звук без касания: тогда остаёмся
  // включёнными и ждём первого тапа — его ловит unlockAudio в game.js и доигрывает начатое.
  autoplay(){
    if(!this.autostart||!this.enabled)return false;
    this.unlocked=true;
    if(this.context&&this.context.state!=='running'){this.blocked=true;this.render();return false;}
    this.sync(true);return !this.blocked;
  }
  attach(context,output) {
    if(this.context)return;
    this.context=context;this.gain=context.createGain();this.gain.gain.value=0;
    this.source=context.createMediaElementSource(this.media);this.source.connect(this.gain);this.gain.connect(output);
    context.addEventListener('statechange',()=>{if(context.state!=='running')this.silence(true);else this.sync(true);});
  }
  persist(){try{this.storage.setItem('rayon-radio',JSON.stringify({index:this.index,enabled:this.enabled}));}catch{}}
  allowed(){const s=this.getState();return this.enabled&&this.unlocked&&s.sound&&s.visible;}
  ramp(value,seconds=.65){if(!this.gain)return;const t=this.context.currentTime,p=this.gain.gain;if(p.cancelAndHoldAtTime)p.cancelAndHoldAtTime(t);else{p.cancelScheduledValues(t);p.setValueAtTime(p.value,t);}p.linearRampToValueAtTime(value,t+seconds);}
  silence(immediate=false){
    clearTimeout(this.timer);this.pendingKey=null;this.generation++;this.playingRequest=false;this.ramp(0,immediate?.015:FADE/1000);
    if(immediate)this.media.pause();else this.timer=setTimeout(()=>{this.media.pause();this.render();},FADE);
  }
  // Any tap resumes a blocked or failed stream, but only after the player pressed ▶ this session.
  gesture(){if(!this.unlocked)return;this.blocked=false;if(this.failed)this.loadedKey=null;this.failed=false;this.sync(true);}
  // Screen changes are deliberately not part of the key: garage and race share the same song.
  sync(force=false){
    const s=this.getState(),key=[s.sound,s.visible,this.enabled,this.unlocked].join(':');
    if(!force&&key===this.key)return;this.key=key;
    if(!this.allowed()){this.silence(!s.visible);this.render();return;}
    this.start();
  }
  track(){return TRACKS[this.index];}
  start(){
    if(!this.allowed()||!this.context||this.context.state==='closed'||this.blocked||this.failed)return;
    const wanted=this.track().src;
    if(this.pendingKey===wanted)return;
    clearTimeout(this.timer);this.pendingKey=null;
    if(this.loadedKey!==wanted&&!this.media.paused){
      this.silence();this.pendingKey=wanted;clearTimeout(this.timer);
      this.timer=setTimeout(()=>{this.pendingKey=null;this.media.pause();this.start();},FADE);return;
    }
    if(this.loadedKey===wanted&&!this.media.paused){this.ramp(MUSIC_LEVEL);this.render();return;}
    if(this.playingRequest)return;
    if(this.loadedKey!==wanted){this.media.src=wanted;this.loadedKey=wanted;this.loading=true;}
    const generation=++this.generation;this.playingRequest=true;this.ramp(MUSIC_LEVEL);
    // First play remains synchronous with the unlocking gesture on iOS.
    Promise.resolve(this.media.play()).then(()=>{
      if(generation!==this.generation)return;
      this.playingRequest=false;
      if(!this.allowed())this.silence(true);
      // Пока трек грузился, игрок мог переключить песню: запрос на старый файл уже не нужен,
      // и без этой догонялки радио оставалось на нём молча до перезагрузки страницы.
      else if(this.loadedKey!==this.track().src)this.start();
      this.render();
    }).catch(error=>{
      if(generation!==this.generation)return;
      this.playingRequest=false;this.loading=false;
      if(error.name==='NotAllowedError')this.blocked=true;
      else if(error.name!=='AbortError')this.failed=true;
      else if(this.allowed()&&this.loadedKey!==this.track().src)this.start();
      this.render();
    });this.render();
  }
  next(step,fromUser=false){
    this.index=(this.index+step+TRACKS.length)%TRACKS.length;
    if(fromUser)this.enabled=true;
    this.failed=false;this.blocked=false;this.loading=false;this.persist();this.sync(true);this.render();
  }
  render(){
    const track=this.track(),active=this.allowed()&&!this.blocked&&!this.failed;
    this.root.querySelector('.radio-title').textContent=track.title;
    this.root.querySelector('.radio-count').textContent=(this.index+1)+'/'+TRACKS.length;
    const button=this.root.querySelector('[data-radio="play"]');
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+ICONS[this.failed?'retry':active?'pause':'play']+'</svg>';
    button.setAttribute('aria-label',this.failed?'Повторить загрузку музыки':active?'Приостановить музыку':'Включить музыку');
    button.setAttribute('aria-pressed',String(active));
    this.root.dataset.playing=String(active&&!this.media.paused&&!this.loading);
    const state=this.failed?'Не загрузилось — нажми повтор':this.blocked?'Нажми ▶':this.loading&&active?'Загрузка…':!this.getState().sound?'Звук выключен':'';
    this.root.querySelector('.radio-state').textContent=state;
    this.root.title=track.title+(state?' · '+state:'');
  }
}
