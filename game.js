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
import {addEveningGarage} from './garage-evening.js'
import {arrangeGarage} from './garage-layout.js';
import {bindEvent} from './event-ui.js?v=027e2d9';
import {totalCrates,finishesToCrate,grantCrate} from './crates.js';
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
import {carLevel,carLevelProgress,levelUpCar,carRankCap,carUpgradeRarity,MAX_CAR_LEVEL} from './car-levels.js';
import {CAR_SHARD_COSTS as SHARD_COSTS} from './progression.js';
import {isSandbox,sandboxSave,SANDBOX_KEY} from './sandbox-save.js';
import {bootTelegram,signIn,authHeader,looksLikeTelegram} from './telegram.js';
import {bindCloudSave} from './cloud-save.js';
import {bindChallengeApi} from './challenge-api.js';
import {bindChallengeUI} from './challenge-ui.js';
import {bindChallengeIntro} from './challenge-intro.js';
import {parseStartParam,RESULT_TEXTS,inviteText,invitedMarkup} from './challenge-rules.js';
import {share as tgShare,shareMessage as tgShareMessage,unsafeUser as tgUser} from './telegram.js';
import {followRidgeCamera} from './ridge-camera.js';
import {GarageRadio} from './garage-radio.js';
import {practiceTrack,SOCIAL_RANK} from './career.js';
import {FEATURES} from './features.js';
import {applyUnlocks,pendingCards,markSeen,unlockCardMarkup} from './unlocks.js';
import {track,bindAnalytics} from './analytics.js';
import {createProfiles} from './profiles.js';
import {bindShell,restoreOnGesture,suggestOnce} from './app-shell.js';
import {portraitFor,lineFor,characterFor,PLACEHOLDER_TAUNT} from './characters.js';
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
import {hydrate,effectiveLevels,rating,opponent,rewardRace,partById,RARITIES,tunePart,PARTS,isCarUnlocked,refreshUnlocks,pendingReveals,markCarRevealed,CAR_SHARD_COSTS} from './progression.js';
import {bindMeta} from './meta-ui.js';
import {bindCustomizer} from './customizer-ui.js?v=027e2d9';
import {applyCustomization,disposeCustomizedCar} from './car-customization.js';
import {RaceEffects,carPose} from './race-effects.js';
import {CARS} from './fleet.js';
import {TRACKS,trackIndex,raceLook} from './tracks.js';
import {createRaceWorld} from './race-world.js';
import {WeatherEffects} from './weather-effects.js';
import {FINISH_FILM_DURATION,finishCameraFrame} from './finish-camera.js?v=027e2d9';
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
setHaptics(!reducedMotion);
let raceEffects,previousSpeed=0;
const quality=new AdaptiveQuality();let graphics,garageEnvironment,raceEnvironment,garageDirty=true,warming=false;
const $=s=>document.querySelector(s),fmt=n=>Math.round(n).toLocaleString('ru-RU');
const names=CARS.map(c=>c.name);
let inspectionSlot=null,inspectionAnchor=0,selectionGlow,levelPunch=0;
const garageMotion=new GarageMotion();let garageViewport={w:375,h:450,extra:0},raceView={x:2,y:12,z:21,fov:46};
const sceneTransition=new SceneTransition($('#game'),$('#scene-transition'),{reduced:reducedMotion,paint:()=>{if(!renderer)return;resize();if(screen==='garage'){updateGarageCamera();garageDirty=true;graphics.render(garageScene,garageCamera);}else graphics.render(raceScene,raceCamera);}});
let world,weather,worldTextures={},raceMap=0,loadingModel=false;const modelLoads=new Map();const modelOrder=[];const raceModels=new Map(),raceLoads=new Map(),fleetPreviewCache=new Map();
function pruneModels(){const keep=new Set([save.selected,currentOpponent?.car]);while(models.filter(Boolean).length>3){const id=modelOrder.find(i=>models[i]&&!keep.has(i));if(id===undefined)break;const geometries=new Set(),materials=new Set();models[id].traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();models[id]=null;modelOrder.splice(modelOrder.indexOf(id),1);}}
// index.html?sandbox=1 — прокачанная песочница для проверок руками: свой ключ хранилища,
// без профилей и без телеметрии. Настоящий прогресс лежит рядом и не трогается.
const SANDBOX=isSandbox(location.search),SAVE_SLOT=SANDBOX?SANDBOX_KEY:'rayon-drag-v2';
let stored;try{stored=JSON.parse(localStorage.getItem(SAVE_SLOT)||(SANDBOX?'null':localStorage.getItem('rayon-drag-v1'))||'null');}catch{}
if(SANDBOX&&!stored)stored=sandboxSave();
let save=hydrate(stored||{});
// Серверный сейв: включается только после входа через Telegram. Без него всё как раньше — localStorage.
const challengeApi=bindChallengeApi({headers:authHeader});
const cloud=bindCloudSave({headers:authHeader,onAdopt(remote){try{localStorage.setItem(SAVE_SLOT,JSON.stringify(remote));}catch{}location.reload();}});
const persist=()=>{save.updatedAt=Date.now();try{localStorage.setItem(SAVE_SLOT,JSON.stringify(save));if(!SANDBOX)profiles.afterPersist(save);}catch{toast('Прогресс сохранится только до закрытия страницы');}cloud.push(save);};
let introStep=1;
let eventUI,duelUI,duelRace=null,duelInputs=[],duelFrame=0,duelAccumulator=0;
let challengeUI=null,challengeIntro=null,garageUpgrading=false;
let lastRaceResult=null,currentOpponent,practiceMode=false,launchElapsed=0,metaUI,customizer;
let battleOutcome=null,battleMatch=null;
const finishPresentation=new FinishPresentation();
const driftHUD=new DriftHUD();
let markReady;const whenReady=new Promise(r=>{markReady=r;});
let screen='garage',phase='idle',ready=false,renderer,garageScene,raceScene,garageCamera,raceCamera,garageCar,playerModel,rivalModel,garageAsset,coastElapsed=0,finishFilmSide=1,models=[],particles=[],roadItems=[],garageWalls=[],garageLayout=null,garageYaw=0,dragging=false,dragLast=0,clock=0,last=0,player,rival,countdown=3,gasHeld=false,launchRpm=3200,settled=false,feedbackTimer=0,shake=0;
const onboarding=new Onboarding({createCar:()=>modelInstance(save.selected,save.equipped[save.selected],save.paint[save.selected],raceModels.has(save.selected),save.decal[save.selected]),seen:()=>lessonsSeen(save),complete:mode=>{save.tutorials[mode]=true;persist();},reduced:reducedMotion});
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),2400);}
function renderCarLevel(){
 const chip=$('#car-level');if(!chip)return;
 const p=carLevelProgress(save,save.selected,SHARD_COSTS[save.selected]||0);
 $('#car-level-value').textContent='УР. '+p.level;
 $('#car-level-shards').textContent=p.max?'МАКС':'◆ '+Math.min(p.current,p.needed)+' / '+p.needed;
 $('#car-level-bar').style.width=(p.max?100:p.needed?Math.min(100,Math.round(p.current/p.needed*100)):0)+'%';
 chip.classList.toggle('ready',!!p.ready);
 $('#car-level-dot').hidden=!p.ready;
 chip.title=p.max?'Машина прокачана до предела':p.ready?'Есть чертежи на новый уровень':'Чертежи капают за победы на этой машине';
}
function renderGarageUI(){const l=effectiveLevels(save),garage=garageLevel(save.garage),next=nextGarage(save);applyUnlocks(save);renderCarLevel();const eventButton=$('#event-button');if(eventButton)eventButton.hidden=!FEATURES.event||save.rank<SOCIAL_RANK;$('#cash').textContent=fmt(save.cash);$('#hard').textContent=fmt(save.hard);$('#car-name').textContent=names[save.selected];$('#power').textContent=110+l[0]*14;$('#grip').textContent=165+l[1]*15;$('#record').textContent=save.records[save.selected]?save.records[save.selected].toFixed(2)+' с':'—';$('#garage-chip-level').textContent='ГАРАЖ '+garage.roman;$('#rival-label').textContent=(opponent(save).solo?'Проверка: ':'Соперник: ')+opponent(save).name;$('#car-rating').textContent='МОЩЬ '+rating(effectiveLevels(save),CARS[save.selected].id);$('#car-rating').title=vehicleStats(CARS[save.selected].id,l).tag;$('#parts-count').textContent=Object.keys(save.inventory).length;$('#boxes-count').textContent=totalCrates(save);$('#rank-count').textContent=save.rank>=CAMPAIGN_LENGTH?'♛':(()=>{const p=campaignPosition(save.rank);return 'район '+(p.map+1)+' · '+(p.series+1)+'/9';})();$('#garage-upgrade-title').textContent=next?'УЛУЧШИТЬ ДО '+next.roman:'ГАРАЖ НА МАКСИМУМЕ';const req=next?garageRequirement(save,next.level):null,locked=!!(req&&req.missing.rank);$('#garage-upgrade-desc').textContent=next?'':'Дальше некуда: уровень 5 из 5';$('#garage-cost').textContent=next?fmt(next.cost)+' ₽ · '+next.scrap+' ⚒':'МАКС';
 // Точка в шапке: гараж можно качнуть прямо сейчас — деньги и условие сошлись.
 $('#garage-chip-dot').hidden=!(next&&req&&req.ok);
 $('#garage-dialog-title').textContent='ГАРАЖ '+garage.roman;
 $('#garage-dialog-name').textContent=garage.name;
 $('#garage-condition').textContent=locked?garageConditionText(next):'';
 $('#garage-perks').innerHTML=[
  ['Мест для машин',garage.carSlots,next?next.carSlots:''],
  ['Ранг деталей до',garage.rankCap,next?next.rankCap:''],
  ['Обвес до',RARITIES[Math.max(0,Math.min(3,garage.level-1))].name.toLowerCase(),next?RARITIES[Math.max(0,Math.min(3,next.level-1))].name.toLowerCase():''],
 ].map(([name,now,soon])=>`<li><span>${name}</span><b>${now}</b>${soon?`<i>→ ${soon}</i>`:''}</li>`).join('');$('#garage-upgrade').disabled=!next;$('#garage-upgrade').classList.toggle('locked',locked);$('#garage-upgrade').title=garageUnlockSummary(next||garage);$('#garage-upgrade').setAttribute('aria-label',next?'Улучшить гараж до '+next.level+' из 5: '+next.name+', '+fmt(next.cost)+' рублей и '+next.scrap+' материалов'+(locked?'. '+garageConditionText(next):''):garage.name+', уровень 5 из 5');}
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
let envMap,garageDecor;const garageResources=[];
function sceneLighting(scene,warm=true){scene.add(new THREE.HemisphereLight(warm?0xf5e9ce:0xdde6dc,warm?0x615847:0x655c40,1.7));const key=new THREE.DirectionalLight(warm?0xffe7b5:0xffd7a0,2.4);key.position.set(7,12,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-14;key.shadow.camera.right=14;key.shadow.camera.top=14;key.shadow.camera.bottom=-14;key.shadow.normalBias=.025;key.shadow.bias=-.00015;scene.add(key);scene.environment=envMap;scene.environmentIntensity=1.0;}
function tire(parent,x,y,z){const m=new THREE.Mesh(new THREE.TorusGeometry(.38,.14,8,18),material(0x282925));m.rotation.x=Math.PI/2;m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
function disposeScene(scene){if(!scene)return;scene.traverse(o=>{if(o.userData.shared)return;if(o.isMesh&&!o.userData.car){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();}});}
function buildGarage(){
 garageDecor?.dispose();
 if(garageScene){if(garageCar)garageScene.remove(garageCar);disposeScene(garageScene);garageScene.traverse(o=>{if(o.isLight)o.dispose?.();});}
 for(const m of garageResources)m.dispose();garageResources.length=0;garageWalls=[];const stage=garageLevel(save.garage);garageScene=new THREE.Scene();garageScene.background=new THREE.Color(0x080f19);garageScene.fog=new THREE.FogExp2(0x080f19,.032);
 garageScene.environmentIntensity=stage.environment*1.1;
 garageScene.add(new THREE.HemisphereLight(0x809ac8,0x302219,stage.ambient*.68));
 const sun=new THREE.DirectionalLight(0xffdca8,stage.sun*.70);sun.position.set(1.5,7,2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:30});sun.shadow.bias=-.0001;sun.shadow.normalBias=.015;sun.shadow.radius=2;shadowBudget(sun,quality.settings,true);garageScene.userData.sun=sun;garageScene.add(sun);
 const tube=new THREE.PointLight(0xffcf8d,stage.tube*.9+12,9,2);tube.position.set(1.5,2.8,-3);garageScene.add(tube);
 const rim=new THREE.DirectionalLight(0xb3d2ee,stage.rim);rim.position.set(4,4,-3);garageScene.add(rim);
 const room=garageAsset.clone(true);configureGarageStage(room,save.garage);garageScene.add(room);
 const dirs={Wall_North:[0,0,-1],Wall_South:[0,0,1],Wall_West:[-1,0,0],Wall_East:[1,0,0]};
 room.traverse(o=>{o.userData.shared=true;if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;o.material=pbrMaterial(o.material);garageResources.push(o.material);
 let parent=o;while(parent&&!dirs[parent.name])parent=parent.parent;
 if(parent){o.material.transparent=true;o.material.forceSinglePass=true;garageWalls.push({mesh:o,normal:new THREE.Vector3(...dirs[parent.name])});}
 if(o.material.map)o.material.map.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);
 });
 garageResources.push(...stabilizeGarageFloor(room));
 garageDecor=addEveningGarage(garageScene,room,worldTextures.garageEvening,stage.level);garageWalls.push(...garageDecor.wallMeshes);
 garageLayout?.dispose();garageLayout=arrangeGarage(garageScene,room,stage.level,{occluders:garageDecor.clusters});
 garageEnvironment?.dispose();garageEnvironment=captureEnvironment(renderer,garageScene,new THREE.Vector3(0,1.25,.4));garageScene.environment=garageEnvironment.texture;
 placeGarageCar();updateGarageCamera(1);garageDirty=true;quality.reset();
 if(ready)resize();
}
function modelInstance(i,equipment=save.equipped[i],paint=save.paint[i],racing=false,decal=save.decal[i]){const root=new THREE.Group();const car=(racing?raceModels.get(i):models[i]).clone(true);root.userData.racing=racing;root.add(car);root.userData.shared=true;root.userData.carLength=CARS[i].length;root.userData.carWidth=CARS[i].width;root.userData.wheelbase=CARS[i].wheelbase;root.userData.axleOffset=CARS[i].axleOffset||0;root.userData.wheelRadius=CARS[i].radius;root.userData.wheels=[];car.traverse(o=>{o.userData.shared=true;o.userData.car=true;if(/^Wheel_[FR][LR]$/.test(o.name))root.userData.wheels.push(o);});applyCustomization(root,car,equipment,paint,decal);if(racing){root.userData.tailMaterials=[];car.updateWorldMatrix(true,true);car.traverse(o=>{if(!o.isMesh)return;if(/headlight/i.test(o.material.name))root.userData.lampY=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y;if(/^Red lens(?:\.\d+)?$/.test(o.material.name)){root.userData.tailY=new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y;o.material.emissive.set(0xff2010);root.userData.tailMaterials.push(o.material);}});}return root;}
function updateGarageCamera(blend=.12){
 const dt=blend>=1?1/60:-Math.log(1-blend)/12,custom=customizer?.isOpen,slot=customizer?.focusSlot;if(slot!==inspectionSlot){inspectionSlot=slot;inspectionAnchor=garageYaw;}const focus=garageFocus(CARS[save.selected],reducedMotion?null:slot,garageYaw,inspectionAnchor);if(levelPunch>0){levelPunch=Math.max(0,levelPunch-dt*1.6);focus.zoom*=1-levelPunch*.16;}if(garageMotion.initialized)focus.yaw=garageMotion.yaw+Math.atan2(Math.sin(focus.yaw-garageMotion.yaw),Math.cos(focus.yaw-garageMotion.yaw));let changed=garageMotion.update({yaw:focus.yaw,span:Math.max(2.55,CARS[save.selected].length*.69)*focus.zoom,height:focus.height,targetX:focus.x,targetZ:focus.z,elevation:focus.elevation,offset:custom?-garageViewport.extra/garageViewport.w:0},dt,reducedMotion);const a=.68-garageMotion.yaw;garageCamera.position.set(garageMotion.targetX+Math.sin(a)*10.8,garageMotion.elevation,garageMotion.targetZ+Math.cos(a)*10.8);garageCamera.lookAt(garageMotion.targetX,garageMotion.height,garageMotion.targetZ);const span=garageMotion.span,offset=garageMotion.offset*span;garageCamera.left=-span;garageCamera.right=span;garageCamera.top=span*garageViewport.h/garageViewport.w+offset;garageCamera.bottom=-span*garageViewport.h/garageViewport.w+offset;garageCamera.updateProjectionMatrix();
 const view=new THREE.Vector3(garageCamera.position.x,0,garageCamera.position.z).normalize();
 for(const {mesh,normal} of garageWalls){const dot=view.dot(normal);const target=1-THREE.MathUtils.smoothstep(dot,-.14,.28);if(Math.abs(mesh.material.opacity-target)>.002)changed=true;mesh.material.opacity=Math.abs(mesh.material.opacity-target)<.002?target:THREE.MathUtils.lerp(mesh.material.opacity,target,blend);mesh.material.depthWrite=mesh.material.opacity>.97;mesh.castShadow=target>.95;mesh.visible=mesh.material.opacity>.015;}
 if(garageLayout?.update(garageCamera,garageCar,blend))changed=true;
 return changed;
}
// Пятна пересоздаются вместе с моделями: размер берём от кузова конкретной машины.
// Пятна тянутся за машинами в любой фазе: и на старте, и на выкате после финиша.
function placeGarageCar(equipment=save.equipped[save.selected],paint=save.paint[save.selected],decal=save.decal[save.selected]){if(!models[save.selected])return;const xrayState=selectionGlow?.xray.snapshot();if(garageCar){selectionGlow?.dispose();disposeCustomizedCar(garageCar);garageScene.remove(garageCar);}garageCar=modelInstance(save.selected,equipment,paint,false,decal);garageCar.position.set(0,0,.4);garageCar.rotation.y=Math.PI-.08;garageReflections(garageCar);garageScene.add(garageCar);garageLayout?.setCar(garageCar);selectionGlow=new GarageSelection(garageCar,xrayState);garageDirty=true;if(garageScene.userData.sun)garageScene.userData.sun.shadow.needsUpdate=true;}
function smokeTexture(){const n=64,a=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,r=Math.hypot((x-32)/32,(y-32)/32);a[i]=255;a[i+1]=255;a[i+2]=255;a[i+3]=Math.max(0,1-r)**2*255;}const t=new THREE.DataTexture(a,n,n);t.needsUpdate=true;return t;}
let raceLookCfg=TRACKS[0];
// Road textures are needed only on the track: loaded once, on the first race or by the idle prefetch.
const WORLD_TEXTURES=['brick_wall_001_Diffuse','garage_floor_Diffuse','brick_wall_001_nor_gl','garage_floor_nor_gl'];let worldTexturesPromise=null;
function loadWorldTextures(){if(worldTexturesPromise)return worldTexturesPromise;const loader=new THREE.TextureLoader();worldTexturesPromise=Promise.all(WORLD_TEXTURES.map(n=>loader.loadAsync('assets/materials/'+n+'.jpg'))).then(textures=>{textures.forEach((t,i)=>{t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(i<2)t.colorSpace=THREE.SRGBColorSpace;worldTextures[WORLD_TEXTURES[i]]=t;});}).catch(e=>{worldTexturesPromise=null;throw e;});return worldTexturesPromise;}
// Quiet prefetch once the garage is interactive: road textures, the race version of the current car and the
// next rival's car, one after another, so the first race starts without a pause. Never blocks the garage.
let prefetchTimer=0;
function schedulePrefetch(){clearTimeout(prefetchTimer);const start=()=>prefetch().catch(()=>{});if('requestIdleCallback' in window)requestIdleCallback(start,{timeout:4000});else prefetchTimer=setTimeout(start,2500);}
async function prefetch(){if(screen!=='garage')return;await loadWorldTextures();if(screen!=='garage')return;await loadRaceModel(save.selected);if(screen!=='garage'||save.rank>=CAMPAIGN_LENGTH)return;const next=opponent(save);if(next&&Number.isInteger(next.car))await loadRaceModel(next.car);}
function kitRidePenalty(s){return ['skirts','bumpers'].reduce((a,slot)=>{const p=partById(s.equipped[s.selected]?.[slot]);return a+(p?(p.rarity+1)*.06:0);},0);}
async function buildRace(index=0,look=null){raceLookCfg=look||TRACKS[index];await loadWorldTextures();
 if(playerModel){disposeCustomizedCar(playerModel);playerModel.removeFromParent();playerModel=null;}if(rivalModel){disposeCustomizedCar(rivalModel);rivalModel.removeFromParent();rivalModel=null;}
 weather?.dispose();raceEffects?.dispose();world?.dispose();world?.roadTexture?.dispose();world?.smokeMap?.dispose();
 raceEnvironment?.dispose();raceEnvironment=outdoorEnvironment(renderer,raceLookCfg);const roadTexture=floorTexture('road');world=createRaceWorld(index,{roadTexture,environment:raceEnvironment.texture,textures:worldTextures,look:raceLookCfg});world.roadTexture=roadTexture;world.smokeMap=smokeTexture();raceScene=world.scene;roadItems=world.moving;raceEffects=new RaceEffects(raceScene,world.smokeMap,world.cfg);weather=new WeatherEffects(raceScene,world.cfg,reducedMotion,world.smokeMap);raceMap=index;raceEffects.setQuality(quality.settings);weather.setQuality(quality.settings);shadowBudget(raceScene.userData.sun,quality.settings);quality.reset();
}
async function loadModel(i){
 if(models[i])return models[i];if(modelLoads.has(i))return modelLoads.get(i);
 const promise=createGLTFLoader().loadAsync('assets/cars/'+CARS[i].id+'.glb').then(gltf=>{const car=gltf.scene;car.userData.fit=CARS[i];car.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;const old=o.material;o.material=pbrMaterial(old,true);old.dispose();o.material.envMapIntensity=1.1;}});models[i]=car;modelOrder.push(i);modelLoads.delete(i);return car;}).catch(error=>{modelLoads.delete(i);throw error;});modelLoads.set(i,promise);return promise;
}
async function renderFleetPreviews(indices){const out={};if(!renderer)return out;const pending=[];for(const i of indices){const key=i+'|'+save.paint[i]+'|'+(save.decal[i]||'clean')+'|'+JSON.stringify(save.equipped[i]);if(fleetPreviewCache.has(key))out[i]=fleetPreviewCache.get(key);else pending.push({i,key});}if(!pending.length)return out;
 const preview=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});preview.setPixelRatio(1);preview.setSize(384,256,false);preview.outputColorSpace=THREE.SRGBColorSpace;preview.toneMapping=THREE.ACESFilmicToneMapping;preview.toneMappingExposure=1.08;preview.setClearColor(0,0);const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xf4ead4,0x27332f,2.2));const keyLight=new THREE.DirectionalLight(0xffe4b4,3.5);keyLight.position.set(-5,8,5);scene.add(keyLight);const rim=new THREE.DirectionalLight(0xb6d7e5,1.6);rim.position.set(4,3,-5);scene.add(rim);/* Изометрия без перспективы. Направление совпадает со scripts/render-car-iso.py, иначе свои и закрытые машины в списке смотрят по-разному. */const camera=new THREE.OrthographicCamera(-1,1,1,-1,.05,400),direction=new THREE.Vector3(-1,.8165,1).normalize();
 try{for(const item of pending){await loadModel(item.i);const root=modelInstance(item.i);scene.add(root);const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z);camera.position.copy(center).addScaledVector(direction,Math.max(span*3,8));camera.lookAt(center);camera.updateMatrixWorld();/* Кадр по габаритам самой модели, а не на глаз: иначе вокруг машины остаётся воздух. */const inv=new THREE.Matrix4().copy(camera.matrixWorld).invert(),corner=new THREE.Vector3();let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(let c=0;c<8;c++){corner.set(c&1?bounds.max.x:bounds.min.x,c&2?bounds.max.y:bounds.min.y,c&4?bounds.max.z:bounds.min.z).applyMatrix4(inv);minX=Math.min(minX,corner.x);maxX=Math.max(maxX,corner.x);minY=Math.min(minY,corner.y);maxY=Math.max(maxY,corner.y);}const aspect=1.5,pad=1.03;let halfW=(maxX-minX)/2*pad,halfH=(maxY-minY)/2*pad;if(halfW/halfH<aspect)halfW=halfH*aspect;else halfH=halfW/aspect;const midX=(maxX+minX)/2,midY=(maxY+minY)/2;camera.left=midX-halfW;camera.right=midX+halfW;camera.top=midY+halfH;camera.bottom=midY-halfH;camera.near=.05;camera.far=Math.max(span*8,60);camera.updateProjectionMatrix();preview.render(scene,camera);const src=preview.domElement.toDataURL('image/webp',.86);out[item.i]=src;fleetPreviewCache.set(item.key,src);scene.remove(root);disposeCustomizedCar(root);pruneModels();if(fleetPreviewCache.size>40)fleetPreviewCache.delete(fleetPreviewCache.keys().next().value);}}
 finally{preview.dispose();preview.forceContextLoss();}return out;
}
async function loadRaceModel(i){if(raceModels.has(i))return raceModels.get(i);if(raceLoads.has(i))return raceLoads.get(i);const p=createGLTFLoader().loadAsync('assets/race-cars/'+CARS[i].id+'.glb').then(g=>{g.scene.userData.fit=CARS[i];g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;}});raceModels.set(i,g.scene);raceLoads.delete(i);return g.scene;}).catch(e=>{raceLoads.delete(i);throw e;});raceLoads.set(i,p);return p;}
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
renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});renderer.info.autoReset=false;graphics=new GameRenderer(renderer);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;/* мягкое размытие съедало контактную тень под машиной; нужен чёткий край */renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;garageCamera=new THREE.OrthographicCamera(-3.25,3.25,3.25,-3.25,.1,100);garageCamera.position.set(8.1,7.8,10.1);garageCamera.lookAt(0,.1,-.1);raceCamera=new THREE.PerspectiveCamera(46,1,.1,300);raceCamera.position.set(2,12,21);raceCamera.lookAt(0,0,2);const textureLoader=new THREE.TextureLoader();const eveningPromise=textureLoader.loadAsync('assets/materials/garage-evening-atlas.webp').then(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;worldTextures.garageEvening=t;});const [,room]=await Promise.all([loadModel(save.selected),createGLTFLoader().loadAsync('assets/garage-stages.glb'),eveningPromise]);garageAsset=room.scene;
 buildGarage();await renderer.compileAsync(garageScene,garageCamera);$('#garage-fallback').hidden=true;finishLoading();$('#loading').hidden=true;$('#garage-canvas').append(renderer.domElement);ready=true;markReady();$('#race-button').disabled=false;resize();schedulePrefetch();const observer=new ResizeObserver(resize);observer.observe($('#game'));observer.observe($('#garage-canvas'));observer.observe($('#race-canvas'));renderer.domElement.addEventListener('pointerdown',e=>{if(screen==='race'){if(phase==='coasting'&&!reducedMotion&&coastElapsed>1)coastElapsed=FINISH_FILM_DURATION;return;}garageIdle.interact();dragging=true;dragLast=e.clientX;renderer.domElement.setPointerCapture(e.pointerId);});renderer.domElement.addEventListener('pointermove',e=>{if(dragging&&screen==='garage'){garageIdle.interact();garageYaw+=(e.clientX-dragLast)*.008;garageDirty=true;dragLast=e.clientX;}});renderer.domElement.addEventListener('pointerup',()=>dragging=false);renderer.domElement.addEventListener('pointercancel',()=>dragging=false);renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();gasHeld=false;toast('Графика приостановлена. Обнови страницу, прогресс сохранён.');});requestAnimationFrame(frame);}catch(error){console.error(error);$('#loading p').textContent='Не удалось загрузить 3D. Обнови страницу, чтобы попробовать снова.';}}
function resize(){if(!renderer)return;const parent=screen==='garage'?$('#garage-canvas'):$('#race-canvas'),w=parent.clientWidth,h=parent.clientHeight;if(!w||!h)return;graphics.resize(w,h,devicePixelRatio,quality.level,quality.settings);garageDirty=true;const camera=screen==='garage'?garageCamera:raceCamera;camera.aspect=w/h;if(screen==='garage'){garageViewport={w,h,extra:Math.max(0,parent.getBoundingClientRect().bottom-$('#custom-sheet').getBoundingClientRect().top)};}camera.updateProjectionMatrix();}
function feedback(text,color='#e2ca8a'){feedbackTimer=1.6;$('#feedback').textContent=text;$('#feedback').style.color=color;}
// Стрелка: сборку и дистанцию всегда даёт сервер, клиент их не выдумывает.
function myDuelBuild(){return normalizeDuelBuild({car:save.selected,levels:effectiveLevels(save),equipment:save.equipped[save.selected],paint:save.paint[save.selected],decal:save.decal[save.selected],kit:raceKit(save)});}
// Пришёл по ссылке: до всякого меню показываем, кто зовёт и на чём.
async function openInvite(id){
 let card;
 try{card=await challengeApi.card(id);}catch(e){await challengeIntro.fail(e.message);return;}
 track('challenge_opened',{id,mine:!!card.mine,status:card.status});
 if(card.mine){toast('Это твоя стрелка. Ждём кореша');return;}
 if(card.status==='done'){toast('Эту стрелку уже отъездили');await challengeUI.open();return;}
 if(!(card.timeA>0)){toast('Вызвавший ещё не проехал. Загляни позже');return;}
 const accepted=await challengeIntro.show(card);
 if(!accepted)return;
 await whenReady;
 try{await acceptChallenge(id);}catch(e){toast(e.message);}
}
// Кого позвали адресно — чтобы на экране «вызов брошен» показать лица, а не догадки.
let challengeCalled={names:[],photos:[]};
async function createChallenge(options={}){
 challengeCalled={names:options.names||[],photos:options.photos||[]};
 await cloud.flushNow(save);
 const made=await challengeApi.create(options);
 challengeUI?.close();
 track('challenge_created',{id:made.id,distance:made.distance,rematch:!!options.parentId,invite:!!options.invite});
 // Сначала зовём, потом едем: человек отмечает корешей в шторке Telegram и возвращается
 // сразу на свой заезд. Ссылка живёт с момента создания, ждать финиша для неё не нужно.
 if(options.invite){
  const text=inviteText(options.names);
  if(made.link)await sendInvite(made.id,made.link,text);
  else toast('Ссылку выдаст бот. Он ещё подключается');
 }
 await goRace(false,null,{player:made.build,opponent:null,challenge:{id:made.id,role:'a'},distance:made.distance});
}
// Своя стрелка, по которой я ещё не проехал: ссылку нельзя отдать, пока нет времени.
async function driveChallenge(id){
 await cloud.flushNow(save);
 const card=await challengeApi.card(id);
 challengeUI?.close();
 await goRace(false,null,{player:card.car,opponent:null,challenge:{id,role:'a'},distance:card.distance.a});
}
// Принять и поехать — разные шаги. Между ними человек идёт в гараж и ставит детали: выезжать
// на стрелку на том, что было в момент клика по ссылке, — обидно и глупо. Сборку и фору сервер
// замораживает на выходе из гаража, в startChallenge.
async function acceptChallenge(id){
 await cloud.flushNow(save);
 const deal=await challengeApi.accept(id);
 track('challenge_accepted',{id,distance:deal.distance,rivalDistance:deal.rivalDistance});
 if(screen==='race')await goGarage();
 toast('Стрелка принята. Прокачайся и жми «В ЗАЕЗД»');
 await challengeUI.open();
}
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
// Приглашение уходит карточкой: бот заранее собирает сообщение с машиной вызывающего и кнопкой
// «ПРИНЯТЬ СТРЕЛКУ», Telegram показывает шторку «кому отправить». Ссылка остаётся запасным путём —
// на старых клиентах и когда бот не отдал заготовку, звать всё равно можно.
async function sendInvite(id,link,text){
 try{const prepared=await challengeApi.share(id);if(tgShareMessage(prepared.messageId))return true;}
 catch(e){console.warn('Карточка приглашения не собралась:',e.message);}
 if(link&&tgShare(link,text))return true;
 if(link)toast('Ссылка: '+link);
 return false;
}
async function shareChallenge(id){
 const card=await challengeApi.card(id);
 if(!card.link)throw Error('Ссылку выдаст бот. Он ещё подключается');
 await sendInvite(id,card.link,card.text);
}
async function goRace(practice=false,mapOverride=null,duel=null,battle=false,bonusKey=null){if(!ready||loadingModel||warming||sceneTransition.busy)return false;activeDriftBonus=bonusKey;const result=await sceneTransition.run(()=>duel?performDuelRace(duel):performGoRace(practice,mapOverride,null,battle),{covered:()=>{
 // Босса показываем, пока экран ещё под шторкой: иначе между картой и его фото мелькает трасса.
 if(!pendingIntro||screen!=='race')return null;
 const rivalIntro=pendingIntro;pendingIntro=null;introShown.add(rivalIntro.id);
 return runBossIntro(rivalIntro);
}});if(screen==='race'&&phase==='ready'&&(!duel||duel.challenge)&&!player.overpass&&!telegramSyncing)onboarding.open({mode:player.ridge?'drift':currentOpponent.startAssist?'drag-auto':'drag-manual',car:CARS[save.selected].id});return result;}
function showRaceFinish(){
 const battle=!!player.ridgeBattle,mode=battle?'battle':player.ridge?'drift':duelRace?'duel':'race';
 haptics(player.crashed?'crash':mode==='drift'||mode==='battle'?'win':(player.finishTime||player.time)<=(rival.crashed?Infinity:rival.finishTime)?'win':'lose');
 finishPresentation.show({mode,time:player.finishTime||player.time,opponentTime:rival.crashed?undefined:rival.finishTime,score:battle?battleScore(player):player.ridge?driftState(player).score:0,opponentScore:battle?battleScore(rival):0,crashed:!!player.crashed});
}
function resetFinishFilm(){finishPresentation.hide();delete $('#game').dataset.overpass;$('#speed').style.color='';delete $('#result-dialog').dataset.driftResult;delete $('#game').dataset.drift;$('#shift-button').classList.remove('handbrake-held');$('#shift-button').removeAttribute('aria-label');$('.result-times>div:first-child>span').textContent='ТВОЁ ВРЕМЯ';$('.result-times>div:last-child>span').textContent='СОПЕРНИК';if(raceCamera)delete raceCamera.userData.crashTarget;$('#result-practice').hidden=true;delete $('#result-dialog').dataset.ridgeCrash;delete $('#game').dataset.raceFilm;delete $('#game').dataset.raceShot;raceCamera?.up.set(0,1,0);}
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
 playerModel=modelInstance(save.selected,save.equipped[save.selected],save.paint[save.selected],true,save.decal[save.selected]);raceScene.add(playerModel);world.setSmokeMap(world.smokeMap);
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
 if(!ready||loadingModel||warming)return;duelRace=duel;duelInputs=[];duelFrame=0;duelAccumulator=0;practiceMode=false;raceEffects?.reset();previousSpeed=0;shake=0;resetFinishFilm();finishFilmSide=Math.random()<.5?-1:1;
 const solo=!duel.opponent,playerBuild=duel.player,opponentBuild=duel.opponent?.build||duel.player;
 const myDistance=duel.distance||DUEL.distance,rivalDistance=duel.rivalDistance||myDistance;raceView={x:reducedMotion?2:3.4,y:reducedMotion?12:13,z:reducedMotion?21:23,fov:reducedMotion?46:49};raceCamera.position.set(raceView.x,raceView.y,raceView.z);raceCamera.lookAt(0,0,2);raceCamera.fov=raceView.fov;
 currentOpponent={id:0,car:opponentBuild.car,levels:opponentBuild.levels,map:DUEL.map,distance:myDistance,name:duel.opponent?.name||'ТВОЙ ВЫЗОВ',window:1,launchPerfect:.24,launchAuto:.8,startAssist:false,boss:false};const map=DUEL.map;currentOpponent.surface=TRACKS[map].wet?.91:1;loadingModel=true;$('#race-button').disabled=true;
 try{await Promise.all([loadRaceModel(playerBuild.car),loadRaceModel(opponentBuild.car)]);}catch(error){console.error(error);toast('Не удалось загрузить соперника. Попробуй ещё раз.');loadingModel=false;$('#race-button').disabled=false;return;}
 loadingModel=false;$('#race-button').disabled=false;await buildRace(map);pruneModels();pruneRaceModels();launchElapsed=0;screen='race';$('#profile-button').disabled=true;renderer.toneMappingExposure=raceLookCfg.night?1.16:raceLookCfg.wet?1.04:1.0;phase='ready';settled=false;coastElapsed=0;gasHeld=false;$('#game').dataset.screen='race';$('#screen-title').textContent=TRACKS[raceMap].name;$('#garage-screen').hidden=true;$('#race-screen').hidden=false;$('#race-canvas').append(renderer.domElement);
 if(playerModel){disposeCustomizedCar(playerModel);raceScene.remove(playerModel);}if(rivalModel){disposeCustomizedCar(rivalModel);raceScene.remove(rivalModel);}playerModel=modelInstance(playerBuild.car,playerBuild.equipment,playerBuild.paint,true,playerBuild.decal);rivalModel=modelInstance(opponentBuild.car,opponentBuild.equipment,opponentBuild.paint,true,opponentBuild.decal);playerModel.rotation.y=-Math.PI/2;rivalModel.rotation.y=-Math.PI/2;playerModel.position.set(-1.9,0,0);rivalModel.position.set(1.9,0,-.2);raceScene.add(playerModel,rivalModel);
 for(const model of [playerModel,rivalModel])model.traverse(o=>{if(o.isMesh&&o.material.name.includes('headlight')){o.material.emissive.set(0xffdfaa);o.material.emissiveIntensity=raceLookCfg.night?2.2:.12;}});player=duelCar(playerBuild,myDistance);rival=duelCar(opponentBuild,rivalDistance);if(solo){rival.finished=true;rivalModel.visible=false;}player.window=currentOpponent.window;player.surface=currentOpponent.surface;rival.surface=currentOpponent.surface;player.rough=rival.rough=currentOpponent.rough||0;player.ride=Math.max(.05,(player.handling.ride??.5)-(duelRace?0:kitRidePenalty(save)));playerModel.userData.ride=player.ride;rivalModel.userData.ride=rival.ride;raceScene.userData.start.position.z=-3;raceScene.userData.finish.position.z=-(player.raceDistance+3);raceScene.userData.tree.position.z=-6;for(const r of roadItems)r.obj.position.z=r.start;for(const p of particles){p.life=0;p.mesh.visible=false;}
 launchRpm=3200;countdown=3;$('#race-callout').hidden=false;$('#race-callout').classList.remove('launch');$('#race-callout strong').textContent='ГОТОВ?';$('#race-callout small').textContent='Тапни после отсчёта';$('#race-callout span').textContent=player.ridge?(TRACKS[raceMap].id==='parking'?'4 ДУГИ · ПО 40 М':activeDriftBonus?'БОНУС · ОТ 800 ОЧКОВ':'ДРИФТ · '+DRIFT_TARGET+' ОЧКОВ'):'ТЫ СЛЕВА';$('#shift-label').textContent='СТАРТ';$('#shift-button').disabled=false;$('#shift-icon').textContent='↑';feedback(duel.challenge?(solo?'СТРЕЛКА · ТВОЙ ВЫЗОВ':'СТРЕЛКА · '+(duel.opponent?.name||'КОРЕШ')):duel.opponent.isBot?'ДУЭЛЬ · БОТ':'ДУЭЛЬ · ЗАПИСЬ ИГРОКА');$('.race-distance').textContent=myDistance+' М';$('.race-top .tiny-label').textContent=solo?'ТВОЙ ВЫЗОВ · '+playerBuild.power:'КЛАСС '+playerBuild.classId+' · '+playerBuild.power+' ↔ '+opponentBuild.power;$('.race-top h2').textContent=duel.opponent?.name||'СТРЕЛКА';resize();updateDashboard();warming=true;$('#shift-button').disabled=true;try{await renderer.compileAsync(raceScene,raceCamera);}finally{warming=false;$('#shift-button').disabled=false;quality.reset();}
}
async function performGoRace(practice=false,mapOverride=null,duel=null,battle=false){if(!duel&&((!practice&&isOverpassStage(save.rank))||(practice&&(mapOverride?.overpass!==undefined||TRACKS[mapOverride]?.check))))return performOverpass(practice,mapOverride?.overpass??trackIndex(save.rank));if(!ready||loadingModel||warming)return;duelRace=duel;duelInputs=[];duelFrame=0;duelAccumulator=0;practiceMode=practice===true;battleOutcome=null;battleMatch=battle?(typeof battle==='object'?battle:createBattleMatch()):null;raceEffects?.reset();previousSpeed=0;shake=0;resetFinishFilm();finishFilmSide=Math.random()<.5?-1:1;raceView={x:reducedMotion?2:3.4,y:reducedMotion?12:13,z:reducedMotion?21:23,fov:reducedMotion?46:49};raceCamera.position.set(raceView.x,raceView.y,raceView.z);raceCamera.lookAt(0,0,2);raceCamera.fov=raceView.fov;currentOpponent=duelRace?{id:0,car:DUEL.car,levels:DUEL.levels,map:DUEL.map,distance:DUEL.distance,name:duelRace.opponent?.name||'КВАЛИФИКАЦИЯ',window:1,launchPerfect:.24,launchAuto:.8,startAssist:false,boss:false}:opponent(save,practiceMode);const map=practiceMode?practiceTrack(save.rank,mapOverride):currentOpponent.map,stageLook=duelRace?null:practiceMode?raceLook(map,0,true):currentOpponent.look;if(TRACKS[map].bonus&&!currentOpponent.drift)currentOpponent={...ridgeOpponent(currentOpponent),map,name:TRACKS[map].name};if(battle&&practiceMode&&TRACKS[map].bonus)currentOpponent=battleOpponent(currentOpponent,save.selected,effectiveLevels(save));currentOpponent.surface=(stageLook||TRACKS[map]).wet?.91:1;currentOpponent.rough=stageLook?.rough||0;track('race_start',{stage:currentOpponent.id,kind:duelRace?'duel':player?.ridgeBattle?'battle':TRACKS[map].bonus?'drift':practiceMode?'training':'campaign',attempt:(attemptCounts.get(currentOpponent.id)||0)+1,opponent:currentOpponent.name,opponentCar:CARS[currentOpponent.car]?.id,opponentPower:currentOpponent.levels?rating(currentOpponent.levels,CARS[currentOpponent.car]?.id):null,distance:currentOpponent.distance,track:TRACKS[map].id,look:stageLook?.look||null,wet:currentOpponent.surface<1,rough:!!currentOpponent.rough,required:currentOpponent.requiredPerfect||0});loadingModel=true;$('#race-button').disabled=true;try{await Promise.all([loadRaceModel(duelRace?DUEL.car:save.selected),loadRaceModel(currentOpponent.car)]);}catch(error){console.error(error);toast('Не удалось загрузить соперника. Попробуй ещё раз.');loadingModel=false;$('#race-button').disabled=false;return;}loadingModel=false;$('#race-button').disabled=false;await buildRace(map,stageLook);pruneModels();pruneRaceModels();launchElapsed=0;screen='race';$('#profile-button').disabled=true;renderer.toneMappingExposure=raceLookCfg.night?1.16:raceLookCfg.wet?1.04:1.0;phase='ready';settled=false;coastElapsed=0;gasHeld=false;$('#game').dataset.screen='race';$('#screen-title').textContent=TRACKS[raceMap].name;$('#garage-screen').hidden=true;$('#race-screen').hidden=false;$('#race-canvas').append(renderer.domElement);if(playerModel){disposeCustomizedCar(playerModel);raceScene.remove(playerModel);}if(rivalModel){disposeCustomizedCar(rivalModel);raceScene.remove(rivalModel);}playerModel=duelRace?modelInstance(DUEL.car,{},'cherry',true):modelInstance(save.selected,save.equipped[save.selected],save.paint[save.selected],true,save.decal[save.selected]);rivalModel=modelInstance(currentOpponent.car,{},currentOpponent.paint||CARS[currentOpponent.car].color,true,currentOpponent.decal);playerModel.rotation.y=-Math.PI/2;rivalModel.rotation.y=-Math.PI/2;playerModel.position.set(-1.9,0,0);rivalModel.position.set(1.9,0,-.2);raceScene.add(playerModel,rivalModel);for(const model of [playerModel,rivalModel])model.traverse(o=>{if(o.isMesh&&o.material.name.includes('headlight')){o.material.emissive.set(0xffdfaa);o.material.emissiveIntensity=raceLookCfg.night?2.2:.12;}});player=duelRace?duelCar():createCar(effectiveLevels(save),CARS[save.selected].drive,CARS[save.selected].id,currentOpponent.distance,raceKit(save));player.window=currentOpponent.window;player.surface=currentOpponent.surface;rival=duelRace?duelCar():createCar(currentOpponent.levels,CARS[currentOpponent.car].drive,CARS[currentOpponent.car].id,currentOpponent.distance);if(duelRace&&!duelRace.opponent){rival.finished=true;rival.finishTime=0;rivalModel.visible=false;}rival.surface=currentOpponent.surface;player.ridge=rival.ridge=TRACKS[map].bonus;player.ridgeObstacles=rival.ridgeObstacles=world.collisionBoxes||[];player.ridgePosts=rival.ridgePosts=world.posts||[];player.ridgeLane=player.ridge?0:-1.9;rival.ridgeLane=1.9;if(player.ridge){rivalModel.visible=!!currentOpponent.ridgeBattle;playerModel.position.x=0;if(currentOpponent.ridgeBattle)startBattle(player,rival,battleMatch.round);}player.rough=rival.rough=currentOpponent.rough||0;player.ride=Math.max(.05,(player.handling.ride??.5)-kitRidePenalty(save));playerModel.userData.ride=player.ride;rivalModel.userData.ride=rival.ride;raceScene.userData.start.position.z=-3;raceScene.userData.finish.position.z=-(player.raceDistance+3);raceScene.userData.tree.position.z=-6;for(const r of roadItems)r.obj.position.z=r.start;for(const p of particles){p.life=0;p.mesh.visible=false;}launchRpm=3200;countdown=3;$('#race-callout').hidden=false;$('#race-callout').classList.remove('launch');$('#race-callout strong').textContent='ГОТОВ?';$('#race-callout small').textContent=player.ridge?'Легко — подруливай. Дальше — дрифт. Плавно лови машину.':currentOpponent.startAssist?'Старт автоматический · переключай в зелёном':'Тапни после отсчёта';$('#race-callout span').textContent=player.ridge?(TRACKS[raceMap].id==='parking'?'4 ДУГИ · ПО 40 М':activeDriftBonus?'БОНУС · ОТ 800 ОЧКОВ':'ДРИФТ · '+DRIFT_TARGET+' ОЧКОВ'):'ТЫ СЛЕВА';$('#shift-label').textContent='СТАРТ';$('#shift-button').disabled=false;$('#shift-icon').textContent='↑';feedback(duelRace?(duelRace.opponent?'ДУЭЛЬ · ЗАПИСЬ ИГРОКА':'КВАЛИФИКАЦИЯ'):currentOpponent.surface<1?'МОКРАЯ ТРАССА':currentOpponent.distance+' МЕТРОВ');$('.race-distance').textContent=currentOpponent.distance+' М';$('.race-top .tiny-label').textContent=duelRace?'ДУЭЛЬ':currentOpponent.requiredPerfect?'ЦЕЛЬ: '+currentOpponent.requiredPerfect+' ИДЕАЛЬНЫХ':currentOpponent.beat||'ЗАЕЗД';$('.race-top h2').textContent=currentOpponent.name+(currentOpponent.boss?' ♛':'');resize();updateDashboard();warming=true;$('#shift-button').disabled=true;try{await renderer.compileAsync(raceScene,raceCamera);}finally{warming=false;$('#shift-button').disabled=false;quality.reset();}pendingIntro=!duelRace&&!practiceMode&&currentOpponent.captain&&!introShown.has(currentOpponent.id)?currentOpponent:null;if(!duelRace&&!player.ridge)await eventUI?.start(practiceMode);}
async function goGarage(){if(sceneTransition.busy)return;await closeDialog($('#result-dialog'));return sceneTransition.run(()=>performGoGarage());}
function performGoGarage(){gasHeld=false;finishIntro();customizer?.close();resetFinishFilm();$('#race-callout').classList.remove('launch');phase='idle';screen='garage';driftHUD.hide();$('#profile-button').disabled=false;renderer.toneMappingExposure=1.02;quality.reset();$('#result-dialog').close();$('#game').dataset.screen='garage';$('#screen-title').textContent='ГАРАЖ';$('#garage-screen').hidden=false;$('#race-screen').hidden=true;$('#garage-canvas').append(renderer.domElement);renderGarageUI();placeGarageCar();resize();updateAudio();showCarReveals().then(showUnlockHint);}
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
$('#car-level').onclick=async()=>{
 if(!ready||screen!=='garage'||sceneTransition.busy)return;
 const unlockCost=SHARD_COSTS[save.selected]||0,before=carLevelProgress(save,save.selected,unlockCost);
 if(before.max){toast('Машина прокачана до предела');return;}
 if(!before.ready){toast('Ещё '+(before.needed-before.current)+' ◆ — чертежи капают за победы на этой машине');return;}
 const up=levelUpCar(save,save.selected,unlockCost);
 if(!up)return;
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
 await challengeUI.open();
};
$('#race-button').onclick=()=>metaUI.open('rivals');$('#quit-race').onclick=goGarage;$('#result-garage').onclick=goGarage;$('#result-practice').onclick=async()=>{if(sceneTransition.busy||$('#result-practice').hidden||practiceMode||duelRace||phase!=='finished')return;await closeDialog($('#result-dialog'));await goRace(true);};$('#race-again').onclick=async()=>{if(sceneTransition.busy)return;const challenge=duelRace?.challenge;await closeDialog($('#result-dialog'));if(challenge){await goGarage();if(challenge.role==='a'){try{if(challengeShare?.link)await sendInvite(challenge.id,challengeShare.link,challengeShare.text);else await shareChallenge(challenge.id);}catch(e){toast(e.message);}await challengeUI.open();return;}try{const r=await challengeApi.rematch(challenge.id);await createChallenge({rivalId:r.rivalId,parentId:r.parentId});}catch(e){toast(e.message);await challengeUI.open();}return;}if(duelRace){await goGarage();duelUI.open();}else {const next=player?.ridgeBattle&&battleMatch?.rounds.length===1?Object.assign(battleMatch,{round:2}):!!player?.ridgeBattle;await goRace(practiceMode,player?.overpass&&practiceMode?{overpass:currentOpponent.district}:raceMap,null,next,activeDriftBonus);}};$('#result-dialog').addEventListener('cancel',e=>{e.preventDefault();goGarage();});
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
let introActive=false,introElapsed=0,introTotal=0,introResolve=null,pendingIntro=null;const introShown=new Set();
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
 raceCamera.position.set(lerp(pos.x,raceView.x,back),lerp(pos.y,raceView.y,back),lerp(pos.z,raceView.z,back));raceCamera.up.set(0,1,0);raceCamera.lookAt(lerp(look.x,0,back),lerp(look.y,0,back),lerp(look.z,2,back));raceCamera.fov=lerp(fov,raceView.fov,back);raceCamera.updateProjectionMatrix();}
// Портрет грузится только когда он нужен, и только если он у персонажа есть: без него заставка
// выглядит как раньше. Класс снимается и ставится заново, иначе анимация выхода не перезапустится.
function showIntroPortrait(name){
 const el=$('#boss-intro'),img=$('#intro-portrait'),src=portraitFor(name);
 el.classList.remove('with-portrait');
 if(!src){img.hidden=true;img.removeAttribute('src');return;}
 img.hidden=false;img.src=src;img.alt=name;
 void el.offsetWidth;el.classList.add('with-portrait');
}
// Заставка идёт в два шага: сначала человек и его реплика, потом его машина. Тап переводит на следующий шаг,
// а если игрок не трогает экран — шаги сменяются сами.
function runBossIntro(opp){return new Promise(resolve=>{const el=$('#boss-intro');
 $('#intro-kicker').textContent=opp.boss?'БОСС РАЙОНА · '+TRACKS[opp.map].name:'ГЛАВАРЬ · '+CREWS[opp.series].toUpperCase();
 $('#intro-name').textContent=opp.name;
 $('#intro-role').textContent=characterFor(opp.name)?.role||'';
 $('#intro-car-name').textContent=CARS[opp.car].name;
 $('#intro-cars').textContent=CARS[opp.car].name+' · МОЩЬ '+rating(opp.levels,CARS[opp.car].id)+' против твоих '+rating(effectiveLevels(save),CARS[save.selected].id);
 $('#intro-taunt').textContent='«'+(lineFor(opp.name)||tauntFor(opp.name)||PLACEHOLDER_TAUNT)+'»';
 showIntroPortrait(opp.name);
 buildAtmosphere(el.querySelector('.intro-fx'),el.querySelector('.intro-dust'));/* пересобираем каждый раз: разброс частиц не повторяется */
 el.dataset.step='1';$('#race-callout').hidden=true;el.hidden=false;
 introActive=true;introStep=1;introElapsed=0;introTotal=introStepLength(1,opp);introResolve=resolve;el.onclick=skipIntro;});}
function introStepLength(step,opp){
 // Первый шаг висит, пока игрок не тапнет: это знакомство, торопить его нечем.
 if(step===1)return Infinity;
 return reducedMotion?1.4:3;
}
function advanceIntro(){
 if(introStep===1){introStep=2;introElapsed=0;introTotal=introStepLength(2);$('#boss-intro').dataset.step='2';return true;}
 return false;
}
function skipIntro(){if(!introActive)return;if(advanceIntro())return;introElapsed=Math.max(introElapsed,introTotal-.35);}
function finishIntro(){if(!introActive)return;introActive=false;introStep=1;$('#boss-intro').hidden=true;$('#boss-intro').onclick=null;$('#race-callout').hidden=false;const r=introResolve;introResolve=null;r?.();}
function settleBattle(){
 if(settled)return;settled=true;phase=player.crashed?'crashed':'finished';gasHeld=false;ridgeControls.reset();resetFinishFilm();$('#race-callout').hidden=true;
 const round=recordBattleRound(battleMatch,player,rival),complete=battleMatch.rounds.length===2,totals=battleMatch.totals,won=totals[0]>totals[1],draw=totals[0]===totals[1];
 // One reward for a completed pair, never for the intermediate result or an abandoned match.
 finishPresentation.result({mode:'battle',score:totals[0],opponentScore:totals[1],crashed:!complete&&!!player.crashed});
 const result=complete&&totals[0]>0?rewardRace(save,{won,perfect:0,opp:currentOpponent,time:player.finishTime||player.time}):{cash:0};lastRaceResult=complete?result:null;if(complete)persist();$('#cash').textContent=fmt(save.cash);$('#hard').textContent=fmt(save.hard);
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
function settle(){if(settled)return;if(player.ridgeBattle){settleBattle();return;}if(player.ridge){settleDrift();return;}if(duelRace?.challenge){settleChallenge();return;}if(duelRace){settleDuel();return;}settled=true;phase='finished';resetFinishFilm();finishPresentation.result({time:player.finishTime,opponentTime:rival.crashed?undefined:rival.finishTime});gasHeld=false;const clean=player.perfect>=(currentOpponent.requiredPerfect||0),won=(rival.crashed||player.finishTime<rival.finishTime)&&clean;const result=rewardRace(save,{won,perfect:player.perfect,opp:currentOpponent,time:player.finishTime,rivalTime:rival.crashed?null:rival.finishTime});lastRaceResult=result;persist();$('#cash').textContent=fmt(save.cash);const tier=resultTier(result,save,won),headline=resultHeadline(tier,{result,save,won,clean,opponent:currentOpponent,player,rival,practice:practiceMode});$('#result-dialog').dataset.tier=tier;$('#result-kicker').textContent=headline.kicker;$('#result-title').textContent=headline.title;$('#result-time').textContent=player.finishTime.toFixed(2)+' с';$('#rival-time').textContent=rival.crashed?'ВЫЛЕТ':rival.finishTime.toFixed(2)+' с';$('#reward').textContent='+'+result.cash+' ₽';$('#race-again').textContent=practiceMode?'ЕЩЁ ТРЕНИРОВКА':result.fresh?(result.unlockedMap!==null?'НА НОВУЮ ТРАССУ':save.rank===CAMPAIGN_LENGTH?'РЕВАНШ С ЧЕМПИОНОМ':'СЛЕДУЮЩИЙ СОПЕРНИК'):'РЕВАНШ';$('#result-practice').hidden=won||practiceMode;$('#result-comment').textContent=headline.comment;$('#result-shifts').textContent='Идеальные переключения: '+player.perfect+(player.ridge?'':' / '+(player.maxGear-1));let lines=[];if(result.unlockedMap!==null)lines.push('<b>НОВАЯ ТРАССА: '+TRACKS[result.unlockedMap].name+'</b>');if(result.fresh)lines.push(save.rank<CAMPAIGN_LENGTH?'Следующий: '+opponent(save).name:'Все 225 заездов пройдены');$('#hard').textContent=fmt(save.hard);result.details='<div class=finish-details>'+lines.join('<br>')+'</div>';$('#reward').textContent='';$('#result-loot').innerHTML=raceLootMarkup(result)+result.details;const celebrate=tier==='district'||tier==='champion'||(won&&!!result.carShard?.unlocked);if(celebrate)showCelebration(celebrationMarkup(tier,{result,save,opponent:currentOpponent}),()=>openDialog($('#result-dialog')));else openDialog($('#result-dialog'));if(FEATURES.event&&save.rank>=SOCIAL_RANK)eventUI?.finish({won,perfect:player.perfect,time:player.finishTime});/* the event joins in after the first garage window */const attempt=(attemptCounts.get(currentOpponent.id)||0)+1;attemptCounts.set(currentOpponent.id,attempt);racesThisSession++;track('race',{stage:currentOpponent.id,kind:practiceMode?'training':'campaign',beat:currentOpponent.beat,captain:!!currentOpponent.captain,boss:!!currentOpponent.boss,opponent:currentOpponent.name,opponentCar:CARS[currentOpponent.car].id,opponentPower:rating(currentOpponent.levels,CARS[currentOpponent.car].id),distance:currentOpponent.distance,track:TRACKS[raceMap]?.id,look:currentOpponent.look?.look||null,wet:currentOpponent.surface<1,rough:!!currentOpponent.rough,won,fresh:!!result.fresh,tier,time:+player.finishTime.toFixed(3),rivalTime:+rival.finishTime.toFixed(3),margin:+(rival.finishTime-player.finishTime).toFixed(3),perfect:player.perfect,good:player.good,missed:player.missed,required:currentOpponent.requiredPerfect||0,attempt,launch:player.launchLog||null,shifts:player.shiftLog||[],equipped:{...save.equipped[save.selected]},drop:result.drop?.id||null});sfx(tier==='race'?(won?'win':'shift'):tier==='series'?'fanfare':'fanfare-long');}
function tickDuelRace(dt){
 duelAccumulator+=dt;
 while(duelAccumulator>=DUEL.step&&duelFrame<DUEL.maxSteps){
  if(duelFrame===DUEL.launchSteps&&!duelInputs.length)beginLaunch();
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
 $('#reward').textContent='ПРОВЕРКА';$('#race-again').textContent=mine?'КИНУТЬ ССЫЛКУ':'РЕВАНШ';
 $('#result-comment').textContent='Сохраняем старт и переключения';
 $('#result-shifts').textContent='Идеальные: '+player.perfect;
 $('#result-loot').innerHTML='';$('#result-event').hidden=true;
 openDialog($('#result-dialog'));
 try{
  const r=await challengeApi.run(ch.id,duelInputs);
  if(duelRace?.challenge?.id!==ch.id||!$('#result-dialog').open)return;
  if(mine){
   challengeShare={link:r.link,text:r.text};
   // Вызов брошен — итога ещё нет. «1 место» здесь врёт: соперник даже не выезжал. Показываем,
   // кому ушёл вызов, и своё время одной строкой.
   $('#result-dialog').dataset.tier='sent';
   $('#result-kicker').textContent='ВЫЗОВ БРОШЕН';
   $('#result-title').textContent='ТВОЁ ВРЕМЯ · '+r.time.toFixed(2)+' с';
   $('#result-time').textContent=r.time.toFixed(2)+' с';
   $('#result-loot').innerHTML=invitedMarkup(challengeCalled.names,challengeCalled.photos);
   $('#result-comment').textContent='Кто не вывезет, тот и проиграл.';
   $('#reward').textContent='ЖДЁМ ОТВЕТА';
   finishPresentation.clear();
   sfx('shift');
   return;
  }
  const texts=r.won?RESULT_TEXTS.win:RESULT_TEXTS.lose;
  $('#result-kicker').textContent='СТРЕЛКА';
  $('#result-title').textContent=r.draw?'НИЧЬЯ':texts.title;
  $('#result-time').textContent=r.time.toFixed(2)+' с';
  $('#rival-time').textContent=r.rivalTime>0?r.rivalTime.toFixed(2)+' с':'—';
  $('#result-comment').textContent=r.draw?'Ровно. Реванш решит.':texts.line;
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
async function claimChallengeRewards(){
 let pending=[];
 try{pending=(await challengeApi.rewards()).list.filter(r=>!r.applied);}catch{return;}
 const crates=[];
 for(const reward of pending){
  try{
   const got=await challengeApi.claim(reward.id);
   const id=got.payload?.crate;
   if(!id)continue;
   grantCrate(save,id,'challenge');crates.push({id});
  }catch{}
 }
 if(!crates.length)return;
 persist();renderGarageUI();
 lastRaceResult={cash:0,scrap:0,hard:0,crates};
 $('#result-loot').innerHTML=raceLootMarkup(lastRaceResult);
 $('#reward').textContent='ТВОЙ ПАК';
}
async function settleDuel(){
 settled=true;phase='finished';resetFinishFilm();gasHeld=false;lastRaceResult=null;const ticket=duelRace.ticket;finishPresentation.result({mode:'duel',time:player.finishTime});
 $('#result-kicker').textContent=duelRace.opponent?'ДУЭЛЬ · ПРОВЕРЯЕМ ФИНИШ':'КВАЛИФИКАЦИЯ';$('#result-title').textContent='ФИНИШ';$('#result-time').textContent=player.finishTime.toFixed(2)+' с';$('#rival-time').textContent=duelRace.opponent?rival.finishTime.toFixed(2)+' с':'—';$('#reward').textContent='ПРОВЕРКА';$('#race-again').textContent='К ДУЭЛЯМ';$('#result-comment').textContent='Сохраняем старт и переключения';$('#result-shifts').textContent='Идеальные: '+player.perfect;$('#result-loot').innerHTML='';$('#result-event').hidden=true;openDialog($('#result-dialog'));
 try{const r=await duelUI.finish(ticket,duelInputs);if(duelRace?.ticket!==ticket||!$('#result-dialog').open)return;$('#result-kicker').textContent='РЕЗУЛЬТАТ ПОДТВЕРЖДЁН';$('#result-title').textContent=r.draw?'НИЧЬЯ':r.won?'ТВОЯ ВЗЯЛА!':'ЕЩЁ ПОКАЖЕМ!';$('#result-time').textContent=r.time.toFixed(2)+' с';finishPresentation.result({mode:'duel',time:r.time,verified:!!duelRace.opponent,place:r.won?1:2,draw:r.draw});$('#reward').textContent=(r.delta>=0?'+':'')+r.delta+' РЕЙТИНГ';$('#result-comment').textContent='Рейтинг: '+r.rating+' · один класс, близкая мощь';sfx(r.won?'win':'shift');}
 catch(e){if(duelRace?.ticket!==ticket||!$('#result-dialog').open)return;$('#result-kicker').textContent='РЕЗУЛЬТАТ ЖДЁТ ОТПРАВКИ';$('#result-comment').textContent='Открой дуэли, чтобы повторить сохранение.';toast(e.message);}
}
const engineBytes=fetch('assets/audio/engine.wav').then(r=>{if(!r.ok)throw Error('engine sample');return r.arrayBuffer();}).catch(()=>null);
let raceAudio,audioCtx,masterGain,musicOut,engineGain,engineVoice,soundEnabled=true;
const radio=new GarageRadio({root:$('#garage-radio'),getState:()=>({garage:screen==='garage',sound:soundEnabled,visible:!document.hidden}),prepare:()=>{soundEnabled=true;syncSoundButton();ensureAudio();}});
function ensureAudio(){if(!soundEnabled)return;try{if(!audioCtx){
 audioCtx=new(window.AudioContext||window.webkitAudioContext)();masterGain=audioCtx.createGain();masterGain.gain.value=.75;
 // Engine and effects are compressed on their own bus; music bypasses it so the motor never pumps the song. A fast limiter on the output keeps the sum from clipping on phone speakers.
 const limiter=audioCtx.createDynamicsCompressor();limiter.threshold.value=-3;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.002;limiter.release.value=.12;limiter.connect(audioCtx.destination);musicOut=limiter;
 const compressor=audioCtx.createDynamicsCompressor();compressor.threshold.value=-15;compressor.knee.value=12;compressor.ratio.value=3;const effectsBus=audioCtx.createGain();effectsBus.gain.value=.8;masterGain.connect(compressor);compressor.connect(effectsBus);effectsBus.connect(limiter);
 raceAudio=new RaceAudio(audioCtx,masterGain);engineVoice=new EngineAudio(audioCtx,masterGain);engineGain=engineVoice.bus;
 engineBytes.then(bytes=>bytes?audioCtx.decodeAudioData(bytes.slice(0)):null).then(buffer=>{if(buffer)engineVoice.attachRecording(buffer);}).catch(()=>{});
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
 engineVoice.update(player,rpm,throttle,driving?.36:revving?.27:.14);
}
function sfx(kind){if(!soundEnabled)return;ensureAudio();if(!audioCtx)return;const t=audioCtx.currentTime;
 if(kind==='shift'||kind==='perfect'||kind==='launch'||kind==='contact'||kind==='nitro'){
 const b=audioCtx.createBuffer(1,audioCtx.sampleRate*(kind==='nitro'?.9:kind==='contact'?.22:kind==='launch'?.32:.13),audioCtx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.exp(-i/d.length*(kind==='nitro'?3:12));
 const src=audioCtx.createBufferSource();src.buffer=b;const f=audioCtx.createBiquadFilter();f.type='bandpass';f.frequency.value=kind==='nitro'?3200:kind==='contact'?260:kind==='launch'?2200:kind==='perfect'?1600:850;if(kind==='nitro'){f.Q.value=.6;f.frequency.setValueAtTime(3400,t);f.frequency.exponentialRampToValueAtTime(900,t+.85);}const g=audioCtx.createGain();g.gain.value=kind==='nitro'?.3:kind==='contact'?.48:kind==='launch'?.13:.22;src.connect(f);f.connect(g);g.connect(masterGain);src.start();src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};return;}
 if(kind==='fanfare'||kind==='fanfare-long'){const long=kind==='fanfare-long',notes=long?[392,494,587,784,988]:[440,554,659],step=long?.3:.26;notes.forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain(),at=t+i*step,last=i===notes.length-1;o.type='triangle';o.frequency.setValueAtTime(f,at);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.07,at+.02);g.gain.exponentialRampToValueAtTime(.001,at+(last?.9:.34));o.connect(g);g.connect(masterGain);o.start(at);o.stop(at+1);o.onended=()=>{o.disconnect();g.disconnect();};});
  if(long){const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sawtooth';o.frequency.setValueAtTime(98,t);o.frequency.linearRampToValueAtTime(196,t+1.2);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.05,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+2.2);o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+2.3);o.onended=()=>{o.disconnect();g.disconnect();};}return;}
 const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.frequency.setValueAtTime(kind==='win'?550:kind==='tick'?650:450,t);g.gain.setValueAtTime(.055,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+.17);o.onended=()=>{o.disconnect();g.disconnect();};}
$('#sound').onclick=()=>{soundEnabled=!soundEnabled;syncSoundButton();ensureAudio();updateAudio();};syncSoundButton();const unlockAudio=e=>{if(e.target.closest?.('#garage-radio'))return;ensureAudio();radio.gesture();};document.addEventListener('pointerdown',unlockAudio,{capture:true});document.addEventListener('keydown',unlockAudio,{capture:true});document.addEventListener('visibilitychange',updateAudio);window.addEventListener('pagehide',()=>radio.silence(true));window.addEventListener('pageshow',()=>radio.sync(true));

function smoke(dt){if(player?.ridge)return;raceEffects?.update(dt,player,rival,[playerModel,rivalModel],phase,reducedMotion);}
function animateWheels(model,speed,dt,car){for(const wheel of model?.userData.wheels??[])if(!(car?.ridge&&car.handbrake&&wheel.name.startsWith('Wheel_R')))wheel.rotation.z+=speed*dt/(model.userData.wheelRadius||.37);}
function updateRaceScene(dt){
 if(player?.overpass){world.update(player.travelDistance??player.distance,player,rival,[playerModel,rivalModel],dt,reducedMotion);return;}
 const travel=player.travelDistance??player.distance;
 const crash=player.crashBody;if(crash&&crash.impacts!==(crash.audioImpacts||0)&&crash.impact>3&&clock-(crash.audioTime||0)>.22){crash.audioImpacts=crash.impacts;crash.audioTime=clock;sfx('contact');haptics(crash.impact>9?'crash':'contact');}
 for(const r of roadItems){r.obj.position.z=((r.start+travel+300)%r.span+r.span)%r.span-300;r.obj.visible=r.obj.position.z>-240&&r.obj.position.z<95;}
 const gap=clamp(-((rival.travelDistance??rival.distance)-travel),-23,18);rivalModel.position.z=THREE.MathUtils.lerp(rivalModel.position.z,gap,1-Math.exp(-9*dt));
 const acceleration=(player.speed-previousSpeed)/Math.max(dt,.001);previousSpeed=player.speed;const pose=carPose(player.speed,acceleration,clock,shake,reducedMotion);const ride=raceScene.userData.roadRide.update(dt,playerModel,player.speed,travel,reducedMotion);playerModel.position.y=pose.height+ride.height;playerModel.rotation.z=pose.pitch*(player.handling?.pitch||1)+ride.pitch;playerModel.rotation.x=pose.roll+ride.roll;const other=carPose(rival.speed,2,clock+.4,0,reducedMotion);const otherRide=raceScene.userData.roadRide.update(dt,rivalModel,rival.speed,travel,reducedMotion);rivalModel.position.y=other.height+otherRide.height;rivalModel.rotation.z=other.pitch*(rival.handling?.pitch||1)+otherRide.pitch;rivalModel.rotation.x=other.roll+otherRide.roll;
 animateWheels(playerModel,player.crashBody?.wheelSpeed??player.speed,dt,player);animateWheels(rivalModel,rival.crashBody?.wheelSpeed??rival.speed,dt,rival);

 raceScene.userData.start.position.z=-3+travel;raceScene.userData.finish.position.z=-(player.raceDistance+3)+travel;raceScene.userData.tree.position.z=-6+travel;
 world.update?.(travel,player,rival,[playerModel,rivalModel],dt,reducedMotion);
 shake=Math.max(0,shake-dt*.9);
}
function updateRaceCamera(dt){
 if(player?.overpass){world.camera(raceCamera,player,playerModel,dt,reducedMotion);return;}
 if(player?.ridge){const target=player.crashed?70:['ready','countdown','launch'].includes(phase)?310:phase==='running'?145:0;raceCamera.userData.driftOffset=damp(raceCamera.userData.driftOffset??target,target,dt,4);raceCamera.setViewOffset(1000*raceCamera.aspect,1000,0,-raceCamera.userData.driftOffset,1000*raceCamera.aspect,1000);}else if(raceCamera.view?.enabled){raceCamera.clearViewOffset();delete raceCamera.userData.driftOffset;}
 if(player?.crashed){const m=playerModel,center=new THREE.Vector3(0,player.crashBody.cg,0).applyQuaternion(m.quaternion).add(m.position),t=1-Math.exp(-dt*3.5),lead=Math.min(3,player.speed*.08),road=ridgeLocal(player.crashBody.hint,0,player.travelDistance??player.distance),out=new THREE.Vector3(center.x-road.x,0,center.z-road.z).normalize();raceCamera.position.lerp(new THREE.Vector3(center.x+out.x*12,center.y+7,center.z+out.z*12+4+lead),t);raceCamera.up.set(0,1,0);const aim=raceCamera.userData.crashTarget??=new THREE.Vector3(0,0,2);aim.lerp(center,1-Math.exp(-dt*14));raceCamera.lookAt(aim);raceCamera.fov=damp(raceCamera.fov,52,dt,3);raceCamera.updateProjectionMatrix();return;}

 if(!reducedMotion&&phase==='coasting'&&!settled&&playerModel&&!player.ridgeBattle){const film=finishCameraFrame(coastElapsed,{x:playerModel.position.x,y:playerModel.position.y,width:playerModel.userData.carWidth,height:CARS[duelRace?duelRace.player.car:save.selected]?.height,length:playerModel.userData.carLength},finishFilmSide);raceCamera.position.set(film.position.x,film.position.y,film.position.z);raceCamera.up.set(Math.sin(film.roll),Math.cos(film.roll),0);raceCamera.lookAt(film.target.x,film.target.y,film.target.z);raceCamera.fov=film.fov;raceCamera.updateProjectionMatrix();$('#game').dataset.raceShot=film.id;return;}
 if(player?.ridge&&(phase==='running'||player.ridgeBattle&&phase==='coasting')){followRidgeCamera(raceCamera,playerModel,player,dt,reducedMotion,rivalModel);return;}
 const ridge=player?.ridge;const coasting=reducedMotion&&['coasting','finished'].includes(phase),impulse=reducedMotion?0:shake,target={x:coasting?3.1:ridge?1.5:2,y:coasting?11.2:ridge?8.6:12,z:coasting?22:ridge?13.2:21,fov:46+(reducedMotion?0:Math.min((player?.speed||0)*(ridge?.20:.12),ridge?10:6))};for(const k of Object.keys(target))raceView[k]=reducedMotion?target[k]:damp(raceView[k],target[k],dt,4.5);raceCamera.position.set(raceView.x+Math.sin(clock*65)*impulse,raceView.y+Math.cos(clock*53)*impulse*.4,raceView.z+impulse*.8);raceCamera.up.set(0,1,0);raceCamera.lookAt(0,0,2);raceCamera.fov=raceView.fov+impulse*3;raceCamera.updateProjectionMatrix();
}
function frame(now){
 requestAnimationFrame(frame);if(warming){last=now;hushEngine();return;}if(document.hidden){last=0;quality.reset();hushEngine();return;}const elapsed=last?(now-last)/1000:1/60,dt=Math.min(elapsed,(screen==='race'&&player?.ridge)? .20 : .05);last=now;clock+=dt;if(screen==='race'&&quality.sample(elapsed)){resize();shadowBudget(raceScene?.userData.sun,quality.settings);shadowBudget(garageScene?.userData.sun,quality.settings,true);raceEffects?.setQuality(quality.settings);weather?.setQuality(quality.settings);}
 if(screen==='race'&&player?.overpass){frameOverpass(dt);updateAudio();return;}
 if(screen==='garage'){garageYaw+=garageIdle.update(dt,dragging||customizer?.isOpen||sceneTransition.busy||!!document.querySelector('dialog[open]'),reducedMotion);const moving=updateGarageCamera(1-Math.exp(-dt*12)),glow=selectionGlow?.update(dt,CARS[save.selected],customizer?.focusSlot,inspectionAnchor,reducedMotion);if(garageDirty||moving)garageScene.userData.sun.shadow.needsUpdate=true;if(garageDirty||moving||glow){graphics.render(garageScene,garageCamera);garageDirty=false;}}
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
   if(player.finished&&phase==='running'&&(!player.ridgeBattle||battleOutcome)){phase='coasting';coastElapsed=0;showRaceFinish();if(!reducedMotion)$('#game').dataset.raceFilm='true';$('#shift-button').disabled=true;$('#shift-label').textContent='ФИНИШ';$('#race-callout').hidden=false;$('#race-callout strong').textContent=player.ridgeBattle?'ЗАЕЗД ЗАВЕРШЁН':'ФИНИШ';$('#race-callout small').textContent='';$('#feedback').textContent='';}
   if(phase==='coasting'){coastElapsed+=dt;if(coastElapsed>1.4)$('#race-callout').hidden=true;if(coastElapsed>=(player.ridgeBattle?2.4:reducedMotion?2.6:FINISH_FILM_DURATION)&&(player.ridge||rival.finished||rival.crashed))settle();}
   if(phase==='running'&&!player.ridge){
    feedbackTimer-=dt;if(feedbackTimer<=0){const [lo,hi]=shiftZone(player),good=player.rpm>=lo&&player.rpm<=hi;$('#feedback').textContent=player.ridge&&player.braking?'ТОРМОЖЕНИЕ · '+player.gear+'-Я ПЕРЕДАЧА':player.heat>.5?'ПЕРЕГРЕВ!':player.gear===player.maxGear?'ДО ФИНИША!':good||player.rpm>player.redline-400?'ПЕРЕКЛЮЧАЙ!':'';$('#feedback').style.color=good?'#c7e792':'#d7c69b';}
   }
   if(phase!=='crashing')updateRaceScene(dt);
  }
  if(phase==='crashing'){tickCar(player,dt);if(player.ridgeBattle)tickCar(rival,dt);if(!player.ridge)tickOpponent(rival,currentOpponent,dt);updateRaceScene(dt);if(player.crashElapsed>1.2)$('#race-callout').hidden=true;if(ridgeCrashPresentationDone(player,reducedMotion))settleRidgeCrash();}
  // The result holds the final crash frame; do not expose a long background tumble.
  smoke(dt);if(introActive){introElapsed+=dt;if(!reducedMotion&&introStep===2)bossIntroCamera(introElapsed,introTotal);if(introElapsed>=introTotal&&!advanceIntro())finishIntro();}else updateRaceCamera(dt);weather?.update(dt,player,rival,playerModel,rivalModel);updateDashboard();graphics.render(raceScene,raceCamera);
 }
 updateAudio();
}

function registerTools(){const ctx=document.modelContext;if(!ctx?.registerTool)return;const ctrl=new AbortController();const tools=[{name:'read_garage',title:'Прочитать состояние гаража',description:'Read the selected car, upgrades, money, records and current race state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({screen,phase,ready,...structuredClone(save)})},{name:'upgrade_car_part',title:'Улучшить конкретную деталь',description:'Upgrade one owned part by its ID. The upgrade stays on this part only and costs money and materials.',inputSchema:{type:'object',properties:{partId:{type:'string',enum:PARTS.map(p=>p.id)}},required:['partId'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(screen!=='garage'||!input||!save.inventory[input.partId])return {ok:false,error:'Выбери полученную деталь в гараже'};if(!tunePart(save,input.partId))return {ok:false,error:'Максимум или не хватает ресурсов'};persist();renderGarageUI();customizer?.refresh();return {ok:true,partId:input.partId,rank:save.inventory[input.partId].rank,cash:save.cash,scrap:save.scrap};}}];for(const tool of tools)try{Promise.resolve(ctx.registerTool(tool,{signal:ctrl.signal})).catch(()=>{});}catch{}window.addEventListener('pagehide',()=>ctrl.abort(),{once:true});}
customizer=bindCustomizer({save,changed:()=>{persist();renderGarageUI();},previewCar:placeGarageCar,resized:resize,toast,sfx});
eventUI=FEATURES.event?bindEvent({save,changed:()=>{persist();renderGarageUI();},toast,sfx}):null;/* выключенный ивент не поднимаем: иначе он дёргает /api/event на каждом запуске и заезде */
challengeIntro=bindChallengeIntro();
challengeUI=bindChallengeUI({api:challengeApi,onCreate:createChallenge,onDrive:driveChallenge,onAccept:acceptChallenge,onStart:startChallenge,onShare:shareChallenge,onClaim:async id=>{const got=await challengeApi.claim(id);const crate=got.payload?.crate;if(!crate)return;grantCrate(save,crate,'referrals');persist();renderGarageUI();toast('Ящик твой. Он ждёт в «Ящиках»');track('referral_reward',{crate});},toast});
duelUI=bindDuels({startRace:r=>goRace(false,null,r),getBuild:()=>({car:save.selected,levels:effectiveLevels(save),equipment:save.equipped[save.selected],paint:save.paint[save.selected],decal:save.decal[save.selected]}),toast});
metaUI=bindMeta({save,profiles,identity:()=>{const u=tgUser();return u?{name:[u.first_name,u.last_name].filter(Boolean).join(' ')||u.username||null,photo:u.photo_url||null}:{};},openCustomizer:id=>customizer.open(id),changed:()=>{persist();renderGarageUI();},refreshCar:()=>{if(ready)placeGarageCar();},startRace:goRace,openDuels:()=>duelUI.open(),selectCar,renderFleetPreviews,toast,sfx});$('#profile-button').onclick=()=>metaUI.open('profile');bindShell($('#fullscreen-toggle'),toast);restoreOnGesture();setTimeout(()=>suggestOnce(toast),6000);/* profiles replace the event profile while the event is off */// В Telegram позывной не спрашиваем: имя и аватар приходят из аккаунта, а прогресс живёт на сервере.
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
 try{
  const session=await signIn({source:new URLSearchParams(location.search).get('utm')});
  if(!session)return;
  track('telegram_app_open',{created:!!session.created,startParam:session.startParam||null});
  cloud.start({save:session.save,revision:session.revision,local:save});
  challengeApi.flush().catch(()=>{});
  const entry=parseStartParam(session.startParam);
  if(entry?.kind==='challenge')openInvite(entry.id);
 }catch(e){toast('Telegram не пустил в игру. Играем локально');}
 finally{telegramSyncing=false;}
})();(()=>{const direct=new URLSearchParams(location.search).get('startapp');const entry=direct&&parseStartParam(direct);if(entry?.kind==='challenge'&&!telegramLaunch)openInvite(entry.id);})();renderGarageUI();if(save.migrationNotice){const n=save.migrationNotice;delete save.migrationNotice;persist();toast('Доработка отменена: +'+fmt(n.cash)+' ₽. На прокачку деталей: +'+n.materials+' ⚒');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),9000);}else persist();registerTools();init();

document.addEventListener('click',async e=>{const button=e.target.closest('[data-bonus-drift]');if(!button||sceneTransition.busy)return;const ticket=availableDriftBonuses(save).find(t=>t.key===button.dataset.bonusDrift);if(!ticket)return;for(const dialog of document.querySelectorAll('dialog[open]'))await closeDialog(dialog);await goRace(true,ticket.map,null,false,ticket.key);});
