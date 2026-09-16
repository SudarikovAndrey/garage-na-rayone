// Экономика конца: недельные цели и награды за рекорды на бонусных трассах. Рубли и материалы после гаража V
// нужны для премиальных красок, а редкая косметика достаётся за рекорды, которые нельзя купить.
import {addDecal} from './decals.js';
import {paintById} from './paints.js';
import {track} from './analytics.js';
export const GOAL_POOL=[
 {id:'wins',name:'Пять побед',hint:'любые заезды кампании',kind:'win',target:5,reward:{cash:2500}},
 {id:'perfect',name:'Пятнадцать чётких',hint:'идеальные переключения',kind:'perfect',target:15,reward:{scrap:60}},
 {id:'captain',name:'Главарь повержен',hint:'первая победа над главарём',kind:'captain',target:1,reward:{hard:15}},
 {id:'dirt',name:'Три на грунтовке',hint:'победы на разбитой дороге',kind:'dirtWin',target:3,reward:{scrap:80},minRank:150},
 {id:'wet',name:'Три под дождём',hint:'победы на мокром асфальте',kind:'wetWin',target:3,reward:{cash:3000}},
 {id:'ridge',name:'Три финиша на Гребне',hint:'доехать, не слететь',kind:'ridgeFinish',target:3,reward:{hard:10}},
 {id:'overpass',name:'Два больших пролёта',hint:'перелететь большой пролёт эстакады',kind:'bigGap',target:2,reward:{scrap:120},minRank:90},
 {id:'overtake',name:'Тридцать обгонов',hint:'на ночном шоссе',kind:'overtaken',target:30,reward:{cash:4000},minRank:90},
 {id:'practice',name:'Четыре раза за деталями',hint:'тренировочные заезды',kind:'practice',target:4,reward:{scrap:40}},
 {id:'rival',name:'Кореш второй',hint:'победи любого кореша района',kind:'rivalWin',target:1,reward:{cash:1500}},
 {id:'tune',name:'Три улучшения',hint:'прокачай детали',kind:'tune',target:3,reward:{cash:1200}},
 {id:'streak',name:'Три подряд',hint:'три победы без поражений',kind:'streak3',target:1,reward:{hard:8}},
];
// A record is a time (lower is better, `under`) or a drift score (higher is better, `over`).
export const RECORD_REWARDS=[
 {track:'ridge',over:2400,reward:{decal:'phantom'},name:'Гребень: 2400 очков дрифта'},
 {track:'ridge',over:3200,reward:{paint:'gold'},name:'Гребень: 3200 очков дрифта'},
 {track:'overpass',under:15,reward:{decal:'glitch'},name:'Эстакада быстрее 15 с'},
 {track:'overtake',under:17,reward:{paint:'lime'},name:'Обгон быстрее 17 с'},
];
export const HIGHER_IS_BETTER={ridge:true};
export function weekKey(now=Date.now()){const d=new Date(now);const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));const day=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-day);const y=t.getUTCFullYear(),w=Math.ceil(((t-Date.UTC(y,0,1))/86400000+1)/7);return y+'-W'+String(w).padStart(2,'0');}
const hash=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
export function pickGoals(week,rank=0){const pool=GOAL_POOL.filter(g=>!g.minRank||rank>=g.minRank);const out=[];let seed=hash(week);while(out.length<3&&out.length<pool.length){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const g=pool[seed%pool.length];if(!out.includes(g))out.push(g);}return out;}
export function ensureGoals(s,now=Date.now()){const week=weekKey(now);if(!s.goals||s.goals.week!==week)s.goals={week,progress:{},claimed:[]};return s.goals;}
export function noteGoal(s,kind,n=1,now=Date.now()){const g=ensureGoals(s,now);g.progress[kind]=(g.progress[kind]||0)+n;}
export function goalStatus(s,now=Date.now()){const g=ensureGoals(s,now);return pickGoals(g.week,s.rank).map(goal=>({...goal,progress:Math.min(goal.target,g.progress[goal.kind]||0),done:(g.progress[goal.kind]||0)>=goal.target,claimed:g.claimed.includes(goal.id)}));}
export function grantReward(s,reward){const got=[];if(reward.cash){s.cash+=reward.cash;got.push(reward.cash.toLocaleString('ru-RU')+' ₽');}if(reward.scrap){s.scrap+=reward.scrap;got.push(reward.scrap+' ⚒');}if(reward.hard){s.hard+=reward.hard;got.push(reward.hard+' $');}
 if(reward.paint&&paintById(reward.paint)){if(!s.ownedPaints.includes(reward.paint))s.ownedPaints.push(reward.paint);got.push('краска «'+paintById(reward.paint).name+'»');}
 if(reward.decal){const r=addDecal(s,reward.decal);got.push(r.duplicate?'+30 ⚒ за повтор декали':'декаль');}
 return got;}
export function claimGoal(s,id,now=Date.now()){const g=ensureGoals(s,now),goal=goalStatus(s,now).find(x=>x.id===id);if(!goal||!goal.done||goal.claimed)return null;g.claimed.push(id);track('goal',{goal:id});return grantReward(s,goal.reward);}
export const rewardText=r=>[r.cash&&r.cash.toLocaleString('ru-RU')+' ₽',r.scrap&&r.scrap+' ⚒',r.hard&&r.hard+' $',r.paint&&'краска',r.decal&&'декаль'].filter(Boolean).join(' · ');
// Рекорды бонусных трасс: лучшее время на трассу и одноразовые награды за планки.
export function noteTrackRecord(s,trackId,value){if(!(value>0))return {record:false,rewards:[]};s.trackRecords??={};s.recordRewards??=[];const higher=!!HIGHER_IS_BETTER[trackId],best=s.trackRecords[trackId];const record=!best||(higher?value>best:value<best);if(record)s.trackRecords[trackId]=+value.toFixed(3);const rewards=[];for(const r of RECORD_REWARDS){if(r.track!==trackId)continue;const key=r.track+':'+(r.under??'>'+r.over),hit=r.under!=null?value<r.under:value>r.over;if(hit&&!s.recordRewards.includes(key)){s.recordRewards.push(key);rewards.push({...r,got:grantReward(s,r.reward)});}}return {record,rewards,best:s.trackRecords[trackId]};}
export function restoreGoals(s,d){s.goals=d.goals&&typeof d.goals.week==='string'?{week:d.goals.week,progress:Object.fromEntries(Object.entries(d.goals.progress||{}).filter(([k,v])=>Number.isFinite(v)).map(([k,v])=>[k,Math.max(0,Math.floor(v))])),claimed:Array.isArray(d.goals.claimed)?d.goals.claimed.filter(x=>typeof x==='string'):[]}:null;s.trackRecords=Object.fromEntries(Object.entries(d.trackRecords||{}).filter(([k,v])=>Number.isFinite(v)&&v>0));s.recordRewards=Array.isArray(d.recordRewards)?d.recordRewards.filter(x=>typeof x==='string'):[];}
export function goalsMarkup(s,now=Date.now()){const list=goalStatus(s,now);return `<section class="weekly-goals"><div class="goals-head"><b>ЦЕЛИ НЕДЕЛИ</b><small>${s.goals.week}</small></div>${list.map(g=>`<div class="goal-row ${g.claimed?'claimed':g.done?'done':''}"><div><b>${g.name}</b><small>${g.hint} · ${g.progress}/${g.target}</small><i style="--p:${Math.round(g.progress/g.target*100)}%"></i></div>${g.claimed?'<span>✓</span>':g.done?`<button data-goal-claim="${g.id}">ЗАБРАТЬ</button>`:`<span>${rewardText(g.reward)}</span>`}</div>`).join('')}</section>`;}
