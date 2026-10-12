// The same frozen result drives the track reveal and the reward-card headline.
export function finishSummary({mode='race',time=0,opponentTime,score=0,opponentScore=0,crashed=false,verified=false,place,draw=false}={}){
 const clock=Number.isFinite(time)&&time>0?time.toFixed(2):'—';
 if(mode==='overpass')return {kind:'score',value:Math.min(3,Math.max(0,score))+' / 3',unit:crashed?'НЕ ХВАТИЛО МОЩИ':'ПРОЛЁТЫ ПРОЙДЕНЫ',note:clock==='—'?'':clock+' С'};
 if(crashed)return {kind:'crash',value:'ВЫЛЕТ',unit:'ЗАЕЗД ЗАВЕРШЁН',note:''};
 if(mode==='drift')return {kind:'score',value:Math.max(0,Math.floor(score)).toLocaleString('ru-RU'),unit:'ОЧКОВ',note:clock==='—'?'':clock+' С'};
 if(mode==='duel'&&!verified)return {kind:'time',value:clock,unit:'СЕКУНД',note:'ТВОЁ ВРЕМЯ'};
 const tied=draw||(mode==='battle'?score===opponentScore:Number.isFinite(opponentTime)&&time===opponentTime);
 if(tied)return {kind:'crash',value:'НИЧЬЯ',unit:mode==='battle'?'РАВНЫЙ СЧЁТ':clock+' С',note:''};
 const position=place??(mode==='battle'?(score>opponentScore?1:2):(!Number.isFinite(opponentTime)||opponentTime<=0||time<opponentTime?1:2));
 return {kind:'place',value:String(position),unit:'МЕСТО',note:mode==='battle'?Math.floor(score).toLocaleString('ru-RU')+' ОЧКОВ':clock+' С'};
}
export class FinishPresentation{
 constructor(){
  this.game=document.querySelector('#game');this.dialog=document.querySelector('#result-dialog');
  this.banner=document.createElement('div');this.banner.className='finish-banner';this.banner.hidden=true;this.banner.setAttribute('role','status');
  this.hero=document.createElement('div');this.hero.className='finish-outcome';this.hero.hidden=true;
  for(const node of [this.banner,this.hero])node.innerHTML='<strong class="finish-number"></strong><span class="finish-unit"></span><span class="finish-note"></span>';
  document.querySelector('#race-screen').append(this.banner);document.querySelector('#result-kicker').after(this.hero);
  new MutationObserver(()=>{if(this.dialog.open){this.hide();this.hero.hidden=!this.latest;if(this.latest)this.paint(this.hero,this.latest);}}).observe(this.dialog,{attributes:true,attributeFilter:['open']});
  new MutationObserver(()=>{if(this.game.dataset.screen==='garage'){this.hide();this.latest=null;this.hero.hidden=true;}}).observe(this.game,{attributes:true,attributeFilter:['data-screen']});
 }
 paint(node,data){node.dataset.kind=data.kind;node.querySelector('.finish-number').textContent=data.value;node.querySelector('.finish-unit').textContent=data.unit;node.querySelector('.finish-note').textContent=data.note;}
 result(data){this.latest=finishSummary(data);this.paint(this.hero,this.latest);this.hero.hidden=false;}
 // Есть состояния без итога: вызов брошен, соперник ещё не ехал — показывать «1 место» тут нечего.
 clear(){this.latest=null;this.hero.hidden=true;}
 show(data){this.hide();this.result(data);this.paint(this.banner,this.latest);this.banner.hidden=false;this.game.dataset.finish='true';this.timer=setTimeout(()=>this.hide(),2800);}
 hide(){clearTimeout(this.timer);this.banner.hidden=true;delete this.game.dataset.finish;}
}
