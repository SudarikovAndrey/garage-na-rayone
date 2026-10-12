export const CAMPAIGN_REVISION=2;
export const SERIES_LENGTH=5;
export const DISTRICT_LENGTH=45;
export const CAMPAIGN_LENGTH=225;
export const BEATS=['Разогрев','Вызов','Передышка','На точность','Главарь'];
export const DRIFT_BEAT=2;
// Drift score needed to pass a campaign drift stage, per district. The free Ridge run keeps its own 1600.
export const DRIFT_TARGETS=[1200,1400,1600,1800,2000];
export const driftTarget=rank=>DRIFT_TARGETS[Math.min(DRIFT_TARGETS.length-1,campaignPosition(rank).map)];
export const CREWS=['Дворовые','Кооператоры','Ночная смена','Дальнобой','Железные','Старые знакомые','Без тормозов','Авторитеты','Последний рубеж'];
export function campaignPosition(rank){
 const n=Math.max(0,Math.min(CAMPAIGN_LENGTH-1,Math.floor(Number(rank)||0)));
 const series=Math.floor(n/SERIES_LENGTH)%9,beat=n%SERIES_LENGTH;
 // Drift is optional post-boss content. Preserve ranks and save revision; every main stage is drag.
 return {n,map:Math.floor(n/DISTRICT_LENGTH),series,beat,boss:n%DISTRICT_LENGTH===DISTRICT_LENGTH-1,captain:beat===SERIES_LENGTH-1,drift:false};
}
// Distance follows the role of the stage: sprints to warm up and breathe, the classic 402 for challenge and
// precision, the long straight for captains and bosses from the third district on (early 804 m bosses
// punished any power deficit too hard in the 100-bot autotest).
export function campaignDistance(rank){const pos=campaignPosition(rank);if(pos.drift)return 804;const {map,beat,captain}=campaignPosition(rank);if(captain)return map<2?402:804;return [201,402,201,402][beat];}
// Benchmark player levels [engine,tires,gearbox] at district borders; knots are written by
// scripts/simulate-campaign.mjs --write-knots from the simulated regular player.
export const BENCHMARK_KNOTS=[[0,[1.739,0.46,0.46]],[44,[9.579,8.222,6.226]],[89,[11.656,10.217,8.593]],[134,[14.473,12.587,11.866]],[179,[18.227,14.421,13.834]],[224,[19.879,17.027,14.62]]];
// Догоняющая планка. Кампания авторская: уровни каждого этапа посчитаны под эталонного игрока
// (BENCHMARK_KNOTS). Кто приходит к стене сильно выше эталона — проезжает её насквозь: на верхах
// мощь решает быстрее, чем руки, и стена перестаёт быть стеной. Поэтому соперник получает столько
// же мощи сверху, сколько игрок набрал сверх эталона, — сохраняется не отношение, а сам разрыв,
// потому что именно разрыв и превращается в секунды на финише.
// from — с какого ранга планка вообще включается: первый район учит играть, и догонять там некого.
// slack — запас, который прощается без последствий (обычный разброс прокачки), follow — какую долю
// оставшегося превышения повторять, limit — предел подъёма. Рядовые соперники тянутся слабее стен:
// они остаются передышкой, но перестают быть пустым местом для перекачанного.

// Эталон — медиана живого прогресса, значит половина игроков выше него по построению. Догон один
// к одному превращал это в стену: в модели поздние главари давали серии по 280–350 поражений подряд,
// до 225-го этапа не доходил никто. Поэтому запас покрывает обычный разброс прокачки, а повторяем
// мы только часть превышения — догон возвращает интерес, а не отбирает кампанию.
export const CHASE={from:45,slack:.08,follow:{plain:.35,captain:.55,boss:.55},limit:1.25};

// Потолок живой прокачки: всё легендарное пятнадцатого ранга в гараже V. Модель кампании считает
// уровни своей арифметикой и на последних рангах перепрыгивала этот потолок — и последний босс
// оказывался авторизован против машины, которой в игре не существует: его не проходил даже игрок
// со всем легендарным. Эталон выше потолка не поднимаем. Соответствие сверяет check-fleet-world.
// Эталон кампании задаётся мощью, а не выдумкой модели. Цифры — из телеметрии (232 заезда, сборка 50928d1):
// живые игроки шли 153 мощи на 7 ранге, 279 на 37, 357 на 82, 399 на 112, 433 на 127. Из них вычтено 7% —
// столько снимает урезанный ранний доход (замер модели до и после правки). Ранги 179 и 224 замеров не имеют:
// туда ещё никто не дошёл, и они поставлены по замыслу — к финалу игрок должен подойти почти на потолке (558),
// но не упереться в него, иначе последнему боссу нечем сопротивляться.
export const TARGET_POWER=[[0,120],[44,270],[89,342],[134,409],[179,465],[224,490]];/* 490, а не 515: на последнем ранге до потолка 558 остаётся один красный ящик — второй игрок получает
   уже ЗА последнего босса, и требовать его от того, кто ещё не победил, нельзя */
// Живой максимум машины: уникальные детали пятнадцатого ранга ПЛЮС все шесть апгрейдов в своём потолке.
// Апгрейды складываются поверх деталей в effectiveLevels, и без них потолок выходил 558 мощи вместо 808 —
// по такому заниженному потолку боссы последних районов срезались клампом и теряли часть стены.
export const LEVEL_CEILING=[34.76,26.08,26.89];/* 808 мощи: детали 558 + апгрейды */
// Запас авторства. Эталон — медиана прогресса, то есть ровно половина игроков ниже него. Пока
// модельный игрок часто мазал, разброс времени это скрывал; с реалистичной точностью решает мощь,
// и лестница, посчитанная строго по медиане, отрезает нижнюю половину — в прогоне было 0.71 побед
// на разогреве вместо 0.88 и никто не доходил до конца. Поэтому этапы считаются под игрока чуть
// ниже медианы: тот, кто идёт вровень, проходит с запасом, а отстающий — не упирается в стену.
export const AUTHORING_HEADROOM=1;
export function benchmarkLevels(rank){const n=Math.max(0,Math.min(CAMPAIGN_LENGTH-1,Number(rank)||0));let i=1;while(i<BENCHMARK_KNOTS.length-1&&BENCHMARK_KNOTS[i][0]<n)i++;const [a,la]=BENCHMARK_KNOTS[i-1],[b,lb]=BENCHMARK_KNOTS[i],t=(n-a)/(b-a);return la.map((v,k)=>Math.min(LEVEL_CEILING[k],(v+(lb[k]-v)*t)*AUTHORING_HEADROOM));}
// Stage targets: the first-try win probability of the regular player at benchmark power. Captains and
// bosses are the walls; env WIN_CAPTAIN / WIN_BOSS override them for balancing scripts only.
const env=globalThis.process?.env||{};
// Ordinary probabilities refer to observed drivers; district bosses use an explicit build/time contract.
export const FIRST_WALL_RANK=4;
export const BOSS_BUILD_FACTOR=[1.10,1.12,1.10,1.10,1.12];
export const BOSS_TIME_ALLOWANCE=[.12,.10,.10,.08,.06];
export const WIN_TARGETS={firstWall:.6,warmup:.95,challenge:.87,breather:.97,precision:.80,
 captain:[.62,.6,.55,.55,.5],captainSkill:[.88,.75,.7,.67,.63],captainEdge:.008,
 boss:[.15,.12,.1,.07,.05],bossSkill:[.35,.3,.25,.2,.15],bossPower:BOSS_BUILD_FACTOR};
if(env.WIN_CAPTAIN)WIN_TARGETS.captain=WIN_TARGETS.captain.map(()=>Number(env.WIN_CAPTAIN));if(env.WIN_BOSS)WIN_TARGETS.boss=WIN_TARGETS.boss.map(()=>Number(env.WIN_BOSS));
// Walls ramp up by district: the first captain is a nudge, the last boss a real fight.
export function winTarget(rank){const {map,beat,boss,captain}=campaignPosition(rank);if(rank<3)return .99;if(rank===FIRST_WALL_RANK)return WIN_TARGETS.firstWall;if(captain)return boss?WIN_TARGETS.boss[map]:WIN_TARGETS.captain[map];return [WIN_TARGETS.warmup-map*.015,WIN_TARGETS.challenge-map*.025,WIN_TARGETS.breather-map*.01,WIN_TARGETS.precision-map*.035][beat];}

// Execution grows by district; gearbox upgrades help, but never restore the tutorial window.
export function campaignShiftWindow(rank,practice=false){
 const {map,boss,captain,beat}=campaignPosition(rank);
 if(practice)return 1.2;
 if(rank<3)return 2.1;if(rank<10)return 1.7;if(rank<25)return 1.35;
 const base=[1,.9,.8,.7,.6][map];
 return boss?[.8,.65,.52,.44,.36][map]:captain?[.95,.8,.7,.6,.52][map]:beat===3?base*.8:base;
}
