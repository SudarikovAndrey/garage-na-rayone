import {overpassCheck} from './overpass-route.js';
import {parkingBrief} from './parking-course.js';
import {CARS} from './fleet.js';
import {TRACKS,trackIndex,raceLook} from './tracks.js';
import {opponent,campaignAdvice,rating,effectiveLevels,CAMPAIGN_LENGTH} from './progression.js';
import {DISTRICT_LENGTH,BEATS,CREWS,DRIFT_BEAT,campaignPosition} from './campaign-config.js';
import {DRIFT_TARGET} from './ridge-drift.js';
import {isUnlocked} from './unlocks.js';
import {decalById} from './decals.js';
export function routeState(rank,map=trackIndex(rank)){
 const current=trackIndex(rank),wins=Math.max(0,Math.min(DISTRICT_LENGTH,rank-map*DISTRICT_LENGTH));
 if(TRACKS[map]?.bonus)return {current,map,wins:0,locked:false,cleared:false,complete:rank>=CAMPAIGN_LENGTH,bonus:true};
 return {current,map,wins,locked:map>current,cleared:wins===DISTRICT_LENGTH,complete:rank>=CAMPAIGN_LENGTH};
}
export function canRaceTrack(rank,map){return Number.isInteger(map)&&map>=0&&map<TRACKS.length&&(TRACKS[map].bonus||map<=trackIndex(rank));}
export function practiceTrack(rank,map){return canRaceTrack(rank,map)?map:trackIndex(rank);}
export const SOCIAL_RANK=10; // duels and the event appear after the first garage upgrade window: the core loop first
const modes=(active,save)=>`<div class="race-modes"><button class="${active==='campaign'?'active':''}" aria-pressed="${active==='campaign'}" data-campaign-open>КАМПАНИЯ</button>${!save||isUnlocked(save,'training')?`<button class="${active==='practice'?'active':''}" aria-pressed="${active==='practice'}" data-practice-open>ТРЕНИРОВКА</button>`:''}${(save?.rank??0)>=SOCIAL_RANK?'<button data-pvp-open>ДУЭЛИ · PvP</button>':''}</div>`;
const stop=(track,i,{selected,locked,cleared,label,glyph,disabled=false})=>`<button class="route-stop ${selected?'selected':''} ${locked?'locked':''} ${cleared?'cleared':''}" data-track="${i}" ${disabled?'disabled':''} aria-label="${track.name} · ${label}" aria-pressed="${selected}"><img src="assets/tracks/${track.id}.webp" alt="" width="240" height="150"><b>${glyph}</b><small>${label}</small></button>`;
const banner=(t,weather,note)=>`<div class="route-banner"><img src="assets/tracks/${t.id}.webp" alt="" width="240" height="150"><div><small>${weather}</small><h3>${t.name}</h3><span>${note}</span></div></div>`;
// The stage card names only what matters before the start: the kind of race (drag or drift), the distance and the opponent.
const stageCard=(save,opp)=>{if(opp.solo)return overpassBrief(opp);const base=rating(effectiveLevels(save),CARS[save.selected].id),power=rating(opp.levels,CARS[opp.car].id);
 const role=opp.boss?'БОСС РАЙОНА':opp.captain?'ГЛАВАРЬ':opp.rival?'СТАРЫЙ ЗНАКОМЫЙ':opp.drift?'ЭТАП КАМПАНИИ':opp.beat.toUpperCase();
 if(opp.drift)return `<div class="career-rival drift"><div><small>ДРИФТ · ${opp.distance} М · ${role}</small><h3>${opp.name}</h3></div><p>Цель: ${opp.driftTarget} очков · газ и передачи авто</p></div>`;
 return `<div class="career-rival ${opp.captain?'boss':''}"><div><small>ДРАГ · ${opp.distance} М · ${role}</small><h3>${opp.name}</h3></div><div class="rival-power"><b>${power}</b><small>мощь · твоя ${base}</small></div><p>${CARS[opp.car].name}${opp.requiredPerfect?' · победа + '+opp.requiredPerfect+' чётких переключения':''}</p>${opp.boss&&save.overpassChecks?.[opp.map]?'<p class=route-reward>✓ МАШИНА ПРОШЛА ЭСТАКАДУ</p>':''}${opp.captain&&opp.decal?`<span class="boss-decal" style="--decal:${decalById(opp.decal).preview}"><i></i> ДЕКАЛЬ: ${decalById(opp.decal).name}</span>`:''}</div>`;};
// dev — режим наладки: «Наигранное» нужно нам для плейтестов, игроку в карьере оно только мешает.
export function careerMarkup(save,map,dev=false){
 if(TRACKS[map]?.bonus)return practiceMarkup(save,map); // bonus tracks live in the training tab
 const state=routeState(save.rank,map),opp=opponent(save),cur=campaignPosition(save.rank),current=map===state.current&&!state.cleared,t=current&&opp.drift?TRACKS[opp.map]:TRACKS[map];
 // The map grows with the player: the current district and the next one; further districts appear as they open.
 const route=TRACKS.map((track,i)=>{if(track.bonus||i>state.current+1)return '';const s=routeState(save.rank,i);return stop(track,i,{selected:i===map,locked:s.locked,cleared:s.cleared,label:s.locked?'Дальше':s.wins+'/45',glyph:s.locked?'?':s.cleared?'✓':i+1});}).join('');
 let action;
 if(state.locked)action=`<div class="route-lock"><b>ПОБЕДИ БОССА ПРЕДЫДУЩЕГО РАЙОНА</b><span>${TRACKS[map-1].name} · 9 серий</span></div><button class="primary" data-current-route>К МОЕМУ СОПЕРНИКУ</button>`;
 else if(state.cleared)action=`<div class="route-reward claimed">✓ Район пройден · награда получена</div><button class="primary" data-practice-open="${map}">ТРЕНИРОВКА НА ЭТОЙ ТРАССЕ</button>${state.complete&&map===4?'<button class="primary" data-new-campaign>НОВЫЙ КРУГ КАМПАНИИ</button><p class="route-note">Чемпионство, машины и имущество сохранятся. Путь по районам начнётся заново.</p><button class="secondary" data-race="rank">РЕВАНШ С ЧЕМПИОНОМ</button>':'<button class="secondary" data-current-route>ПРОДОЛЖИТЬ КАРЬЕРУ</button>'}`;
 else{
  const driftSeries=false;
  action=`<div class="series-progress">${Array.from({length:9},(_,i)=>`<span class="${state.wins>=i*5+5?'done':Math.floor(state.wins/5)===i?'active':''}">${state.wins>=i*5+5?'✓':i+1}</span>`).join('')}<b>${CREWS[opp.series]} · серия ${opp.series+1}/9</b></div><div class="ladder route-ladder">${BEATS.map((label,i)=>{const drift=i===DRIFT_BEAT&&driftSeries;if(opp.series===8&&i===2)label='Проверка';return `<i class="${state.wins%5>i?'won':state.wins%5===i?'current':''} ${drift?'drift':''}" title="${drift?'Дрифт':label}">${state.wins%5>i?'✓':i===4?'♛':drift?'S':i+1}</i>`;}).join('')}</div>${stageCard(save,opp)}<button class="primary" data-race="rank">${opp.solo?'ПРОВЕРИТЬ МАШИНУ':opp.boss?'ПОБЕДИТЬ БОССА':opp.drift?'НА ДРИФТ':'В ЗАЕЗД'}</button>`;
 }
 const summary=state.complete?'все районы пройдены':`район ${cur.map+1} из 5 · серия ${cur.series+1} из 9 · заезд ${cur.beat+1} из 5`;
 return modes('campaign',save)+`<div class="career-summary"><b>${state.complete?'ВСЕ ТРАССЫ ТВОИ':'ПУТЬ К ЧЕМПИОНУ'}</b><span>${summary}${save.campaignChampionships?' · ♛'+save.campaignChampionships:''}</span></div><div class="route-map">${route}</div>${banner(t,current&&opp.drift?t.weather:raceLook(map,current?opp.series:0).weather,current&&opp.drift?'Дрифт-этап района · очки вместо секунд':'9 серий · 45 заездов')}${action}${dev?'<button class="secondary share-stats" data-share-stats>ПЕРЕДАТЬ НАИГРАННОЕ</button>':''}`;
}
// Training: any opened track, including the Ridge. Rank does not move; rubles, materials and a part for a win do.
export function practiceMarkup(save,map,district=trackIndex(save.rank)){
 const m=practiceTrack(save.rank,map),t=TRACKS[m],opp=opponent(save,true),drift=!!t.bonus&&!t.check;
 const picks=TRACKS.map((track,i)=>{const open=canRaceTrack(save.rank,i);return stop(track,i,{selected:i===m,locked:!open,cleared:false,disabled:!open,label:!open?'Закрыто':track.bonus?track.name:'ДРАГ',glyph:track.check?'↗':track.bonus?'S':i+1});}).join('');
 if(t.check)return modes('practice',save)+`<div class=career-summary><b>ЭСТАКАДА · ПРОВЕРКА</b><span>Газ и передачи авто · без наград</span></div><div class="route-map practice-map">${picks}</div>${banner(t,t.weather,'700 м · три пролёта над районом')}<div class=overpass-districts aria-label="Выбор района">${TRACKS.slice(0,trackIndex(save.rank)+1).map((d,i)=>`<button data-overpass-district="${i}" aria-pressed="${i===district}">${i+1} · ${d.name}</button>`).join('')}</div>${overpassBrief(overpassCheck(district))}<button class=primary data-overpass-start="${district}">ПРОВЕРИТЬ МАШИНУ</button><button class=secondary data-campaign-open>К КАМПАНИИ</button>`;
 const card=t.id==='parking'?parkingBrief():drift?`<div class="career-rival drift"><div><small>ДРИФТ · 804 М · СВОБОДНЫЙ ЗАЕЗД</small><h3>${t.name}</h3></div><p>${t.description||'Узкая насыпь, боковой ветер и перепады ритма.'}</p><p>Цель: ${DRIFT_TARGET} очков · газ и передачи авто · отдельный рекорд</p></div>`:stageCard(save,{...opp,beat:'соперник из пройденных'});
 return modes('practice',save)+`<div class="career-summary"><b>ТРЕНИРОВКА</b><span>ранг не растёт · дрифт: рубли и материалы за очки</span></div><div class="route-map practice-map">${picks}</div>${banner(t,drift?t.weather:raceLook(m,0,true).weather,drift?'Тренировка · бонусы с деталями открываются после боссов':'Драг · '+opp.distance+' м · без риска для кампании')}${card}${drift&&t.id!=='parking'?'<div class="route-note"><b>ПАРНЫЙ ДРИФТ · БОТ</b><br>Два заезда со сменой мест. Очки за дуги и дрифт рядом. Слабее — рули и толкай, сильнее — дрифт и замедление.</div><button class="primary" data-race="battle">НА ПАРНЫЙ ДРИФТ</button>':''}<button class="primary" data-race="practice">${drift?'НА ДРИФТ':'В ЗАЕЗД'}</button><button class="secondary" data-campaign-open>К КАМПАНИИ</button>`;
}

function overpassBrief(opp){return `<div class="career-rival overpass"><div><small>ОДИНОЧНЫЙ ЗАЕЗД · 700 М</small><h3>ПЕРЕЛЕТИ ТРИ ПРОЛЁТА</h3></div><p>Разгон и передачи автоматические. Дальность прыжка зависит от мощи машины.</p><div class=overpass-needs>${opp.needKmh.map((n,i)=>`<span>ПРОЛЁТ ${i+1}<b>${n}</b>КМ/Ч НА КРАЮ</span>`).join('')}</div><p>${opp.practice?'Тренировка без наград.':'Перелетишь все три — +'+opp.reward.cash+' ₽ и +'+opp.reward.scrap+' материалов. Даже при падении кампания продолжится.'}</p></div>`;}
