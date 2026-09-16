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
export const BENCHMARK_KNOTS=[[0,[1.65,0.45,0.45]],[44,[8.482,7.629,5.644]],[89,[11.761,11.093,9.188]],[134,[14.091,12.737,10.26]],[179,[16.602,15.36,12.789]],[224,[17.993,17.883,14.037]]];
// Догоняющая планка. Кампания авторская: уровни каждого этапа посчитаны под эталонного игрока
// (BENCHMARK_KNOTS). Кто приходит к стене сильно выше эталона — проезжает её насквозь: на верхах
// мощь решает быстрее, чем руки, и стена перестаёт быть стеной. Поэтому соперник получает столько
// же мощи сверху, сколько игрок набрал сверх эталона, — сохраняется не отношение, а сам разрыв,
// потому что именно разрыв и превращается в секунды на финише.
// from — с какого ранга планка вообще включается: первый район учит играть, и догонять там некого.
// slack — запас, который прощается без последствий (обычный разброс прокачки), follow — какую долю
// оставшегося превышения повторять, limit — предел подъёма. Рядовые соперники тянутся слабее стен:
// они остаются передышкой, но перестают быть пустым местом для перекачанного.

export const CHASE={from:45,slack:.04,follow:{plain:.5,captain:1,boss:1},limit:1.45};

export function benchmarkLevels(rank){const n=Math.max(0,Math.min(CAMPAIGN_LENGTH-1,Number(rank)||0));let i=1;while(i<BENCHMARK_KNOTS.length-1&&BENCHMARK_KNOTS[i][0]<n)i++;const [a,la]=BENCHMARK_KNOTS[i-1],[b,lb]=BENCHMARK_KNOTS[i],t=(n-a)/(b-a);return la.map((v,k)=>v+(lb[k]-v)*t);}
// Stage targets: the first-try win probability of the regular player at benchmark power. Captains and
// bosses are the walls; env WIN_CAPTAIN / WIN_BOSS override them for balancing scripts only.
const env=globalThis.process?.env||{};
// Bosses are set against the precise player (bossSkill) so even a clean driver loses about half the first
// tries; boss[] is the floor kept for the regular player so the wall stays passable without luck.
// Bosses are the walls: their pace is authored against a player who tuned ABOVE the benchmark (bossPower), so
// the median car of the district cannot pass on driving alone — the first boss is the first reason to upgrade.
// The first captain (rank 4) is the first deliberate loss: one readable «нужно чётких: 1» in the first minutes.
export const FIRST_WALL_RANK=4;
export const WIN_TARGETS={firstWall:.6,warmup:.95,challenge:.87,breather:.97,precision:.80,captain:[.75,.6,.55,.55,.5],
 // Главарь — стена и для точного игрока. Без этой цели он проходил всех главарей с первой попытки:
 // кампания была авторизована только против среднего, а точный едет на 3-5% быстрее и съедал весь запас.
 captainSkill:[.88,.75,.7,.67,.63],captainEdge:.008,boss:[.3,.3,.28,.27,.25],bossSkill:[.5,.48,.45,.42,.4],bossPower:[1.032,1.03,1.028,1.025,1.022]/* boss pace = regular driver tuned bossPower above the benchmark. Tuning headroom within a district is small (drops and caps), so +4% is the most a median player can be asked to find; +8% walled the simulation for 150 attempts */};
if(env.WIN_CAPTAIN)WIN_TARGETS.captain=WIN_TARGETS.captain.map(()=>Number(env.WIN_CAPTAIN));if(env.WIN_BOSS)WIN_TARGETS.boss=WIN_TARGETS.boss.map(()=>Number(env.WIN_BOSS));
// Walls ramp up by district: the first captain is a nudge, the last boss a real fight.
export function winTarget(rank){const {map,beat,boss,captain}=campaignPosition(rank);if(rank<3)return .99;if(rank===FIRST_WALL_RANK)return WIN_TARGETS.firstWall;if(captain)return boss?WIN_TARGETS.boss[map]:WIN_TARGETS.captain[map];return [WIN_TARGETS.warmup,WIN_TARGETS.challenge,WIN_TARGETS.breather,WIN_TARGETS.precision][beat];}
