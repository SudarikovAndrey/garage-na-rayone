import {loadResidentialKit} from '../residential-kit.js';
import {loadIndustrialKit} from '../industrial-kit.js';
import {lightingDebug} from './lighting-debug.js';
import {lightingConfig} from '../lighting-state.js';
import * as T from 'three';
import {createPuddleDebug} from './puddle-debug.js';
import {PUDDLE_CONFIG} from '../puddle-layout.js';
import {createGLTFLoader} from '../gltf.js';
import {createRaceWorld,scrollRaceScenery} from '../race-world.js';
import {CARS} from '../fleet.js';
import {applyCustomization} from '../car-customization.js';
import {loadWheelKit} from '../wheel-kit.js';
import {PREVIEW_SPEEDS,PREVIEW_TUNING,previewSpeed,previewTuning} from './race-preview-options.js';
import {GameRenderer,outdoorEnvironment,captureEnvironment,shadowBudget} from '../pbr-renderer.js';
import {LOOKS,TRACKS} from '../tracks.js';
import {WeatherEffects} from '../weather-effects.js';
import {QUALITY,MOBILE_RENDER,AdaptiveQuality,deferMobileFrame} from '../render-quality.js';
import {attachGroundLight} from '../ground-light.js';
import {dragCameraFrame} from '../drag-camera.js';
import {RacePeek,bindRacePeek,composeRacePeek} from '../race-peek.js';
const $=id=>document.getElementById(id),renderer=new T.WebGLRenderer({antialias:false});document.body.append(renderer.domElement);renderer.toneMapping=T.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.info.autoReset=false;
const params=new URLSearchParams(location.search);
$('lighting-quality').value=String(Math.max(0,Math.min(2,Math.round(Number(params.get('quality')??1)||0))));
const adaptive=new AdaptiveQuality();let requestedQuality=Number($('lighting-quality').value);adaptive.level=requestedQuality;
const light=params.get('light')||'sunset',weatherMode=params.get('weather')||'damp';
$('light').value=light;$('weather').value=weatherMode;
for(const t of TRACKS.slice(0,5))$('track').add(new Option(t.name,t.id));
const trackIndex=Math.max(0,TRACKS.slice(0,5).findIndex(t=>t.id===params.get('track')));$('track').value=TRACKS[trackIndex].id;
const look=LOOKS.find(l=>l.look===light)||LOOKS[0],wet=weatherMode==='clear'?0:weatherMode==='storm'?1:weatherMode==='damp'?.35:.65;
const cfg={...TRACKS[trackIndex],...look,look:light,environmentState:light==='storm'?'night':light,wet,damp:weatherMode==='damp',fogDensity:weatherMode==='damp'?.0055:undefined,storm:weatherMode==='storm'?1:0};
const waterDensity=Math.max(.3,Math.min(2,Number(params.get('waterDensity'))||1)),waterSeed=Number(params.get('waterSeed')??PUDDLE_CONFIG.seed)>>>0;
const waterSize=[1,2,5,10].includes(Number(params.get('waterSize')))?Number(params.get('waterSize')):1;cfg.puddles={density:waterDensity,seed:waterSeed,areaScale:waterSize};$('puddle-size').value=String(waterSize);
$('puddle-density').value=waterDensity;$('puddle-seed').value=waterSeed;
Object.assign(cfg,lightingConfig(cfg));
const kitReady=trackIndex===1?loadIndustrialKit():trackIndex===0?loadResidentialKit():Promise.resolve();
const carAssetsReady=Promise.all(['mine','rival'].map((id,i)=>{const car=CARS.find(c=>c.id===params.get(id))||CARS[i];return createGLTFLoader().loadAsync('/assets/race-cars/'+car.id+'.glb');}));
const textures={},loader=new T.TextureLoader();
await Promise.all([kitReady,...['brick_wall_001_Diffuse','garage_floor_Diffuse','brick_wall_001_nor_gl','garage_floor_nor_gl'].map(async name=>{const t=await loader.loadAsync('/assets/materials/'+name+'.jpg');t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;if(name.endsWith('Diffuse'))t.colorSpace=T.SRGBColorSpace;textures[name]=t;})]);
// Match the game's asphalt albedo and local environment, so the demo is representative.
const pixels=new Uint8Array(512*512*4);let seed=701;for(let i=0;i<pixels.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const v=61+seed/4294967296*22;pixels[i]=v;pixels[i+1]=v+2;pixels[i+2]=v-8;pixels[i+3]=255;}
const road=new T.DataTexture(pixels,512,512);Object.assign(road,{generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter,anisotropy:4,wrapS:T.RepeatWrapping,wrapT:T.RepeatWrapping,colorSpace:T.SRGBColorSpace});road.repeat.set(3,70);road.needsUpdate=true;
const graphics=new GameRenderer(renderer),world=createRaceWorld(trackIndex,{look:cfg,textures,roadTexture:road}),scene=world.scene,camera=new T.PerspectiveCamera(50,innerWidth/innerHeight,.1,300);
const environment=outdoorEnvironment(renderer,cfg);scene.environment=environment.texture;
const probe=captureEnvironment(renderer,scene,new T.Vector3(-1.9,1.1,-2));scene.environment=probe.texture;
let puddleDebug=createPuddleDebug(scene.userData.wetRoad,world.moving);$('puddle-debug').checked=params.has('puddleDebug');const showWaterDebug=()=>{puddleDebug.set($('puddle-debug').checked);$('water-stats').hidden=!$('puddle-debug').checked;};$('puddle-debug').onchange=showWaterDebug;showWaterDebug();
renderer.toneMappingExposure=cfg.night?1.16:1;shadowBudget(scene.userData.sun,QUALITY[Number($('lighting-quality').value)]);
const selection=[params.get('mine')||CARS[0].id,params.get('rival')||CARS[1].id];
const tuning=[previewTuning(params.get('mine-tuning')),previewTuning(params.get('rival-tuning'))];
for(const [i,id] of ['mine','rival'].entries()){
 for(const c of CARS)$(id).add(new Option(c.name,c.id));
 selection[i]=CARS.some(c=>c.id===selection[i])?selection[i]:CARS[i].id;$(id).value=selection[i];
 for(const p of PREVIEW_TUNING)$(id+'-tuning').add(new Option(p.name,p.id));$(id+'-tuning').value=tuning[i].id;
}
$('settings-panel').open=params.has('settings');
if(tuning.some(p=>p.id!=='stock'))await loadWheelKit();
const models=[],carAssets=await carAssetsReady;
for(let i=0;i<2;i++){
 const meta=CARS.find(c=>c.id===selection[i]),car=carAssets[i].scene,root=new T.Group();
 car.userData.fit=meta;Object.assign(root.userData,{racing:true,carWidth:meta.width,carLength:meta.length,carHeight:meta.height,wheelbase:meta.wheelbase,axleOffset:meta.axleOffset,wheelRadius:meta.radius,wheels:[],tailMaterials:[]});
 root.add(car);applyCustomization(root,car,tuning[i].equipment,meta.color);root.rotation.y=-Math.PI/2;root.position.set(i?1.9:-1.9,0,0);
 root.traverse(o=>{if(/^Wheel_[FR][LR]$/.test(o.name))root.userData.wheels.push(o);if(o.isMesh)o.castShadow=o.receiveShadow=true;});
 const ground=attachGroundLight(root,meta,{ambient:cfg.night?1:.26});ground.setHeight(0);ground.setBeam(cfg.night?1:0);ground.setTail(cfg.night?.65:.1);
 root.traverse(o=>{if(!o.isMesh)return;const m=o.material;if(/headlight/i.test(m.name)){m.emissive.set(0xffdfaa);m.emissiveIntensity=cfg.night?2.2:.12;}if(/^Red lens/.test(m.name)){m.emissive.set(0xff2010);m.emissiveIntensity=cfg.night?.65:.1;root.userData.tailMaterials.push(m);}});
 scene.add(root);models.push(root);
}
const smokePixels=new Uint8Array(32*32*4);for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4;smokePixels[i]=smokePixels[i+1]=smokePixels[i+2]=255;smokePixels[i+3]=Math.max(0,1-Math.hypot((x-15.5)/16,(y-15.5)/16))**2*255;}const smoke=new T.DataTexture(smokePixels,32,32);smoke.needsUpdate=true;
let weather=new WeatherEffects(scene,world.cfg,false,smoke);weather.setQuality(QUALITY[Number($('lighting-quality').value)]);if(world.cfg.weatherState!=='storm')weather.nextFlash=Infinity;
const lightDebug=lightingDebug(scene.userData.lighting,scene);$('lighting-debug').onchange=()=>{lightDebug.set($('lighting-debug').checked);$('lighting-stats').hidden=!$('lighting-debug').checked;};
$('lighting-quality').onchange=()=>{requestedQuality=Number($('lighting-quality').value);adaptive.level=requestedQuality;adaptive.reset();const url=new URL(location.href);url.searchParams.set('quality',$('lighting-quality').value);history.replaceState(null,'',url);const q=QUALITY[Number($('lighting-quality').value)];weather.setQuality(q);shadowBudget(scene.userData.sun,q);resize();};
const cars=models.map(()=>({speed:18,travelDistance:0,time:0,gear:3,levels:[3,1,1],finished:false}));
const state=new RacePeek();bindRacePeek(renderer.domElement,state,()=>!$('hold').checked);
let gap=0,target=0,auto=false,time=4,travel=Number(params.get('travel')||0),paused=params.has('paused'),last=0,speedKmh=previewSpeed(params.get('speed')),settleTime=4,count=0,view=null,aim=null;
for(const [id,value] of [['ahead',-20],['beside',0],['behind',20]])$(id).onclick=()=>{auto=false;target=value;};$('pass').onclick=()=>{auto=true;time=0;};
function demo(){state.reset();if($('hold').checked){state.begin(-1,0,0,390);state.move(-1,$('reverse').checked?-140:140,0);}}
if(params.has('gap'))gap=target=Number(params.get('gap'));$('hold').checked=params.has('hold');$('reverse').checked=params.has('reverse');demo();
$('travel').value=travel;$('pause').textContent=paused?'Продолжить':'Пауза';
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Продолжить':'Пауза';};
$('travel').oninput=$('travel').onchange=()=>{travel=Math.max(0,Number($('travel').value)||0);paused=true;$('pause').textContent='Продолжить';};
function reloadPreview(){
 const q=new URLSearchParams({track:$('track').value,light:$('light').value,weather:$('weather').value,travel:String(travel),gap:String(target)});
 q.set('waterDensity',String(Math.max(.3,Math.min(2,Number($('puddle-density').value)||1))));q.set('waterSeed',String(Number($('puddle-seed').value)>>>0));if($('puddle-debug').checked)q.set('puddleDebug','1');
 q.set('waterSize',$('puddle-size').value);q.set('quality',$('lighting-quality').value);if(params.get('mobile')==='1')q.set('mobile','1');
 q.set('speed',String(speedKmh));for(const id of ['mine','rival','mine-tuning','rival-tuning'])q.set(id,$(id).value);if($('settings-panel').open)q.set('settings','1');
 if(paused)q.set('paused','1');if($('hold').checked)q.set('hold','1');if($('reverse').checked)q.set('reverse','1');location.search=q;
};
for(const id of ['track','mine','rival','mine-tuning','rival-tuning'])$(id).onchange=reloadPreview;$('puddle-apply').onclick=reloadPreview;
$('light').onchange=()=>{scene.userData.lighting.setEnvironment($('light').value==='storm'?'night':$('light').value);refreshWeather();syncAddress();};
$('weather').onchange=()=>{scene.userData.lighting.setWeather(({clear:'dry',damp:'wet',rain:'rain',storm:'storm'})[$('weather').value]);refreshWeather();syncAddress();};
function refreshWeather(){weather.dispose();weather=new WeatherEffects(scene,world.cfg,false,smoke);weather.setQuality(QUALITY[Number($('lighting-quality').value)]);if(world.cfg.weatherState!=='storm')weather.nextFlash=Infinity;puddleDebug.dispose?.();puddleDebug=createPuddleDebug(scene.userData.wetRoad,world.moving);showWaterDebug();}
function syncAddress(){const q=new URLSearchParams(location.search);q.set('light',$('light').value);q.set('weather',$('weather').value);q.set('travel',travel.toFixed(1));history.replaceState(null,'','?'+q);}
$('hold').onchange=demo;$('reverse').onchange=demo;const showSpeed=()=>{$('shift').textContent=speedKmh+' км/ч · СМЕНИТЬ СКОРОСТЬ';};showSpeed();
$('shift').onclick=()=>{speedKmh=PREVIEW_SPEEDS[(PREVIEW_SPEEDS.indexOf(speedKmh)+1)%PREVIEW_SPEEDS.length];showSpeed();};
// A paused preview settles its camera, then stops submitting frames until an interaction.
for(const event of ['pointerdown','pointermove','pointerup','input','change','click','resize'])addEventListener(event,()=>{settleTime=4;});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();const level=Number($('lighting-quality').value);graphics.resize(innerWidth,innerHeight,devicePixelRatio,level,QUALITY[level]);}addEventListener('resize',resize);resize();
const spec=m=>({x:m.position.x,y:m.position.y,z:m.position.z,width:m.userData.carWidth,length:m.userData.carLength,height:m.userData.carHeight});
function frame(t){requestAnimationFrame(frame);if(deferMobileFrame(t,last))return;if(document.hidden){last=0;return;}const elapsed=last?(t-last)/1000:1/60,dt=Math.min(.05,elapsed);last=t;
 if(MOBILE_RENDER&&!paused&&adaptive.sample(elapsed,adaptive.level<requestedQuality)){adaptive.level=Math.min(adaptive.level,requestedQuality);$('lighting-quality').value=String(adaptive.level);const q=QUALITY[adaptive.level];weather.setQuality(q);shadowBudget(scene.userData.sun,q);resize();}
if(paused&&(settleTime-=dt)<=0)return;if(!paused)time+=dt;if(auto&&!paused)target=Math.sin(time*.42)*26;gap+=(target-gap)*(1-Math.exp(-dt*3));models[1].position.z=gap;const speed=speedKmh/3.6;if(!paused){travel+=dt*speed;for(const m of models)for(const wheel of m.userData.wheels)wheel.rotation.z+=speed*dt/m.userData.wheelRadius;}scrollRaceScenery(world.moving,travel);// Landmarks do not loop with roadside chunks: match the real race's travelled distance.
 scene.userData.start.position.z=-3+travel;scene.userData.tree.position.z=-6+travel;
 scene.userData.finish.position.z=scene.userData.finishRival.position.z=-405+travel;
 world.update(travel);for(const c of cars){c.travelDistance=travel;c.time=time;c.speed=paused?0:speed;}weather.update(paused?0:dt,...cars,...models);if(world.cfg.damp){const water=scene.userData.wetRoad;for(const lamp of water?.uniforms.wetTails.value||[])lamp.w*=.15;}state.update(dt);
 const base=dragCameraFrame({phase:'running',time,speed,sinceLaunch:5,aspect:camera.aspect,rivalZ:gap}),f=composeRacePeek(base,state,{mine:spec(models[0]),rival:spec(models[1]),aspect:camera.aspect}),a=1-Math.exp(-dt*f.lag);if(!view){view={...f.pos,fov:f.fov};aim={...f.aim};}for(const k of ['x','y','z']){view[k]+=(f.pos[k]-view[k])*a;aim[k]+=(f.aim[k]-aim[k])*a;}view.fov+=(f.fov-view.fov)*a;camera.position.copy(view);camera.up.set(Math.sin(f.roll),Math.cos(f.roll),0);camera.lookAt(aim.x,aim.y,aim.z);camera.fov=view.fov;camera.updateProjectionMatrix();graphics.render(scene,camera);
 if($('lighting-debug').checked&&count%12===0)$('lighting-stats').textContent=lightDebug.update(renderer);
 if($('puddle-debug').checked&&count%12===0)$('water-stats').textContent=puddleDebug.text();
 if(++count%12===0&&document.activeElement!==$('travel'))$('travel').value=travel.toFixed(1);
 if(count%12===0)$('status').textContent=`Соперник ${Math.abs(gap).toFixed(1)} м ${gap<0?'впереди':'позади'} · кино ${Math.round(state.amount*100)}% · ${state.pointer===null?'отпущено':'удержание'} · ${speedKmh} км/ч`;
}
requestAnimationFrame(frame);
