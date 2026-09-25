import {rewardTiles} from './reward-tiles.js';
import {ownedCrates,crateDetail,shopMarkup,offerMarkup,lootCard,paintLootCard,decalLootCard,crateOpening,crateArt} from './loot-ui.js';
import {buy} from './shop.js';
import {careerMarkup,practiceMarkup,canRaceTrack,practiceTrack} from './career.js';
import {statsText} from './played-stats.js';
import {track} from './analytics.js';
import {profileMarkup,cleanName} from './profiles.js';
import {bindCallsign,cleanRegion} from './callsign.js';
import {openDialog,closeDialog,animateContent} from './motion.js';
import {CARS} from './fleet.js';
import {TRACKS,trackIndex} from './tracks.js';
import {vehicleStats} from './vehicle-dynamics.js';
import {openBox,effectiveLevels,PARTS,restartCampaign,isCarUnlocked,carShardProgress,carSlots,CAR_SHARD_COSTS} from './progression.js';
import {LADDER,unlockHint} from './car-classes.js';
import {devMode,setDevMode,tapCounter} from './dev-mode.js';
import {avatarFromFile} from './avatar.js';
const $=s=>document.querySelector(s);
export function bindMeta({save,openCustomizer,changed,refreshCar,startRace,openDuels,selectCar,renderFleetPreviews,toast,sfx,profiles=null,identity=()=>({})}){
 let cloudList=profiles?.cloudCache?.()||[];
 let cloudLoad=null;
 let requireProfile=false;
 let overpassDistrict=trackIndex(save.rank);
 let mode='boxes',practiceMap=trackIndex(save.rank),choosing=false,shopTab='crates',returnToResult=null,fleetRender=0;const dialog=$('#meta-dialog');
 function wallet(){$('#meta-wallet').textContent=requireProfile||mode==='boxes'?'':save.cash.toLocaleString('ru-RU')+' ₽ · '+save.scrap+' ⚒ · '+save.hard+' $';}
 function fleetMarkup(){
  // Автопарк — лестница: сверху то, что уже своё, дальше то, к чему идёшь. Закрытые машины
  // показываем силуэтом и честно пишем, откуда они берутся: цель должна быть видна с первого дня.
  const slots=carSlots(save),parked=save.unlockedCars.filter(Boolean).length;
  const head=`<p class="crate-note">Мест в гараже: ${parked} из ${slots} · больше мест даёт следующий уровень гаража</p>`;
  // Свои машины наверху: это в первую очередь экран выбора, а уже потом витрина целей.
  const order=[...LADDER].sort((a,b)=>(isCarUnlocked(save,b)?1:0)-(isCarUnlocked(save,a)?1:0));
  let split=false;
  const rows=order.map(i=>{
   const c=CARS[i],own=isCarUnlocked(save,i),stats=vehicleStats(c.id,own?effectiveLevels(save,i):[0,0,0]),p=carShardProgress(save,i);
   let head='';
   if(!own&&!split){split=true;head='<h3 class="fleet-subtitle">К ЧЕМУ ИДЁШЬ</h3>';}
   if(own)return `<button class="fleet-tile ${i===save.selected?'active':''}" data-car="${i}" aria-pressed="${i===save.selected}"><img data-fleet-preview="${i}" src="assets/cars/${c.id}.webp" alt="${c.model}" width="320" height="200" loading="lazy"><b>${c.name}</b><span class="class-badge">${stats.tag}</span><small>${c.model} · мощь ${stats.rating} · ${stats.gears} ст. · ${stats.topSpeed} км/ч${i===save.selected?' · ✓ выбрана':''}</small></button>`;
   const collecting=p.current>0,full=p.current>=p.needed&&p.needed>0;
   return head+`<article class="fleet-tile locked ${collecting?'fragment':''}"><img src="assets/cars/${c.id}.webp" alt="${c.model}" width="320" height="200" loading="lazy"><b>${c.name}</b><span class="class-badge">${stats.tag}</span><small>${full?'Собрана · нужно место в гараже':unlockHint(i)||c.model}</small><span class="car-shards"><span><i style="width:${p.needed?Math.round(p.current/p.needed*100):0}%"></i></span><strong>${p.needed?'◆ '+p.current+' / '+p.needed:c.model}</strong></span></article>`;
  }).join('');
  return head+`<div class="fleet-ladder">${rows}</div>`;
 }
 async function updateFleetPreviews(token){if(!renderFleetPreviews)return;const indices=CARS.map((_,i)=>i).filter(i=>isCarUnlocked(save,i));try{const previews=await renderFleetPreviews(indices);if(mode!=='cars'||token!==fleetRender)return;for(const [i,src] of Object.entries(previews)){const img=$(`#meta-body [data-fleet-preview="${i}"]`);if(img&&src){img.src=src;img.classList.add('ready');}}}catch(error){console.warn('Fleet previews unavailable',error);}}
 // Облачный список идёт через Apps Script и думает несколько секунд. Окно открываем сразу на
 // запомненном списке, а свежие имена и их прогресс подтягиваем в фоне и дорисовываем на месте.
 function refreshCloud(){
  if(!profiles)return Promise.resolve();
  if(cloudLoad)return cloudLoad;
  cloudLoad=(async()=>{
   try{
    const list=await profiles.listCloud();
    if(list.length)cloudList=list;
    await profiles.describe([...cloudList.map(c=>c.name),...profiles.index().list.map(p=>p.name)]);
   }catch{}
   cloudLoad=null;
   if(mode==='profile'&&dialog.open)render();
  })();
  return cloudLoad;
 }
 function render(){animateContent($('#meta-body'));$('#meta-title').textContent=mode==='boxes'?'ЯЩИКИ':mode==='shop'?'БАРЫГА':mode==='look'?'ОБРАЗ':mode==='cars'?'МАШИНЫ':mode==='practice'?'ТРЕНИРОВКА':mode==='stats'?'НАИГРАННОЕ':mode==='profile'?(requireProfile?'ПОЗЫВНОЙ':'ПРОФИЛЬ'):'КАРЬЕРА';wallet();
 if(mode==='boxes')$('#meta-body').innerHTML=ownedCrates(save);
 else if(mode==='shop')$('#meta-body').innerHTML=shopMarkup(save,shopTab);
 else if(mode==='cars'){const token=++fleetRender;$('#meta-body').innerHTML=fleetMarkup();updateFleetPreviews(token);}
 else if(mode==='look')$('#meta-body').innerHTML='<img class="look-image" src="assets/garage-look.webp" alt="Эталон: вишнёвая ВАЗ-2108 в российском гараже 90-х"><p class="crate-note">Визуальный эталон. Финальные 3D-модели и обвесы — следующий этап.</p>';
 else if(mode==='practice')$('#meta-body').innerHTML=practiceMarkup(save,practiceMap,overpassDistrict);
 else if(mode==='profile'){const me=identity()||{};$('#meta-body').innerHTML=profiles?profileMarkup(profiles,save,cloudList,{required:requireProfile,dev:devMode(),photo:me.photo||null,name:me.name||null}):'<p class="crate-note">Профили недоступны.</p>';bindCallsign($('#meta-body'));}
 else if(mode==='stats'){const text=statsText(save),name=profiles?.current();$('#meta-body').innerHTML=`<div class="event-season"><span>НАИГРАННОЕ</span><b>${name?name.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])):'БЕЗ ИМЕНИ'}</b><small>ПОСЛЕДНИЕ ЗАЕЗДЫ И ПОКУПКИ · БЕЗ ЛИЧНЫХ ДАННЫХ</small></div><div class="event-tabs" role="tablist"><button role="tab" aria-selected="false" data-profile-open>ПРОФИЛЬ</button><button role="tab" aria-selected="true">НАИГРАННОЕ</button></div><section class="event-profile profiles"><textarea class="stats-text" readonly rows="14">${text.replace(/</g,'&lt;')}</textarea><button class="primary" data-share-stats>СКОПИРОВАТЬ</button><p class="event-note">Текст уже в буфере — вставь его в чат. Если буфер не дался, выдели и скопируй вручную.</p><button class="secondary" data-campaign-open>К КАМПАНИИ</button></section>`;}
 else $('#meta-body').innerHTML=careerMarkup(save,practiceMap,devMode());
 }
 function open(next){if(choosing)return;returnToResult=null;track('screen',{name:next});if(next==='parts'){closeDialog(dialog).then(()=>openCustomizer());return;}mode=next;if(next==='rivals')practiceMap=trackIndex(save.rank);render();if(!dialog.open)openDialog(dialog);if(next==='profile')refreshCloud();}
 // Первый запуск: окно позывного нельзя закрыть — иначе прогресс останется безымянным и не свяжется с плейтестом.
 async function requireName(){
  if(!profiles||profiles.current())return false;
  requireProfile=true;mode='profile';dialog.dataset.required='1';$('#meta-close').hidden=true;
  render();if(!dialog.open)openDialog(dialog);
  $('#profile-name')?.focus({preventScroll:true});
  track('profile',{action:'ask'});
  await refreshCloud();if(requireProfile)$('#profile-name')?.focus({preventScroll:true});
  return true;
 }
 function nameAccepted(){requireProfile=false;delete dialog.dataset.required;$('#meta-close').hidden=false;}
 async function exit(){if(choosing||requireProfile)return;const back=returnToResult;returnToResult=null;await closeDialog(dialog);back?.();}
 $('#meta-close').onclick=exit;dialog.addEventListener?.('cancel',e=>{e.preventDefault();exit();});for(const tab of document.querySelectorAll('[data-meta]'))tab.onclick=()=>open(tab.dataset.meta);
 function reveal(drop){animateContent($('#meta-body'));changed();wallet();$('#meta-title').textContent=drop.crate?'В ЯЩИКЕ':drop.duplicate?'МАТЕРИАЛЫ':'ТВОЯ ДОБЫЧА';$('#meta-body').innerHTML=(drop.crate?`<div class="opened-box-summary">${crateArt(drop.crate,'is-open')}<span>ЯЩИК ОТКРЫТ</span></div>`:'')+rewardTiles({drop,bonusPaint:drop.bonusPaint,bonusDecal:drop.bonusDecal})+`<p class="crate-note">Деталь в инвентаре, краски и декали — во вкладках мастерской.</p><button class="primary loot-collect" data-loot-done>${returnToResult?'К РЕЗУЛЬТАТУ':'В ГАРАЖ'} <span>✓</span></button>`;sfx('win');}
 async function openCrate(id,{onClose=null,onOpened=null}={}){
  if(choosing)return false;
  const drop=openBox(save,id);if(!drop)return false;
  choosing=true;returnToResult=onClose;mode='boxes';changed();onOpened?.(drop);wallet();
  $('#meta-title').textContent='ОТКРЫВАЕМ';$('#meta-body').innerHTML=crateOpening(id);$('#meta-body').scrollTop=0;$('#meta-close').disabled=true;
  if(!dialog.open)openDialog(dialog);
  try{
   const stage=$('#meta-body .opening-art');sfx('upgrade');
   if(stage?.animate&&!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
    await stage.animate([{transform:'translateY(0) rotate(0)'},{transform:'translateY(-3px) rotate(-2deg)',offset:.35},{transform:'translateY(0) rotate(2deg)',offset:.7},{transform:'none'}],{duration:260,easing:'ease-out'}).finished.catch(()=>{});
    stage.classList.add('lid-open');
    await stage.querySelector('.opening-open').animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:420,easing:'cubic-bezier(.2,.7,.2,1)',fill:'forwards'}).finished.catch(()=>{});
   }
   reveal(drop);
  }finally{choosing=false;$('#meta-close').disabled=false;$('#meta-body [data-loot-done]')?.focus({preventScroll:true});}
  return true;
 }

 // Enter в поле позывного (на телефоне — «Готово» на клавиатуре) отправляет форму так же, как кнопка.
 $('#meta-body').addEventListener?.('keydown',e=>{if(e.key!=='Enter'||e.target?.name!=='name')return;const f=e.target.closest?.('form[data-profile-create]');if(!f)return;e.preventDefault();f.requestSubmit?f.requestSubmit():f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 $('#meta-body').addEventListener?.('submit',e=>{const f=e.target.closest('form[data-profile-create]');if(!f||!profiles)return;e.preventDefault();const data=new FormData(f);const name=cleanName(data.get('name'));if(!name)return;
  // Код региона — часть номера игрока, храним рядом с сейвом.
  const region=cleanRegion(data.get('region'));if(save&&region)save.region=region;const current=profiles.current();if(!current){const btn=f.querySelector?.('button[type=submit]');if(btn)btn.disabled=true;profiles.adoptOrContinue(name,save).then(r=>{if(btn)btn.disabled=false;if(!r)return;track('profile',{action:'named',continued:r.continued});if(r.continued)return;changed();if(requireProfile){nameAccepted();toast('Погнали, '+name);closeDialog(dialog);}else{toast('Теперь ты '+name);render();}});}else{profiles.create(name,save);profiles.select(name,save);}});
 // Десять тапов по слову «ПРОФИЛЬ» открывают наладку и столько же закрывают. Игрок сюда не попадёт
// случайно, а нам не нужно держать в игре кнопки, которые ему только мешают.
const countTap=tapCounter();
$('#meta-body').addEventListener?.('click',e=>{
 if(!e.target.closest?.('[data-dev-tap]')||!countTap())return;
 const on=setDevMode(!devMode());
 toast(on?'Наладка открыта':'Наладка закрыта');
 render();
});
// Своё фото из галереи. Файл никуда не уходит: ужимается до квадрата и ложится в сейв.
async function pickAvatar(){
 const input=document.createElement('input');
 input.type='file';input.accept='image/*';
 input.onchange=async()=>{
  const file=input.files?.[0];if(!file)return;
  try{save.avatar=await avatarFromFile(file);changed();render();toast('Фото на месте');}
  catch(err){toast(err.message);}
 };
 input.click();
}
$('#meta-body').onclick=async e=>{const b=e.target.closest('button');if(!b||choosing)return;
 if(b.hasAttribute('data-avatar-pick')){await pickAvatar();return;}
 if(b.hasAttribute('data-avatar-clear')){save.avatar=null;changed();render();return;}
 if(b.hasAttribute('data-car')){if(choosing)return;choosing=true;b.classList.add('loading');b.querySelector('small').textContent='Загрузка…';await closeDialog(dialog);const ok=await selectCar(Number(b.dataset.car));choosing=false;if(!ok){render();openDialog(dialog);}}
 else if(b.hasAttribute('data-overpass-district')){const d=Number(b.dataset.overpassDistrict);if(Number.isInteger(d)&&d>=0&&d<=trackIndex(save.rank)){overpassDistrict=d;render();}}
 else if(b.hasAttribute('data-overpass-start')){if(choosing)return;const d=Number(b.dataset.overpassStart);if(!Number.isInteger(d)||d<0||d>trackIndex(save.rank))return;choosing=true;await closeDialog(dialog);try{await startRace(true,{overpass:d});}finally{choosing=false;}}
 else if(b.hasAttribute('data-track')){const map=Number(b.dataset.track);if(Number.isInteger(map)&&map>=0&&map<TRACKS.length){practiceMap=map;render();}}
 else if(b.hasAttribute('data-current-route')){practiceMap=trackIndex(save.rank);render();}
 else if(b.dataset.crateDetail){$('#meta-body').innerHTML=crateDetail(save,b.dataset.crateDetail);}
 else if(b.dataset.openBox){await openCrate(b.dataset.openBox);}
 else if(b.hasAttribute('data-shop')){mode='shop';render();}
 else if(b.dataset.shopTab){shopTab=b.dataset.shopTab;mode='shop';render();}
 else if(b.dataset.offer){const [kind,id]=b.dataset.offer.split(':');$('#meta-body').innerHTML=offerMarkup(save,kind,id);}
 else if(b.dataset.buy||b.dataset.buyCash){const [kind,id]=(b.dataset.buy||b.dataset.buyCash).split(':'),result=buy(save,kind,id,b.dataset.buyCash?'cash':null);if(!result.ok){toast(result.error);return;}changed();wallet();if(kind==='materials'){mode='shop';shopTab='materials';render();toast('+'+result.amount+' материалов · можно улучшать детали');sfx('upgrade');}else if(kind==='part')reveal(result.drop);else if(kind==='paint'){mode='shop';shopTab='paints';render();toast('Краска открыта для всех машин · вкладка «Цвет»');sfx('win');}else if(kind==='neon'){mode='shop';shopTab='paints';render();toast('Неон открыт для всех машин · вкладка «Цвет»');sfx('win');}else{mode='boxes';$('#meta-title').textContent='ЯЩИК КУПЛЕН';$('#meta-body').innerHTML=crateDetail(save,id);sfx('win');}}

 else if(b.dataset.quickPaint){await closeDialog(dialog);openCustomizer('paint:'+b.dataset.quickPaint);}
 else if(b.dataset.quickDecal){await closeDialog(dialog);openCustomizer('decal:'+b.dataset.quickDecal);}
 else if(b.dataset.quickEquip){await closeDialog(dialog);openCustomizer(b.dataset.quickEquip);}
 else if(b.hasAttribute('data-loot-done')){await exit();}
 else if(b.hasAttribute('data-new-campaign')){if(restartCampaign(save)){changed();practiceMap=0;render();toast('Новый круг · весь гараж сохранён');}}
 else if(b.hasAttribute('data-campaign-tune')){const engines=PARTS.filter(p=>p.slot==='engine'&&save.inventory[p.id]).sort((a,b)=>b.rarity-a.rarity);await closeDialog(dialog);openCustomizer(engines[0]?.id);}
 else if(b.hasAttribute('data-practice-open')){const m=Number(b.dataset.practiceOpen);practiceMap=practiceTrack(save.rank,Number.isInteger(m)?m:practiceMap);mode='practice';render();}
 else if(b.hasAttribute('data-profile-open')){mode='profile';render();}
 else if(b.hasAttribute('data-profile-play')){const name=b.dataset.profilePlay;toast('Загружаем '+name+'…');
  // На первом запуске профиля ещё нет, и безымянный прогресс архивировать некуда: сравниваем и оставляем более дальний.
  if(requireProfile){const r=await profiles.adoptOrContinue(name,save);if(r&&!r.continued){nameAccepted();toast('Погнали, '+name);closeDialog(dialog);}}
  else await profiles.select(name,save);}
 else if(b.hasAttribute('data-profile-cloud')){b.disabled=true;b.textContent='СМОТРИМ ОБЛАКО…';await refreshCloud();toast(cloudList.length?'В облаке: '+cloudList.length:'В облаке пока пусто');}
 else if(b.hasAttribute('data-profile-reset')){if(b.dataset.armed!=='true'){b.dataset.armed='true';b.textContent='ТОЧНО СБРОСИТЬ?';setTimeout(()=>{if(b.isConnected){delete b.dataset.armed;b.textContent='СБРОСИТЬ ПРОГРЕСС ЭТОГО ПРОФИЛЯ';}},4000);return;}profiles.reset(profiles.current());}
 else if(b.hasAttribute('data-share-stats')){track('screen',{name:'stats'});const text=statsText(save);mode='stats';render();try{await navigator.clipboard.writeText(text);toast('Скопировано · вставь в чат');}catch{const ta=$('#meta-body textarea');ta?.focus();ta?.select();toast('Выдели текст и скопируй');}}
 else if(b.hasAttribute('data-campaign-open')){practiceMap=trackIndex(save.rank);mode='rivals';render();}
 else if(b.hasAttribute('data-pvp-open')){await closeDialog(dialog);openDuels();}
 else if(b.dataset.race){if(choosing||['practice','battle'].includes(b.dataset.race)&&!canRaceTrack(save.rank,practiceMap))return;choosing=true;await closeDialog(dialog);try{await startRace(['practice','battle'].includes(b.dataset.race),practiceMap,null,b.dataset.race==='battle');}finally{choosing=false;}}
 };
 return {open,render,openCrate,requireName};
}
