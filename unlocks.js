// Последовательное подключение механик. Игрок видит кнопку или вкладку только тогда, когда она ему нужна, и один
// раз получает короткую карточку «Новое» — что это и зачем. Порядок повторяет карту прохождения
// (docs/onboarding-flow.md): заезд → деталь → главарь → ящик → гараж → машины → материалы → тренировка → дуэли.
import {totalCrates} from './crates.js';
export const UNLOCKS=[
 {id:'crates',when:s=>totalCrates(s)>0||s.races>=5,button:'[data-meta="boxes"]',title:'Ящики',text:'Каждые пять финишей — уличный ящик с деталью. За босса района — эпический. Открываются во вкладке «Ящики».'},
 {id:'customize',when:s=>s.rank>=1||Object.keys(s.inventory).length>3,button:'#configure-button',title:'Мастерская',text:'Первая деталь уже в багажнике. Поставь её в тюнинге — мощь вырастет сразу, а дальше детали можно улучшать за рубли и материалы.'},
 {id:'captain',when:s=>s.rank>=3,title:'Главарь серии',text:'Каждая пятая гонка — главарь. За него дают награду серии и чертёж машины, но он просит не только обогнать: держи чёткие переключения в зелёной зоне.'},
 {id:'launch',when:s=>s.rank>=3,title:'Старт теперь твой',text:'Автостарта больше нет. Жми «Старт», когда загорится зелёный: раньше — фальстарт, позже — потерянные метры.'},
 {id:'garage',when:s=>s.rank>=5,button:'#garage-upgrade',title:'Гараж растёт',text:'Уровень гаража открывает редкий обвес, глубже тюнинг и место под вторую машину. Условие и цена — на кнопке над «Заездом».'},
 {id:'fleet',when:s=>s.rank>=4||(s.carShards||[]).some((n,i)=>n>0&&!s.unlockedCars?.[i]),button:'#switch-car',title:'Чертежи машин',text:'За каждого главаря — несколько чертежей. Соберёшь — новая машина встанет в гараж, если есть свободное место.'},
 {id:'shop',when:s=>s.rank>=8,button:'[data-meta="shop"]',title:'Барыга',text:'Материалы для улучшений пакетами дешевле, чем поштучно, а с V гаража — премиальные краски. Баксы — редкая валюта за первые победы.'},
 {id:'training',when:s=>s.rank>=5||s.campaignLosses>0,title:'Тренировка',text:'Упёрся? Во вкладке «Тренировка» — заезд с пройденным соперником: ранг не растёт, зато рубли, материалы и деталь за победу.'},
 {id:'duels',when:s=>s.rank>=10,title:'Дуэли',text:'С десятого заезда открыты дуэли с другими игроками на одинаковых машинах — только руки.'},
];
export const unlockState=s=>Object.fromEntries(UNLOCKS.map(u=>[u.id,!!u.when(s)]));
export const isUnlocked=(s,id)=>!!UNLOCKS.find(u=>u.id===id)?.when(s);
// Home buttons appear with their mechanic; ids are the functional ids the pit-stop layout keeps.
export function applyUnlocks(s,root=document){for(const u of UNLOCKS){if(!u.button)continue;const on=!!u.when(s);for(const el of root.querySelectorAll(u.button))el.hidden=!on;}}
export function pendingCards(s){s.hints??=[];return UNLOCKS.filter(u=>u.when(s)&&!s.hints.includes(u.id));}
import {track} from './analytics.js';
export function markSeen(s,id){s.hints??=[];if(!s.hints.includes(id)){s.hints.push(id);track('hint',{hint:id});}}
export const unlockCardMarkup=u=>`<span class="tiny-label">НОВОЕ</span><h2>${u.title}</h2><p>${u.text}</p><small class="unlock-tap">тапни, чтобы закрыть</small>`;
