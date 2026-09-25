import {CAMPAIGN_LENGTH,DISTRICT_LENGTH,CREWS} from './campaign-config.js';
import {TRACKS} from './tracks.js';
import {CARS} from './fleet.js';
import {crateArt} from './loot-ui.js';
import {crewTitle,crewLine,districtLine} from './campaign-texts.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toLocaleString('ru-RU');
// Four tiers of finish: an ordinary race, a series captain, a district boss, the championship.
export function resultTier(result,save,won){if(!won||!result.fresh)return 'race';if(save.rank>=CAMPAIGN_LENGTH)return 'champion';if(result.bossBox)return 'district';if(result.milestone)return 'series';return 'race';}
export function resultHeadline(tier,{result,save,won,clean,opponent,player,rival,practice}){
 if(practice)return {kicker:result.record?'НОВЫЙ РЕКОРД':'ТРЕНИРОВКА',title:won?'ТВОЯ ВЗЯЛА!':'ЕЩЁ ПОКАЖЕМ!',comment:'Заезд на детали · карьера '+save.rank+'/'+CAMPAIGN_LENGTH};
 if(!won){
  const gap=Math.max(0,(player?.finishTime||0)-(rival?.finishTime||0)).toFixed(2);
  const kicker=opponent?.boss?'БОСС УСТОЯЛ':opponent?.captain?'ГЛАВАРЬ УСТОЯЛ':'ФИНИШ';
  const comment=!clean?'Нужно идеальных переключений: '+opponent.requiredPerfect+'. У тебя: '+(player?.perfect||0)+'.':opponent?.captain?'Не хватило '+gap+' с. Прокачай машину или лови зелёную зону.':'Прогресс сохранён. Прокачай машину и возьми реванш.';
  return {kicker,title:'ЕЩЁ ПОКАЖЕМ!',comment};
 }
 if(tier==='champion')return {kicker:'КАРЬЕРА ПРОЙДЕНА · 225/225',title:'ВСЕ РАЙОНЫ ТВОИ!',comment:'Чемпионство №'+((save.campaignChampionships||0)+1)+'. Район за районом — все твои.'};
 if(tier==='district')return {kicker:'РАЙОН ПРОЙДЕН · '+Math.floor(save.rank/DISTRICT_LENGTH)+'/5',title:'РАЙОН ТВОЙ!',comment:districtLine(opponent.map,opponent.name)};
 if(tier==='series')return {kicker:'СЕРИЯ ПРОЙДЕНА · '+CREWS[opponent.series].toUpperCase()+' '+(opponent.series+1)+'/9',title:crewTitle(opponent.series),comment:crewLine(opponent.series)};
 return {kicker:result.crates.length?'5 ФИНИШЕЙ · НАГРАДА':result.record?'НОВЫЙ РЕКОРД':'ФИНИШ',title:'ТВОЯ ВЗЯЛА!',comment:result.fresh?'Карьера: '+save.rank+'/'+CAMPAIGN_LENGTH+' побед':'Чемпион побеждён снова.'};
}
export function seriesAwardMarkup(result){
 const m=result.milestone;if(!m)return '';const shard=result.carShard,car=shard?CARS[shard.index]:null;
 return `<div class="series-award"><span class="tiny-label">НАГРАДА СЕРИИ</span><b>+${money(m.cash)} ₽ · +${m.scrap} ⚒</b>${car?`<div class="shard-bar"><i style="--p:${Math.round(shard.current/shard.needed*100)}%"></i><span>${shard.unlocked?'ОТКРЫТА МАШИНА · ':'ШАРДЫ · '}${esc(car.name)} ${shard.current}/${shard.needed}</span></div>`:''}</div>`;
}
export function celebrationMarkup(tier,{result,save,opponent}){
 const champion=tier==='champion',district=tier==='district';
 const track=result.unlockedMap!==null&&result.unlockedMap!==undefined?TRACKS[result.unlockedMap]:null,car=result.carShard?.unlocked?CARS[result.carShard.index]:null,crate=result.crates?.[0];
 const kicker=champion?'КАРЬЕРА ПРОЙДЕНА · 225/225':district?TRACKS[opponent.map].name+' · БОСС ПОБЕЖДЁН':'ШАРДЫ СОБРАНЫ';
 const title=champion?'ВСЕ РАЙОНЫ ТВОИ!':district?'РАЙОН ТВОЙ!':'НОВАЯ ТАЧКА!';
 const line=champion?'Чемпионство №'+((save.campaignChampionships||0)+1)+'. Легендарный ящик уже в гараже.':district?districtLine(opponent.map,opponent.name):'Забирай из гаража и катайся.';
 return `<span class="tiny-label">${esc(kicker)}</span><h2>${esc(title)}</h2><p>${esc(line)}</p>`
  +(track?`<div class="celebrate-card"><img src="assets/tracks/${track.id}.webp" alt="" width="240" height="150"><span class="tiny-label">НОВАЯ ТРАССА</span><b>${esc(track.name)}</b><small>${esc(track.weather)}</small></div>`:'')
  +(car?`<div class="celebrate-card car"><img src="assets/cars/${car.id}.webp" alt="" width="320" height="200"><span class="tiny-label">НОВАЯ ТАЧКА</span><b>${esc(car.name)}</b><small>${esc(car.model)}</small></div>`:'')
  +(crate&&(district||champion)?`<div class="celebrate-crate">${crateArt(crate.id,'glow')}<b>${crate.id==='legend'?'ЛЕГЕНДАРНЫЙ ЯЩИК':'ЭПИЧЕСКИЙ ЯЩИК'}</b>${result.hard?`<small>+${result.hard} $</small>`:''}</div>`:'')
  +'<small class="celebrate-hint">Тапни, чтобы продолжить</small>';
}
