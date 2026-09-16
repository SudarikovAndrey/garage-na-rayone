import {isOverpassStage,overpassStage} from './overpass-flow.js';
import {CAMPAIGN_LENGTH,CAMPAIGN_REVISION,campaignPosition,campaignDistance,BEATS,driftTarget,CHASE,benchmarkLevels} from './campaign-config.js';
import {CAMPAIGN_TUNING} from './campaign-tuning.js';
export {CAMPAIGN_LENGTH} from './campaign-config.js';
import {vehicleStats} from './vehicle-dynamics.js';
import {restorePaints,rollPaintBonus} from './paints.js';
import {restoreGoals,noteGoal,noteTrackRecord} from './goals.js';
import {restorePlayed,recordRace} from './played-stats.js';
import {CAPTAINS,DISTRICT_BOSSES} from './characters.js';
import {upgradeLevels,restoreUpgrades,grantUpgrade,missingUpgrades,upgradeNeedsLevel,upgradeAllowed} from './upgrades.js';
import {track} from './analytics.js';
import {restoreDecals,rollDecalBonus,addDecal,bossDecal} from './decals.js';
import {CRATE_FINISHES,crateById,crateCount,adjustCrate,grantCrate,restoreEconomy} from './crates.js';
import {garageLevel,restoreGarageLevel,garageRankCap,requiredGarageFor,carSlotsFor,GARAGE_LEVELS as GARAGE_LEVELS_SLOTS} from './garage-levels.js';
import {carLevel as carLevelOf,carRankCap as carRankCapOf,restoreCarLevels,levelForRank} from './car-levels.js';
import {CARS,CAR_COUNT} from './fleet.js';
import {validAvatar} from './avatar.js';
import {TRACKS,trackIndex,lookForRank} from './tracks.js';
import {rivalFor} from './rivals.js';
export const CAR_SHARD_COSTS=[0,12,8,10,14,18,22,16,16,10,24,18,26];
const CAR_SHARD_ORDER=[2,1,3,4,7,9,8,11,5,10,6,12];
export const BOSS_CARS=[6,10,6,10,10]; // Десятка, Волга, Десятка, Волга, Волга — Нива на грунте не дотягивала до темпа босса
// Ordinary opponents drive cars of their district: an Инвалидка cannot be tuned to a district-5 pace over 804 m, so late
// districts field the faster classics and the off-roaders where the dirt is.
export const STAGE_CARS=[[2,1,9,3,8],[1,3,8,0,4],[0,4,8,10,7,5],[4,5,6,7,11,10],[5,6,10,0,4]];
export const RARITIES=[{name:'Обычная',color:'#a9ab9a',weight:55,maxRank:5},{name:'Редкая',color:'#73b9ef',weight:28,maxRank:7},{name:'Эпическая',color:'#c08aec',weight:13,maxRank:10},{name:'Легендарная',color:'#eeb857',weight:4,maxRank:15}];
export const SLOTS=[{id:'engine',name:'Мотор',icon:'⚙',stats:[1,0,0]},{id:'tires',name:'Шины',icon:'◉',stats:[0,1,0]},{id:'gearbox',name:'КПП',icon:'⤴',stats:[0,0,1]},{id:'spoiler',name:'Спойлер',icon:'━',stats:[.22,0,.05]},{id:'skirts',name:'Юбки',icon:'▰',stats:[.16,0,0]},{id:'fenders',name:'Крылья',icon:'◠',stats:[0,.24,0]},{id:'rims',name:'Диски',icon:'✺',stats:[.08,.25,0]},{id:'bumpers',name:'Бамперы',icon:'▱',stats:[.12,.08,0]}];
const nicknames={
 engine:['Капиталочка','Батин секрет','Злой карб','Ракета района'],
 tires:['Ещё походят','Свежий навар','Жвачка','Клей для трассы'],
 gearbox:['Хрустит, едет','Короткоходка','Щёлк — ушёл','Без базара'],
 spoiler:['Скамейка','Антикрылышко','Аэродром','На взлёт'],
 skirts:['Кооператив','Порог понтов','Ниже плинтуса','Асфальторез'],
 fenders:['Рихтовочка','На вырост','Плечи шире','Шкаф на колёсах'],
 rims:['Литьё с рынка','Понты на литье','Малиновый шик','Золото района'],
 bumpers:['Кооперативный спорт','Губа не дура','Обвес авторитета','Асфальт пополам'],
};
export const PARTS=SLOTS.flatMap(s=>RARITIES.map((r,i)=>({id:s.id+'-'+i,slot:s.id,name:s.name+' «'+nicknames[s.id][i]+'»',nickname:nicknames[s.id][i],rarity:i,maxRank:r.maxRank,icon:s.icon,stats:s.stats})));
export const partById=id=>PARTS.find(p=>p.id===id);
export const AREAS=TRACKS.map(t=>t.name);

// Имена главарей берём из состава персонажей: у каждого есть лицо и свои реплики (dist/characters.js).
const NAMES=CAPTAINS;
const STYLES=[{name:'С места',shift:6100,power:-.12,grip:.7},{name:'На верхах',shift:6600,power:.25,grip:-.25},{name:'Ровный',shift:6250,power:0,grip:.1}];
const integer=(x,a,b)=>Math.max(a,Math.min(b,Math.floor(Number(x)||0)));
export function hydrate(d={}){const oldRank=integer(d.rank??Math.min(d.wins||0,24),0,d.campaignRevision===CAMPAIGN_REVISION?CAMPAIGN_LENGTH:25);const selected=integer(d.selected,0,CAR_COUNT-1),hasCollection=Number(d.collectionRevision)>=1;const s={tutorials:Object.fromEntries(['drag-auto','drag-manual','drift'].filter(id=>d.tutorials?.[id]===true).map(id=>[id,true])),hints:Array.isArray(d.hints)?d.hints.filter(x=>typeof x==='string'):[],campaignRevision:CAMPAIGN_REVISION,collectionRevision:1,updatedAt:integer(d.updatedAt,0,4e12),campaignChampionships:integer(d.campaignChampionships,0,10000),campaignLosses:integer(d.campaignLosses,0,999),campaignSeconds:integer(d.campaignSeconds,0,1e8),campaignAttempts:integer(d.campaignAttempts,0,1e6),paint:CARS.map((car,i)=>['cherry','ivory','black','blue','green','silver','orange'].includes(d.paint?.[i])?d.paint[i]:car.color),version:3,cash:integer(d.cash??1200,0,1e8),selected,garage:restoreGarageLevel(d),garageRevision:2,records:CARS.map((car,i)=>Number(d.records?.[i])>0?Number(d.records[i]):null),wins:integer(d.wins,0,1e6),rank:d.campaignRevision===CAMPAIGN_REVISION?oldRank:oldRank*9,races:integer(d.races,0,1e6),streak:integer(d.streak,0,1e6),scrap:integer(d.scrap,0,1e7),boxes:integer(d.boxes??1,0,10000),bossBoxes:integer(d.bossBoxes,0,10000),pity:integer(d.pity,0,7),inventory:{},equipped:CARS.map(()=>({})),carShards:CARS.map((_,i)=>integer(d.carShards?.[i],0,1e6)),unlockedCars:CARS.map((_,i)=>hasCollection?!!d.unlockedCars?.[i]:i===0||i===selected)};
 s.overpassChecks=Array.from({length:5},(_,i)=>d.overpassChecks?.[i]===true);
 s.driftBonusClaims=Array.isArray(d.driftBonusClaims)?[...new Set(d.driftBonusClaims.filter(x=>typeof x==='string'&&/^\d+:(90|135|180|225)$/.test(x)))].slice(-1000):[];
 for(const p of PARTS)if(d.inventory?.[p.id])s.inventory[p.id]={rank:integer(d.inventory[p.id].rank||1,1,p.maxRank)};
 if(!d.version){for(const id of ['engine-0','tires-0','gearbox-0'])s.inventory[id]={rank:1};}
 for(let c=0;c<CAR_COUNT;c++)for(const slot of SLOTS){const id=d.equipped?.[c]?.[slot.id];if(s.inventory[id]&&partById(id)?.slot===slot.id)s.equipped[c][slot.id]=id;else if(!d.version&&c<2&&s.unlockedCars[c]&&s.inventory[slot.id+'-0'])s.equipped[c][slot.id]=slot.id+'-0';}
 if(Number(d.version||0)<3){let cash=0,materials=0;for(let car=0;car<2;car++)for(let slot=0;slot<3;slot++){const n=integer(d.levels?.[car]?.[slot],0,8);cash+=[250,200,220][slot]*n*(n+1)/2;materials+=n*20;}if(cash){s.cash=integer(s.cash+cash,0,1e8);s.scrap=integer(s.scrap+materials,0,1e7);s.migrationNotice={cash,materials};}}
 else if(d.migrationNotice?.cash>0)s.migrationNotice={cash:integer(d.migrationNotice.cash,0,1e8),materials:integer(d.migrationNotice.materials,0,1e7)};
 // Своё фото игрока. Лежит в сейве, а значит переезжает с прогрессом; без него берётся аватар Telegram.
 s.avatar=validAvatar(d.avatar)?d.avatar:null;
 s.eventReceipts=Array.isArray(d.eventReceipts)?d.eventReceipts.filter(x=>typeof x==='string').slice(-1000):[];
 s.eventPending=d.eventPending&&typeof d.eventPending.ticket==='string'?d.eventPending:null;
 restoreEconomy(s,d,integer);
 restorePaints(s,d);
 restoreGoals(s,d);
 restoreUpgrades(s,d,CAR_COUNT);
 restorePlayed(s,d);
 restoreDecals(s,d,CAR_COUNT);
 s.unlockedCars[0]=true;s.unlockedCars[s.selected]=true;refreshUnlocks(s);
 // Какие машины игрок уже видел на весь экран. Старым сейвам ничего не показываем задним числом:
 // всё, что уже стоит в гараже на момент первой загрузки с этим полем, считается показанным.
 s.revealedCars=CARS.map((_,i)=>Array.isArray(d.revealedCars)?!!d.revealedCars[i]:!!s.unlockedCars[i]);
 // Уровень машины: у старых сейвов он подбирается так, чтобы уже установленные детали остались легальными.
 restoreCarLevels(s,d,i=>{let need=1;for(const id of Object.values(s.equipped[i]||{})){const owned=s.inventory[id];if(owned)need=Math.max(need,levelForRank(owned.rank));}
  for(const id of (Array.isArray(d?.upgrades?.[i])?d.upgrades[i]:[]))need=Math.max(need,upgradeNeedsLevel(id));return need;});
 return s;
}
export const isCarUnlocked=(s,i)=>!!CARS[i]&&!!s.unlockedCars?.[i];
export {carLevel,carRankCap,carUpgradeRarity,carLevelProgress,levelUpCar,MAX_CAR_LEVEL} from './car-levels.js';
// Очередь показа: машина открыта, но её ещё не видели во весь экран.
export const pendingReveals=s=>CARS.map((_,i)=>i).filter(i=>!!s.unlockedCars?.[i]&&!s.revealedCars?.[i]);
export function markCarRevealed(s,i){if(!CARS[i])return false;(s.revealedCars??=[])[i]=true;return true;}
// A car with all shards moves into the garage only while there is a free spot (carSlots); otherwise it waits, and the
// next garage level lets it in. Order is the shard order, so the queue is predictable.
export const carSlots=s=>carSlotsFor(s.garage);
export const carShardsComplete=(s,i)=>i>0&&integer(s.carShards?.[i],0,1e9)>=CAR_SHARD_COSTS[i];
export const pendingCars=s=>CAR_SHARD_ORDER.filter(i=>carShardsComplete(s,i)&&!isCarUnlocked(s,i));
export function refreshUnlocks(s){let parked=s.unlockedCars.filter(Boolean).length;const gained=[];for(const i of CAR_SHARD_ORDER){if(isCarUnlocked(s,i)||!carShardsComplete(s,i))continue;if(parked>=carSlots(s))break;s.unlockedCars[i]=true;parked++;gained.push(i);}return gained;}
export const carShardProgress=(s,i)=>({current:integer(s.carShards?.[i],0,CAR_SHARD_COSTS[i]||0),needed:CAR_SHARD_COSTS[i]||0});
function grantCampaignShards(s,opp){return grantCarShards(s,3+Math.floor(opp.id/45));}
export function grantCarShards(s,count,{car=null}={}){
 // Машина уже своя — чертежи идут ей в уровень и копятся сверх стоимости открытия.
 if(car!==null&&CARS[car]&&isCarUnlocked(s,car)){
  const amount=Math.max(0,Math.floor(count));if(!amount)return null;
  s.carShards[car]=integer(s.carShards[car],0,1e6)+amount;
  return {index:car,amount,current:s.carShards[car],needed:CAR_SHARD_COSTS[car]||0,unlocked:false,pending:false,garageForSpot:null,level:true};
 }
 const index=CAR_SHARD_ORDER.find(i=>!carShardsComplete(s,i));if(index===undefined)return null;const needed=CAR_SHARD_COSTS[index],before=integer(s.carShards[index],0,needed),amount=Math.min(needed-before,Math.max(0,Math.floor(count)));s.carShards[index]=before+amount;const complete=s.carShards[index]>=needed,unlocked=complete&&refreshUnlocks(s).includes(index);const spot=complete&&!unlocked?GARAGE_LEVELS_SLOTS.find(g=>g.carSlots>s.unlockedCars.filter(Boolean).length):null;return {index,amount,current:s.carShards[index],needed,unlocked,pending:complete&&!unlocked,garageForSpot:spot?.level??null};}
export function partStrength(p,rank){const base=[.45,.85,1.35,2][p.rarity],level=integer(rank,1,p.maxRank),steps=Math.min(level-1,4)+Math.max(0,level-5)*.35;return ['engine','tires','gearbox'].includes(p.slot)?base+steps*[1.2,1.45,1.6,1.75][p.rarity]:base*(1+steps*.22);}
export function effectiveLevels(s,car=s.selected){const out=[0,0,0];
 for(const id of Object.values(s.equipped[car])){const p=partById(id),owned=s.inventory[id];if(!p||!owned)continue;
  const amount=partStrength(p,owned.rank);p.stats.forEach((v,i)=>out[i]+=v*amount);}
 // Уникальные апгрейды складываются поверх деталей: слотов у них нет, работают все разом.
 upgradeLevels(s,car).forEach((v,i)=>out[i]+=v);
 return out;}
export const rating=(levels,carId='samara')=>vehicleStats(carId,levels).rating;
// Догон: во сколько раз игрок выше эталона своего ранга, во столько же поднимается стена.
// Уровни растут одной долей, чтобы характер соперника (мотор против шин) не менялся.
// Сколько мощи добавить сопернику: ровно тот излишек, который игрок набрал сверх эталона своего
// ранга. Небольшой запас (slack) прощаем — обычный разброс прокачки стеной быть не должен.
export function chaseGain(mine,bench,{slack=CHASE.slack,follow=CHASE.follow.plain,limit=CHASE.limit}={}){
 if(!(mine>0)||!(bench>0))return 0;
 const over=mine-bench*(1+slack);
 return over>0?Math.min(over*follow,bench*(limit-1)):0;
}
// Поднять уровни до нужной мощи: доли всех трёх растут одинаково, характер соперника не меняется.
// Мощь — это база машины плюс уровни с весами, поэтому множитель считаем по уровням, а не по мощи.
export function chaseLevels(levels,carId,gain){
 const span=levels[0]*14+levels[1]*5+levels[2]*3;
 if(!(gain>0)||!(span>0))return levels;
 return levels.map(v=>+(v*(1+gain/span)).toFixed(3));
}
// Мощь игрока как её видит гараж. Калибровка зовёт opponent({rank}) без сейва — там догонять некого,
// и это не ошибка: соперники авторские и считаются против эталона, а не против чьей-то машины.
const playerPower=s=>{try{return rating(effectiveLevels(s),CARS[s.selected]?.id);}catch{return 0;}};
export function opponent(s,practice=false){
 if(!practice&&isOverpassStage(s.rank))return overpassStage(s.rank);
 let n=practice?Math.max(0,Math.min(CAMPAIGN_LENGTH-1,s.rank)-8):Math.min(CAMPAIGN_LENGTH-1,s.rank);
 if(practice&&campaignPosition(n).drift)n=Math.max(0,n-1); // training is always a drag race
 const pos=campaignPosition(n),crew=Math.floor(n/5)%25,style=STYLES[crew%3],tuning=CAMPAIGN_TUNING[n];
 // Recurring rivals take the «Вызов» beat of series 1–6 in every district: same face, a new car each district.
 // Машина берётся из этапа всегда: уровни деталей откалиброваны под неё. В тренировке молчит только сам знакомый
 // (имя, реплики, окрас), иначе его уровни поехали бы на чужой машине и «передышка» выходила тяжелее кампании.
 const stageRival=rivalFor(pos),rival=practice?null:stageRival,rivalStyle=rival?STYLES[rival.style]:style;
 // District bosses drive cars that can actually be tuned to a boss pace over 804 m (an Инвалидка cannot).
 const pool=STAGE_CARS[pos.map],strong=[...pool].sort((a,b)=>rating([0,0,0],CARS[b].id)-rating([0,0,0],CARS[a].id)),car=stageRival?stageRival.car:pos.boss?BOSS_CARS[pos.map]:pos.captain?strong[crew%2]:pool[(n*7+2)%pool.length],look=lookForRank(n,practice);/* captains take the two strongest cars of the district pool: they must reach an 804 m pace */
 if(pos.drift)return driftStage(s,n,pos,tuning);
 return {id:n,name:rival?rival.name:pos.boss?DISTRICT_BOSSES[pos.map]:pos.captain?NAMES[crew%NAMES.length]:['Пацан','Кореш','Сосед','Напарник'][pos.beat]+' '+NAMES[crew%NAMES.length],rival:rival&&{id:rival.id,name:rival.name,taunt:rival.taunt,win:rival.win,lose:rival.lose,visit:rival.visit,returns:rival.returns},paint:rival?.paint,area:AREAS[pos.map],map:pos.map,car,boss:pos.boss,captain:pos.captain,decal:pos.captain?bossDecal(n):null,beat:BEATS[pos.beat],series:pos.series,distance:campaignDistance(n),requiredPerfect:practice||n<4||pos.boss?0:pos.beat===3||pos.captain?(campaignDistance(n)===201||pos.map===0?1:2):0,/* bosses: overtaking is the win (Andrey, 13 Sep) — their wall is pace and power; precision stages and captains still ask for clean shifts (1 in district 1, 2 later) */style:rivalStyle.name,shift:pos.beat===2?6500:6168,levels:chaseLevels(tuning?.levels||[0,0,0],CARS[car].id,n<CHASE.from?0:chaseGain(playerPower(s),rating(benchmarkLevels(n),CARS[s.selected]?.id),{follow:pos.boss?CHASE.follow.boss:pos.captain?CHASE.follow.captain:CHASE.follow.plain})),targetTime:tuning?.time,reaction:tuning?.reaction??.3,window:n<3?2.1:n<10?1.7:n<25?1.35:n<50?1.2:pos.beat===2?1.2:pos.beat===3||pos.captain?.65:1,startAssist:n<3,launchPerfect:n<10?.7:n<25?.42:.24,launchAuto:n<10?1.25:n<25?1:.8,launchRpm:6168,surface:look.wet?.91:1,rough:look.rough,look,practice,champion:s.rank>=CAMPAIGN_LENGTH};
}
// A campaign drift stage: solo run on the Ridge, scored by drift points against the district's target.
function driftStage(s,n,pos,tuning){
 const ridge=TRACKS.findIndex(t=>t.id==='ridge'),look={...TRACKS[ridge]};
 return {id:n,name:'ГРЕБЕНЬ',drift:true,driftTarget:driftTarget(n),area:AREAS[pos.map],map:ridge,car:0,boss:false,captain:false,decal:null,beat:'Дрифт',series:pos.series,distance:804,requiredPerfect:0,style:'Дрифт',shift:6250,levels:[2,2,1],targetTime:null,reaction:.3,window:1,startAssist:false,launchPerfect:.24,launchAuto:.8,launchRpm:6100,surface:1,rough:look.rough,look,practice:false,champion:s.rank>=CAMPAIGN_LENGTH};
}
export function restartCampaign(s){
 if(s.rank<CAMPAIGN_LENGTH)return false;
 s.campaignChampionships=(s.campaignChampionships||0)+1;s.rank=0;s.campaignLosses=0;s.overpassChecks=Array(5).fill(false);return true;
}
export function campaignAdvice(s,opp){
 if(s.campaignLosses>=2)return 'Два реванша подряд? Заезд на детали даст передышку и материалы.';
 if(opp.rough)return 'Разбитая грунтовка: Нива и УАЗ идут ровно, низкий обвес теряет ход на каждой яме.';
 if(opp.distance===201)return 'Короткий спринт: решают старт и первые передачи.';
 if(opp.distance===804)return 'Длинная прямая: раскрой высшие передачи.';
 return opp.surface<1?'Мокро: цепкие шины помогут на старте.':'Лови зелёную зону: цепочка точных переключений ускоряет машину.';
}
const guaranteedParts={4:'engine-1',9:'tires-1',14:'gearbox-1',39:'engine-2',44:'tires-2',49:'gearbox-2',89:'engine-3',99:'tires-3',109:'gearbox-3'};
export const GUARANTEED_PARTS=guaranteedParts;
// Пустой слот — деталь встаёт на машину сама. По телеметрии плейтеста те, кто не нашёл мастерскую,
// возили выигранные детали в багажнике и упирались в стену на третьем этапе. Занятый слот не трогаем:
// там уже есть выбор игрока.
export function addPart(s,id){const p=partById(id);if(!p)throw Error('Неизвестная деталь');
 const duplicate=!!s.inventory[id];let scrap=0;
 if(duplicate){scrap=[8,18,40,90][p.rarity];s.scrap+=scrap;}else s.inventory[id]={rank:1};
 const mounted=!duplicate&&!s.equipped[s.selected][p.slot]&&equip(s,id);
 return {id,duplicate,scrap,mounted:!!mounted};}
// Early on a duplicate drop reads as «nothing»: while the player owns fewer than eight parts, reroll up to five times.
export function rollFreshPart(s,min=0,rng=Math.random){const level=garageLevel(s.garage).level,far=id=>{const p=partById(id);return p&&requiredGarageFor(p.slot,p.rarity)>level+1;};let id=rollPart(min,rng);for(let i=0;i<5&&far(id);i++)id=rollPart(min,rng);/* a drop should mount in this garage or the next one, not three levels later */if(Object.keys(s.inventory).length>=8)return id;for(let i=0;i<5&&(s.inventory[id]||far(id));i++)id=rollPart(min,rng);return id;}
export function rollPart(min=0,rng=Math.random){let roll=Math.min(.999999,Math.max(0,rng()))*RARITIES.slice(min).reduce((a,r)=>a+r.weight,0),rarity=min;for(;rarity<3;rarity++){roll-=RARITIES[rarity].weight;if(roll<0)break;}const slot=SLOTS[Math.min(SLOTS.length-1,Math.floor(Math.max(0,rng())*SLOTS.length))];return slot.id+'-'+rarity;}
export function openBox(s,box=false,rng=Math.random){
 const key=box===true?'boss':box===false?'street':box,c=crateById(key);if(!c||crateCount(s,key)<1)return null;
 adjustCrate(s,key,-1);const weights=c.weights.map((w,i)=>s.pity>=7&&i<2?0:w),sum=weights.reduce((a,w)=>a+w,0);let roll=Math.min(.999999,Math.max(0,rng()))*sum,rarity=0;
 for(;rarity<3;rarity++){roll-=weights[rarity];if(roll<0)break;}
 const slots=c.slots||SLOTS.map(x=>x.id),slot=slots[Math.min(slots.length-1,Math.floor(Math.max(0,rng())*slots.length))],id=slot+'-'+rarity;
 s.pity=rarity>=2?0:Math.min(7,s.pity+1);
 const opened={...addPart(s,id),crate:key,bonusPaint:rollPaintBonus(s,rng),bonusDecal:rollDecalBonus(s,rng)};
 // Уникальный апгрейд — редкая находка и только из серьёзных ящиков; легендарный за район даёт его наверняка,
 // чтобы категорию увидел каждый, кто дошёл до конца. Разыгрываем последним, чтобы не сдвигать
 // последовательность случайных чисел у детали, краски и декали.
 const chance=key==='legend'?1:key==='boss'?.22:0;
 const left=chance>0?missingUpgrades(s):[];
 opened.bonusUpgrade=left.length&&rng()<chance?left[Math.min(left.length-1,Math.floor(Math.max(0,rng())*left.length))].id:null;
 if(opened.bonusUpgrade)grantUpgrade(s,opened.bonusUpgrade);track('crate',{crate:key,part:id,rarity,duplicate:!!opened.duplicate,paint:opened.bonusPaint?.id||null,decal:opened.bonusDecal?.id||null,upgrade:opened.bonusUpgrade});return opened;
}
// A dropped part is kept, but it mounts only once the garage level allows its slot and rarity.
export function canInstall(s,id){const p=partById(id);if(!p||!s.inventory?.[id])return {ok:false,garage:null};const need=requiredGarageFor(p.slot,p.rarity);return {ok:need<=garageLevel(s.garage).level,garage:need};}
// Потолок ранга держат двое: мастерская и сама машина. Что ниже, то и считается.
export const rankCapFor=(s,id,car=s.selected)=>Math.min(partById(id)?.maxRank||0,garageRankCap(s),carRankCapOf(carLevelOf(s,car)));
export function equip(s,id){const p=partById(id);if(!p||!s.inventory[id]||!canInstall(s,id).ok)return false;s.equipped[s.selected][p.slot]=id;track('equip',{part:id,slot:p.slot,rarity:p.rarity});return true;}
export function unequip(s,slot){delete s.equipped[s.selected][slot];}
export const tuneCost=(s,id)=>{const p=partById(id),r=s.inventory[id]?.rank||1;return {cash:Math.round((p?.rarity+1)*120*r*(1+Math.max(0,r-4)*.06)*(1-garageLevel(s.garage).discount)),scrap:Math.round([12,16,22,30][p?.rarity||0]*r*(1-garageLevel(s.garage).discount*.5))};};/* the garage discounts materials at half its ruble rate: a better workshop wastes less *//* materials: an epic part to rank 7 costs 462 ⚒, not 672 — a district's wins (~600 ⚒) must cover the guaranteed engine AND tyres before the boss (docs/campaign-design-review.md) */
export function tunePart(s,id){const o=s.inventory[id],p=partById(id);if(!o||!p||o.rank>=rankCapFor(s,id))return false;const c=tuneCost(s,id);if(s.cash<c.cash||s.scrap<c.scrap)return false;s.cash-=c.cash;s.scrap-=c.scrap;o.rank++;noteGoal(s,'tune');track('tune',{part:id,level:o.rank,cash:c.cash,scrap:c.scrap,rarity:p.rarity,slot:p.slot});return true;}
export const salvageValue=(s,id)=>s.inventory[id]?[8,18,40,90][partById(id).rarity]*s.inventory[id].rank:0;
export function salvage(s,id){if(!s.inventory[id]||s.equipped.some((e,i)=>s.unlockedCars[i]&&Object.values(e).includes(id)))return false;const n=salvageValue(s,id);delete s.inventory[id];s.scrap+=n;track('salvage',{part:id,scrap:n});return n;}
export function rewardRace(s,{won,perfect=0,opp,time,rivalTime=null},rng=Math.random){
 s.races++;s.streak=won?s.streak+1:0;const cash=(won?330+opp.id*9:100+opp.id*3)+(opp.practice?0:perfect*30);s.cash+=cash;s.scrap+=won?12:8;
 if(!opp.practice){s.campaignAttempts++;s.campaignSeconds+=Math.round(time||0);s.campaignLosses=won?0:s.campaignLosses+1;}
 const fresh=won&&!opp.practice&&opp.id===s.rank&&s.rank<CAMPAIGN_LENGTH;let drop=null,bossDecalDrop=null,box=false,bossBox=false;const crates=[],hard=fresh?5+(opp.boss?40:0):0;s.hard+=hard;
 if(won){s.wins++;drop=addPart(s,fresh&&guaranteedParts[opp.id]||rollFreshPart(s,fresh&&opp.boss?1:0,rng));if(fresh&&opp.captain&&opp.decal)bossDecalDrop=addDecal(s,opp.decal,s.selected);if(fresh)s.rank++;}
 const milestone=fresh&&opp.captain?{scrap:60+Math.floor(opp.id/45)*25,cash:600+Math.floor(opp.id/45)*250}:null,carShard=milestone?grantCampaignShards(s,opp):null;
 // Каждая победа капает чертежом в ту машину, на которой ехали: уровень растёт от езды, а не только от главарей.
 const levelShards=won?grantCarShards(s,opp.boss?3:opp.captain?2:1,{car:s.selected}):null;
 if(milestone){s.scrap+=milestone.scrap;s.cash+=milestone.cash;}
 // One finish has one crate source. A district milestone replaces the routine crate.
 s.crateProgress=(s.crateProgress||0)+1;
 if(fresh&&opp.boss){
  const final=s.rank===CAMPAIGN_LENGTH;
  crates.push(grantCrate(s,final?'legend':'boss',final?'Вся карьера · 225 заездов':opp.area+' · побеждён '+opp.name));
  bossBox=true;s.crateProgress=0;
 }else if(s.crateProgress>=CRATE_FINISHES){
  crates.push(grantCrate(s,'street','За 5 завершённых заездов'));box=true;s.crateProgress=0;
 }
 const record=(opp.distance??402)===402&&(!s.records[s.selected]||time<s.records[s.selected]);if(record)s.records[s.selected]=time;
 // Weekly goals count what the finish was, never how it was rewarded. Bonus-track counters (ridge/overpass/overtake) are noted by the mode itself.
 if(opp.practice)noteGoal(s,'practice');
 if(won){noteGoal(s,'win');if(opp.captain&&!opp.practice)noteGoal(s,'captain');if(opp.rough)noteGoal(s,'dirtWin');if(opp.look?.wet)noteGoal(s,'wetWin');if(opp.rival)noteGoal(s,'rivalWin');if(s.streak===3)noteGoal(s,'streak3');}
 if(perfect>0)noteGoal(s,'perfect',perfect);
 const trackRecord=opp.trackId?noteTrackRecord(s,opp.trackId,won||opp.practice?time:0):null;
 recordRace(s,{opp,won,perfect,time,fresh,drop,rivalTime});
 track('reward',{stage:opp.id,won,fresh,cashGain:cash+(milestone?.cash||0),scrapGain:(won?12:8)+(milestone?.scrap||0),hardGain:hard,drop:drop?.id||null,duplicate:!!drop?.duplicate,crates:crates.map(c=>c.id),carShard:carShard?{car:carShard.index,amount:carShard.amount,unlocked:carShard.unlocked}:null,record});
 return {scrap:(won?12:8)+(milestone?.scrap||0),trackRecord,cash:cash+(milestone?.cash||0),milestone,carShard,bossDecal:bossDecalDrop,guaranteed:fresh&&!!guaranteedParts[opp.id],hard,crates,drop,box,bossBox,record,fresh,unlockedMap:fresh&&opp.boss&&s.rank<CAMPAIGN_LENGTH?trackIndex(s.rank):null,perfectBonus:opp.practice?0:perfect*30};
}
