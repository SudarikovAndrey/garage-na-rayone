import {driftState,driftCue,setDriftSteer} from './ridge-drift.js';
import {tickCar,tickCoast} from './physics.js';
import {resolveBattleContact} from './ridge-contact.js';
export {resolveBattleContact} from './ridge-contact.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function battleOpponent(base,car,levels){return {...base,name:'РЫЖИЙ · ДРИФТ-БИТВА',car,levels:levels.map((n,i)=>Math.max(0,n+(i===0?-.3:i===1?.4:0))),paint:'ivory',decal:'pulse',ridgeBattle:true,practice:true,boss:false,captain:false,requiredPerfect:0,startAssist:true,distance:540};}
export function createBattleMatch(){return {round:1,rounds:[],totals:[0,0]};}
export function startBattle(a,b,round=1){
 for(const [i,c] of [a,b].entries()){
  c.ridge=true;c.ridgeBattle=true;c.ridgeLane=0;c.ridgeSlide=i?1.05:-1.05;c.ridgeLateralSpeed=0;
  c.distance=c.travelDistance=(i===(round===1?1:0))?4.8:0;driftState(c).lineTarget=c.ridgeSlide;
  c.battle={round,lead:c.distance>0,contacts:0,lastHit:-10,proximity:0,paceAccel:0,bot:i===1};
 }
}
export function battleScore(c){return c.crashed?0:Math.floor((c.drift?.score||0)+(c.drift?.pending||0)+(c.battle?.proximity||0));}
export function recordBattleRound(match,a,b){
 if(match.rounds.length>=match.round)return match.rounds.at(-1);
 const scores=[battleScore(a),battleScore(b)],result={scores,crashed:[!!a.crashed,!!b.crashed]};
 match.rounds.push(result);scores.forEach((n,i)=>match.totals[i]+=n);return result;
}

export function battleBotSteer(bot,player){
 const gap=player.distance-bot.distance,x=bot.ridgeSlide||0,v=bot.ridgeLateralSpeed||0,cue=driftCue(bot),d=driftState(bot);
 const attack=Math.abs(gap)<3.5&&Math.sin(bot.time*.9)>.65;
 const side=x>=(player.ridgeSlide||0)?1:-1;
 const lane=attack?clamp((player.ridgeSlide||0)+side*.65,-2.7,2.7):clamp((player.ridgeSlide||0)+side*1.8,-1.7,1.7);
 const turn=clamp((lane-x)*.35-v*.22,-.48,.48);
 // Catch the tail before initiating another arc; the bot uses the same single steering axis.
 if(Math.abs(x)>2.8||Math.abs(x+v*.65)>3.0999999999999996)return clamp(-x*.42-v*.38,-.46,.46);
 // Build an arc, then counter-steer to recover room before the next initiation.
 if(bot.speed>15&&cue.sign&&Math.abs(cue.now.curvature)>.002){
  const room=cue.sign>0?2.5-x:2.5+x;
  if(room>1&&(cue.now.load>.75||Math.sin(bot.time*1.1) > -.7))return cue.sign*0.76;
 }
 if(d.mode==='recover')return clamp((-d.angle*.65-d.angularVelocity*.3)*0.5+turn*0.5,-.4,.4);
 return turn;
}
export function battlePace(bot,player,dt){
 if(!bot.battle?.bot||bot.crashed||player.crashed||bot.finished||player.finished)return;
 const gap=player.distance-bot.distance+(bot.battle.lead?3:-3),closing=player.speed-bot.speed;
 // A bounded change in throttle closes ordinary gaps over seconds; positions
 // never move artificially. Assistance fades before the final sprint.
 const finish=clamp((bot.raceDistance-Math.max(bot.distance,player.distance)-65)/100,0,1);
 const target=player.speed>12?clamp(gap*.42+closing*.9,-2.2,2.8)*finish:0;
 bot.battle.paceAccel+=(target-bot.battle.paceAccel)*(1-Math.exp(-dt*2));
}
export function tickBattle(a,b,dt){
 for(let left=dt;left>1e-8;left-=1/120){
  const step=Math.min(left,1/120);for(const c of [a,b]){c.battle.clock=(c.battle.clock||0)+step;if(c.finished)c.battle.lastHit=-10;}if(battleResult(a,b)){for(const c of [a,b])if(c.crashed)tickCar(c,step);else if(c.finished)tickCoast(c,step);resolveBattleContact(a,b,step);continue;}
  battlePace(b,a,step);setDriftSteer(b,battleBotSteer(b,a));
  for(const c of [a,b])if(c.finished)tickCoast(c,step);else tickCar(c,step);
  resolveBattleContact(a,b,step);
  const gap=Math.hypot(a.distance-b.distance,(a.ridgeSlide||0)-(b.ridgeSlide||0)),near=clamp(1-(gap-2)/7,0,1);
  for(const c of [a,b])if(!c.crashed&&!c.finished&&c.drift?.scoring&&c.drift.contactTime<=0)c.battle.proximity+=c.speed*step*1.75*near;
 }
}
export function battleResult(a,b){
 if(a.crashed||b.crashed||a.finished&&b.finished||Math.max(a.time,b.time)>65){
  const scores=[battleScore(a),battleScore(b)];return {won:scores[0]>scores[1],draw:scores[0]===scores[1],scores,reason:a.crashed?'crash':b.crashed?'knockout':'score'};
 }
 return null;
}
