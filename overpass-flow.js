import {campaignPosition,CAMPAIGN_LENGTH} from './campaign-config.js';
import {TRACKS} from './tracks.js';
import {overpassCheck,GRAVITY,OVERPASS_HEIGHT} from './overpass-route.js';
export const overpassTrack=()=>TRACKS.findIndex(t=>t.check);
export const isOverpassStage=rank=>rank<CAMPAIGN_LENGTH&&campaignPosition(rank).series===8&&campaignPosition(rank).beat===2;
export function overpassStage(rank){const p=campaignPosition(rank);return {...overpassCheck(p.map,{map:overpassTrack()}),stageRank:rank,series:8,beat:'Проверка',practice:false,startAssist:true,look:TRACKS[overpassTrack()]};}
export function completeOverpass(save,car,opp,practice=false){
 const won=!!car.finished&&!car.crashed&&car.landings===3,result={won,cash:0,scrap:0,fresh:false};
 if(practice)return result;
 if(!isOverpassStage(opp.stageRank)||save.rank!==opp.stageRank)return result;
 result.fresh=true;save.rank++;save.races++;save.campaignAttempts++;save.campaignSeconds+=car.time||0;save.campaignLosses=0;
 save.overpassChecks??=Array(5).fill(false);save.overpassChecks[opp.district]=won;
 if(won){save.wins++;result.cash=opp.reward.cash;result.scrap=opp.reward.scrap;save.cash+=result.cash;save.scrap+=result.scrap;}
 return result;
}
// Once below the deck, retain the ballistic velocity. Stop at the courtyard, never shake in place.
export function tickOverpassFall(car,dt){
 const f=car.overpassFall;if(!f)return;car.crashElapsed=(car.crashElapsed||0)+dt;
 if(f.y>-OVERPASS_HEIGHT+.4){f.vy-=GRAVITY*dt;f.y=Math.max(-OVERPASS_HEIGHT+.4,f.y+f.vy*dt);car.travelDistance=(car.travelDistance??car.distance)+car.speed*dt;f.pitch=Math.max(-.95,f.pitch-dt*.32);if(f.y<=-OVERPASS_HEIGHT+.4){f.impact=true;car.speed*=.18;}}
 else {car.speed*=Math.exp(-6*dt);car.travelDistance+=car.speed*dt;f.pitch*=Math.exp(-5*dt);}
}
