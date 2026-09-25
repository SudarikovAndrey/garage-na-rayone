import {recordRace} from './played-stats.js';
import {overpassStart,overpassCheck,nextGap,requiredKmh} from './overpass-route.js';
import {overpassTrack,overpassStage,isOverpassStage,completeOverpass} from './overpass-flow.js';
import {rewardTiles} from './reward-tiles.js';
import {availableDriftBonuses,rewardDriftBonus,rewardDriftPractice} from './drift-bonuses.js';
import {parkingCompleted} from './parking-course.js';
let activeDriftBonus=null;
import {DriftHUD} from './drift-hud.js';
import {FinishPresentation} from './finish-presentation.js';
import {battleOpponent,startBattle,tickBattle,battleResult,battleScore,createBattleMatch,recordBattleRound} from './ridge-battle.js';
import {Onboarding,lessonsSeen} from './onboarding.js';
import {driftState,DRIFT_TARGET} from './ridge-drift.js';
import {writeDriftRecord} from './ridge-records.js';
import {ridgeCrashPresentationDone} from './ridge-body.js';
import {ridgeLocal} from './ridge-terrain.js';
import {RidgeControls,ridgeOpponent} from './ridge-controls.js';
import {CAMPAIGN_LENGTH,DISTRICT_LENGTH,CREWS,campaignPosition} from './campaign-config.js';
import {resultTier,resultHeadline,seriesAwardMarkup,celebrationMarkup} from './result-tiers.js';
import {tauntFor} from './campaign-texts.js';
import {setupTelemetry} from './telemetry.js';
import {DUEL,duelCar,duelStep,normalizeDuelBuild} from './duel-rules.js';
import {bindDuels} from './duel-ui.js';
import {GarageIdle} from './garage-idle.js';
const garageIdle=new GarageIdle();
import {stabilizeGarageFloor,garageReflections} from './garage-surfaces.js';
import {garageFocus} from './garage-focus.js';
import {GarageSelection} from './garage-selection.js';
import {refineGarageShell,addWorkshop} from './garage-workshop.js';
import {loadGarageCrew,addGarageCrew} from './garage-crew.js';
import {loadGarageResident,addGarageResident} from './garage-resident.js';
import {addEveningGarage} from './garage-evening.js'
import {arrangeGarage} from './garage-layout.js';
import {bindEvent} from './event-ui.js?v=1ed9a3b';
import {totalCrates,finishesToCrate,grantCrate} from './crates.js';
import {paintById,ownsPaint} from './paints.js';
import {neonById,ownsNeon,addNeon} from './neons.js';
import {raceLootMarkup} from './loot-ui.js';
import {bindEarnedCrates} from './earned-crates.js';
import {RaceAudio} from './race-audio.js';
import {EngineAudio} from './engine-audio.js';
import {voiceFor} from './engine-voice.js';
import {raceKit} from './upgrades.js';
import {haptics,setHaptics} from './haptics.js';
import {bindCarReveal} from './car-reveal.js';
import {bindCarLevelUp,levelUpLines} from './car-levelup.js';
import {bindGarageUpgrade,garageUpgradeLines} from './garage-upgrade.js';
import {addGarageLamps,bindIndicators} from './garage-lamps.js';
import {attachNeon} from './car-neon.js';
import {attachGroundLight} from './ground-light.js';
import {createGarageBlackout} from './garage-blackout.js';
import {lineOnce} from './rival-line.js';
import {HANDICAP_LEVELS} from './handicap.js';
import {carLevel,carLevelProgress,levelUpCar,carRankCap,carUpgradeRarity,carLevelPerks,blueprintWord,MAX_CAR_LEVEL} from './car-levels.js';
import {CAR_SHARD_COSTS as SHARD_COSTS} from './progression.js';
import {isSandbox,sandboxSave,SANDBOX_KEY} from './sandbox-save.js';
import {bootTelegram,signIn,authHeader,looksLikeTelegram} from './telegram.js';
import {bindCloudSave} from './cloud-save.js';
import {bindChallengeApi} from './challenge-api.js';
import {bindLoanerUI,LOANER_TEXT} from './loaner-ui.js';
import {LOANER_RULES} from './loaner-rules.js';
import {bindStore} from './store.js';
import {applyReceipts,restoreEntitlements,gotSomething} from './receipts.js';
import {buildInviteCard} from './invite-card.js';
import {captureGarageShot,warmStage} from './garage-shot.js';
import {dragCameraFrame,ORBIT_LIMIT} from './drag-camera.js';
import {devMode} from './dev-mode.js';
import {bindChallengeUI,bindChallengePicker,waitingCount,inviteArt} from './challenge-ui.js';
import {bannerLine} from './referral-road.js';
import {bindChallengeIntro} from './challenge-intro.js';
import {parseStartParam,RESULT_TEXTS,inviteText,invitedMarkup} from './challenge-rules.js';
import {share as tgShare,shareMessage as tgShareMessage,unsafeUser as tgUser,requestWriteAccess as tgRequestWrite,fullscreenState as tgFullscreen,fullscreenShell} from './telegram.js';
import {followRidgeCamera} from './ridge-camera.js';
import {GarageRadio} from './garage-radio.js';
import {practiceTrack,SOCIAL_RANK} from './career.js';
import {FEATURES} from './features.js';
import {applyUnlocks,pendingCards,markSeen,unlockCardMarkup} from './unlocks.js';
import {track,bindAnalytics} from './analytics.js';
import {createProfiles} from './profiles.js';
import {bindShell,restoreOnGesture,suggestOnce} from './app-shell.js';
import {portraitFor,lineFor,characterFor,PLACEHOLDER_TAUNT} from './characters.js';
import {createLivePortrait} from './live-portrait.js';
import {upgradeButton} from './upgrade-button.js';
import {mountIcons,powerBadge} from './currency-icons.js';
import {attachParallax,keepFaceClear} from './intro-parallax.js';
import {PORTRAIT_RIGS} from './portrait-rigs.js';
import {buildAtmosphere} from './intro-atmosphere.js';
import {bindLoadingBar,loadingProgress,finishLoading,crawlLoading} from './loading-bar.js';
const profiles=createProfiles();
import {SceneTransition,GarageMotion,damp,openDialog,closeDialog} from './motion.js';
import {AdaptiveQuality} from './render-quality.js';
import {GameRenderer,pbrMaterial,shadowBudget,captureEnvironment,outdoorEnvironment} from './pbr-renderer.js';
import {garageLevel,nextGarage,upgradeGarage,configureGarageStage,garageRequirement,garageConditionText,garageUnlockSummary,GARAGE_LEVELS} from './garage-levels.js';
import * as THREE from 'three';
import {createGLTFLoader} from './gltf.js';
import {vehicleStats} from './vehicle-dynamics.js';
import {createCar,launch,shift,tickCar,tickCoast,tickOpponent,shiftZone,launchRpmFor,clamp,fireNitro,nitroTank} from './physics.js';
import {hydrate,effectiveLevels,rating,opponent,rewardRace,partById,RARITIES,tunePart,PARTS,isCarUnlocked,refreshUnlocks,pendingReveals,markCarRevealed,CAR_SHARD_COSTS,cleanRun} from './progression.js';
import {bindMeta} from './meta-ui.js';
import {bindCustomizer} from './customizer-ui.js?v=1ed9a3b';
import {applyCustomization,disposeCustomizedCar} from './car-customization.js';
import {attachDriver,seatFor} from './car-driver.js';
// Водитель за рулём обеих машин заезда (Андрей: «во всех машинах должен быть водитель»). Персонаж грузится один раз;
// если машину успели убрать, пока он грузился, водитель не садится.
function seatRaceDrivers(...models){for(const m of models){const fit=seatFor(m?.userData.carId);if(fit)attachDriver(m,fit).catch(e=>console.warn('водитель не сел',e));}}
import {RaceEffects,CarBody} from './race-effects.js';
import {CARS} from './fleet.js';
import {TRACKS,trackIndex,raceLook} from './tracks.js';
import {createRaceWorld} from './race-world.js';
import {treeLevels,paintTree} from './start-tree.js';
import {WeatherEffects} from './weather-effects.js';
import {BeatClock} from './beat-clock.js';
import {FINISH_FILM_DURATION,finishCameraFrame} from './finish-camera.js?v=1ed9a3b';
mountIcons();   // иконки ресурсов в верхней панели: рисунок один и тот же с ценами на кнопках
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
setHaptics(!reducedMotion);
let raceEffects,previousSpeed=0;
// Кузова на подвеске: у своей машины и у соперника своя история наклона, поэтому это состояние, а не функция.
const playerBody=new CarBody(),rivalBody=new CarBody();
const quality=new AdaptiveQuality();let graphics,garageEnvironment,raceEnvironment,garageDirty=true,garageShadowDirty=false,warming=false;
const $=s=>document.querySelector(s),fmt=n=>Math.round(n).toLocaleString('ru-RU');
const names=CARS.map(c=>c.name);
let inspectionSlot=null,inspectionAnchor=0,selectionGlow,levelPunch=0;
const garageMotion=new GarageMotion();let garageViewport={w:375,h:450,extra:0},raceView={x:2,y:12,z:21,fov:46},raceAim={x:0,y:0,z:2};
// exempt: окно знакомства с боссом лежит прямо в #game и должно ловить тап, пока остальной экран inert под шторкой.
const sceneTransition=new SceneTransition($('#game'),$('#scene-transition'),{reduced:reducedMotion,exempt:'#boss-intro',paint:()=>{if(!renderer)return;resize();if(screen==='garage'){updateGarageCamera();garageDirty=true;graphics.render(garageScene,garageCamera);}else graphics.render(raceScene,raceCamera);}});
let garageLamps=null,garageIndicators=null,raceIndicators=null,raceProbe=null;let world,weather,worldTextures={},raceMap=0,loadingModel=false;const modelLoads=new Map();const modelOrder=[];const raceModels=new Map(),raceLoads=new Map(),fleetPreviewCache=new Map();
function pruneModels(){const keep=new Set([save.selected,currentOpponent?.car]);while(models.filter(Boolean).length>3){const id=modelOrder.find(i=>models[i]&&!keep.has(i));if(id===undefined)break;const geometries=new Set(),materials=new Set();models[id].traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();models[id]=null;modelOrder.splice(modelOrder.indexOf(id),1);}}
// index.html?sandbox=1 — прокачанная песочница для проверок руками: свой ключ хранилища,
// без профилей и без телеметрии. Настоящий прогресс лежит рядом и не трогается.
const SANDBOX=isSandbox(location.search),SAVE_SLOT=SANDBOX?SANDBOX_KEY:'rayon-drag-v2';
let stored;try{stored=JSON.parse(localStorage.getItem(SAVE_SLOT)||(SANDBOX?'null':localStorage.getItem('rayon-drag-v1'))||'null');}catch{}
if(SANDBOX&&!stored)stored=sandboxSave();
let save=hydrate(stored||{});
// Серверный сейв: включается только после входа через Telegram. Без него всё как раньше — localStorage.
const challengeApi=bindChallengeApi({headers:authHeader});
const store=bindStore({headers:authHeader,dev:devMode()});
const cloud=bindCloudSave({headers:authHeader,onAdopt(remote){try{localStorage.setItem(SAVE_SLOT,JSON.stringify(remote));}catch{}location.reload();}});
const persist=()=>{save.updatedAt=Date.now();try{localStorage.setItem(SAVE_SLOT,JSON.stringify(save));if(!SANDBOX)profiles.afterPersist(save);}catch{toast('Прогресс сохранится только до закрытия страницы');}cloud.push(save);};
let introStep=1;
let eventUI,duelUI,duelRace=null,duelInputs=[],duelFrame=0,duelAccumulator=0;
let challengeUI=null,challengeIntro=null,challengePicker=null,loanerUI=null,garageUpgrading=false;
let lastRaceResult=null,currentOpponent,practiceMode=false,launchElapsed=0,metaUI,customizer;
let battleOutcome=null,battleMatch=null;
const finishPresentation=new FinishPresentation();
const driftHUD=new DriftHUD();
let markReady;const whenReady=new Promise(r=>{markReady=r;});
let finishFilmStart=null;
// Свайп по трассе: камера объезжает точку слежения, чтобы заглянуть на свою машину сбоку.
// Палец отпустили — сама возвращается. Хранится отдельно от полёта: полёт живёт своей жизнью.
let raceOrbit=0,orbitDrag=null;
let screen='garage',phase='idle',ready=false,renderer,garageScene,raceScene,garageCamera,raceCamera,garageCar,playerModel,rivalModel,garageAsset,coastElapsed=0,finishFilmSide=1,models=[],particles=[],roadItems=[],garageWalls=[],garageLayout=null,garageYaw=0,dragging=false,dragLast=0,clock=0,last=0,player,rival,countdown=3,gasHeld=false,launchRpm=3200,settled=false,feedbackTimer=0,shake=0;
const onboarding=new Onboarding({createCar:()=>modelInstance(save.selected,save.equipped[save.selected],save.paint[save.selected],raceModels.has(save.selected),save.decal[save.selected],save.neon?.[save.selected]),seen:()=>lessonsSeen(save),complete:mode=>{save.tutorials[mode]=true;persist();},reduced:reducedMotion});
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2400);}
function renderCarLevel(){
 const chip=$('#car-level');if(!chip)return;
 const p=carLevelProgress(save,save.selected,SHARD_COSTS[save.selected]||0);
 $('#car-level-value').textContent='УР. '+p.level;
 $('#car-level-shards').textContent=p.max?'МАКС':'◆ '+Math.min(p.current,p.needed)+' / '+p.needed;
 $('#car-level-bar').style.width=(p.max?100:p.needed?Math.min(100,Math.round(p.current/p.needed*100)):0)+'%';
 chip.classList.toggle('ready',!!p.ready);
 $('#car-level-dot').hidden=!p.ready;
 // Готовность видно словом, а не только точкой: раньше плашка выглядела как надпись, и человек
 // не догадывался, что по ней можно нажать.
 $('#car-level-shards').textContent=p.max?'МАКС':p.ready?'ПРОКАЧАТЬ':'◆ '+Math.min(p.current,p.needed)+' / '+p.needed;
 chip.title=p.max?'Машина прокачана до предела':p.ready?'Есть чертежи на новый уровень':'Чертежи капают за победы на этой машине';
 // Тот же счёт чертежей в шапке мастерской, только коротким чипом — в одной строке с мощью.
 const slim=$('#custom-level');
 if(slim){
  $('#custom-level-value').textContent='УР. '+p.level;
  $('#custom-level-shards').textContent=p.max?'МАКС':p.ready?'ПРОКАЧАТЬ':'◆ '+Math.min(p.current,p.needed)+' / '+p.needed;
  $('#custom-level-bar').style.width=(p.max?100:p.needed?Math.min(100,Math.round(p.current/p.needed*100)):0)+'%';
  slim.classList.toggle('ready',!!p.ready);
  slim.title=chip.title;
 }
}
// Поверхности призыва корешей: полоса в гараже и плашка на экране результата. Обе показывают
// одно и то же — ближайшую награду, её цену в магазине и сколько ещё звать, — потому что
// человек должен узнавать предложение, а не разгадывать его заново.
let inviteState=null,inviteAskedThisSession=false;
function inviteTier(){return inviteState?.ladder?.find(t=>!t.reached)||null;}
function inviteOffer(){
 const tier=inviteTier();
 return bannerLine({left:inviteState?.left||0,next:inviteState?.next||null,payload:tier?.payload||null});
}
// Свёрнутое состояние помним, но привязываем к ступени: сменилась награда — баннер снова
// разворачивается один раз. Иначе человек, свернувший его на третьем кореше, больше никогда
// не увидит, что дальше его ждёт краска.
const INVITE_FOLD='rayon-invite-folded';
const foldedTier=()=>{try{return localStorage.getItem(INVITE_FOLD);}catch{return null;}};
const rememberFold=key=>{try{key?localStorage.setItem(INVITE_FOLD,key):localStorage.removeItem(INVITE_FOLD);}catch{/* без памяти переживём */}};
function renderInviteBanner(){
 const node=$('#invite-banner');if(!node)return;
 const line=inviteOffer(),tier=inviteTier();
 node.hidden=line.hidden;
 if(line.hidden)return;
 const key=String(tier?.mates||'');
 node.dataset.collapsed=foldedTier()===key?'true':'false';
 $('#invite-banner-line').textContent=line.text;
 $('#invite-banner-art').innerHTML=inviteArt(line.worth);
 // В свёрнутом виде от строки остаётся прогресс: «1 / 3» — сколько привёл из нужных. Голое
 // число читалось как счётчик непрочитанного и ничего не объясняло.
 const brought=Math.max(0,(tier?.mates||0)-(inviteState?.left||0));
 $('#invite-banner-left').textContent=tier?.mates?brought+' / '+tier.mates:'';
 // Награда закрыта и ждёт — значок становится нотификатором: золотая окантовка и плашка.
 node.dataset.ready=inviteState?.ladder?.some(t=>t.rewardId)?'true':'false';
 const done=Math.max(0,(tier?.mates||0)-(inviteState?.left||0));
 $('#invite-banner-bar').style.width=(tier?.mates?Math.round(done/tier.mates*100):0)+'%';
}
function foldInvite(folded){
 const node=$('#invite-banner');if(!node)return;
 node.dataset.collapsed=folded?'true':'false';
 rememberFold(folded?String(inviteTier()?.mates||''):null);
}
// Просим на пике: после победы, рекорда или ящика — и один раз за сессию, иначе это
// превращается в попрошайничество. После проигрыша не просим вовсе: там человек зол.
function offerInvite({won,record,crates}){
 const node=$('#result-invite');if(!node)return;
 const line=inviteOffer();
 const worth=!line.hidden&&(won||record||crates>0)&&!inviteAskedThisSession;
 node.hidden=!worth;
 if(!worth)return;
 inviteAskedThisSession=true;
 $('#result-invite-line').textContent=line.text;
 $('#result-invite-art').innerHTML=inviteArt(line.worth);
}
async function loadInviteState(){
 try{inviteState=await challengeApi.referrals();}catch{inviteState=null;}
 renderInviteBanner();
}
// Свёрнутый значок разворачивается, развёрнутый ведёт к корешам: одно нажатие — одно действие.
$('#invite-open').onclick=()=>{
 if(screen!=='garage'||sceneTransition.busy)return;
 if($('#invite-banner').dataset.collapsed==='true')foldInvite(false);
 else challengeUI?.open('mates');
};
$('#invite-call').onclick=()=>{if(screen==='garage'&&!sceneTransition.busy)challengeUI?.open('mates');};
$('#invite-collapse').onclick=()=>foldInvite(true);
$('#result-invite').onclick=async()=>{await closeDialog($('#result-dialog'));challengeUI?.open('mates');};

function renderGarageUI(){const l=effectiveLevels(save),garage=garageLevel(save.garage),next=nextGarage(save);applyUnlocks(save);renderCarLevel();const eventButton=$('#event-button');if(eventButton)eventButton.hidden=!FEATURES.event||save.rank<SOCIAL_RANK;$('#cash').textContent=fmt(save.cash);$('#hard').textContent=fmt(save.hard);$('#scrap').textContent=fmt(save.scrap);$('#car-name').textContent=names[save.selected];$('#power').textContent=110+l[0]*14;$('#grip').textContent=165+l[1]*15;$('#record').textContent=save.records[save.selected]?save.records[save.selected].toFixed(2)+' с':'—';$('#garage-chip-level').textContent='ГАРАЖ '+garage.roman;$('#rival-label').textContent=(opponent(save).solo?'Проверка: ':'Соперник: ')+opponent(save).name;powerBadge($('#car-rating'),rating(effectiveLevels(save),CARS[save.selected].id));$('#car-rating').title=vehicleStats(CARS[save.selected].id,l).tag;$('#parts-count').textContent=Object.keys(save.inventory).length;{const crates=totalCrates(save),box=$('#boxes-count');box.textContent=crates;box.hidden=!crates;}$('#rank-count').textContent=save.rank>=CAMPAIGN_LENGTH?'♛':(()=>{const p=campaignPosition(save.rank);return 'район '+(p.map+1)+' · '+(p.series+1)+'/9';})();const req=next?garageRequirement(save,next.level):null,locked=!!(req&&req.missing.rank);$('#garage-upgrade-desc').textContent=next?'':'Дальше некуда: уровень 5 из 5';
 // Точка в шапке: гараж можно качнуть прямо сейчас — деньги и условие сошлись.
 $('#garage-chip-dot').hidden=!(next&&req&&req.ok);
 $('#garage-dialog-title').textContent='ГАРАЖ '+garage.roman;
 $('#garage-dialog-name').textContent=garage.name;
 
 $('#garage-perks').innerHTML=[
  ['Мест для машин',garage.carSlots,next?next.carSlots:''],
  ['Ранг деталей до',garage.rankCap,next?next.rankCap:''],
  ['Обвес до',RARITIES[Math.max(0,Math.min(3,garage.level-1))].name.toLowerCase(),next?RARITIES[Math.max(0,Math.min(3,next.level-1))].name.toLowerCase():''],
 ].map(([name,now,soon])=>`<li><span>${name}</span><b>${now}</b>${soon?`<i>→ ${soon}</i>`:''}</li>`).join('');// Гараж качается той же кнопкой, что деталь: стрелка, цена, материалы (upgrade-button.js).
 {const b=$('#garage-upgrade');
  if(!next)upgradeButton(b,{max:true,note:'Гараж на пределе'});
  else if(locked)upgradeButton(b,{max:true,note:garageConditionText(next)});
  else upgradeButton(b,{price:next.cost,scrap:next.scrap,meta:'гараж '+next.roman+' · '+next.name,
   shortCash:next.cost-save.cash,shortScrap:next.scrap-save.scrap});}
 $('#garage-upgrade').classList.toggle('locked',locked);$('#garage-upgrade').title=garageUnlockSummary(next||garage);$('#garage-upgrade').setAttribute('aria-label',next?'Улучшить гараж до '+next.level+' из 5: '+next.name+', '+fmt(next.cost)+' рублей и '+next.scrap+' материалов'+(locked?'. '+garageConditionText(next):''):garage.name+', уровень 5 из 5');}
$('#garage-chip').onclick=()=>{if(screen!=='garage'||sceneTransition.busy)return;openDialog($('#garage-dialog'));};
$('#garage-dialog-close').onclick=()=>closeDialog($('#garage-dialog'));
$('#garage-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog($('#garage-dialog'));});
$('#garage-upgrade').onclick=async()=>{
 if(!ready||screen!=='garage'||sceneTransition.busy||garageUpgrading)return;
 const next=nextGarage(save);if(!next)return;
 const req=garageRequirement(save,next.level);
 if(!req.ok){toast(req.missing.rank?garageConditionText(next):req.missing.cash?'Для гаража нужно ещё '+fmt(req.missing.cash)+' ₽':'Для гаража нужно ещё '+req.missing.scrap+' ⚒');return;}
 const before=garageLevel(save.garage);
 garageUpgrading=true;
 try{
  await closeDialog($('#garage-dialog'));
  let bought=false,parked=[];
  await garageUpgradeFx.run({async swap(){
   if(!upgradeGarage(save))return;
   bought=true;parked=refreshUnlocks(save);
   persist();renderGarageUI();customizer?.refresh();
   buildGarage();
   await renderer.compileAsync(garageScene,garageCamera);
  }});
  if(!bought)return;
  // Крупно и с перечнем: что за уровень и что он открыл.
  await carLevelUp.show({level:next.roman,name:next.name.toUpperCase(),lines:garageUpgradeLines(before,next)});
  if(parked.length){toast('В гараже нашлось место: '+parked.map(i=>CARS[i].name).join(', '));await showCarReveals();}
 }finally{garageUpgrading=false;}
};
$('#switch-car').onclick=()=>{if(ready&&!loadingModel)metaUI.open('cars');};
$('#help').onclick=()=>{for(const b of document.querySelectorAll('[data-lesson]'))b.disabled=screen==='race'&&phase!=='ready';openDialog($('#help-dialog'));};for(const b of document.querySelectorAll('[data-lesson]'))b.onclick=async()=>{if(screen==='race'&&phase!=='ready')return;await closeDialog($('#help-dialog'));onboarding.open({mode:b.dataset.lesson==='drift'?'drift':save.rank<3?'drag-auto':'drag-manual',car:CARS[save.selected].id,force:true});};$('#close-help').onclick=()=>closeDialog($('#help-dialog'));$('#help-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog($('#help-dialog'));});
function material(color,roughness=.85,metalness=0){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
function box(parent,w,h,d,x,y,z,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function cylinder(parent,r,h,x,y,z,mat,segments=12){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function floorTexture(type){const size=512,data=new Uint8Array(size*size*4);for(let i=0;i<size*size;i++){let n=Math.random()*22;let v=type==='road'?61+n:133+n;data[i*4]=v;data[i*4+1]=v+(type==='road'?2:-1);data[i*4+2]=v-8;data[i*4+3]=255;}const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.needsUpdate=true;t.generateMipmaps=true;t.minFilter=THREE.LinearMipmapLinearFilter;t.magFilter=THREE.LinearFilter;t.anisotropy=4;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(type==='road'?3:2,type==='road'?70:2);t.colorSpace=THREE.SRGBColorSpace;return t;}
let envMap,garageDecor,garageResident,garageResidentAsset,garageWorkshop,garageCrew,garageCrewAssets;const garageResources=[];
function sceneLighting(scene,warm=true){scene.add(new THREE.HemisphereLight(warm?0xf5e9ce:0xdde6dc,warm?0x615847:0x655c40,1.7));const key=new THREE.DirectionalLight(warm?0xffe7b5:0xffd7a0,2.4);key.position.set(7,12,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-14;key.shadow.camera.right=14;key.shadow.camera.top=14;key.shadow.camera.bottom=-14;key.shadow.normalBias=.025;key.shadow.bias=-.00015;scene.add(key);scene.environment=envMap;scene.environmentIntensity=1.0;}
function tire(parent,x,y,z){const m=new THREE.Mesh(new THREE.TorusGeometry(.38,.14,8,18),material(0x282925));m.rotation.x=Math.PI/2;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function disposeScene(scene){if(!scene)return;scene.traverse(o=>{if(o.userData.shared)return;if(o.isMesh&&!o.userData.car){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();}});}
function buildGarage(){
 garageResident?.dispose();
 garageCrew?.dispose();
 garageWorkshop?.dispose();
 garageDecor?.dispose();
 if(garageScene){if(garageCar)garageScene.remove(garageCar);disposeScene(garageScene);garageScene.traverse(o=>{if(o.isLight)o.dispose?.();});}
 for(const m of garageResources)m.dispose();garageResources.length=0;garageWalls=[];const stage=garageLevel(save.garage);garageScene=new THREE.Scene();garageScene.background=new THREE.Color(0x080f19);garageScene.fog=new THREE.FogExp2(0x080f19,.032);
 garageScene.environmentIntensity=stage.environment*1.1*GARAGE_LIGHT;
 // Студийная схема на три источника (Андрей, 17 сентября): тёплый ключ спереди-слева сверху с тенью, холодное заполнение
 // справа без тени, контровой сзади сверху — кромка на крыше и стойках. Общий свет приглушён ради контраста.
 // Контровой .43 (был .62) и софтбокс без прожектора: с ними светлая машина сверху пересвечивалась (28% горящих
 // пикселов против 6% в старой схеме — проба 17 сентября); при .43 кромка остаётся, а капот и крыша не режут.
 // Баланс студийный, а не «поровну со всех сторон»: полусфера светит слабо (она и есть ровная засветка со всех
 // сторон, от неё кузов читается плоским пятном), ключ сильный, заполнение противоположного борта втрое слабее
 // ключа, контровой отделяет машину от стены. Форму дальше довершает длинный блик от полос в снимке окружения.
 garageScene.add(new THREE.HemisphereLight(0x8fa4c4,0x26201a,stage.ambient*.19*GARAGE_LIGHT));
 const sun=new THREE.DirectionalLight(0xfff0d8,stage.sun*1.30*GARAGE_LIGHT);sun.position.set(-3.6,6.4,4.2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:30});sun.shadow.bias=-.0001;sun.shadow.normalBias=.015;sun.shadow.radius=2;shadowBudget(sun,quality.settings,true);garageScene.userData.sun=sun;garageScene.add(sun);
 const tube=new THREE.PointLight(0xffcf8d,(stage.tube*.9+12)*GARAGE_LIGHT,9,2);tube.position.set(1.5,2.8,-3);garageScene.add(tube);
 const fill=new THREE.DirectionalLight(0xb9d0f5,stage.rim*.52*GARAGE_LIGHT);fill.position.set(4.8,3.2,3.4);garageScene.add(fill);
 const back=new THREE.DirectionalLight(0xffe2bd,stage.sun*.58*GARAGE_LIGHT);back.position.set(1.2,4.8,-5.2);garageScene.add(back);
 const room=garageAsset.clone(true);configureGarageStage(room,save.garage);garageScene.add(room);
 const dirs={Wall_North:[0,0,-1],Wall_South:[0,0,1],Wall_West:[-1,0,0],Wall_East:[1,0,0]};
 room.traverse(o=>{o.userData.shared=true;if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;o.material=pbrMaterial(o.material);garageResources.push(o.material);
 let parent=o;while(parent&&!dirs[parent.name])parent=parent.parent;
 if(parent){o.material.transparent=true;o.material.forceSinglePass=true;garageWalls.push({mesh:o,normal:new THREE.Vector3(...dirs[parent.name])});}
 if(o.material.map)o.material.map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);
 });
 garageResources.push(...stabilizeGarageFloor(room));refineGarageShell(room,stage.level);
 garageDecor=addEveningGarage(garageScene,room,worldTextures.garageEvening,stage.level);garageWalls.push(...garageDecor.wallMeshes);
 garageResident=addGarageResident(garageScene.getObjectByName('Sofa'),garageResidentAsset,{reduced:reducedMotion});
 garageCrew=addGarageCrew(garageScene,garageCrewAssets,{reduced:reducedMotion});
 garageWorkshop=addWorkshop(garageScene,room,stage.level);garageWalls.push(...garageWorkshop.wallMeshes);
 garageLayout?.dispose();garageLayout=arrangeGarage(garageScene,room,stage.level,{occluders:[...garageDecor.clusters,...garageWorkshop.clusters,...garageCrew.clusters]});
 // Линейные трубки и переноска — до снимка окружения: длинные блики ламп должны лежать на лаке.
 garageLamps?.dispose();garageLamps=addGarageLamps(garageScene,stage.level);
 // Лампы бокса режем сильнее общего множителя: они светили на машину со всех сторон и съедали объём —
 // именно из-за них кузов читался плоским пятном цвета (проба: без ламп средняя яркость кузова падает
 // с 42 до 17, то есть они давали 60% его света). Сами трубки на экране остаются яркими.
 for(const light of garageLamps.lights)light.intensity*=GARAGE_LIGHT*.62;
 // Студийные полосы видны только снимку окружения: длинный блик на лаке есть, а над крышей камере ничего не мешает.
 if(garageLamps?.studio)garageLamps.studio.visible=true;
 garageEnvironment?.dispose();garageEnvironment=captureEnvironment(renderer,garageScene,new THREE.Vector3(0,1.25,.4));garageScene.environment=garageEnvironment.texture;
 if(garageLamps?.studio)garageLamps.studio.visible=false;
 // Выключатель создаём до машины: прожектор фар должен войти в число источников сцены сразу, иначе щелчок
 // выключателя менял бы их число и перекомпилировал все материалы.
 garageBlackout?.dispose();garageBlackout=createGarageBlackout(garageScene,{ambient:GARAGE_GROUND_AMBIENT,lamps:garageLamps,reduced:reducedMotion});if(garageDark){garageBlackout.set(true);while(garageBlackout.update(.05));}
 placeGarageCar();updateGarageCamera(1);garageDirty=true;quality.reset();
 if(ready)resize();
}
function modelInstance(i,equipment=save.equipped[i],paint=save.paint[i],racing=false,decal=save.decal[i],neon=null){const root=new THREE.Group();const car=(racing?raceModels.get(i):models[i]).clone(true);root.userData.racing=racing;root.userData.carId=CARS[i].id;root.add(car);root.userData.shared=true;root.userData.carLength=CARS[i].length;root.userData.carWidth=CARS[i].width;root.userData.wheelbase=CARS[i].wheelbase;root.userData.axleOffset=CARS[i].axleOffset||0;root.userData.wheelRadius=CARS[i].radius;root.userData.wheels=[];car.traverse(o=>{o.userData.shared=true;o.userData.car=true;if(/^Wheel_[FR][LR]$/.test(o.name))root.userData.wheels.push(o);});applyCustomization(root,car,equipment,paint,decal);/* Световой ковёр — до неона: неон ищет его в userData и отдаёт ему цвет и уровни трубок. Ночью земля видит свой свет целиком, мокрым днём вполсилы, ясным днём почти нет. */attachGroundLight(root,CARS[i],{reduced:reducedMotion,ambient:racing?(raceLookCfg.night?1:raceLookCfg.wet?.5:.26):GARAGE_GROUND_AMBIENT});if(neon)attachNeon(root,neon,{reduced:reducedMotion,racing});if(racing){root.userData.tailMaterials=[];car.traverse(o=>{if(o.isMesh&&(o.material.isMeshPhysicalMaterial||/glass/i.test(o.material.name)))o.material.envMapIntensity*=1.3;});/* на трассе лак и стёкла ловят окружение сильнее — как в гараже */car.updateWorldMatrix(true,true);car.traverse(o=>{if(!o.isMesh)return;if(/headlight/i.test(o.material.name))root.userData.lampY=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y;if(/^Red lens(?:\.\d+)?$/.test(o.material.name)){root.userData.tailY=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y;o.material.emissive.set(0xff2010);root.userData.tailMaterials.push(o.material);}});}return root;}
function updateGarageCamera(blend=.12){
 const dt=blend>=1?1/60:-Math.log(1-blend)/12,custom=customizer?.isOpen,slot=customizer?.focusSlot;if(slot!==inspectionSlot){inspectionSlot=slot;inspectionAnchor=garageYaw;}const focus=garageFocus(CARS[save.selected],reducedMotion?null:slot,garageYaw,inspectionAnchor);if(levelPunch>0){levelPunch=Math.max(0,levelPunch-dt*1.6);focus.zoom*=1-levelPunch*.16;}if(garageMotion.initialized)focus.yaw=garageMotion.yaw+Math.atan2(Math.sin(focus.yaw-garageMotion.yaw),Math.cos(focus.yaw-garageMotion.yaw));let changed=garageMotion.update({yaw:focus.yaw,span:Math.max(2.55,CARS[save.selected].length*.69)*focus.zoom,height:focus.height,targetX:focus.x,targetZ:focus.z,elevation:focus.elevation,offset:custom?-garageViewport.extra/garageViewport.w:0},dt,reducedMotion);const a=.68-garageMotion.yaw;garageCamera.position.set(garageMotion.targetX+Math.sin(a)*10.8,garageMotion.elevation,garageMotion.targetZ+Math.cos(a)*10.8);garageCamera.lookAt(garageMotion.targetX,garageMotion.height,garageMotion.targetZ);const span=garageMotion.span,offset=garageMotion.offset*span;garageCamera.left=-span;garageCamera.right=span;garageCamera.top=span*garageViewport.h/garageViewport.w+offset;garageCamera.bottom=-span*garageViewport.h/garageViewport.w+offset;garageCamera.updateProjectionMatrix();
 const view=new THREE.Vector3(garageCamera.position.x,0,garageCamera.position.z).normalize();
 for(const {mesh,normal} of garageWalls){const dot=view.dot(normal);const target=1-THREE.MathUtils.smoothstep(dot,-.14,.28);if(Math.abs(mesh.material.opacity-target)>.002)changed=true;mesh.material.opacity=Math.abs(mesh.material.opacity-target)<.002?target:THREE.MathUtils.lerp(mesh.material.opacity,target,blend);mesh.material.depthWrite=mesh.material.opacity>.97;const cast=target>.95;if(mesh.castShadow!==cast){mesh.castShadow=cast;garageShadowDirty=true;}mesh.visible=mesh.material.opacity>.015;}
 if(garageLayout?.update(garageCamera,garageCar,blend))changed=true;
 return changed;
}
// Пятна пересоздаются вместе с моделями: размер берём от кузова конкретной машины.
// Пятна тянутся за машинами в любой фазе: и на старте, и на выкате после финиша.
function placeGarageCar(equipment=save.equipped[save.selected],paint=save.paint[save.selected],decal=save.decal[save.selected],neon=save.neon?.[save.selected]){if(!models[save.selected])return;const xrayState=selectionGlow?.xray.snapshot();if(garageCar){selectionGlow?.dispose();disposeCustomizedCar(garageCar);garageScene.remove(garageCar);}garageCar=modelInstance(save.selected,equipment,paint,false,decal,neon);garageCar.position.set(0,0,.4);garageCar.rotation.y=Math.PI-.08;garageReflections(garageCar);garageIndicators?.dispose();garageIndicators=bindIndicators(garageCar,{reduced:reducedMotion});/* аварийка: до setCar, чтобы клоны линз в зеркале пола знали, что они мигают */garageScene.add(garageCar);garageLayout?.setCar(garageCar);/* На подъёмнике машина поднята: её свет должен лечь на пол под ней, а не светящейся плитой на дорожках. */garageCar.userData.groundLight?.setHeight(garageCar.position.y);garageBlackout?.setCar(garageCar);selectionGlow=new GarageSelection(garageCar,xrayState);garageDirty=true;if(garageScene.userData.sun)garageScene.userData.sun.shadow.needsUpdate=true;}
function smokeTexture(){const n=64,a=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,r=Math.hypot((x-32)/32,(y-32)/32);a[i]=255;a[i+1]=255;a[i+2]=255;a[i+3]=Math.max(0,1-r)**2*255;}const t=new THREE.DataTexture(a,n,n);t.needsUpdate=true;return t;}
let raceLookCfg=TRACKS[0];
// Гараж — витрина: пол там освещён, и добавочный свет на нём читается слабее, чем на ночном асфальте,
// поэтому неону под днищем дадим больше, чем ночью. Купленную подсветку игрок должен видеть на своей машине.
const GARAGE_GROUND_AMBIENT=1.5;
// Общий уровень света бокса. Студийная схема оказалась слишком яркой для насыщенных красок: на оранжевой
// «Восьмёрке» 40% пикселов кузова упирались в потолок канала, крыша и капот читались белыми (проба 17 сентября).
// Отдельные ручки почти ничего не меняли — виноват суммарный свет, поэтому режем всё разом и сохраняем баланс
// между ключом, заполнением и контровым. При .55 выбитых пикселов 4%, средняя яркость кузова 182 → 152.
const GARAGE_LIGHT=.55,GARAGE_EXPOSURE=.94;
// Выключатель света держится на сессию, а не в сейве: это способ посмотреть на машину, а не настройка.
let garageBlackout=null,garageDark=false;
// Road textures are needed only on the track: loaded once, on the first race or by the idle prefetch.
const WORLD_TEXTURES=['brick_wall_001_Diffuse','garage_floor_Diffuse','brick_wall_001_nor_gl','garage_floor_nor_gl'];let worldTexturesPromise=null;
// Кирпич и бетон трассы — те же четыре картинки, что уже приехали внутри garage-stages.glb. Раньше
// игра качала их второй раз из assets/materials (2 МБ) и держала на видеокарте вторую копию: четыре
// текстуры 1024×1024 RGBA с мипами — это 21 МБ. Теперь трасса берёт готовые из комнаты.
function harvestWorldTextures(room){if(!room)return;room.traverse(o=>{if(!o.isMesh)return;
 for(const m of [].concat(o.material||[]))for(const k of ['map','normalMap']){const t=m[k];
  if(t?.name&&WORLD_TEXTURES.includes(t.name)&&!worldTextures[t.name])worldTextures[t.name]=t;/* настройки семплера оставляем как в glb: анизотропия на полу и стенах стоит кадра на телефоне */}});}
function loadWorldTextures(){if(worldTexturesPromise)return worldTexturesPromise;if(WORLD_TEXTURES.every(n=>worldTextures[n]))return Promise.resolve();const loader=new THREE.TextureLoader();worldTexturesPromise=Promise.all(WORLD_TEXTURES.map(n=>loader.loadAsync('assets/materials/'+n+'.jpg'))).then(textures=>{textures.forEach((t,i)=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(i<2)t.colorSpace=THREE.SRGBColorSpace;worldTextures[WORLD_TEXTURES[i]]=t;});}).catch(e=>{worldTexturesPromise=null;throw e;});return worldTexturesPromise;}
// Quiet prefetch once the garage is interactive: road textures, the race version of the current car and the
// next rival's car, one after another, so the first race starts without a pause. Never blocks the garage.
let prefetchTimer=0;
function schedulePrefetch(){clearTimeout(prefetchTimer);const start=()=>prefetch().catch(()=>{});if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:4000});else prefetchTimer=setTimeout(start,2500);}
async function prefetch(){if(screen!=='garage')return;await loadWorldTextures();if(screen!=='garage')return;await loadRaceModel(save.selected);if(screen!=='garage'||save.rank>=CAMPAIGN_LENGTH)return;const next=opponent(save);if(next&&Number.isInteger(next.car))await loadRaceModel(next.car);}
function kitRidePenalty(s){return ['skirts','bumpers'].reduce((a,slot)=>{const p=partById(s.equipped[s.selected]?.[slot]);return a+(p?(p.rarity+1)*.06:0);},0);}
async function buildRace(index=0,look=null){raceLookCfg=look||TRACKS[index];await loadWorldTextures();
 if(playerModel){disposeCustomizedCar(playerModel);playerModel.removeFromParent();playerModel=null;}if(rivalModel){disposeCustomizedCar(rivalModel);rivalModel.removeFromParent();rivalModel=null;}
 weather?.dispose();raceEffects?.dispose();world?.dispose();world?.roadTexture?.dispose();world?.smokeMap?.dispose();
 raceEnvironment?.dispose();raceEnvironment=outdoorEnvironment(renderer,raceLookCfg);const roadTexture=floorTexture('road');world=createRaceWorld(index,{roadTexture,environment:raceEnvironment.texture,textures:worldTextures,look:raceLookCfg});world.roadTexture=roadTexture;world.smokeMap=smokeTexture();raceScene=world.scene;roadItems=world.moving;raceEffects=new RaceEffects(raceScene,world.smokeMap,world.cfg);
 // Отражения как в гараже: один снимок собранной трассы с места старта (небо + дома + фонари) вместо одного лишь неба.
 // Небо на время снимка — фон сцены, иначе в отражениях над крышей была бы пустота.
 {const bg=raceScene.background;raceScene.background=raceEnvironment.texture;raceProbe?.dispose();raceProbe=captureEnvironment(renderer,raceScene,new THREE.Vector3(-1.9,1.1,-2));raceScene.background=bg;raceScene.environment=raceProbe.texture;}
 weather=new WeatherEffects(raceScene,world.cfg,reducedMotion,world.smokeMap);/* молния по первой доле такта радио; без грома — Андрей попросил убрать звук */beatClock??=new BeatClock(radio,()=>audioCtx);weather.setBeat(()=>beatClock.wait());raceMap=index;raceEffects.setQuality(quality.settings);weather.setQuality(quality.settings);shadowBudget(raceScene.userData.sun,quality.settings);quality.reset();
}
async function loadModel(i){
 if(models[i])return models[i];if(modelLoads.has(i))return modelLoads.get(i);
 const promise=createGLTFLoader().loadAsync('assets/cars/'+CARS[i].id+'.glb').then(gltf=>{const car=gltf.scene;car.userData.fit=CARS[i];car.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;const old=o.material;o.material=pbrMaterial(old,true);old.dispose();o.material.envMapIntensity=1.1;}});models[i]=car;modelOrder.push(i);modelLoads.delete(i);return car;}).catch(error=>{modelLoads.delete(i);throw error;});modelLoads.set(i,promise);return promise;
}
async function renderFleetPreviews(indices,looks={}){const out={};if(!renderer)return out;const pending=[];for(const i of indices){/* looks — чужая внешность той же модели: тачка кореша в подмене */const look=looks[i]||{equipment:save.equipped[i],paint:save.paint[i],decal:save.decal[i]};const key=i+'|'+look.paint+'|'+(look.decal||'clean')+'|'+JSON.stringify(look.equipment);if(fleetPreviewCache.has(key))out[i]=fleetPreviewCache.get(key);else pending.push({i,key,look});}if(!pending.length)return out;
 const preview=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});preview.setPixelRatio(1);preview.setSize(384,256,false);preview.outputColorSpace=THREE.SRGBColorSpace;preview.toneMapping=THREE.ACESFilmicToneMapping;preview.toneMappingExposure=1.08;preview.setClearColor(0,0);const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xf4ead4,0x27332f,2.2));const keyLight=new THREE.DirectionalLight(0xffe4b4,3.5);keyLight.position.set(-5,8,5);scene.add(keyLight);const rim=new THREE.DirectionalLight(0xb6d7e5,1.6);rim.position.set(4,3,-5);scene.add(rim);/* Изометрия без перспективы. Направление совпадает со scripts/render-car-iso.py, иначе свои и закрытые машины в списке смотрят по-разному. */const camera=new THREE.OrthographicCamera(-1,1,1,-1,.05,400),direction=new THREE.Vector3(-1,.8165,1).normalize();
 try{for(const item of pending){await loadModel(item.i);const root=modelInstance(item.i,item.look.equipment,item.look.paint,false,item.look.decal);scene.add(root);const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z);camera.position.copy(center).addScaledVector(direction,Math.max(span*3,8));camera.lookAt(center);camera.updateMatrixWorld();/* Кадр по габаритам самой модели, а не на глаз: иначе вокруг машины остаётся воздух. */const inv=new THREE.Matrix4().copy(camera.matrixWorld).invert(),corner=new THREE.Vector3();let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(let c=0;c<8;c++){corner.set(c&1?bounds.max.x:bounds.min.x,c&2?bounds.max.y:bounds.min.y,c&4?bounds.max.z:bounds.min.z).applyMatrix4(inv);minX=Math.min(minX,corner.x);maxX=Math.max(maxX,corner.x);minY=Math.min(minY,corner.y);maxY=Math.max(maxY,corner.y);}const aspect=1.5,pad=1.03;let halfW=(maxX-minX)/2*pad,halfH=(maxY-minY)/2*pad;if(halfW/halfH<aspect)halfW=halfH*aspect;else halfH=halfW/aspect;const midX=(maxX+minX)/2,midY=(maxY+minY)/2;camera.left=midX-halfW;camera.right=midX+halfW;camera.top=midY+halfH;camera.bottom=midY-halfH;camera.near=.05;camera.far=Math.max(span*8,60);camera.updateProjectionMatrix();preview.render(scene,camera);const src=preview.domElement.toDataURL('image/webp',.86);out[item.i]=src;fleetPreviewCache.set(item.key,src);scene.remove(root);disposeCustomizedCar(root);pruneModels();if(fleetPreviewCache.size>40)fleetPreviewCache.delete(fleetPreviewCache.keys().next().value);}}
 finally{preview.dispose();preview.forceContextLoss();}return out;
}
async function loadRaceModel(i){if(raceModels.has(i))return raceModels.get(i);if(raceLoads.has(i))return raceLoads.get(i);const p=createGLTFLoader().loadAsync('assets/race-cars/'+CARS[i].id+'.glb').then(g=>{g.scene.userData.fit=CARS[i];g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;/* тени домов и столбов ложатся на машину при проезде; без этого она светилась в тени */}});raceModels.set(i,g.scene);raceLoads.delete(i);return g.scene;}).catch(e=>{raceLoads.delete(i);throw e;});raceLoads.set(i,p);return p;}
function pruneRaceModels(){for(const [i,model] of raceModels){if(i===save.selected||i===currentOpponent?.car)continue;const gs=new Set(),ms=new Set();model.traverse(o=>{if(o.isMesh){gs.add(o.geometry);ms.add(o.material);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());raceModels.delete(i);}}
async function selectCar(i){if(!ready||sceneTransition.busy||!isCarUnlocked(save,i))return false;return sceneTransition.run(()=>performSelectCar(i));}
async function performSelectCar(i){
 if(loadingModel||!CARS[i]||!isCarUnlocked(save,i))return false;loadingModel=true;$('#race-button').disabled=true;
 try{await loadModel(i);customizer?.close();save.selected=i;persist();renderGarageUI();placeGarageCar();resize();pruneModels();await renderer.compileAsync(garageScene,garageCamera);return true;}catch(error){console.error(error);toast('Машина не загрузилась. Попробуй ещё раз.');return false;}finally{loadingModel=false;$('#race-button').disabled=false;}
}
async function init(){try{
 // Полоса считает реальные файлы: модели и текстуры идут через общий менеджер three.
 bindLoadingBar($('#loading-bar'));crawlLoading();
 THREE.DefaultLoadingManager.onProgress=(url,loaded,total)=>loadingProgress(total?loaded/total:0);
renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});renderer.info.autoReset=false;graphics=new GameRenderer(renderer);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;/* мягкое размытие съедало контактную тень под машиной; нужен чёткий край */renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=GARAGE_EXPOSURE;garageCamera=new THREE.OrthographicCamera(-3.25,3.25,3.25,-3.25,.1,100);garageCamera.position.set(8.1,7.8,10.1);garageCamera.lookAt(0,.1,-.1);raceCamera=new THREE.PerspectiveCamera(46,1,.1,300);raceCamera.position.set(2,12,21);raceCamera.lookAt(0,0,2);const textureLoader=new THREE.TextureLoader();const eveningPromise=textureLoader.loadAsync('assets/materials/garage-evening-atlas.webp').then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;worldTextures.garageEvening=t;});const [,room]=await Promise.all([loadModel(save.selected),createGLTFLoader().loadAsync('assets/garage-stages.glb'),eveningPromise,loadGarageCrew().then(assets=>{garageCrewAssets=assets;}).catch(error=>console.warn('Garage crew unavailable',error)),loadGarageResident().then(asset=>{garageResidentAsset=asset;}).catch(error=>console.warn('Garage resident unavailable',error))]);garageAsset=room.scene;harvestWorldTextures(room.scene);
 buildGarage();await renderer.compileAsync(garageScene,garageCamera);$('#garage-fallback').hidden=true;finishLoading();$('#loading').hidden=true;$('#garage-canvas').append(renderer.domElement);ready=true;markReady();$('#race-button').disabled=false;resize();schedulePrefetch();const observer=new ResizeObserver(resize);observer.observe($('#game'));observer.observe($('#garage-canvas'));observer.observe($('#race-canvas'));renderer.domElement.addEventListener('pointerdown',e=>{if(screen==='race'){if(phase==='coasting'&&!reducedMotion&&coastElapsed>1)coastElapsed=FINISH_FILM_DURATION;if(!player?.ridge&&!player?.overpass){orbitDrag={x:e.clientX,from:raceOrbit};try{renderer.domElement.setPointerCapture(e.pointerId);}catch{}}return;}garageIdle.interact();dragging=true;dragLast=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{if(orbitDrag&&screen==='race'){const turn=orbitDrag.from-(e.clientX-orbitDrag.x)*.0045;raceOrbit=Math.max(-ORBIT_LIMIT,Math.min(ORBIT_LIMIT,turn));}if(dragging&&screen==='garage'){garageIdle.interact();garageYaw+=(e.clientX-dragLast)*.008;dragLast=e.clientX;/* кадр перерисует признак движения камеры (moving); garageDirty здесь заставлял бы пересчитывать тень на каждом кадре жеста */}});renderer.domElement.addEventListener('pointerup',()=>{dragging=false;orbitDrag=null;});renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;orbitDrag=null;});renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();gasHeld=false;toast('Графика приостановлена. Обнови страницу, прогресс сохранён.');});requestAnimationFrame(frame);}catch(error){console.error(error);$('#loading p').textContent='Не удалось загрузить 3D. Обнови страницу, чтобы попробовать снова.';}}
function resize(){if(!renderer)return;const parent=screen==='garage'?$('#garage-canvas'):$('#race-canvas'),w=parent.clientWidth,h=parent.clientHeight;if(!w||!h)return;graphics.resize(w,h,devicePixelRatio,quality.level,quality.settings);garageDirty=true;const camera=screen==='garage'?garageCamera:raceCamera;camera.aspect=w/h;if(screen==='garage'){garageViewport={w,h,extra:Math.max(0,parent.getBoundingClientRect().bottom-$('#custom-sheet').getBoundingClientRect().top)};}camera.updateProjectionMatrix();}
function feedback(text,color='#e2ca8a'){feedbackTimer=1.6;$('#feedback').textContent=text;$('#feedback').style.color=color;}
// Стрелка: сборку и дистанцию всегда даёт сервер, клиент их не выдумывает.
function myDuelBuild(){return normalizeDuelBuild({car:save.selected,levels:effectiveLevels(save),equipment:save.equipped[save.selected],paint:save.paint[save.selected],decal:save.decal[save.selected],neon:save.neon?.[save.selected],kit:raceKit(save)});}
// Пришёл по ссылке: до всякого меню показываем, кто зовёт и на чём.
async function openInvite(id){
 let card;
 try{card=await challengeApi.card(id);}catch(e){await challengeIntro.fail(e.message);return;}
 track('challenge_opened',{id,mine:!!card.mine,closed:card.closed||null});
 if(card.mine){toast('Это твоя стрелка. Ждём, кто ответит');return;}
 // Новичок по ссылке сначала подменяет кореша на его тачке, стрелки — потом (docs/loaner-invite.md).
 if(card.loaner){await openLoaner(card.loaner);return;}
 // Карточка сама знает, что не так: перезабили, протухла, я уже отвечал. Кнопка на ней говорит
 // правду и ведёт туда, где есть смысл: на свежую стрелку того же кореша или в список.
 const go=await challengeIntro.show(card);
 if(!go)return;
 await whenReady;
 // Перезабитая стрелка ведёт на свежую, а не в тупик с тостом.
 const target=card.closed?card.nextId:id;
 if(!target){await challengeUI.open();return;}
 try{await startChallenge(target);}catch(e){toast(e.message);await challengeUI.open();}
}
// Разрешение боту писать. Просим один раз за сессию и только там, где уведомление и правда нужно:
// человек завёл стрелку и теперь ждёт ответа. На входе в игру такое окно выглядит попрошайничеством.
let canWrite=false,askedWrite=false;
async function askWriteAccess(){
 if(canWrite||askedWrite||!telegramLaunch)return false;
 askedWrite=true;
 const granted=await tgRequestWrite();
 if(!granted)return false;
 canWrite=true;
 challengeApi.notifyAllowed().catch(()=>{});
 track('notify_allowed',{});
 toast('Бот напишет, когда ответят');
 return true;
}
// Кого позвали адресно — чтобы на экране «вызов брошен» показать лица, а не догадки.
let challengeCalled={names:[],photos:[]};
async function createChallenge(options={}){
 // Сначала кому, потом еду (Андрей, 17 сентября). Раньше кнопка молча выкидывала на пустую трассу,
 // и человек не понимал, зачем едет. Реванш и адресный вызов из списка адресата уже знают.
 if(!options.rivalIds&&!options.parentId){
  const picked=await challengePicker.pick();
  if(!picked)return;
  options={...options,...picked};
 }
 challengeCalled={names:options.names||[],photos:options.photos||[]};
 await cloud.flushNow(save);
 const made=await challengeApi.create(options);
 challengeUI?.close();
 track('challenge_created',{id:made.id,distance:made.distance,rematch:!!options.parentId,invited:made.invited||0,closed:made.closed||null});
 // Перезабитая стрелка исчезает: время у человека одно, и об этом надо сказать вслух.
 if(made.closed)toast('Старая стрелка закрыта. Ставим новое время');
 else toast('Катани трассу: твой результат — это вызов корешам');
 await goRace(false,null,{player:made.build,opponent:null,challenge:{id:made.id,role:'a'},distance:made.distance,solo:true,hint:made.hint||'Ставишь время. Кореша поедут по нему'});
 // Пока человек едет, греем студию баннера. Первая сборка карточки стоит секунд — собрать
 // окружение и скомпилировать материалы машины под здешний свет, — и эта пауза приходится
 // ровно на момент отправки, где читается как «не работает». Гаража на экране сейчас нет,
 // так что забрать машину в студию можно незаметно.
 if(screen==='race')warmStage({THREE,graphics,car:garageCar}).catch(()=>{});
}
// Своя стрелка, по которой я ещё не проехал: ссылку нельзя отдать, пока нет времени.
async function driveChallenge(id){
 await cloud.flushNow(save);
 const card=await challengeApi.card(id);
 challengeUI?.close();
 await goRace(false,null,{player:card.car,opponent:null,challenge:{id,role:'a'},distance:card.distance.challenger});
}
// Приём и выход на старт — один шаг. Бронировать место не от кого: на стрелку отвечают все сразу,
// и «принято, но не поехал» было выдуманным состоянием. Прокачаться перед заездом по-прежнему можно —
// стрелка ждёт в списке, а сборку сервер замораживает именно здесь, на старте.
async function startChallenge(id){
 await cloud.flushNow(save);
 const deal=await challengeApi.start(id);
 challengeUI?.close();
 track('challenge_started',{id,distance:deal.distance,rivalDistance:deal.rivalDistance});
 await goRace(false,null,{
  player:myDuelBuild(),
  opponent:{build:deal.rivalBuild,inputs:deal.rivalInputs||[],name:deal.rival?.name||'КОРЕШ'},
  challenge:{id,role:'b',rivalTime:deal.rivalTime},
  distance:deal.distance,rivalDistance:deal.rivalDistance,
 });
}
// Кадр для баннера: снимаем настоящий гараж с настоящей машиной. Внутри нет ни одного await —
// холст игры отдаёт картинку только в той же задаче, где прошла отрисовка. Размер рендера сбиваем,
// поэтому сразу возвращаем его на место.
function garageShot(){
 if(!ready||screen!=='garage'||!garageCar)return null;
 try{return captureGarageShot({THREE,graphics,scene:garageScene,car:garageCar,level:quality.level,settings:quality.settings});}
 catch(e){console.warn('Снимок гаража не вышел:',e.message);return null;}
 finally{resize();garageDirty=true;}
}
// Баннер приглашения: та самая машина, что стоит в гараже, — с краской, обвесом и декалями.
// Снимок гаража лучше витринного рендера: в чате сразу видно, что тачка своя. Если снять не вышло
// (например, стрелку зовут не из гаража), падаем на общий рендер машины: показать вызов важнее красоты.
async function myInviteCard(distance,time=0){
 const shot=garageShot()||(await renderFleetPreviews([save.selected]))[save.selected]||null;
 const stats=vehicleStats(CARS[save.selected].id,effectiveLevels(save));
 return buildInviteCard({
  name:tgUser()?.first_name||profiles.current()||'ГОНЩИК',
  car:CARS[save.selected].name,power:stats.rating,distance,time,
  carImage:shot,
 });
}
// Баннер уходит на сервер до приглашения: бот подставляет его в сообщение. Повторяем один раз —
// стрелка записана в базу секунду назад, и первый запрос попадает иногда на реплику, которая её
// ещё не видит. Не вышло и со второго раза — зовём со стоковой карточкой машины.
async function sendInviteCard(id,distance,time=0){
 let jpeg=null;
 for(let attempt=0;attempt<2;attempt++){
  try{
   jpeg=jpeg||await myInviteCard(distance,time);
   await challengeApi.putCard(id,jpeg);
   track('invite_card',{ok:true,kb:Math.round(jpeg.length/1024),attempt});
   return true;
  }catch(e){
   console.warn('Баннер приглашения не ушёл:',e.message);
   if(attempt)track('invite_card',{ok:false,reason:String(e.message||e).slice(0,80),kb:jpeg?Math.round(jpeg.length/1024):0});
   else await new Promise(r=>setTimeout(r,1500));
  }
 }
 return false;
}
// Приглашение уходит карточкой: бот заранее собирает сообщение с машиной вызывающего и кнопкой
// «ПРИНЯТЬ СТРЕЛКУ», Telegram показывает шторку «кому отправить». Ссылка остаётся запасным путём —
// на старых клиентах и когда бот не отдал заготовку, звать всё равно можно.
async function sendInvite(id,link,text,distance=null,time=0){
 if(distance!=null)await sendInviteCard(id,distance,time);
 try{const prepared=await challengeApi.share(id);if(tgShareMessage(prepared.messageId))return true;}
 catch(e){console.warn('Карточка приглашения не собралась:',e.message);}
 if(link&&tgShare(link,text))return true;
 if(link)toast('Ссылка: '+link);
 return false;
}
// Позвать на свою стрелку. Если позванный уже в корешах и бот до него дотягивается, шторку
// «кому отправить» не открываем вовсе: письмо ему уже ушло, а выбирать вручную того, кто и так
// получит вызов, — работа впустую, и человек справедливо не понимает, зачем его об этом спросили.
// Остальным нужна ссылка, и тогда сначала говорим, что собираем карточку: карточка рисуется и
// уходит на сервер пару секунд, и молчание в этот момент читается как «отправка не работает».
async function callMates(id){
 const share=challengeShare;
 if(share?.notified>0){
  const names=(share.notifiedNames||[]).slice(0,2).join(' и ');
  toast(names?names+(share.notified>1?' получат вызов':' получит вызов'):'Вызов ушёл корешам');
  return true;
 }
 toast('Собираем карточку для чата…');
 try{
  if(share?.link)await sendInvite(id,share.link,share.text,share.distance,share.time);
  else await shareChallenge(id);
  return true;
 }catch(e){toast(e.message);return false;}
}
async function shareChallenge(id){
 const card=await challengeApi.card(id);
 if(!card.link)throw Error('Ссылку выдаст бот. Он ещё подключается');
 // Дистанция вызвавшего у карточки называется challenger: после переделки сервера прежнее
 // distance.a перестало существовать, и баннер по этому пути молча не собирался.
 await sendInvite(id,card.link,card.text,card.distance?.challenger??null,card.time??0);
}
async function goRace(practice=false,mapOverride=null,duel=null,battle=false,bonusKey=null){if(!ready||loadingModel||warming||sceneTransition.busy)return false;activeDriftBonus=bonusKey;const result=await sceneTransition.run(()=>duel?performDuelRace(duel):performGoRace(practice,mapOverride,null,battle),{covered:()=>{
 // Босса показываем, пока экран ещё под шторкой: иначе между картой и его фото мелькает трасса.
 if(!pendingIntro||screen!=='race')return null;
 const rivalIntro=pendingIntro;pendingIntro=null;introShown.add(rivalIntro.id);
 return runBossIntro(rivalIntro);
}});if(screen==='race'&&phase==='ready'&&(!duel||duel.challenge||duel.loaner)&&!player.overpass&&!telegramSyncing)onboarding.open({mode:player.ridge?'drift':currentOpponent.startAssist||duel?.autoLaunch?'drag-auto':'drag-manual',car:CARS[save.selected].id});return result;}
function showRaceFinish(){
 const battle=!!player.ridgeBattle,mode=battle?'battle':player.ridge?'drift':duelRace?'duel':'race';
 haptics(player.crashed?'crash':mode==='drift'||mode==='battle'?'win':(player.finishTime||player.time)<=(rival.crashed?Infinity:rival.finishTime)?'win':'lose');
 finishPresentation.show({mode,time:player.finishTime||player.time,opponentTime:rival.crashed?undefined:rival.finishTime,score:battle?battleScore(player):player.ridge?driftState(player).score:0,opponentScore:battle?battleScore(rival):0,crashed:!!player.crashed});
}
function resetFinishFilm(){finishFilmStart=null;$('#result-garage').hidden=false;$('#race-again').disabled=false;delete $('#result-dialog').dataset.loaner;finishPresentation.hide();delete $('#game').dataset.overpass;$('#speed').style.color='';delete $('#result-dialog').dataset.driftResult;delete $('#game').dataset.drift;$('#shift-button').classList.remove('handbrake-held');$('#shift-button').removeAttribute('aria-label');$('.result-times>div:first-child>span').textContent='ТВОЁ ВРЕМЯ';$('.result-times>div:last-child>span').textContent='СОПЕРНИК';if(raceCamera)delete raceCamera.userData.crashTarget;$('#result-practice').hidden=true;delete $('#result-dialog').dataset.ridgeCrash;delete $('#game').dataset.raceFilm;delete $('#game').dataset.raceShot;raceCamera?.up.set(0,1,0);}
async function performOverpass(practice,district){
 if(!ready||warming||loadingModel)return false;
 const maxDistrict=trackIndex(save.rank);district=Math.max(0,Math.min(maxDistrict,Math.floor(Number(district)||0)));
 practiceMode=practice;duelRace=null;activeDriftBonus=null;battleMatch=null;battleOutcome=null;pendingIntro=null;resetFinishFilm();driftHUD.hide();ridgeControls.reset();
 currentOpponent=practice?{...overpassCheck(district,{map:overpassTrack()}),startAssist:true}:overpassStage(save.rank);
 loadingModel=true;$('#race-button').disabled=true;
 try{await loadRaceModel(save.selected);await buildRace(overpassTrack(),{...TRACKS[overpassTrack()],district:currentOpponent.district});}
 catch(e){console.error(e);toast('Эстакада не загрузилась. Попробуй ещё раз.');return false;}
 finally{loadingModel=false;$('#race-button').disabled=false;}
 player=createCar(effectiveLevels(save),CARS[save.selected].drive,CARS[save.selected].id,currentOpponent.distance,raceKit(save));overpassStart(player,currentOpponent.district);player.surface=1;player.ride=player.handling.ride;
 // A model-free placeholder keeps shared audio harmless; it is never raced or rendered.
 rival=createCar();rival.finished=true;rivalModel=new THREE.Group();rivalModel.visible=false;
 playerModel=modelInstance(save.selected,save.equipped[save.selected],save.paint[save.selected],true,save.decal[save.selected],save.neon?.[save.selected]);raceScene.add(playerModel);world.setSmokeMap(world.smokeMap);
 launchElapsed=0;countdown=3;coastElapsed=0;settled=false;gasHeld=false;previousSpeed=0;shake=0;phase='ready';screen='race';
 $('#game').dataset.screen='race';$('#game').dataset.overpass='true';$('#overpass-landing').dataset.flash='false';$('#overpass-landing').textContent='';$('#profile-button').disabled=true;$('#screen-title').textContent='ЭСТАКАДА';$('#garage-screen').hidden=true;$('#race-screen').hidden=false;$('#race-canvas').append(renderer.domElement);renderer.toneMappingExposure=1.04;
 $('.race-top h2').textContent='ЭСТАКАДА';$('.race-top .tiny-label').textContent=TRACKS[currentOpponent.district].name;$('.race-distance').textContent='700 М';
 $('#race-callout').hidden=false;$('#race-callout').classList.remove('launch');$('#race-callout strong').textContent='ГОТОВ?';$('#race-callout small').textContent='';$('#race-callout span').textContent='';$('#shift-label').textContent='ПРОВЕРИТЬ МАШИНУ';$('#shift-icon').textContent='↑';$('#shift-button').disabled=false;
 track('race_start',{kind:'overpass',stage:currentOpponent.stageRank??null,practice,district:currentOpponent.district,distance:700,required:currentOpponent.needKmh});
 resize();world.update(0,player,rival,[playerModel,rivalModel],0,reducedMotion);raceCamera.position.set(3,8,14);delete raceCamera.userData.overpassAim;world.camera(raceCamera,player,playerModel,1,true);updateOverpassHUD();warming=true;
 try{await renderer.compileAsync(raceScene,raceCamera);}finally{warming=false;quality.reset();}pruneModels();pruneRaceModels();return true;
}
function updateOverpassHUD(){
 const ready=['ready','countdown'].includes(phase),next=nextGap(player.distance,player.overpassGaps),pass=player.speed*3.6>=(next?.needKmh||0),air=player.air;
 $('#opponent-marker').hidden=true;$('#speed').textContent=Math.floor(player.speed*3.6);$('#speed').style.color=ready?'':pass?'#c7e792':'#f1a47a';$('#gear').textContent=(player.landings||0)+' / 3';$('.gear>span').textContent='ПРОЛЁТЫ';$('#time').textContent=(player.time||0).toFixed(2);$('.time>span').textContent='СЕК';$('#player-marker').style.left=clamp(player.distance/700*98,0,98)+'%';
 const hint=player.crashed?'НЕ ХВАТИЛО '+player.fell.short+' М':air?'В ПОЛЁТЕ · '+air.t.toFixed(1)+' С':next?'ДО ПРОЛЁТА '+Math.ceil(next.metres)+' М · НУЖНО '+next.needKmh+' КМ/Ч':'ТРИ ПРОЛЁТА ПОЗАДИ';
 $('#feedback').textContent=phase==='ready'?'ТРИ ПРЫЖКА · ГАЗ И ПЕРЕДАЧИ АВТО':hint;$('#feedback').style.color=player.crashed?'#f1a47a':air||pass?'#c7e792':'#ffe1a3';
 $('#overpass-progress').innerHTML=player.overpassGaps.map((g,i)=>`<span class="${i<(player.landings||0)?'landed':air?.gap.id===g.id?'flying':''}"><b>${i<(player.landings||0)?'✓':i+1}</b><small>${requiredKmh(g)} км/ч</small></span>`).join('');
}
function settleOverpass(){
 if(settled)return;settled=true;phase=player.crashed?'crashed':'finished';const result=completeOverpass(save,player,currentOpponent,practiceMode);lastRaceResult=null;racesThisSession++;recordRace(save,{opp:{...currentOpponent,id:currentOpponent.stageRank??save.rank,practice:practiceMode,name:'ЭСТАКАДА · '+(currentOpponent.district+1)},won:result.won,time:player.time,fresh:result.fresh});persist();
 $('#race-callout').hidden=true;finishPresentation.result({mode:'overpass',crashed:player.crashed,score:player.landings,time:player.time});
 $('#result-dialog').dataset.tier='race';$('#result-dialog').dataset.ridgeCrash='true';$('#result-kicker').textContent=practiceMode?'ЭСТАКАДА · ТРЕНИРОВКА':'ПРОВЕРКА ПЕРЕД БОССОМ';$('#result-title').textContent=result.won?'МАШИНА ГОТОВА К БОССУ':'НЕ ХВАТИЛО МОЩИ';$('#result-time').textContent=player.time.toFixed(2)+' с';$('#rival-time').textContent=(player.landings||0)+' / 3';$('.result-times>div:last-child>span').textContent='ПРОЛЁТЫ';$('#reward').textContent='';$('#result-shifts').textContent=result.won?'Все три пролёта пройдены':'Не хватило '+player.fell.short+' м';$('#result-comment').textContent=practiceMode?(result.won?'Свободная проверка: награды выдаются только за этап кампании.':currentOpponent.hint):result.won?'Проверка пройдена. Впереди последний соперник и босс района.':currentOpponent.hint+' Этап пройден — можно продолжить кампанию.';
 $('#result-loot').innerHTML=rewardTiles(result);$('#result-event').textContent='';$('#race-again').textContent=practiceMode?'ЕЩЁ ПРОВЕРКА':'ПРОДОЛЖИТЬ КАМПАНИЮ';$('#result-practice').hidden=true;
 track('overpass',{stage:currentOpponent.stageRank??null,district:currentOpponent.district,practice:practiceMode,won:result.won,landings:player.landings,short:player.fell?.short||0,time:player.time,fresh:result.fresh});if(result.fresh)track('reward',{stage:currentOpponent.stageRank,cashGain:result.cash,scrapGain:result.scrap,fresh:true,won:result.won});openDialog($('#result-dialog'));sfx(result.won?'win':'shift');
}
function frameOverpass(dt){
 if(phase==='countdown'){const before=Math.ceil(countdown);countdown-=dt;$('#race-callout strong').textContent=Math.max(1,Math.ceil(countdown));$('#shift-label').textContent=Math.max(1,Math.ceil(countdown));if(before!==Math.ceil(countdown)&&countdown>0)sfx('tick');if(countdown<=0){launch(player,launchRpmFor(player));phase='running';$('#race-callout').hidden=true;$('#shift-button').disabled=true;sfx('launch');}}
 if(phase==='running'){
  const before=player.landings;tickCar(player,dt);
  if(player.landings>before){$('#overpass-landing').textContent='ДОЛЕТЕЛ · '+player.landings+' / 3';$('#overpass-landing').dataset.flash='true';player.landingFlash=.9;sfx('contact');shake=.1;}
  if(player.crashed){phase='crashing';$('#shift-button').disabled=true;$('#overpass-landing').textContent='НЕ ХВАТИЛО '+player.fell.short+' М';$('#overpass-landing').dataset.flash='true';player.landingFlash=2.3;}
  else if(player.finished){phase='coasting';coastElapsed=0;finishPresentation.show({mode:'overpass',score:3,time:player.time});}
 }
 if(phase==='crashing'){tickCar(player,dt);if(player.overpassFall?.impact&&!player.overpassFall.heard){player.overpassFall.heard=true;sfx('contact');haptics('crash');}if(player.crashElapsed>=(reducedMotion?1.7:2.3))settleOverpass();}
 if(phase==='coasting'){tickCoast(player,dt);coastElapsed+=dt;if(coastElapsed>=2.8)settleOverpass();}
 if(!settled){world.update(player.travelDistance??player.distance,player,rival,[playerModel,rivalModel],dt,reducedMotion);animateWheels(playerModel,player.speed,dt,player);world.camera(raceCamera,player,playerModel,dt,reducedMotion);}
 player.landingFlash=Math.max(0,(player.landingFlash||0)-dt);$('#overpass-landing').dataset.flash=player.landingFlash>0?'true':'false';updateOverpassHUD();graphics.render(raceScene,raceCamera);
}

async function performDuelRace(duel){
 if(!ready||loadingModel||warming)return;duelRace=duel;duelInputs=[];duelFrame=0;duelAccumulator=0;practiceMode=false;raceEffects?.reset();playerBody.reset();rivalBody.reset();previousSpeed=0;shake=0;resetFinishFilm();finishFilmSide=Math.random()<.5?-1:1;
 const solo=!duel.opponent,playerBuild=duel.player,opponentBuild=duel.opponent?.build||duel.player,/* в подмене «чувак» едет физикой тачки кореша, а выглядит своей машиной */rivalLook=duel.opponent?.look||opponentBuild;
 const myDistance=duel.distance||DUEL.distance,rivalDistance=duel.rivalDistance||myDistance;raceView={x:reducedMotion?2:3.4,y:reducedMotion?12:13,z:reducedMotion?21:23,fov:reducedMotion?46:49};raceAim={x:0,y:reducedMotion?0:1,z:reducedMotion?2:-6};raceOrbit=0;orbitDrag=null;raceCamera.position.set(raceView.x,raceView.y,raceView.z);raceCamera.lookAt(raceAim.x,raceAim.y,raceAim.z);raceCamera.fov=raceView.fov;
 currentOpponent={id:0,car:rivalLook.car,levels:opponentBuild.levels,map:DUEL.map,distance:myDistance,name:duel.opponent?.name||'ТВОЙ ВЫЗОВ',window:1,launchPerfect:.24,launchAuto:.8,startAssist:false,boss:false};const map=DUEL.map;currentOpponent.surface=TRACKS[map].wet?.91:1;loadingModel=true;$('#race-button').disabled=true;
 try{await Promise.all([loadRaceModel(playerBuild.car),loadRaceModel(rivalLook.car)]);}catch(error){console.error(error);toast('Не удалось загрузить соперника. Попробуй ещё раз.');loadingModel=false;$('#race-button').disabled=false;return;}
 loadingModel=false;$('#race-button').disabled=false;await buildRace(map);pruneModels();pruneRaceModels();launchElapsed=0;screen='race';$('#profile-button').disabled=true;renderer.toneMappingExposure=raceLookCfg.night?1.16:raceLookCfg.wet?1.04:1.0;phase='ready';settled=false;coastElapsed=0;gasHeld=false;$('#game').dataset.screen='race';$('#screen-title').textContent=TRACKS[raceMap].name;$('#garage-screen').hidden=true;$('#race-screen').hidden=false;$('#race-canvas').append(renderer.domElement);
 if(playerModel){disposeCustomizedCar(playerModel);raceScene.remove(playerModel);}if(rivalModel){disposeCustomizedCar(rivalModel);raceScene.remove(rivalModel);}playerModel=modelInstance(playerBuild.car,playerBuild.equipment,playerBuild.paint,true,playerBuild.decal,playerBuild.neon);rivalModel=modelInstance(rivalLook.car,rivalLook.equipment,rivalLook.paint,true,rivalLook.decal,rivalLook.neon);playerModel.rotation.y=-Math.PI/2;rivalModel.rotation.y=-Math.PI/2;playerModel.position.set(-1.9,0,0);rivalModel.position.set(1.9,0,-.2);raceScene.add(playerModel,rivalModel);seatRaceDrivers(playerModel,rivalModel);raceIndicators?.dispose();raceIndicators=bindIndicators(playerModel,{reduced:reducedMotion,lights:false});
 for(const model of [playerModel,rivalModel])model.traverse(o=>{if(o.isMesh&&o.material.name.includes('headlight')){o.material.emissive.set(0xffdfaa);o.material.emissiveIntensity=raceLookCfg.night?2.2:.12;}});player=duelCar(playerBuild,myDistance);rival=duelCar(opponentBuild,rivalDistance);if(solo){rival.finished=true;rivalModel.visible=false;}player.window=currentOpponent.window;player.surface=currentOpponent.surface;rival.surface=currentOpponent.surface;player.rough=rival.rough=currentOpponent.rough||0;player.ride=Math.max(.05,(player.handling.ride??.5)-(duelRace?0:kitRidePenalty(save)));playerModel.userData.ride=player.ride;rivalModel.userData.ride=rival.ride;raceScene.userData.start.position.z=-3;raceScene.userData.finish.position.z=-(player.raceDistance+3);raceScene.userData.tree.position.z=-6;for(const r of roadItems)r.obj.position.z=r.start;for(const p of particles){p.life=0;p.mesh.visible=false;}
 launchRpm=3200;countdown=3;$('#race-callout').hidden=false;$('#race-callout').classList.remove('launch');$('#race-callout strong').textContent='ГОТОВ?';$('#race-callout small').textContent=duel.autoLaunch?LOANER_TEXT.rule:'Тапни после отсчёта';$('#race-callout span').textContent=rivalDistance!==myDistance?'ТЫ СЛЕВА · У КАЖДОГО СВОЙ ФИНИШ':'ТЫ СЛЕВА';$('#shift-label').textContent='СТАРТ';$('#shift-button').disabled=false;$('#shift-icon').textContent='↑';feedback(duel.loaner?(solo?'ПРОГРЕВ · ТАЧКА КОРЕША':'ПОДМЕНА · ЗА КОРЕША'):duel.challenge?(solo?'СТРЕЛКА · ТВОЙ ВЫЗОВ':'СТРЕЛКА · '+(duel.opponent?.name||'КОРЕШ')):duel.opponent.isBot?'ДУЭЛЬ · БОТ':'ДУЭЛЬ · ЗАПИСЬ ИГРОКА');$('.race-distance').textContent=myDistance+' М';$('.race-top .tiny-label').textContent=duel.loaner?'ТАЧКА КОРЕША · МОЩЬ '+playerBuild.power:solo?'ТВОЙ ВЫЗОВ · '+playerBuild.power:'КЛАСС '+playerBuild.classId+' · '+playerBuild.power+' ↔ '+opponentBuild.power;$('.race-top h2').textContent=duel.loaner&&solo?'ПРОГРЕВ':duel.opponent?.name||'СТРЕЛКА';resize();updateDashboard();warming=true;$('#shift-button').disabled=true;try{await renderer.compileAsync(raceScene,raceCamera);}finally{warming=false;$('#shift-button').disabled=false;quality.reset();}
}
async function performGoRace(practice=false,mapOverride=null,duel=null,battle=false){if(!duel&&((!practice&&isOverpassStage(save.rank))||(practice&&(mapOverride?.overpass!==undefined||TRACKS[mapOverride]?.check))))return performOverpass(practice,mapOverride?.overpass??trackIndex(save.rank));if(!ready||loadingModel||warming)return;duelRace=duel;duelInputs=[];duelFrame=0;duelAccumulator=0;practiceMode=practice===true;battleOutcome=null;battleMatch=battle?(typeof battle==='object'?battle:createBattleMatch()):null;raceEffects?.reset();playerBody.reset();rivalBody.reset();previousSpeed=0;shake=0;resetFinishFilm();finishFilmSide=Math.random()<.5?-1:1;raceView={x:reducedMotion?2:3.4,y:reducedMotion?12:13,z:reducedMotion?21:23,fov:reducedMotion?46:49};raceAim={x:0,y:reducedMotion?0:1,z:reducedMotion?2:-6};raceOrbit=0;orbitDrag=null;raceCamera.position.set(raceView.x,raceView.y,raceView.z);raceCamera.lookAt(raceAim.x,raceAim.y,raceAim.z);raceCamera.fov=raceView.fov;currentOpponent=duelRace?{id:0,car:DUEL.car,levels:DUEL.levels,map:DUEL.map,distance:DUEL.distance,name:duelRace.opponent?.name||'КВАЛИФИКАЦИЯ',window:1,launchPerfect:.24,launchAuto:.8,startAssist:false,boss:false}:opponent(save,practiceMode);const map=practiceMode?practiceTrack(save.rank,mapOverride):currentOpponent.map,stageLook=duelRace?null:practiceMode?raceLook(map,0,true):currentOpponent.look;if(TRACKS[map].bonus&&!currentOpponent.drift)currentOpponent={...ridgeOpponent(currentOpponent),map,name:TRACKS[map].name};if(battle&&practiceMode&&TRACKS[map].bonus)currentOpponent=battleOpponent(currentOpponent,save.selected,effectiveLevels(save));currentOpponent.surface=(stageLook||TRACKS[map]).wet?.91:1;currentOpponent.rough=stageLook?.rough||0;track('race_start',{stage:currentOpponent.id,kind:duelRace?'duel':player?.ridgeBattle?'battle':TRACKS[map].bonus?'drift':practiceMode?'training':'campaign',attempt:(attemptCounts.get(currentOpponent.id)||0)+1,opponent:currentOpponent.name,opponentCar:CARS[currentOpponent.car]?.id,opponentPower:currentOpponent.levels?rating(currentOpponent.levels,CARS[currentOpponent.car]?.id):null,distance:currentOpponent.distance,track:TRACKS[map].id,look:stageLook?.look||null,wet:currentOpponent.surface<1,rough:!!currentOpponent.rough,required:currentOpponent.requiredPerfect||0});loadingModel=true;$('#race-button').disabled=true;try{await Promise.all([loadRaceModel(duelRace?DUEL.car:save.selected),loadRaceModel(currentOpponent.car)]);}catch(error){console.error(error);toast('Не удалось загрузить соперника. Попробуй ещё раз.');loadingModel=false;$('#race-button').disabled=false;return;}loadingModel=false;$('#race-button').disabled=false;await buildRace(map,stageLook);pruneModels();pruneRaceModels();launchElapsed=0;screen='race';$('#profile-button').disabled=true;renderer.toneMappingExposure=raceLookCfg.night?1.16:raceLookCfg.wet?1.04:1.0;phase='ready';settled=false;coastElapsed=0;gasHeld=false;$('#game').dataset.screen='race';$('#screen-title').textContent=TRACKS[raceMap].name;$('#garage-screen').hidden=true;$('#race-screen').hidden=false;$('#race-canvas').append(renderer.domElement);if(playerModel){disposeCustomizedCar(playerModel);raceScene.remove(playerModel);}if(rivalModel){disposeCustomizedCar(rivalModel);raceScene.remove(rivalModel);}playerModel=duelRace?modelInstance(DUEL.car,{},'cherry',true):modelInstance(save.selected,save.equipped[save.selected],save.paint[save.selected],true,save.decal[save.selected],save.neon?.[save.selected]);rivalModel=modelInstance(currentOpponent.car,currentOpponent.equipment||{},currentOpponent.paint||CARS[currentOpponent.car].color,true,currentOpponent.decal,currentOpponent.neon);/* обвес, краска и неон главарей и боссов: сток остаётся только у рядовых */playerModel.rotation.y=-Math.PI/2;rivalModel.rotation.y=-Math.PI/2;playerModel.position.set(-1.9,0,0);rivalModel.position.set(1.9,0,-.2);raceScene.add(playerModel,rivalModel);seatRaceDrivers(playerModel,rivalModel);for(const model of [playerModel,rivalModel])model.traverse(o=>{if(o.isMesh&&o.material.name.includes('headlight')){o.material.emissive.set(0xffdfaa);o.material.emissiveIntensity=raceLookCfg.night?2.2:.12;}});raceIndicators?.dispose();raceIndicators=bindIndicators(playerModel,{reduced:reducedMotion,lights:false});/* аварийка и в заезде: линзы мигают, свет ложится на асфальт */player=duelRace?duelCar():createCar(effectiveLevels(save),CARS[save.selected].drive,CARS[save.selected].id,currentOpponent.distance,raceKit(save));player.window=currentOpponent.window;player.surface=currentOpponent.surface;rival=duelRace?duelCar():createCar(currentOpponent.levels,CARS[currentOpponent.car].drive,CARS[currentOpponent.car].id,currentOpponent.distance);if(duelRace&&!duelRace.opponent){rival.finished=true;rival.finishTime=0;rivalModel.visible=false;}rival.surface=currentOpponent.surface;player.ridge=rival.ridge=TRACKS[map].bonus;player.ridgeObstacles=rival.ridgeObstacles=world.collisionBoxes||[];player.ridgePosts=rival.ridgePosts=world.posts||[];player.ridgeLane=player.ridge?0:-1.9;rival.ridgeLane=1.9;if(player.ridge){rivalModel.visible=!!currentOpponent.ridgeBattle;playerModel.position.x=0;if(currentOpponent.ridgeBattle)startBattle(player,rival,battleMatch.round);}player.rough=rival.rough=currentOpponent.rough||0;player.ride=Math.max(.05,(player.handling.ride??.5)-kitRidePenalty(save));playerModel.userData.ride=player.ride;rivalModel.userData.ride=rival.ride;raceScene.userData.start.position.z=-3;raceScene.userData.finish.position.z=-(player.raceDistance+3);raceScene.userData.tree.position.z=-6;for(const r of roadItems)r.obj.position.z=r.start;for(const p of particles){p.life=0;p.mesh.visible=false;}launchRpm=3200;countdown=3;$('#race-callout').hidden=false;$('#race-callout').classList.remove('launch');$('#race-callout strong').textContent='ГОТОВ?';$('#race-callout small').textContent=duelRace?.solo?duelRace.hint:player.ridge?'Легко — подруливай. Дальше — дрифт. Плавно лови машину.':currentOpponent.startAssist?'Старт автоматический · переключай в зелёном':'Тапни после отсчёта';$('#race-callout span').textContent=duelRace?.solo?'СТАВИШЬ ВРЕМЯ':player.ridge?(TRACKS[raceMap].id==='parking'?'4 ДУГИ · ПО 40 М':activeDriftBonus?'БОНУС · ОТ 800 ОЧКОВ':'ДРИФТ · '+DRIFT_TARGET+' ОЧКОВ'):'ТЫ СЛЕВА';$('#shift-label').textContent='СТАРТ';$('#shift-button').disabled=false;$('#shift-icon').textContent='↑';feedback(duelRace?.solo?'СОПЕРНИК ПОЕДЕТ ПОЗЖЕ · СТАВИШЬ ВРЕМЯ':duelRace?(duelRace.opponent?'ДУЭЛЬ · ЗАПИСЬ ИГРОКА':'КВАЛИФИКАЦИЯ'):currentOpponent.surface<1?'МОКРАЯ ТРАССА':currentOpponent.distance+' МЕТРОВ');$('.race-distance').textContent=currentOpponent.distance+' М';// Форма честно показана в шапке заезда: человек должен понимать, почему соперник вдруг злее.
 $('.race-top .tiny-label').textContent=duelRace?'ДУЭЛЬ':currentOpponent.formBoost?'В ФОРМЕ · СОПЕРНИК ЗЛЕЕ НА '+Math.round(currentOpponent.formBoost*100)+'%':currentOpponent.requiredPerfect?'ЦЕЛЬ: '+currentOpponent.requiredPerfect+' ИДЕАЛЬНЫХ':currentOpponent.beat||'ЗАЕЗД';$('.race-top h2').textContent=currentOpponent.name+(currentOpponent.boss?' ♛':'');resize();updateDashboard();warming=true;$('#shift-button').disabled=true;try{await renderer.compileAsync(raceScene,raceCamera);}finally{warming=false;$('#shift-button').disabled=false;quality.reset();}// Заставка: боссы и главари всегда, знакомые соперники — только при первой встрече (в первом районе); дальше они уже свои.
 /* Знакомство показываем при каждой встрече с корешем, не только при первой: портреты теперь живые,
 а кикер у возвращения свой («ВЫЗОВ · банда»). Повтор того же этапа в одной сессии заставку не повторяет. */
 pendingIntro=!duelRace&&!practiceMode&&(currentOpponent.captain||currentOpponent.rival)&&!introShown.has(currentOpponent.id)?currentOpponent:null;if(!duelRace&&!player.ridge)await eventUI?.start(practiceMode);}
async function goGarage(){if(sceneTransition.busy)return;await closeDialog($('#result-dialog'));return sceneTransition.run(()=>performGoGarage());}
function performGoGarage(){loadInviteState();gasHeld=false;raceOrbit=0;orbitDrag=null;finishIntro();customizer?.close();resetFinishFilm();$('#race-callout').classList.remove('launch');phase='idle';screen='garage';driftHUD.hide();$('#profile-button').disabled=false;renderer.toneMappingExposure=GARAGE_EXPOSURE;quality.reset();$('#result-dialog').close();$('#game').dataset.screen='garage';$('#screen-title').textContent='ГАРАЖ';$('#garage-screen').hidden=false;$('#race-screen').hidden=true;$('#garage-canvas').append(renderer.domElement);renderGarageUI();placeGarageCar();resize();updateAudio();showCarReveals().then(showUnlockHint);}
// One «Новое» card per garage visit, never on top of a lesson or another overlay.
const carReveal=bindCarReveal({root:$('#car-reveal'),sfx,haptics,reducedMotion});
// Новая машина показывается во весь экран один раз, при возвращении в гараж: в отчёте о заезде
// на неё не смотрят, а здесь она уже стоит рядом.
async function showCarReveals(){
 for(const i of pendingReveals(save)){
  if(onboarding.active||document.querySelector('dialog[open]'))return;
  await carReveal.show(i,effectiveLevels(save,i));
  markCarRevealed(save,i);persist();
 }
}
function showUnlockHint(){if(onboarding.active||!$('#celebration').hidden||document.querySelector('dialog[open]'))return;const [next]=pendingCards(save);if(!next)return;$('#celebration').classList.add('unlock');showCelebration(unlockCardMarkup(next),()=>{$('#celebration').classList.remove('unlock');markSeen(save,next.id);persist();});}
bindEarnedCrates({element:$('#result-loot'),resultDialog:$('#result-dialog'),getResult:()=>lastRaceResult,openCrate:(id,options)=>metaUI.openCrate(id,options),backFocus:$('#result-garage')});
const carLevelUp=bindCarLevelUp({root:$('#car-levelup'),sfx,haptics,reducedMotion,punch(){
 // Свет в гараже бьёт ярче, камера коротко подаётся к машине — это один и тот же кадр, а не оверлей поверх пустоты.
 levelPunch=1;const sun=garageScene?.userData?.sun;if(sun){const base=sun.intensity;sun.intensity=base*2.4;setTimeout(()=>{sun.intensity=base;garageDirty=true;},420);}
 garageDirty=true;
}});
// Волна апгрейда живёт в самой сцене: свой свет и свой рывок камеры, как у уровня машины.
const garageUpgradeFx=bindGarageUpgrade({THREE,getScene:()=>garageScene,markDirty(){garageDirty=true;},sfx,haptics,reducedMotion,punch(){
 levelPunch=1;const sun=garageScene?.userData?.sun;if(sun){const base=sun.intensity;sun.intensity=base*2.8;setTimeout(()=>{sun.intensity=base;garageDirty=true;},520);}
 garageDirty=true;
}});
// Окно уровня: что машина умеет сейчас, что даст следующий уровень, откуда берутся чертежи и
// кнопка прокачки. Раньше всё это жило в подсказке к плашке, и человек видел только счётчик.
// Окно уровня собрано по образцу гаражного: строка «что сейчас → что станет», одно условие
// и одна кнопка. Уровень — это потолок машины, а не мощь, и таблица говорит об этом без абзацев.
function renderCarLevelDialog(){
 const unlockCost=SHARD_COSTS[save.selected]||0,p=carLevelProgress(save,save.selected,unlockCost);
 const rarity=level=>(RARITIES[carUpgradeRarity(level)]?.name||'').toLowerCase().replace(/ая$/,'ой');
 const next=p.max?null:p.level+1;
 $('#car-level-car').textContent=CARS[save.selected].name+' · УР. '+p.level+(p.max?' · МАКС':'');
 $('#car-level-perks').innerHTML=[
  ['Ранг деталей до',carRankCap(p.level),next?carRankCap(next):''],
  ['Апгрейды до',rarity(p.level),next?rarity(next):''],
  ['Чертежи',p.max?'—':Math.min(p.current,p.needed)+' / '+p.needed,''],
 ].map(([name,now,soon])=>`<li><span>${name}</span><b>${now}</b>${soon?`<i>→ ${soon}</i>`:''}</li>`).join('');
 $('#car-level-need').textContent=p.max?'Машина на пределе — дальше некуда.':p.ready?'':'Ещё '+(p.needed-p.current)+' '+blueprintWord(p.needed-p.current)+' — и уровень твой.';
 const button=$('#car-level-up');
 button.hidden=p.max;
 // Уровень машины покупается чертежами, поэтому вместо цены в рублях — счёт чертежей.
 if(p.ready)upgradeButton(button,{label:'УР. '+(next||p.level),meta:'◆ '+p.needed+' чертежей'});
 else upgradeButton(button,{state:'short',label:'◆ '+Math.min(p.current,p.needed)+' / '+p.needed,
  note:'нужно ещё '+(p.needed-p.current)});
 $('#car-level-source').innerHTML='Чертежи этой машины капают за победы на ней: рядовой — 1, главарь — 2, босс — 3.<br>Чужие чертежи дают главари районов, и уходят они в следующую машину коллекции — не сюда.';
}
$('#custom-level').onclick=()=>{if(screen==='garage'&&!sceneTransition.busy){renderCarLevelDialog();openDialog($('#car-level-dialog'));}};
$('#car-level').onclick=()=>{
 if(!ready||screen!=='garage'||sceneTransition.busy)return;
 renderCarLevelDialog();openDialog($('#car-level-dialog'));
};
$('#car-level-close').onclick=()=>closeDialog($('#car-level-dialog'));
$('#car-level-dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog($('#car-level-dialog'));});
$('#car-level-up').onclick=async()=>{
 const unlockCost=SHARD_COSTS[save.selected]||0,before=carLevelProgress(save,save.selected,unlockCost);
 if(before.max||!before.ready)return;
 const up=levelUpCar(save,save.selected,unlockCost);
 if(!up)return;
 await closeDialog($('#car-level-dialog'));
 persist();renderGarageUI();customizer?.refresh();
 track('car_level_up',{car:CARS[save.selected].id,level:up.level,rankCap:up.rankCap});
 await carLevelUp.show({level:up.level,name:CARS[save.selected].name,rankCap:up.rankCap,
  lines:levelUpLines({level:up.level,rankCap:up.rankCap,upgradeRarity:up.upgradeRarity,rarityName:RARITIES[up.upgradeRarity]?.name})});
};
$('#nitro-button').onclick=e=>{
 e.stopPropagation();
 if(phase!=='running'||!player||!fireNitro(player))return;
 // Свой звук и своя отдача: баллон должно быть слышно и чувствоваться.
 sfx('nitro');haptics('nitro');feedback('НИТРО!','#8fe3ff');shake=Math.max(shake,.24);
 track('nitro_fired',{tier:player.nitro,left:+player.nitroLeft.toFixed(2),speed:Math.round(player.speed*3.6)});
 updateNitro();
};
$('#challenge-button').onclick=async()=>{
 if(!ready||sceneTransition.busy||screen!=='garage')return;
 await challengeUI.open();refreshChallengeBadge();
};
// Бейдж над кнопкой «Стрелка»: сколько вызовов ждут моего заезда. Считаем по списку с сервера при входе
// и после каждого визита в стрелки; бейдж рисует общая система пометок по data-incoming.
async function refreshChallengeBadge(){
 try{const n=waitingCount(await challengeApi.list());$('#challenge-button').dataset.incoming=String(n);$('#challenge-button').classList.toggle('has-incoming',n>0);}
 catch{/* нет сети или входа — бейджа нет */}
}
$('#race-button').onclick=()=>metaUI.open('rivals');$('#quit-race').onclick=goGarage;$('#result-garage').onclick=goGarage;$('#result-practice').onclick=async()=>{if(sceneTransition.busy||$('#result-practice').hidden||practiceMode||duelRace||phase!=='finished')return;await closeDialog($('#result-dialog'));await goRace(true);};$('#race-again').onclick=async()=>{if(sceneTransition.busy)return;/* подмена: следующий заезд прямо отсюда, мимо гаража; после обрыва — досылка того же */if(duelRace?.loaner){if(loanerUnsent){const {inputs,shifts}=loanerUnsent;$('#result-kicker').textContent='ПОДМЕНА · ПРОВЕРЯЕМ ФИНИШ';await sendLoanerRun(inputs,shifts);return;}await closeDialog($('#result-dialog'));await loanerNext();return;}const challenge=duelRace?.challenge;await closeDialog($('#result-dialog'));if(challenge){await goGarage();if(challenge.role==='a'){await callMates(challenge.id);await challengeUI.open();return;}try{const r=await challengeApi.rematch(challenge.id);await createChallenge({rivalId:r.rivalId,parentId:r.parentId});}catch(e){toast(e.message);await challengeUI.open();}return;}if(duelRace){await goGarage();duelUI.open();}else {const next=player?.ridgeBattle&&battleMatch?.rounds.length===1?Object.assign(battleMatch,{round:2}):!!player?.ridgeBattle;await goRace(practiceMode,player?.overpass&&practiceMode?{overpass:currentOpponent.district}:raceMap,null,next,activeDriftBonus);}};$('#result-dialog').addEventListener('cancel',e=>{e.preventDefault();goGarage();});
// Выбор форы с экрана финиша: сохраняем на сервере и сразу открываем шторку приглашения.
$('#result-loot').addEventListener('click',async e=>{const b=e.target.closest('[data-handicap]');if(!b||sceneTransition.busy)return;const challenge=duelRace?.challenge;if(!challenge||challenge.role!=='a')return;
 for(const x of $('#result-loot').querySelectorAll('[data-handicap]'))x.disabled=true;b.classList.add('picked');
 try{await challengeApi.handicap(challenge.id,b.dataset.handicap);track('challenge_handicap',{id:challenge.id,level:b.dataset.handicap});
  await closeDialog($('#result-dialog'));await goGarage();
  await callMates(challenge.id);
  await askWriteAccess();await challengeUI.open();}
 catch(err){toast(err.message);for(const x of $('#result-loot').querySelectorAll('[data-handicap]'))x.disabled=false;b.classList.remove('picked');}});
function beginLaunch(){if(phase!=='launch')return;if(duelRace){if(!duelInputs.length)duelInputs.push(duelFrame);phase='running';$('#race-callout').classList.remove('launch');$('#shift-label').textContent='ПЕРЕКЛЮЧИТЬ';feedback(duelFrame*DUEL.step<=.24?'ЧЁТКИЙ СТАРТ!':'ПОЕХАЛИ!');sfx('launch');return;}phase='running';player.time=launchElapsed;if(player.ridgeBattle){launch(rival,launchRpmFor(rival));rival.time=launchElapsed;}const fast=player.ridge||currentOpponent.startAssist||launchElapsed<=currentOpponent.launchPerfect;launch(player,launchRpmFor(player)-(fast?0:launchElapsed<currentOpponent.launchAuto*.85?1200:2200)*(player.redline-1000)/6500);shake=.17;sfx('launch');$('#race-callout').classList.remove('launch');$('#race-callout strong').textContent=fast?'ЧЁТКИЙ СТАРТ!':'ПОЕХАЛИ!';$('#shift-label').textContent='ПЕРЕКЛЮЧИТЬ';$('#shift-icon').textContent='↑';feedback(player.ridge?'ГАЗ АВТО · ТЯНИ БЕГУНОК':fast?'ЧЁТКИЙ СТАРТ!':'ПОЕХАЛИ!');haptics('launch');if(player.ridge){$('#race-callout strong').textContent='ДЕРЖИ РИТМ';$('#shift-label').textContent='ДРИФТ';}}
function controlDown(){if(onboarding.active)return;if(!ready||warming||sceneTransition.busy||screen!=='race'||$('#result-dialog').open)return;if(introActive){skipIntro();return;}ensureAudio();if(phase==='ready'){phase='countdown';countdown=3;$('#shift-button').disabled=true;$('#shift-label').textContent='3';$('#shift-icon').textContent='';sfx('tick');}else if(phase==='launch')beginLaunch();else if(phase==='coasting'&&!reducedMotion&&coastElapsed>1){coastElapsed=FINISH_FILM_DURATION;}else if(phase==='running'){if(player.ridge||player.overpass){return;}if(duelRace){if(!player.finished&&player.gear<player.maxGear&&duelInputs.at(-1)!==duelFrame&&duelInputs.length<7)duelInputs.push(duelFrame);return;}const q=shift(player);if(q){shake=q==='perfect'?(player.nitroShot?.38:.30):.19;feedback(q==='perfect'?(player.nitroShot?'НИТРО ×'+player.combo:'ИДЕАЛЬНО ×'+player.combo):q==='good'?'ХОРОШО':'МИМО',q==='perfect'?(player.nitroShot?'#8fe3ff':'#c7e792'):q==='good'?'#ddceab':'#e39373');sfx(q==='perfect'?'perfect':'shift');haptics(player.nitroShot&&q==='perfect'?'nitro':q);}}}
function controlUp(){gasHeld=false;ridgeControls.reset();}
const shiftBtn=$('#shift-button');shiftBtn.addEventListener('pointerdown',e=>{e.preventDefault();shiftBtn.setPointerCapture(e.pointerId);controlDown();});for(const name of ['pointerup','pointercancel','lostpointercapture'])shiftBtn.addEventListener(name,controlUp);shiftBtn.addEventListener('click',e=>{if(e.detail===0){controlDown();}});document.addEventListener('keydown',e=>{if(!$('#result-dialog').open&&ridgeControls.key(e.code,true)){e.preventDefault();return;}if(e.code==='Space'&&screen==='race'&&!e.repeat&&!$('#result-dialog').open){e.preventDefault();controlDown();}});document.addEventListener('keyup',e=>{if(ridgeControls.key(e.code,false))e.preventDefault();if(e.code==='Space')controlUp();});window.addEventListener('blur',controlUp);document.addEventListener('visibilitychange',()=>{controlUp();last=0;});

const ridgeControls=new RidgeControls(()=>({player,rival,phase,screen}),()=>controlDown());
let lastDriftMode='grip';
function updateNitro(){
 const button=$('#nitro-button');if(!button)return;
 const tank=player?.nitro>0?nitroTank(player.nitro):0;
 button.hidden=!tank||!!player?.ridge||!!player?.overpass;
 if(button.hidden)return;
 const left=Math.max(0,player.nitroLeft||0);
 $('#nitro-tank').style.width=(tank?Math.round(left/tank*100):0)+'%';
 button.classList.toggle('burning',!!player.nitroActive);
 button.disabled=left<=0||phase!=='running';
}
function updateDashboard(){if(player?.overpass){updateOverpassHUD();return;}updateNitro();driftHUD.update(player,rival,phase);const drift=!!player.ridge;$('.gear>span').textContent=drift?'УГОЛ':'ПЕРЕДАЧА';$('.time>span').textContent=drift?(TRACKS[raceMap].id==='parking'?'ЦЕЛЬ 4 ДУГИ':'ЦЕЛЬ '+(activeDriftBonus?([800,2000,4000].find(n=>n>=(player.drift?.score||0))||4000):DRIFT_TARGET)):'СЕК';$('#opponent-marker').hidden=drift;$('#speed').textContent=Math.floor(player.speed*3.6);$('#time').textContent=(player.finished?player.finishTime:player.time).toFixed(2);$('#gear').textContent=['ready','countdown','launch'].includes(phase)?'N':player.gear+' / '+player.maxGear;const rpm=['countdown','launch'].includes(phase)?launchRpm:player.rpm;$('#rpm-needle').style.left=clamp((rpm-1000)/(player.redline-1000)*100,0,99)+'%';$('#rpm-value').textContent=fmt(rpm)+' ОБ/МИН';$('#player-marker').style.left=clamp(player.distance/player.raceDistance*98,0,98)+'%';$('#opponent-marker').style.left=clamp(rival.distance/player.raceDistance*98,0,98)+'%';const [lo,hi]=shiftZone(player);$('.perfect-zone').style.left=((lo-1000)/(player.redline-1000)*100)+'%';$('.perfect-zone').style.width=((hi-lo)/(player.redline-1000)*100)+'%';$('.rpm-track').classList.toggle('hot',player.heat>.5);if(phase==='running'&&!drift){$('#shift-button').disabled=player.gear>=player.maxGear||!!(player.ridge&&player.braking);$('#shift-label').textContent=player.ridge&&player.braking?'ПЕРЕДАЧИ ВНИЗ · АВТО':player.gear>=player.maxGear?'ДО ФИНИША':'ПЕРЕКЛЮЧИТЬ';}const labels=document.querySelectorAll('.rpm-labels>span');labels.forEach((el,i)=>el.textContent=i===3?(player.redline/1000).toFixed(1)+' ×1000':Math.round((1000+(player.redline-1000)*i/3)/1000));if(drift){const d=driftState(player);
  // Момент срыва в занос отдаём в руку: по экрану его видно позже, чем чувствуется.
  if(d.mode!==lastDriftMode){if(d.mode==='slide'&&phase==='running')haptics('drift-enter');lastDriftMode=d.mode;}
  $('#gear').textContent=(d.angle<-.04?'← ':d.angle>.04?'→ ':'')+Math.round(Math.abs(d.angle)*180/Math.PI)+'°';$('#time').textContent=fmt(Math.floor(d.score+d.pending));}if(player.ridgeBattle){$('.time>span').textContent='ТЫ / РЫЖИЙ · '+battleMatch.round+'/2';$('#time').textContent=fmt(battleScore(player))+' / '+fmt(battleScore(rival));$('#opponent-marker').hidden=false;}ridgeControls.update();}
// Full-screen celebration for district, championship and car unlocks; a tap or a timer hands over to the result card.
function showCelebration(html,done){const el=$('#celebration');el.querySelector('.celebration-card').innerHTML=html;el.hidden=false;let finished=false;const finish=()=>{if(finished)return;finished=true;clearTimeout(timer);el.hidden=true;el.onclick=null;done();};const timer=setTimeout(finish,reducedMotion?3500:7000);el.onclick=finish;}
// Captain and boss intro: name plate, taunt and a camera pass along the rival's car before the countdown.
let introActive=false,introElapsed=0,introTotal=0,introResolve=null,pendingIntro=null,introCleanup=null;const introShown=new Set();
const telemetry=setupTelemetry(),attemptCounts=new Map();
// Analytics context for every event: where the player is and what they drive (docs/telemetry-schema.md).
const BUILD=([...document.scripts].map(x=>x.src).find(x=>/game\.js/.test(x))||'').split('v=')[1]||'';let racesThisSession=0;
bindAnalytics(SANDBOX?()=>{}:telemetry.send,()=>({rank:save.rank,cash:save.cash,scrap:save.scrap,hard:save.hard,garage:save.garage,car:CARS[save.selected]?.id,power:rating(effectiveLevels(save),CARS[save.selected].id),screen,fps:quality?.level??null,build:BUILD,session:telemetry.runId,profile:profiles.current()||null}));
track('session',{phase:'start',rankStart:save.rank});addEventListener('pagehide',()=>track('session',{phase:'end',seconds:Math.round(performance.now()/1000),races:racesThisSession}));
// Two unhurried shots of the rival's car: a low front three-quarter dolly, then a high rear three-quarter
// push-in, and a soft return to the race view. Long lens, distance kept so the body never clips.
function bossIntroCamera(t,total){if(!rivalModel||!raceCamera)return;const L=rivalModel.userData.carLength||4,x=rivalModel.position.x,z=rivalModel.position.z,ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);},lerp=(a,b,k)=>a+(b-a)*k;
 const backTime=.7,shots=total-backTime,cut=.5,back=ease((t-shots)/backTime);let pos,look,fov;
 if(t<shots*cut){const k=ease(t/(shots*cut));pos={x:x+lerp(5.2,6.0,k),y:lerp(1.05,.85,k),z:z-L/2-lerp(5.0,-0.5,k)};look={x,y:.55,z:z-lerp(.6,0,k)};fov=30;}
 else{const k=ease((t-shots*cut)/(shots*(1-cut)));pos={x:x+lerp(3.6,2.6,k),y:lerp(2.6,2.1,k),z:z+L/2+lerp(6.0,3.8,k)};look={x,y:.7,z:z+lerp(.4,0,k)};fov=lerp(30,34,k);}
 raceCamera.position.set(lerp(pos.x,raceView.x,back),lerp(pos.y,raceView.y,back),lerp(pos.z,raceView.z,back));raceCamera.up.set(0,1,0);raceCamera.lookAt(lerp(look.x,raceAim.x,back),lerp(look.y,raceAim.y,back),lerp(look.z,raceAim.z,back));raceCamera.fov=lerp(fov,raceView.fov,back);raceCamera.updateProjectionMatrix();}
// Портрет грузится только когда он нужен, и только если он у персонажа есть: без него заставка
// выглядит как раньше. Класс снимается и ставится заново, иначе анимация выхода не перезапустится.
// Портрет живой: та же картинка на сетке, дышит, моргает, шевелит губами под реплику (live-portrait.js).
// Без рига или без WebGL он тихо остаётся обычной картинкой. Экземпляр гасим в finishIntro.
let livePortrait=null,introParallax=null,introFaceClear=null;
function showIntroPortrait(name,line=''){
 const el=$('#boss-intro'),box=$('#intro-portrait'),src=portraitFor(name);
 el.classList.remove('with-portrait');
 livePortrait?.destroy();livePortrait=null;introFaceClear?.();introFaceClear=null;
 if(!src){box.hidden=true;box.replaceChildren();return;}
 box.hidden=false;
 const canvas=document.createElement('canvas');box.replaceChildren(canvas);
 livePortrait=createLivePortrait(canvas,{src,rig:PORTRAIT_RIGS[characterFor(name)?.portrait],anchor:'bottom'}).start();
 livePortrait.say(Math.min(4,1.2+line.length/16));
 // Кадры портретов разные, поэтому лицо опускаем под облако по факту, а не на глаз.
 const clear=()=>keepFaceClear(livePortrait,box,$('#intro-bubble'));
 requestAnimationFrame(()=>requestAnimationFrame(clear));setTimeout(clear,400);addEventListener('resize',clear);
 introFaceClear=()=>removeEventListener('resize',clear);
 void el.offsetWidth;el.classList.add('with-portrait');
}
// Заставка идёт в два шага: сначала человек и его реплика, потом его машина. Тап переводит на следующий шаг,
// а если игрок не трогает экран — шаги сменяются сами.
function runBossIntro(opp){return new Promise(resolve=>{const el=$('#boss-intro');
 $('#intro-kicker').textContent=opp.boss?'БОСС РАЙОНА · '+TRACKS[opp.map].name:opp.captain?'ГЛАВАРЬ · '+CREWS[opp.series].toUpperCase():'ВЫЗОВ · '+(opp.rival?.visit===1?'ПЕРВАЯ ВСТРЕЧА':CREWS[opp.series].toUpperCase());
 $('#intro-name').textContent=opp.name;
 $('#intro-role').textContent=characterFor(opp.name)?.role||'';
 $('#intro-car-name').textContent=CARS[opp.car].name;
 // Сравнение силы — главная цифра этого экрана, поэтому это плашка, а не строка текста:
 // слева его тачка, справа твоя, сильная сторона подсвечена.
 {const his=Math.round(rating(opp.levels,CARS[opp.car].id)),mine=Math.round(rating(effectiveLevels(save),CARS[save.selected].id));
  const side=(name,power,win)=>`<span class="power-side${win?' lead':''}"><b>${name}</b><em>${power}</em></span>`;
  $('#intro-cars').innerHTML=side(CARS[opp.car].name,his,his>mine)+'<i class="power-vs">мощь</i>'+side(CARS[save.selected].name,mine,mine>his);}
 const taunt=lineFor(opp.name)||tauntFor(opp.name)||PLACEHOLDER_TAUNT;
 $('#intro-taunt').textContent='«'+taunt+'»';
 showIntroPortrait(opp.name,taunt);
 buildAtmosphere(el.querySelector('.intro-fx'),el.querySelector('.intro-dust'));/* пересобираем каждый раз: разброс частиц не повторяется */
 el.dataset.step='1';$('#race-callout').hidden=true;el.hidden=false;introParallax?.();introParallax=attachParallax(el);
 introActive=true;introStep=1;introElapsed=0;introTotal=introStepLength(1,opp);introResolve=resolve;
 // В вебвью Телеграма click по обычному блоку долетает не всегда, а pointerdown срабатывает
 // сразу и на палец, и на мышь. Слушаем на перехвате, чтобы дети заставки его не съели.
 const tap=()=>skipIntro();el.onclick=tap;el.addEventListener('pointerdown',tap,{capture:true});
 introCleanup=()=>el.removeEventListener('pointerdown',tap,{capture:true});});}
function introStepLength(step,opp){
 // Первый шаг ждёт тапа: это знакомство, торопить его нечем. Но не вечно — если тап почему-то
 // не долетел, заставка обязана уйти сама, а не запереть игрока перед заездом.
 if(step===1)return reducedMotion?6:14;
 return reducedMotion?1.4:3;
}
function advanceIntro(){
 if(introStep===1){introStep=2;introElapsed=0;introTotal=introStepLength(2);$('#boss-intro').dataset.step='2';return true;}
 return false;
}
function skipIntro(){
 if(!introActive)return;
 // Тап значит «дальше» — сразу в заезд. Второй кадр (фон уходит, табличка уезжает, портрет
 // остаётся поверх трассы) задуман как проезд камеры и остаётся только для тех, кто не тапнул.
 // Сразу после нажатия он читался поломкой: «всё исчезло, кроме портрета над машиной».
 finishIntro();
}
function finishIntro(){if(!introActive)return;introCleanup?.();introCleanup=null;introActive=false;introStep=1;livePortrait?.destroy();livePortrait=null;introParallax?.();introParallax=null;$('#boss-intro').hidden=true;$('#boss-intro').onclick=null;$('#race-callout').hidden=false;const r=introResolve;introResolve=null;r?.();}
// Экран реплики: портрет, имя и фраза на фоне исхода. Тап по экрану или «Дальше» ведёт к результату;
// если человек не трогает экран — уходит сам.
function showRivalLine(line){return new Promise(resolve=>{if(!line)return resolve();const el=$('#rival-line');el.dataset.outcome=line.won?'win':'lose';$('#line-kicker').textContent=line.kicker;$('#line-name').textContent=line.name;$('#line-role').textContent=line.role;$('#line-text').textContent='«'+line.text+'»';const img=$('#line-portrait');if(line.portrait){img.hidden=false;img.src=line.portrait;img.alt=line.name;}else{img.hidden=true;img.removeAttribute('src');}el.hidden=false;let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);el.hidden=true;el.onclick=null;resolve();};const timer=setTimeout(finish,reducedMotion?5000:9000);el.onclick=finish;});}
function settleBattle(){
 if(settled)return;settled=true;phase=player.crashed?'crashed':'finished';gasHeld=false;ridgeControls.reset();resetFinishFilm();$('#race-callout').hidden=true;
 const round=recordBattleRound(battleMatch,player,rival),complete=battleMatch.rounds.length===2,totals=battleMatch.totals,won=totals[0]>totals[1],draw=totals[0]===totals[1];
 // One reward for a completed pair, never for the intermediate result or an abandoned match.
 finishPresentation.result({mode:'battle',score:totals[0],opponentScore:totals[1],crashed:!complete&&!!player.crashed});
 const result=complete&&totals[0]>0?rewardRace(save,{won,perfect:0,opp:currentOpponent,time:player.finishTime||player.time,rivalTime:rival?.finishTime||null}):{cash:0};lastRaceResult=complete?result:null;if(complete)persist();$('#cash').textContent=fmt(save.cash);$('#hard').textContent=fmt(save.hard);$('#scrap').textContent=fmt(save.scrap);
 $('#result-dialog').dataset.tier='race';$('#result-dialog').dataset.ridgeCrash='true';$('#result-dialog').dataset.driftResult='true';$('#result-kicker').textContent='ПАРНЫЙ ДРИФТ · '+(complete?'ИТОГ ДВУХ ЗАЕЗДОВ':'ЗАЕЗД 1 / 2');$('#result-title').textContent=complete?(draw?'НИЧЬЯ':won?'ТЫ ВЫИГРАЛ!':'РЫЖИЙ ВЫИГРАЛ'):'МЕНЯЕМСЯ МЕСТАМИ';
 $('.result-times>div:first-child>span').textContent='ТВОИ ОЧКИ';$('.result-times>div:last-child>span').textContent='РЫЖИЙ';$('#result-time').textContent=fmt(totals[0]);$('#rival-time').textContent=fmt(totals[1]);$('#reward').textContent=complete?'+'+fmt(result.cash)+' ₽':'';$('#race-again').textContent=complete?'ЕЩЁ ПАРУ':'ВТОРОЙ ЗАЕЗД · ТЫ ВПЕРЕДИ';$('#result-practice').hidden=true;
 $('#result-comment').textContent=complete?'Очки за чистые дуги и дрифт рядом. Глубже угол — ниже скорость.':(player.crashed?'Вылет обнулил этот проезд. ':rival.crashed?'Рыжий вылетел. ':'')+'Теперь ты ведущий. Набирай очки в поворотах, защищай линию.';
 $('#result-shifts').textContent=battleMatch.rounds.map((r,i)=>(i+1)+': '+fmt(r.scores[0])+' / '+fmt(r.scores[1])+(r.crashed[0]?' · твой вылет':r.crashed[1]?' · вылет Рыжего':'')).join(' · ');$('#result-loot').innerHTML=complete&&totals[0]>0?raceLootMarkup(result):'';$('#result-event').textContent='';sfx(complete&&won?'win':'shift');openDialog($('#result-dialog'));
}

function settleDrift(){
 if(settled)return;settled=true;phase='finished';gasHeld=false;ridgeControls.reset();$('#race-callout').hidden=true;delete $('#game').dataset.raceFilm;delete $('#game').dataset.raceShot;
 const target=activeDriftBonus?800:DRIFT_TARGET,stage=false,parking=TRACKS[raceMap].id==='parking',d=driftState(player),score=Math.floor(d.score),won=parking?parkingCompleted(player)===4:score>=target,record=writeDriftRecord(score,globalThis.localStorage,TRACKS[raceMap].id);
 finishPresentation.result({mode:'drift',time:player.finishTime,score});
 const bonus=activeDriftBonus,result=bonus?rewardDriftBonus(save,bonus,score,{finished:true}):rewardDriftPractice(save,score);if(result.claimed)activeDriftBonus=null;persist();lastRaceResult=result;racesThisSession++;track('drift',{track:TRACKS[raceMap].id,score,target,won,metres:Math.round(d.metres||0),bestChain:d.bestChain||0,bestAngle:Math.round(d.bestAngle||0),broken:!!d.broken,bonus:!!bonus,parking});
 $('#result-dialog').dataset.tier='race';$('#result-dialog').dataset.ridgeCrash='true';$('#result-dialog').dataset.driftResult='true';$('#result-kicker').textContent=stage?'ДРИФТ · ЭТАП КАМПАНИИ · ЦЕЛЬ '+target:TRACKS[raceMap].name+' · ДРИФТ';$('#result-title').textContent=stage&&won?'ЭТАП ПРОЙДЕН!':record.fresh&&won?'НОВЫЙ РЕКОРД!':won?'КРАСИВО ПОЛОЖИЛ!':'ЕЩЁ ОДНУ ПОПЫТКУ';
 $('.result-times>div:first-child>span').textContent='ТВОИ ОЧКИ';$('.result-times>div:last-child>span').textContent='РЕКОРД';$('#result-time').textContent=fmt(score);$('#rival-time').textContent=fmt(record.best);$('#reward').textContent='+'+fmt(result.cash)+' ₽';$('#race-again').textContent=stage&&won?'ДАЛЬШЕ':'ЕЩЁ ДРИФТ';$('#result-comment').textContent=won?(stage?'Дрифт засчитан, кампания идёт дальше.':'Цепляй повороты в серию и улучшай рекорд.'):'Цель — '+target+' очков. Тяни бегунок в сторону поворота; держи угол в зелёном.';$('#result-shifts').textContent=Math.round(d.metres)+' м в дрифте · '+d.bestChain+' в цепочке · '+Math.round(d.bestAngle)+'° максимум';if(parking){$('#result-title').textContent=won?'ВСЕ ДУГИ ВЗЯТЫ!':'ДУГИ: '+parkingCompleted(player)+' / 4';$('#result-comment').textContent='По 40 м дрифта в каждой отмеченной дуге. Вне жёлтого маршрута метры не считаются.';}if(bonus){$('#result-kicker').textContent='БОНУС ПОСЛЕ БОССА';$('#result-comment').textContent=result.claimed?result.tier+' · награда получена. Следующий бонус — после следующего босса.':'До награды — 800 очков. Бонус сохранён: попробуй ещё раз.';}$('#reward').textContent='';$('#result-loot').innerHTML=raceLootMarkup(result);$('#result-event').textContent='';openDialog($('#result-dialog'));
}
function settleRidgeCrash(){
 if(player.ridgeBattle){settleBattle();return;}
 if(settled)return;settled=true;phase='crashed';gasHeld=false;ridgeControls.reset();lastRaceResult=null;finishPresentation.result({crashed:true});track('crash',{track:TRACKS[raceMap].id,kind:'drift',distance:Math.floor(player.distance),time:+(player.time||0).toFixed(2)});
 $('#race-callout').hidden=true;$('#result-dialog').dataset.ridgeCrash='true';$('#result-dialog').dataset.tier='race';$('#result-kicker').textContent=TRACKS[raceMap].name+' · ВЫЛЕТ';$('#result-title').textContent='СЛЕТЕЛ С ТРАССЫ';$('#result-time').textContent='—';$('#rival-time').textContent=rival.finished?rival.finishTime.toFixed(2)+' с':'—';$('#reward').textContent='0 ₽';$('#race-again').textContent='ПОПРОБОВАТЬ ЕЩЁ';$('#result-comment').textContent='Тяни бегунок в сторону поворота. Держи угол в зелёном; к краям бегунка занос становится опаснее. Отпусти — машина выпрямится.';$('#result-shifts').textContent='Вылет на '+Math.floor(player.distance)+' м';$('#result-loot').innerHTML='';$('#result-event').textContent='';openDialog($('#result-dialog'));
}
function settle(){if(settled)return;if(player.ridgeBattle){settleBattle();return;}if(player.ridge){settleDrift();return;}if(duelRace?.loaner){settleLoaner();return;}if(duelRace?.challenge){settleChallenge();return;}if(duelRace){settleDuel();return;}settled=true;phase='finished';resetFinishFilm();finishPresentation.result({time:player.finishTime,opponentTime:rival.crashed?undefined:rival.finishTime});gasHeld=false;const clean=cleanRun(currentOpponent,player),won=(rival.crashed||player.finishTime<rival.finishTime)&&clean;const result=rewardRace(save,{won,perfect:player.perfect,opp:currentOpponent,time:player.finishTime,rivalTime:rival.crashed?null:rival.finishTime});lastRaceResult=result;persist();$('#cash').textContent=fmt(save.cash);$('#scrap').textContent=fmt(save.scrap);const tier=resultTier(result,save,won),headline=resultHeadline(tier,{result,save,won,clean,opponent:currentOpponent,player,rival,practice:practiceMode});$('#result-dialog').dataset.tier=tier;$('#result-kicker').textContent=headline.kicker;$('#result-title').textContent=headline.title;$('#result-time').textContent=player.finishTime.toFixed(2)+' с';$('#rival-time').textContent=rival.crashed?'ВЫЛЕТ':rival.finishTime.toFixed(2)+' с';$('#reward').textContent='+'+result.cash+' ₽';$('#race-again').textContent=practiceMode?'ЕЩЁ ТРЕНИРОВКА':result.fresh?(result.unlockedMap!==null?'НА НОВУЮ ТРАССУ':save.rank===CAMPAIGN_LENGTH?'РЕВАНШ С ЧЕМПИОНОМ':'СЛЕДУЮЩИЙ СОПЕРНИК'):'РЕВАНШ';$('#result-practice').hidden=won||practiceMode;$('#result-comment').textContent=headline.comment;$('#result-shifts').textContent='Идеальные переключения: '+player.perfect+(player.ridge?'':' / '+(player.maxGear-1));let lines=[];if(result.unlockedMap!==null)lines.push('<b>НОВАЯ ТРАССА: '+TRACKS[result.unlockedMap].name+'</b>');if(result.fresh)lines.push(save.rank<CAMPAIGN_LENGTH?'Следующий: '+opponent(save).name:'Все 225 заездов пройдены');$('#hard').textContent=fmt(save.hard);result.details='<div class=finish-details>'+lines.join('<br>')+'</div>';$('#reward').textContent='';$('#result-loot').innerHTML=raceLootMarkup(result)+result.details;offerInvite({won,record:!!result.record,crates:(result.crates||[]).length});const celebrate=tier==='district'||tier==='champion'||(won&&!!result.carShard?.unlocked);const openResult=()=>{if(celebrate)showCelebration(celebrationMarkup(tier,{result,save,opponent:currentOpponent}),()=>openDialog($('#result-dialog')));else openDialog($('#result-dialog'));};$('#result-dialog').dataset.outcome=won?'win':'lose';/* слово соперника — после карточки места и до цифр: боссы и знакомые отзываются на исход, каждый один раз (settle() обязан оставаться одной строкой: check-result-practice режет его регуляркой) */const line=lineOnce(save,currentOpponent,won,{practice:practiceMode,duel:!!duelRace});if(line){persist();showRivalLine(line).then(openResult);}else openResult();if(FEATURES.event&&save.rank>=SOCIAL_RANK)eventUI?.finish({won,perfect:player.perfect,time:player.finishTime});/* the event joins in after the first garage window */const attempt=(attemptCounts.get(currentOpponent.id)||0)+1;attemptCounts.set(currentOpponent.id,attempt);racesThisSession++;track('race',{stage:currentOpponent.id,kind:practiceMode?'training':'campaign',beat:currentOpponent.beat,captain:!!currentOpponent.captain,boss:!!currentOpponent.boss,opponent:currentOpponent.name,opponentCar:CARS[currentOpponent.car].id,opponentPower:rating(currentOpponent.levels,CARS[currentOpponent.car].id),distance:currentOpponent.distance,track:TRACKS[raceMap]?.id,look:currentOpponent.look?.look||null,wet:currentOpponent.surface<1,rough:!!currentOpponent.rough,won,fresh:!!result.fresh,tier,time:+player.finishTime.toFixed(3),rivalTime:+rival.finishTime.toFixed(3),margin:+(rival.finishTime-player.finishTime).toFixed(3),perfect:player.perfect,good:player.good,missed:player.missed,required:currentOpponent.requiredPerfect||0,attempt,launch:player.launchLog||null,shifts:player.shiftLog||[],equipped:{...save.equipped[save.selected]},drop:result.drop?.id||null});sfx(tier==='race'?(won?'win':'shift'):tier==='series'?'fanfare':'fanfare-long');}
function tickDuelRace(dt){
 duelAccumulator+=dt;
 while(duelAccumulator>=DUEL.step&&duelFrame<DUEL.maxSteps){
  // Подмена стартует сама: новичку оставлены только передачи (docs/loaner-invite.md, раздел 5).
  if(!duelInputs.length&&(duelFrame===DUEL.launchSteps||duelRace.autoLaunch&&duelFrame===LOANER_RULES.launchFrame))beginLaunch();
  const oldGear=player.gear;duelStep(player,duelFrame,duelInputs);
  if(duelRace.opponent)duelStep(rival,duelFrame,duelRace.opponent.inputs);
  if(player.gear!==oldGear){shake=.22;feedback(player.combo?'ИДЕАЛЬНО ×'+player.combo:'ПЕРЕКЛЮЧЕНО');sfx(player.combo?'perfect':'shift');}
  duelFrame++;duelAccumulator-=DUEL.step;
 }
 if(player.finished)tickCoast(player,dt);if(rival.finished)tickCoast(rival,dt);
}
// Стрелка едет тем же заездом, что дуэль, поэтому здесь только своё: адрес отправки,
// две ветки результата и обязательный проход через прокачку для принявшего вызов.
let challengeShare=null;
async function settleChallenge(){
 settled=true;phase='finished';resetFinishFilm();gasHeld=false;lastRaceResult=null;
 const ch=duelRace.challenge,mine=ch.role==='a';
 challengeShare=null;
 finishPresentation.result({mode:'duel',time:player.finishTime});
 $('#result-dialog').dataset.tier='race';$('#result-kicker').textContent='СТРЕЛКА · ПРОВЕРЯЕМ ФИНИШ';$('#result-title').textContent='ФИНИШ';
 $('#result-time').textContent=player.finishTime.toFixed(2)+' с';
 $('#rival-time').textContent=mine?'—':(ch.rivalTime>0?ch.rivalTime.toFixed(2)+' с':'—');
 $('#reward').textContent='ПРОВЕРКА';$('#race-again').textContent=mine?'КИНУТЬ ССЫЛКУ':'ЕЩЁ РАЗ';
 $('#result-comment').textContent='Сохраняем старт и переключения';
 $('#result-shifts').textContent='Идеальные: '+player.perfect;
 $('#result-loot').innerHTML='';$('#result-event').hidden=true;
 openDialog($('#result-dialog'));
 try{
  const r=await challengeApi.run(ch.id,duelInputs);
  if(duelRace?.challenge?.id!==ch.id||!$('#result-dialog').open)return;
  if(mine){
   challengeShare={link:r.link,text:r.text,distance:ch.distance??duelRace?.distance??null,time:r.time,
    notified:r.notified||0,notifiedNames:r.notifiedNames||[]};
   // Вызов брошен — итога ещё нет. «1 место» здесь врёт: соперник даже не выезжал. Показываем,
   // кому ушёл вызов, и своё время одной строкой.
   $('#result-dialog').dataset.tier='sent';
   $('#result-kicker').textContent='ВЫЗОВ БРОШЕН';
   $('#result-title').textContent='ТВОЁ ВРЕМЯ · '+r.time.toFixed(2)+' с';
   $('#result-time').textContent=r.time.toFixed(2)+' с';
   // Фора сопернику выбирается здесь: вызывающий уже знает своё время. Три кнопки — и приглашение уходит.
   $('#result-loot').innerHTML=`<p class="handicap-lead">Отправь вызов корешу</p><div class="handicap-pick">${Object.entries(HANDICAP_LEVELS).map(([id,l])=>`<button data-handicap="${id}"><b>${l.name}</b><small>${l.hint}</small></button>`).join('')}</div>`+invitedMarkup(challengeCalled.names,challengeCalled.photos);
   $('#result-comment').textContent='Фора — дистанцией: сопернику короче, тебе полная. Кто не вывезет, тот и проиграл.';
   $('#reward').textContent='ВЫБЕРИ ФОРУ';
   finishPresentation.clear();
   sfx('shift');
   return;
  }
  const texts=r.won?RESULT_TEXTS.win:RESULT_TEXTS.lose;
  $('#result-kicker').textContent='СТРЕЛКА';
  $('#result-title').textContent=r.draw?'НИЧЬЯ':texts.title;
  $('#result-time').textContent=r.time.toFixed(2)+' с';
  $('#rival-time').textContent=r.rivalTime>0?r.rivalTime.toFixed(2)+' с':'—';
  $('#result-comment').textContent=r.draw?'Ровно. Ещё раз решит.':texts.line;
  // Победителю реванш не нужен — он зовёт ещё раз; проигравший берёт реванш. Обе кнопки заводят новую стрелку тому же.
  $('#race-again').textContent=r.won||r.draw?'ЕЩЁ РАЗ':'РЕВАНШ';
  $('#reward').textContent='';
  finishPresentation.result({mode:'duel',time:r.time,verified:true,place:r.won?1:2,draw:r.draw});
  sfx(r.won?'win':'shift');
  await claimChallengeRewards();
 }catch(e){
  if(duelRace?.challenge?.id!==ch.id||!$('#result-dialog').open)return;
  $('#result-kicker').textContent='РЕЗУЛЬТАТ ЖДЁТ ОТПРАВКИ';
  $('#result-comment').textContent='Открой стрелки, чтобы повторить отправку.';
  toast(e.message);
 }
}
// Проигрыш обязан вести в прокачку так же, как победа: ящик кладём прямо в диалог результата,
// дальше работает обычное открытие с установкой детали в пустой слот.
//
// Начисление применяется и **тут же сохраняется**: выданным сервер считает то, что увидел в сейве,
// а не то, что отдал. Раньше право помечалось выданным в момент запроса, и обрыв связи между
// запросом и сохранением терял приз молча (docs/payments.md, раздел 1).
async function claimPending(){
 let pending=[];
 try{pending=(await challengeApi.rewards()).pending||[];}catch{return null;}
 const {applied,got}=applyReceipts(save,pending);
 if(!applied.length)return null;
 persist();renderGarageUI();
 return got;
}
async function claimChallengeRewards(){
 const got=await claimPending();
 if(!got||!gotSomething(got))return;
 lastRaceResult={cash:got.cash,scrap:got.scrap,hard:got.hard,crates:got.crates};
 $('#result-loot').innerHTML=raceLootMarkup(lastRaceResult);
 $('#reward').textContent='ТВОЙ ПАК';
}

// Подмена (docs/loaner-invite.md): новичок по ссылке едет на тачке кореша. Прогрев в одиночку, потом
// заезд с «чуваком с района» — до победы и мимо гаража. Гараж открывается уже с призом.
let loaner=null,loanerUnsent=null;
async function openLoaner(deal){
 loaner=deal;
 track('loaner_opened',{id:deal.challengeId,stage:deal.stage});
 // Старт на сервере — сразу, пока человек читает карточку: там считается соперник под эту тачку,
 // и к нажатию кнопки он уже готов. Предложение с карточки его ещё не знает.
 const started=deal.stage==='offer'?challengeApi.loaner(deal.challengeId):Promise.resolve(deal);
 started.catch(()=>{});
 // Тачка кореша в его краске и обвесе — рисуем, как только поднимется сцена.
 whenReady.then(()=>renderFleetPreviews([deal.build.car],{[deal.build.car]:deal.build})).then(out=>loanerUI.setCar(out[deal.build.car])).catch(()=>{});
 await loanerUI.intro(deal);
 try{loaner=await started;}catch(e){toast(e.message);loaner=null;return;}
 await whenReady;
 await loanerNext();
}
function loanerNext(){
 if(!loaner)return false;
 const warmup=loaner.stage==='warmup',r=loaner.rival;
 track(warmup?'loaner_warmup':'loaner_race',{id:loaner.challengeId,attempt:(loaner.attempts||0)+1});
 return goRace(false,null,{player:loaner.build,
  opponent:warmup?null:{build:loaner.build,look:r.look,inputs:r.inputs,name:r.name,isBot:true},
  loaner:{stage:warmup?'warmup':'race'},autoLaunch:true,distance:loaner.contract?.distance||LOANER_RULES.distance});
}
async function settleLoaner(){
 settled=true;phase='finished';resetFinishFilm();gasHeld=false;lastRaceResult=null;
 const warmup=duelRace.loaner.stage==='warmup',inputs=[...duelInputs],shifts=player.maxGear-1;
 finishPresentation.result({mode:'duel',time:player.finishTime});
 $('#result-dialog').dataset.tier='race';$('#result-event').hidden=true;$('#result-loot').innerHTML='';
 // Подсказка «что дальше» здесь главная часть экрана — не прячем её, как в кампании.
 $('#result-dialog').dataset.loaner='true';
 // Гараж откроется после победы — с призом. До неё отсюда одна дорога: на старт.
 $('#result-garage').hidden=true;
 // Соперник назван по имени и с его временем уже после прогрева: новичок видит, во что целиться.
 $('.result-times>div:last-child>span').textContent=loaner.rival.name.toLocaleUpperCase('ru-RU');
 $('#rival-time').textContent=loaner.rival.time.toFixed(2)+' с';
 $('#result-time').textContent=player.finishTime.toFixed(2)+' с';
 $('#result-shifts').textContent='В зелёную: '+player.perfect+' из '+shifts;
 if(warmup){
  const t=LOANER_TEXT.warmup({perfect:player.perfect,shifts,rival:loaner.rival.name});
  $('#result-kicker').textContent='ПОДМЕНА · ПРОГРЕВ';$('#result-title').textContent=t.title;
  $('#reward').textContent='';$('#result-comment').textContent=t.line;
  $('#race-again').textContent='НА СТАРТ';
  openDialog($('#result-dialog'));sfx(player.perfect>=shifts-2?'win':'shift');
  loaner.stage='race';
  track('loaner_warmed',{id:loaner.challengeId,perfect:player.perfect,shifts,time:player.finishTime});
  challengeApi.loaner(loaner.challengeId,{warmed:true}).catch(()=>{});
  return;
 }
 $('#result-kicker').textContent='ПОДМЕНА · ПРОВЕРЯЕМ ФИНИШ';$('#result-title').textContent='ФИНИШ';
 $('#reward').textContent='ПРОВЕРКА';
 $('#result-comment').textContent='Сохраняем старт и переключения';$('#race-again').textContent='ЕЩЁ РАЗ';
 openDialog($('#result-dialog'));
 await sendLoanerRun(inputs,shifts);
}
// Время считает сервер. Пока ответа нет, «ЕЩЁ РАЗ» закрыт: иначе победа пришла бы, когда человек
// уже поехал снова, и сцена с призом потерялась бы.
async function sendLoanerRun(inputs,shifts){
 const again=$('#race-again');again.disabled=true;
 try{
  const r=await challengeApi.loanerRun(loaner.challengeId,inputs);
  loanerUnsent=null;
  if(!duelRace?.loaner||!$('#result-dialog').open)return;
  loaner.attempts=r.attempts;
  if(r.won){await closeDialog($('#result-dialog'));await loanerWin(r);return;}
  const t=LOANER_TEXT.lost({gap:r.gap,perfect:r.perfect,missed:r.missed,shifts,rival:loaner.rival.name});
  $('#result-kicker').textContent='ПОДМЕНА · ПОПЫТКА '+r.attempts;$('#result-title').textContent=t.title;
  $('#result-time').textContent=r.time.toFixed(2)+' с';$('#reward').textContent='';
  $('#result-comment').textContent=t.line;$('#race-again').textContent='ЕЩЁ РАЗ';
  finishPresentation.result({mode:'duel',time:r.time,verified:true,place:2});
  sfx('shift');
  track('loaner_lost',{id:loaner.challengeId,attempt:r.attempts,gap:+r.gap.toFixed(3),perfect:r.perfect,missed:r.missed});
 }catch(e){
  loanerUnsent={inputs,shifts};
  if(!duelRace?.loaner||!$('#result-dialog').open)return;
  $('#result-kicker').textContent='РЕЗУЛЬТАТ НЕ УШЁЛ';$('#result-comment').textContent='Нет связи. Жми — отправим ещё раз.';
  $('#race-again').textContent='ОТПРАВИТЬ ЕЩЁ РАЗ';toast(e.message);
 }finally{again.disabled=false;}
}
async function loanerWin(r){
 track('loaner_won',{id:loaner.challengeId,attempts:r.attempts,time:r.time,gap:+r.gap.toFixed(3)});
 sfx('win');haptics('win');
 const deal=loaner;loaner=null;
 await loanerUI.win({lender:deal.lender,rival:deal.rival.name,time:r.time,rivalTime:r.rivalTime,prize:deal.prize});
 // Приз приезжает квитанцией, как любой другой: применяем и сразу сохраняем.
 await claimPending();
 await goGarage();
 // Приз должен оказаться в руках, а не в меню: сразу к ящикам.
 metaUI.open('boxes');
}
// Незаконченная подмена ждёт человека на входе, даже если он зашёл без ссылки.
async function resumeLoaner(){
 try{const {loaner:deal}=await challengeApi.loanerPending();if(deal&&!loaner)await openLoaner(deal);}catch{}
}

// Покупки и всё остальное, что сервер начислил, пока игра была закрыта. Плюс восстановление
// вечного: купленная за деньги машина обязана вернуться на любом устройстве и после любого
// конфликта сейвов, поэтому entitlements сверяются с сейвом на каждом входе.
async function syncPurchases(){
 let data=null;
 try{data=(await store.flush())||(await store.sync());}catch{return;}
 if(!data)return;
 const {applied,got}=applyReceipts(save,data.pending||[]);
 const back=restoreEntitlements(save,(data.owned||[]).map(id=>store.skuById(id)?.grant).filter(Boolean));
 if(!applied.length&&!gotSomething(back))return;
 persist();renderGarageUI();
 if(gotSomething(got))toast('Покупка пришла: забирай в гараже');
}
async function settleDuel(){
 settled=true;phase='finished';resetFinishFilm();gasHeld=false;lastRaceResult=null;const ticket=duelRace.ticket;finishPresentation.result({mode:'duel',time:player.finishTime});
 $('#result-kicker').textContent=duelRace.opponent?'ДУЭЛЬ · ПРОВЕРЯЕМ ФИНИШ':'КВАЛИФИКАЦИЯ';$('#result-title').textContent='ФИНИШ';$('#result-time').textContent=player.finishTime.toFixed(2)+' с';$('#rival-time').textContent=duelRace.opponent?rival.finishTime.toFixed(2)+' с':'—';$('#reward').textContent='ПРОВЕРКА';$('#race-again').textContent='К ДУЭЛЯМ';$('#result-comment').textContent='Сохраняем старт и переключения';$('#result-shifts').textContent='Идеальные: '+player.perfect;$('#result-loot').innerHTML='';$('#result-event').hidden=true;openDialog($('#result-dialog'));
 try{const r=await duelUI.finish(ticket,duelInputs);if(duelRace?.ticket!==ticket||!$('#result-dialog').open)return;$('#result-kicker').textContent='РЕЗУЛЬТАТ ПОДТВЕРЖДЁН';$('#result-title').textContent=r.draw?'НИЧЬЯ':r.won?'ТВОЯ ВЗЯЛА!':'ЕЩЁ ПОКАЖЕМ!';$('#result-time').textContent=r.time.toFixed(2)+' с';finishPresentation.result({mode:'duel',time:r.time,verified:!!duelRace.opponent,place:r.won?1:2,draw:r.draw});$('#reward').textContent=(r.delta>=0?'+':'')+r.delta+' РЕЙТИНГ';$('#result-comment').textContent='Рейтинг: '+r.rating+' · один класс, близкая мощь';sfx(r.won?'win':'shift');}
 catch(e){if(duelRace?.ticket!==ticket||!$('#result-dialog').open)return;$('#result-kicker').textContent='РЕЗУЛЬТАТ ЖДЁТ ОТПРАВКИ';$('#result-comment').textContent='Открой дуэли, чтобы повторить сохранение.';toast(e.message);}
}
let raceAudio,audioCtx,masterGain,musicOut,engineGain,engineVoice,soundEnabled=true;
const radio=new GarageRadio({root:$('#garage-radio'),getState:()=>({garage:screen==='garage',sound:soundEnabled,visible:!document.hidden}),prepare:()=>{soundEnabled=true;syncSoundButton();ensureAudio();},autostart:looksLikeTelegram()});
// Через Телеграм музыка играет с порога, как приёмник в машине. В браузере и на тестовой сборке
// автостарта нет: при отладке страница перезагружается десятки раз, и музыка на каждый раз достаёт.
if(looksLikeTelegram()){ensureAudio();radio.autoplay();}
function ensureAudio(){if(!soundEnabled)return;try{if(!audioCtx){
 audioCtx=new(window.AudioContext||window.webkitAudioContext)();masterGain=audioCtx.createGain();masterGain.gain.value=.75;
 // Engine and effects are compressed on their own bus; music bypasses it so the motor never pumps the song. A fast limiter on the output keeps the sum from clipping on phone speakers.
 const limiter=audioCtx.createDynamicsCompressor();limiter.threshold.value=-3;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.002;limiter.release.value=.12;limiter.connect(audioCtx.destination);musicOut=limiter;
 const compressor=audioCtx.createDynamicsCompressor();compressor.threshold.value=-15;compressor.knee.value=12;compressor.ratio.value=3;const effectsBus=audioCtx.createGain();effectsBus.gain.value=.8;masterGain.connect(compressor);compressor.connect(effectsBus);effectsBus.connect(limiter);
 raceAudio=new RaceAudio(audioCtx,masterGain);engineVoice=new EngineAudio(audioCtx,masterGain);engineGain=engineVoice.bus;
 }radio.attach(audioCtx,musicOut);if(audioCtx.state!=='running'&&audioCtx.state!=='closed')audioCtx.resume().catch(()=>{});
 }catch{soundEnabled=false;syncSoundButton();}}
function syncSoundButton(){$('#sound i').hidden=soundEnabled;$('#sound').setAttribute('aria-label',soundEnabled?'Выключить звук':'Включить звук');$('#sound').title=soundEnabled?'Звук включён':'Звук выключен';}
// Мотор и эффекты замолкают на любом раннем выходе из кадра: сборка сцены, фон, смена экрана.
function hushEngine(){if(!audioCtx)return;engineVoice?.silence(player);raceAudio?.silence(player);}
function updateAudio(){radio.sync();if(!audioCtx||!engineGain)return;const t=audioCtx.currentTime;
 // Engine and race effects stay silent in the garage; radio has its own streamed bus.
 if(!soundEnabled||document.hidden||screen==='garage'||phase==='crashed'||(player?.ridge&&phase==='finished')){engineVoice.silence(player);raceAudio?.silence(player);return;}
 raceAudio?.update(player,phase);
 // Голос мотора пересобираем при смене машины: слои слышны ровно те, что стоят на ней сейчас.
 // В дуэли едет чужая сборка, поэтому апгрейды из гаража туда не попадают.
 if(engineVoice.voiceCar!==player){engineVoice.voiceCar=player;engineVoice.setVoice(duelRace?null:voiceFor(save,player?.levels||[0,0,0]));}
 const driving=['running','coasting','finished'].includes(phase),revving=phase==='countdown'||phase==='launch';const rpm=revving?launchRpm:driving?player.rpm:1100;
 const throttle=player?.crashed?.04:phase==='running'?(player.ridge&&player.braking?.12:player.shiftPause>0?.23:1):phase==='coasting'?.5:phase==='finished'?.18:.5;
 // Пятый аргумент — обороты удержания на старте: с прошивкой мотор висит на отсечке два-степ, пока не отпустили.
 engineVoice.update(player,rpm,throttle,driving?.36:revving?.27:.14,revving?launchRpm:0);
}
let beatClock=null;
function sfx(kind){if(!soundEnabled)return;ensureAudio();if(!audioCtx)return;const t=audioCtx.currentTime;
 if(kind==='shift'||kind==='perfect'||kind==='launch'||kind==='contact'||kind==='nitro'){
 const b=audioCtx.createBuffer(1,audioCtx.sampleRate*(kind==='nitro'?.9:kind==='contact'?.22:kind==='launch'?.32:.13),audioCtx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/d.length*(kind==='nitro'?3:12));
 const src=audioCtx.createBufferSource();src.buffer=b;const f=audioCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=kind==='nitro'?3200:kind==='contact'?260:kind==='launch'?2200:kind==='perfect'?1600:850;if(kind==='nitro'){f.Q.value=.6;f.frequency.setValueAtTime(3400,t);f.frequency.exponentialRampToValueAtTime(900,t+.85);}const g=audioCtx.createGain();g.gain.value=kind==='nitro'?.3:kind==='contact'?.48:kind==='launch'?.13:.22;src.connect(f);f.connect(g);g.connect(masterGain);src.start();src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};return;}
 // Тумблер: щелчок пластика по фронту и глухой удар контакта следом. Клавиша в гараже — единственное место.
 if(kind==='switch'){
  const b=audioCtx.createBuffer(1,Math.floor(audioCtx.sampleRate*.06),audioCtx.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/d.length*24);
  const src=audioCtx.createBufferSource();src.buffer=b;const f=audioCtx.createBiquadFilter();f.type='highpass';f.frequency.value=1700;
  const g=audioCtx.createGain();g.gain.value=.26;src.connect(f);f.connect(g);g.connect(masterGain);src.start();
  src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};
  const o=audioCtx.createOscillator(),og=audioCtx.createGain();o.type='triangle';
  o.frequency.setValueAtTime(190,t);o.frequency.exponentialRampToValueAtTime(96,t+.05);
  og.gain.setValueAtTime(.09,t);og.gain.exponentialRampToValueAtTime(.001,t+.07);
  o.connect(og);og.connect(masterGain);o.start(t);o.stop(t+.08);o.onended=()=>{o.disconnect();og.disconnect();};return;}
 if(kind==='fanfare'||kind==='fanfare-long'){const long=kind==='fanfare-long',notes=long?[392,494,587,784,988]:[440,554,659],step=long?.3:.26;notes.forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),at=t+i*step,last=i===notes.length-1;o.type='triangle';o.frequency.setValueAtTime(f,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.07,at+.02);g.gain.exponentialRampToValueAtTime(.001,at+(last?.9:.34));o.connect(g);g.connect(masterGain);o.start(at);o.stop(at+1);o.onended=()=>{o.disconnect();g.disconnect();};});
  if(long){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(98,t);o.frequency.linearRampToValueAtTime(196,t+1.2);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+2.2);o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+2.3);o.onended=()=>{o.disconnect();g.disconnect();};}return;}
 const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.setValueAtTime(kind==='win'?550:kind==='tick'?650:450,t);g.gain.setValueAtTime(.055,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+.17);o.onended=()=>{o.disconnect();g.disconnect();};}
$('#sound').onclick=()=>{soundEnabled=!soundEnabled;syncSoundButton();ensureAudio();updateAudio();};syncSoundButton();// Выключатель света в гараже: бокс гаснет, и видно, как работают фары, габариты, поворотники и неон.
function syncGarageLight(){const b=$('#garage-light');if(!b)return;b.setAttribute('aria-pressed',String(garageDark));const label=garageDark?'Включить свет в гараже':'Выключить свет в гараже';b.setAttribute('aria-label',label);b.title=label;}
$('#garage-light').onclick=()=>{garageDark=!garageDark;garageBlackout?.set(garageDark);syncGarageLight();garageDirty=true;sfx('switch');haptics('light');};syncGarageLight();const unlockAudio=e=>{if(e.target.closest?.('#garage-radio'))return;ensureAudio();radio.gesture();};document.addEventListener('pointerdown',unlockAudio,{capture:true});document.addEventListener('keydown',unlockAudio,{capture:true});document.addEventListener('visibilitychange',updateAudio);window.addEventListener('pagehide',()=>radio.silence(true));window.addEventListener('pageshow',()=>radio.sync(true));

function smoke(dt){if(player?.ridge)return;raceEffects?.update(dt,player,rival,[playerModel,rivalModel],phase,reducedMotion);}
function animateWheels(model,speed,dt,car){for(const wheel of model?.userData.wheels??[])if(!(car?.ridge&&car.handbrake&&wheel.name.startsWith('Wheel_R')))wheel.rotation.z+=speed*dt/(model.userData.wheelRadius||.37);}
// Неон под днищем пульсирует и в гонке, включая заставку босса: контроллеры живут в userData моделей.
function tickNeon(dt){playerModel?.userData.neon?.update(dt);rivalModel?.userData.neon?.update(dt);raceIndicators?.update(dt);/* Ковёр под каждой машиной: накал стопарей тот же, что у линз в vehicle-effects, высота — чтобы свет остался на дороге, когда машину подбрасывает. */for(const [model,car] of [[playerModel,player],[rivalModel,rival]]){const ground=model?.userData.groundLight;if(!ground)continue;ground.setTail(car?.finished?1:raceLookCfg.night?.42:.12);ground.setBeam(raceLookCfg.night?1:0);ground.setHeight(model.position.y);}}
// Светофор старта: тёмный в «ГОТОВ?», жёлтые по отсчёту, зелёный со старта. Логика в start-tree.js.
let treeGreenAge=null;
function tickStartTree(dt){const lamps=raceScene?.userData.tree?.userData.lamps;if(!lamps)return;const started=['launch','running','coasting','finished','crashing','crashed'].includes(phase);treeGreenAge=started?(treeGreenAge??0)+dt:null;paintTree(lamps,treeLevels(phase,countdown,treeGreenAge,clock),!!raceLookCfg.night);}
function updateRaceScene(dt){
 if(player?.overpass){world.update(player.travelDistance??player.distance,player,rival,[playerModel,rivalModel],dt,reducedMotion);return;}
 const travel=player.travelDistance??player.distance;
 const crash=player.crashBody;if(crash&&crash.impacts!==(crash.audioImpacts||0)&&crash.impact>3&&clock-(crash.audioTime||0)>.22){crash.audioImpacts=crash.impacts;crash.audioTime=clock;sfx('contact');haptics(crash.impact>9?'crash':'contact');shake=Math.max(shake,Math.min(.65,crash.impact*.06));/* удар читается и камерой: вес без тряски не чувствуется */}
 /* Окно прокрутки декора сдвинуто назад: было [-300,+60], стало [-270,+90]. Впереди разницы нет — дальше 240 м
    всё равно туман, — а позади машины теперь всегда стоит застройка, и пролёт камеры после финиша не смотрит
    в пустоту за срезом дороги. */
 for(const r of roadItems){r.obj.position.z=((r.start+travel+270)%r.span+r.span)%r.span-270;r.obj.visible=r.obj.position.z>-285&&r.obj.position.z<125;}
 /* Разрыв показываем как есть. Здесь стоял зажим ±23/18 м с самого первого прототипа: соперник,
    выигрывающий полторы секунды, всё равно ехал рядом — а на 804 метрах это до 150 м настоящего
    отрыва. Игра врала об исходе ровно там, где он решается. Камера к большому разрыву готова:
    дальше 13 м она переводит внимание на свою машину и не гонится за уехавшим. */
 const gap=-((rival.travelDistance??rival.distance)-travel);rivalModel.position.z=THREE.MathUtils.lerp(rivalModel.position.z,gap,1-Math.exp(-9*dt));
 const acceleration=(player.speed-previousSpeed)/Math.max(dt,.001);previousSpeed=player.speed;const pose=playerBody.update(dt,{speed:player.speed,acceleration,kick:shake,reduced:reducedMotion});const ride=raceScene.userData.roadRide.update(dt,playerModel,player.speed,travel,reducedMotion);playerModel.position.y=pose.height+ride.height;playerModel.rotation.z=pose.pitch*(player.handling?.pitch||1)+ride.pitch;playerModel.rotation.x=pose.roll+ride.roll;const other=rivalBody.update(dt,{speed:rival.speed,acceleration:rival.speed>1?2:0,reduced:reducedMotion});const otherRide=raceScene.userData.roadRide.update(dt,rivalModel,rival.speed,travel,reducedMotion);rivalModel.position.y=other.height+otherRide.height;rivalModel.rotation.z=other.pitch*(rival.handling?.pitch||1)+otherRide.pitch;rivalModel.rotation.x=other.roll+otherRide.roll;
 animateWheels(playerModel,player.crashBody?.wheelSpeed??player.speed,dt,player);animateWheels(rivalModel,rival.crashBody?.wheelSpeed??rival.speed,dt,rival);

 raceScene.userData.start.position.z=-3+travel;raceScene.userData.finish.position.z=-(player.raceDistance+3)+travel;
 // Полоса соперника заканчивается там, где его финиш: при форе дистанции разные, и это должно быть видно.
 if(raceScene.userData.finishRival)raceScene.userData.finishRival.position.z=-((rival?.raceDistance||player.raceDistance)+3)+travel;
 raceScene.userData.tree.position.z=-6+travel;
 world.update?.(travel,player,rival,[playerModel,rivalModel],dt,reducedMotion);
 shake=Math.max(0,shake-dt*.9);
}
function updateRaceCamera(dt){
 if(player?.overpass){world.camera(raceCamera,player,playerModel,dt,reducedMotion);return;}
 if(player?.ridge){const target=player.crashed?70:['ready','countdown','launch'].includes(phase)?310:phase==='running'?145:0;raceCamera.userData.driftOffset=damp(raceCamera.userData.driftOffset??target,target,dt,4);raceCamera.setViewOffset(1000*raceCamera.aspect,1000,0,-raceCamera.userData.driftOffset,1000*raceCamera.aspect,1000);}else if(raceCamera.view?.enabled){raceCamera.clearViewOffset();delete raceCamera.userData.driftOffset;}
 if(player?.crashed){const m=playerModel,center=new THREE.Vector3(0,player.crashBody.cg,0).applyQuaternion(m.quaternion).add(m.position),t=1-Math.exp(-dt*3.5),lead=Math.min(3,player.speed*.08),road=ridgeLocal(player.crashBody.hint,0,player.travelDistance??player.distance),out=new THREE.Vector3(center.x-road.x,0,center.z-road.z).normalize();raceCamera.position.lerp(new THREE.Vector3(center.x+out.x*12,center.y+7,center.z+out.z*12+4+lead),t);const jolt=reducedMotion?0:shake;raceCamera.position.x+=Math.sin(clock*65)*jolt;raceCamera.position.y+=Math.cos(clock*53)*jolt*.4;raceCamera.up.set(0,1,0);const aim=raceCamera.userData.crashTarget??=new THREE.Vector3(0,0,2);aim.lerp(center,1-Math.exp(-dt*14));raceCamera.lookAt(aim);raceCamera.fov=damp(raceCamera.fov,52,dt,3)+jolt*3;raceCamera.updateProjectionMatrix();return;}

 if(!reducedMotion&&phase==='coasting'&&!settled&&playerModel&&!player.ridgeBattle){const film=finishCameraFrame(coastElapsed,{x:playerModel.position.x,y:playerModel.position.y,width:playerModel.userData.carWidth,height:CARS[duelRace?duelRace.player.car:save.selected]?.height,length:playerModel.userData.carLength},finishFilmSide,finishFilmStart);raceCamera.position.set(film.position.x,film.position.y,film.position.z);raceCamera.up.set(Math.sin(film.roll),Math.cos(film.roll),0);raceCamera.lookAt(film.target.x,film.target.y,film.target.z);raceCamera.fov=film.fov;raceCamera.updateProjectionMatrix();$('#game').dataset.raceShot=film.id;return;}
 if(player?.ridge&&(phase==='running'||player.ridgeBattle&&phase==='coasting')){followRidgeCamera(raceCamera,playerModel,player,dt,reducedMotion,rivalModel);return;}
 // Дрифт живёт по своим правилам: там камера ходит за машиной, а не летает над трассой.
 if(player?.ridge){
  const impulse=reducedMotion?0:shake,target={x:1.5,y:8.6,z:13.2,fov:46+(reducedMotion?0:Math.min((player?.speed||0)*.20,10))};
  for(const k of Object.keys(target))raceView[k]=reducedMotion?target[k]:damp(raceView[k],target[k],dt,4.5);
  raceAim.x=0;raceAim.y=0;raceAim.z=2;
  raceCamera.position.set(raceView.x+Math.sin(clock*65)*impulse,raceView.y+Math.cos(clock*53)*impulse*.4,raceView.z+impulse*.8);
  raceCamera.up.set(0,1,0);raceCamera.lookAt(0,0,2);raceCamera.fov=raceView.fov+impulse*3;raceCamera.updateProjectionMatrix();return;
 }
 // Заезд: стартовая точка низкая и близкая, дальше подъём дроном. Опорное положение сглаживаем
 // (оператор догоняет), а дрожь подвеса добавляем после — иначе сглаживание её и съест.
 if(!orbitDrag&&raceOrbit)raceOrbit=Math.abs(raceOrbit)<.002?0:damp(raceOrbit,0,dt,2.6);
 const frame=dragCameraFrame({phase,time:clock,speed:player?.speed||0,sinceLaunch:player?.time??99,shake:reducedMotion?0:shake,reduced:reducedMotion,aspect:raceCamera.aspect,rivalZ:rivalModel?.visible?rivalModel.position.z:0,orbit:raceOrbit});
 const follow=reducedMotion?1:1-Math.exp(-dt*frame.lag);
 raceView.x+=(frame.pos.x-raceView.x)*follow;raceView.y+=(frame.pos.y-raceView.y)*follow;raceView.z+=(frame.pos.z-raceView.z)*follow;
 raceView.fov+=(frame.fov-raceView.fov)*follow;
 raceAim.x+=(frame.aim.x-raceAim.x)*follow;raceAim.y+=(frame.aim.y-raceAim.y)*follow;raceAim.z+=(frame.aim.z-raceAim.z)*follow;
 raceCamera.position.set(raceView.x+frame.jitter.x,raceView.y+frame.jitter.y,raceView.z+frame.jitter.z);
 raceCamera.up.set(Math.sin(frame.roll),Math.cos(frame.roll),0);
 raceCamera.lookAt(raceAim.x,raceAim.y,raceAim.z);
 raceCamera.fov=raceView.fov;raceCamera.updateProjectionMatrix();
}
function frame(now){
 requestAnimationFrame(frame);if(warming){last=now;hushEngine();return;}if(document.hidden){last=0;quality.reset();hushEngine();return;}const elapsed=last?(now-last)/1000:1/60,dt=Math.min(elapsed,(screen==='race'&&player?.ridge)? .20 : .05);last=now;clock+=dt;if(quality.sample(elapsed,screen==='race')){/* в гараже качество только опускаем: там тоже бывает тяжело — запись экрана, музыка, слабый телефон */resize();shadowBudget(raceScene?.userData.sun,quality.settings);shadowBudget(garageScene?.userData.sun,quality.settings,true);raceEffects?.setQuality(quality.settings);weather?.setQuality(quality.settings);}
 if(screen==='race'&&player?.overpass){frameOverpass(dt);updateAudio();return;}
 if(screen==='garage'){garageYaw+=garageIdle.update(dt,dragging||customizer?.isOpen||sceneTransition.busy||!!document.querySelector('dialog[open]'),reducedMotion);const moving=updateGarageCamera(1-Math.exp(-dt*12)),glow=selectionGlow?.update(dt,CARS[save.selected],customizer?.focusSlot,inspectionAnchor,reducedMotion),blink=garageIndicators?.update(dt),neonGlow=garageCar?.userData.neon?.update(dt),lightShift=garageBlackout?.update(dt),residentMotion=garageResident?.update(dt),crewMotion=garageCrew?.update(dt),residentShadow=garageResident?.takeShadowDirty(),crewShadow=garageCrew?.takeShadowDirty();if(blink||neonGlow)garageLayout?.syncMirror();/* Теневая карта — только когда сцена под тенью изменилась: машина, стены и декор, что перестали или начали заслонять. Камера орбитой солнце не двигает, а пересчёт 1024² на каждом кадре вращения был самой дорогой частью кадра. */if(garageDirty||garageShadowDirty||garageLayout?.takeShadowDirty()||residentShadow||crewShadow){garageScene.userData.sun.shadow.needsUpdate=true;garageShadowDirty=false;}if(garageDirty||moving||glow||blink||neonGlow||residentMotion||crewMotion||lightShift){graphics.render(garageScene,garageCamera);garageDirty=false;}}
 else{
  if(phase==='crashed'||(phase==='finished'&&player.ridge)){graphics.render(raceScene,raceCamera);updateAudio();return;}
  if(player.ridge&&['ready','countdown'].includes(phase))updateRaceScene(dt);
  if(phase==='countdown'){
   const previous=Math.ceil(countdown);countdown-=dt;launchRpm=1800+Math.min(1,(3-countdown)/2.4)*(launchRpmFor(player)-1800)+Math.sin(clock*17)*75;
   $('#shift-label').textContent=Math.max(1,Math.ceil(countdown));$('#race-callout strong').textContent=Math.max(1,Math.ceil(countdown));
   if(Math.ceil(countdown)!==previous&&countdown>0)sfx('tick');$('#race-callout small').textContent='';
   if(countdown<=0){phase='launch';launchElapsed=0;$('#race-callout').classList.add('launch');$('#race-callout strong').textContent='ЖМИ!';$('#race-callout small').textContent='';$('#race-callout span').textContent='';$('#shift-button').disabled=false;$('#shift-label').textContent='СТАРТ';$('#shift-icon').textContent='↑';sfx('tick');if(currentOpponent.startAssist||player.ridge)beginLaunch();}
  }
  if(!duelRace&&phase==='launch'){launchElapsed+=dt;updateRaceScene(dt);if(launchElapsed>=currentOpponent.launchAuto)beginLaunch();}
  if(duelRace&&['launch','running','coasting','finished'].includes(phase))tickDuelRace(dt);
  if(!duelRace&&!player.ridge&&['launch','running','coasting','finished'].includes(phase))tickOpponent(rival,currentOpponent,dt);
  if(['running','coasting','finished'].includes(phase)){
   if(phase==='running'&&!player.ridge&&currentOpponent.startAssist&&player.rpm>player.redline-500&&player.gear<player.maxGear){shift(player,true);shake=.13;feedback('АВТО · ПЕРЕКЛЮЧЕНО');}
   if(!duelRace){if(player.ridgeBattle){tickBattle(player,rival,dt);if(phase==='running'){battleOutcome??=battleResult(player,rival);if(player.time-(player.battle?.lastHit??-10)<dt){shake=Math.min(.65,.2+(player.battle?.impact||0)*.1);sfx('contact');haptics('contact');}if(battleOutcome&&!player.crashed){player.finished=true;player.finishTime ||=player.time;}}}else if(!player.finished)tickCar(player,dt);else tickCoast(player,dt);}
   if(phase==='running'&&player.time>.65)$('#race-callout').hidden=true;
   if(player.crashed&&phase==='running'){phase='crashing';showRaceFinish();$('#shift-button').disabled=true;$('#shift-label').textContent='ВЫЛЕТ';$('#race-callout').hidden=false;$('#race-callout strong').textContent='ВЫЛЕТ';$('#race-callout small').textContent='Слишком быстро вошёл в поворот';$('#feedback').textContent='';}
   if(player.finished&&phase==='running'&&(!player.ridgeBattle||battleOutcome)){phase='coasting';coastElapsed=0;finishFilmStart={position:{x:raceView.x,y:raceView.y,z:raceView.z},target:{x:raceAim.x,y:raceAim.y,z:raceAim.z},fov:raceView.fov};showRaceFinish();if(!reducedMotion)$('#game').dataset.raceFilm='true';$('#shift-button').disabled=true;$('#shift-label').textContent='ФИНИШ';$('#race-callout').hidden=false;$('#race-callout strong').textContent=player.ridgeBattle?'ЗАЕЗД ЗАВЕРШЁН':'ФИНИШ';$('#race-callout small').textContent='';$('#feedback').textContent='';}
   if(phase==='coasting'){coastElapsed+=dt;if(coastElapsed>1.4)$('#race-callout').hidden=true;if(coastElapsed>=(player.ridgeBattle?2.4:reducedMotion?2.6:FINISH_FILM_DURATION)&&(player.ridge||rival.finished||rival.crashed))settle();}
   if(phase==='running'&&!player.ridge){
    feedbackTimer-=dt;if(feedbackTimer<=0){const [lo,hi]=shiftZone(player),good=player.rpm>=lo&&player.rpm<=hi;$('#feedback').textContent=player.ridge&&player.braking?'ТОРМОЖЕНИЕ · '+player.gear+'-Я ПЕРЕДАЧА':player.heat>.5?'ПЕРЕГРЕВ!':player.gear===player.maxGear?'ДО ФИНИША!':good||player.rpm>player.redline-400?'ПЕРЕКЛЮЧАЙ!':'';$('#feedback').style.color=good?'#c7e792':'#d7c69b';}
   }
   if(phase!=='crashing')updateRaceScene(dt);
  }
  if(phase==='crashing'){tickCar(player,dt);if(player.ridgeBattle)tickCar(rival,dt);if(!player.ridge)tickOpponent(rival,currentOpponent,dt);updateRaceScene(dt);if(player.crashElapsed>1.2)$('#race-callout').hidden=true;if(ridgeCrashPresentationDone(player,reducedMotion))settleRidgeCrash();}
  // The result holds the final crash frame; do not expose a long background tumble.
  tickStartTree(dt);tickNeon(dt);smoke(dt);if(introActive){introElapsed+=dt;if(!reducedMotion&&introStep===2)bossIntroCamera(introElapsed,introTotal);if(introElapsed>=introTotal&&!advanceIntro())finishIntro();}else updateRaceCamera(dt);weather?.update(dt,player,rival,playerModel,rivalModel);updateDashboard();graphics.render(raceScene,raceCamera);
 }
 updateAudio();
}

function registerTools(){const ctx=document.modelContext;if(!ctx?.registerTool)return;const ctrl=new AbortController();const tools=[{name:'read_garage',title:'Прочитать состояние гаража',description:'Read the selected car, upgrades, money, records and current race state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({screen,phase,ready,...structuredClone(save)})},{name:'upgrade_car_part',title:'Улучшить конкретную деталь',description:'Upgrade one owned part by its ID. The upgrade stays on this part only and costs money and materials.',inputSchema:{type:'object',properties:{partId:{type:'string',enum:PARTS.map(p=>p.id)}},required:['partId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(screen!=='garage'||!input||!save.inventory[input.partId])return {ok:false,error:'Выбери полученную деталь в гараже'};if(!tunePart(save,input.partId))return {ok:false,error:'Максимум или не хватает ресурсов'};persist();renderGarageUI();customizer?.refresh();return {ok:true,partId:input.partId,rank:save.inventory[input.partId].rank,cash:save.cash,scrap:save.scrap};}}];for(const tool of tools)try{Promise.resolve(ctx.registerTool(tool,{signal:ctrl.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>ctrl.abort(),{once:true});}
customizer=bindCustomizer({save,changed:()=>{persist();renderGarageUI();},previewCar:placeGarageCar,resized:resize,toast,sfx});
eventUI=FEATURES.event?bindEvent({save,changed:()=>{persist();renderGarageUI();},toast,sfx}):null;/* выключенный ивент не поднимаем: иначе он дёргает /api/event на каждом запуске и заезде */
challengeIntro=bindChallengeIntro();loanerUI=bindLoanerUI();
challengePicker=bindChallengePicker({api:challengeApi,toast});
challengeUI=bindChallengeUI({api:challengeApi,onCreate:createChallenge,onDrive:driveChallenge,onStart:startChallenge,onShare:shareChallenge,onClaim:async id=>{const got=await challengeApi.claim(id);const prize=got.payload||{},took=[];
 // Ступени за корешей платят разным: ящиком, материалами, деньгами, краской, неоном.
 if(prize.crate){grantCrate(save,prize.crate,'referrals');took.push('ящик — он ждёт в «Ящиках»');}
 if(prize.scrap){save.scrap+=prize.scrap;took.push('+'+prize.scrap+' ⚒');}
 if(prize.cash){save.cash+=prize.cash;took.push('+'+fmt(prize.cash)+' ₽');}
 if(prize.hard){save.hard+=prize.hard;took.push('+'+prize.hard+' $');}
 if(prize.paint&&paintById(prize.paint)&&!ownsPaint(save,prize.paint)){save.ownedPaints.push(prize.paint);took.push('краска «'+paintById(prize.paint).name+'»');}
 if(prize.neon&&neonById(prize.neon)&&!ownsNeon(save,prize.neon)){addNeon(save,prize.neon);took.push('неон «'+neonById(prize.neon).name+'»');}
 if(!took.length)return;
 persist();renderGarageUI();toast('Забрал за корешей: '+took.join(' · '));track('referral_reward',{...prize});},toast});
loadInviteState();   // баннер призыва должен стоять с первого входа, а не после первого заезда
duelUI=bindDuels({startRace:r=>goRace(false,null,r),getBuild:()=>({car:save.selected,levels:effectiveLevels(save),equipment:save.equipped[save.selected],paint:save.paint[save.selected],decal:save.decal[save.selected],neon:save.neon?.[save.selected]}),toast});
metaUI=bindMeta({save,profiles,identity:()=>{const u=tgUser();return u?{name:[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||null,photo:u.photo_url||null}:{};},openCustomizer:id=>customizer.open(id),changed:()=>{persist();renderGarageUI();},refreshCar:()=>{if(ready)placeGarageCar();},startRace:goRace,openDuels:()=>duelUI.open(),selectCar,renderFleetPreviews,toast,sfx});$('#profile-button').onclick=()=>metaUI.open('profile');const shell=looksLikeTelegram()?fullscreenShell():null;const shellButton=bindShell($('#fullscreen-toggle'),toast,shell);
// Кнопка «в окно / во весь экран» в шапке, рядом со звуком. В полном экране Telegram выйти изнутри
// клиента нечем: своей кнопки у него нет, а Esc закрывает мини-апп целиком. Снаружи Телеграма кнопки нет.
const WINDOW_ICON={in:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',out:'<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'};
function syncWindowButton(){const button=$('#window-toggle'),can=!!shell?.available?.();button.hidden=!can;if(!can)return;
 const full=shell.active(),label=full?'Свернуть в окно':'Во весь экран';
 button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">'+(full?WINDOW_ICON.in:WINDOW_ICON.out)+'</svg>';
 button.setAttribute('aria-label',label);button.title=label;button.setAttribute('aria-pressed',String(full));}
const syncShell=()=>{syncWindowButton();shellButton?.sync();};
$('#window-toggle').onclick=()=>{shell?.toggle();setTimeout(syncShell,200);};
shell?.watch(syncShell);syncWindowButton();
// Esc в полном экране возвращает окно, а не закрывает игру. Мастерская слушает Esc раньше (на document)
// и закрывает свою шторку сама — в такое нажатие не вмешиваемся.
addEventListener('keydown',e=>{if(e.key!=='Escape'||e.defaultPrevented||document.querySelector('dialog[open]'))return;
 if(!shell?.available?.()||!shell.active())return;e.preventDefault();shell.toggle();setTimeout(syncShell,200);});restoreOnGesture();setTimeout(()=>suggestOnce(toast,shell),6000);/* profiles replace the event profile while the event is off */// В Telegram позывной не спрашиваем: имя и аватар приходят из аккаунта, а прогресс живёт на сервере.
const telegramLaunch=!SANDBOX&&looksLikeTelegram();
let telegramSyncing=telegramLaunch;
if(!SANDBOX&&!telegramLaunch)profiles.syncOnStart(save);
if(!SANDBOX&&!telegramLaunch&&!profiles.current())metaUI.requireName();
if(!SANDBOX)addEventListener('pagehide',()=>{profiles.flush(save);if(cloud.enabled)cloud.flushNow(save);});
// Пока Telegram отвечает и сервер отдаёт сейв, обучение не открываем: иначе человеку, который
// давно играет, показывают «Стартуй на зелёный», а через секунду страница перезагружается
// с его настоящим прогрессом. Ждём ответа — он приходит за доли секунды.
if(telegramLaunch)(async()=>{
 const app=await bootTelegram();if(!app){telegramSyncing=false;return;}
 syncShell();/* SDK приезжает позже разметки: только теперь видно, умеет ли клиент полный экран */
 try{
  const session=await signIn({source:new URLSearchParams(location.search).get('utm')});
  if(!session)return;
  track('telegram_app_open',{created:!!session.created,startParam:session.startParam||null,...tgFullscreen()});
  canWrite=!!session.user?.canWrite;
  cloud.start({save:session.save,revision:session.revision,local:save});
  challengeApi.flush().catch(()=>{});refreshChallengeBadge();syncPurchases();
  const entry=parseStartParam(session.startParam);
  if(entry?.kind==='challenge')openInvite(entry.id);
  // Без ссылки — вдруг подмена не закончена: вернуть человека туда, где он остановился.
  else resumeLoaner();
 }catch(e){toast('Telegram не пустил в игру. Играем локально');}
 finally{telegramSyncing=false;}
})();(()=>{const direct=new URLSearchParams(location.search).get('startapp');const entry=direct&&parseStartParam(direct);if(telegramLaunch)return;if(entry?.kind==='challenge')openInvite(entry.id);else resumeLoaner();})();renderGarageUI();if(save.migrationNotice){const n=save.migrationNotice;delete save.migrationNotice;persist();toast('Доработка отменена: +'+fmt(n.cash)+' ₽. На прокачку деталей: +'+n.materials+' ⚒');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),9000);}else persist();registerTools();init();
// Наладка: собрать баннер приглашения прямо сейчас, не заводя стрелку. Нужен для подбора ракурса.
if(devMode()){globalThis.rayonCard=(distance=402,time=8.75)=>myInviteCard(distance,time);
 // Прогрев студии отдельной ручкой: без него первая карточка стоит секунд, и это надо уметь мерить.
 globalThis.rayonWarm=()=>warmStage({THREE,graphics,car:garageCar});}

document.addEventListener('click',async e=>{const button=e.target.closest('[data-bonus-drift]');if(!button||sceneTransition.busy)return;const ticket=availableDriftBonuses(save).find(t=>t.key===button.dataset.bonusDrift);if(!ticket)return;for(const dialog of document.querySelectorAll('dialog[open]'))await closeDialog(dialog);await goRace(true,ticket.map,null,false,ticket.key);});
