export const EVENT={id:'rayon-1995-01',name:'СЕЗОН АСФАЛЬТА',start:Date.UTC(2026,8,11),end:Date.UTC(2026,8,25),levels:20,xpPerLevel:300};
export const QUESTS=[{key:'races',name:'Три заезда',target:3},{key:'wins',name:'Две победы',target:2},{key:'perfect',name:'Шесть чётких',target:6}];
export const PASS_REWARDS=Array.from({length:20},(_,i)=>{const n=i+1;return n===20?{crate:'legend'}:n%5===0?{crate:'boss'}:n%4===0?{hard:20}:n%3===0?{crate:n%2?'tech':'body'}:n%2===0?{scrap:30+n*2}:{cash:1000+n*150};});
export const eventDay=now=>new Date(now).toISOString().slice(0,10);
export const activeEvent=now=>now>=EVENT.start&&now<EVENT.end;
export const eventLevel=p=>Math.min(20,Math.floor(p.xp/300));
export const league=score=>score>=10000?'ЛЕГЕНДА':score>=5000?'АВТОРИТЕТ':score>=2000?'СВОЙ НА РАЙОНЕ':'НОВИЧОК';
export const rewardName=r=>r.crate?({street:'С рынка',tech:'Под капот',body:'На стиле',boss:'Со склада',legend:'Чёрный чемодан'}[r.crate]):r.cash?r.cash.toLocaleString('ru-RU')+' ₽':r.hard?r.hard+' $':r.scrap+' ⚒';
export function newEventProfile(){return {name:'Пацан',avatar:0,xp:0,score:0,races:0,wins:0,best:null,days:{},claims:[],receipts:[],recent:[],active:null};}
export function dayStats(p,now){const key=eventDay(now);return p.days[key]||{races:0,wins:0,perfect:0,best:[],claimed:[]};}
export function startEventRace(p,{id,practice=false},now){if(!activeEvent(now))throw Error('Ивент завершён');if(p.active&&now-p.active.at<5000)throw Error('Заезд уже готовится');p.active={id,at:now,practice:!!practice};return {ticket:id};}
export function finishEventRace(p,b,now){
 if(p.recent.includes(b.ticket))return {duplicate:true};
 const a=p.active;if(!a||a.id!==b.ticket)throw Error('Заезд не зарегистрирован');
 const elapsed=(now-a.at)/1000;
 if(!activeEvent(now)||elapsed>1800)throw Error('Время заезда истекло');
 if(typeof b.won!=='boolean'||!Number.isInteger(b.perfect)||b.perfect<0||b.perfect>4||!Number.isFinite(b.time)||b.time<2||b.time>300||elapsed<Math.max(2,b.time-1))throw Error('Некорректный результат');
 const d=p.days[eventDay(now)]??={races:0,wins:0,perfect:0,best:[],claimed:[]};
 d.races++;d.wins+=+b.won;d.perfect+=b.perfect;p.races++;p.wins+=+b.won;p.best=p.best?Math.min(p.best,b.time):b.time;
 const xp=60+(b.won?40:0)+10*b.perfect;p.xp+=xp;
 const score=a.practice?0:50+(b.won?40:0)+15*b.perfect,old=d.best.reduce((a,b)=>a+b,0);
 if(score)d.best=[...d.best,score].sort((a,b)=>b-a).slice(0,10);
 const gained=d.best.reduce((a,b)=>a+b,0)-old;p.score+=gained;p.active=null;p.recent=[b.ticket,...p.recent].slice(0,30);
 return {xp,score:gained,practice:a.practice};
}
export function claimEvent(p,key,now,place=null){
 if(p.claims.includes(key))return {duplicate:true};
 let reward;
 if(key.startsWith('pass:')){const n=Number(key.slice(5));if(!Number.isInteger(n)||n<1||n>20||eventLevel(p)<n)throw Error('Награда ещё закрыта');reward=PASS_REWARDS[n-1];}
 else if(key.startsWith('quest:')){const [,day,id]=key.split(':');if(day!==eventDay(now)||!activeEvent(now))throw Error('Задание уже сменилось');const q=QUESTS.find(q=>q.key===id),d=dayStats(p,now);if(!q||d[q.key]<q.target)throw Error('Задание ещё не выполнено');if(d.claimed.includes(id))return {duplicate:true};d.claimed.push(id);p.xp+=150;p.claims.push(key);return {xp:150};}
 else if(key==='final'){if(now<EVENT.end||p.races<10||!place)throw Error('Нужны конец ивента и 10 финишей');reward=place===1?{crate:'legend'}:place<=10?{crate:'boss'}:{crate:'body'};}
 else throw Error('Неизвестная награда');
 p.claims.push(key);p.receipts.push({id:EVENT.id+':'+key,reward});return {reward};
}
export function publicProfile(p){return {name:p.name,avatar:p.avatar,score:p.score,xp:p.xp,races:p.races,wins:p.wins,best:p.best};}
