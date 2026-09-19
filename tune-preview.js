// Что даёт деталь сейчас и что даст следующий уровень — числами, которые игрок видит в игре:
// мощь (рейтинг), максимальная скорость, сцепление на старте и ширина зелёной зоны переключения.
import {partById,effectiveLevels,rating} from './progression.js';
import {vehicleStats,handlingFor,gearsFor} from './vehicle-dynamics.js';
import {createCar,shiftZone} from './physics.js';
import {CARS} from './fleet.js';
// Exact (unrounded) figures too: a body-kit level moves the rating by a fraction, and the player should see it move.
export function carFigures(levels,carId){const stats=vehicleStats(carId,levels),h=handlingFor(carId),car=createCar(levels,0,carId),[lo,hi]=shiftZone(car);return {rating:stats.rating,ratingExact:h.rating+levels[0]*14+levels[1]*5+levels[2]*3,topSpeed:stats.topSpeed,topSpeedExact:gearsFor(carId,levels).at(-1)*(1+levels[0]*.012),grip:+levels[1].toFixed(2),window:Math.round((hi-lo)/2),levels};}
const show=(a,b,exactA,exactB)=>{if(b===undefined||a!==b)return [a,b];const fa=+exactA.toFixed(1),fb=+exactB.toFixed(1);return fa===fb?[a,b]:[fa,fb];};
const withRank=(save,id,rank)=>({...save,inventory:{...save.inventory,[id]:{...save.inventory[id],rank}}});
// Что даёт сама деталь: разница между машиной с ней и той же машиной без неё.
// Именно это игрок хочет видеть на карточке, а не абсолютные числа всей машины.
export function partGain(save,id,car=save.selected){
 const p=partById(id),owned=save.inventory[id];if(!p||!owned)return [];
 const carId=CARS[car].id;
 const equip=(e,value)=>{const next={...e};if(value)next[p.slot]=value;else delete next[p.slot];return next;};
 const withPart={...save,equipped:save.equipped.map((e,i)=>i===car?equip(e,id):e)};
 const without={...save,equipped:save.equipped.map((e,i)=>i===car?equip(e,null):e)};
 const a=carFigures(effectiveLevels(without,car),carId),b=carFigures(effectiveLevels(withPart,car),carId);
 const lines=[],add=(label,from,to,unit='',digits=0)=>{
  const delta=to-from;if(Math.abs(delta)<(digits?.05:.5))return;
  lines.push(`${label} ${delta>0?'+':'−'}${digits?Math.abs(delta).toFixed(digits):Math.round(Math.abs(delta))}${unit}`);
 };
 add('Мощь',a.rating,b.rating);
 add('Макс. скорость',a.topSpeed,b.topSpeed,' км/ч');
 add('Сцепление',a.grip,b.grip,'',2);
 add('Зелёная зона',a.window,b.window,' об/мин');
 return lines;
}
export function tunePreview(save,id,car=save.selected){
 const p=partById(id),owned=save.inventory[id];if(!p||!owned)return null;
 const carId=CARS[car].id,mounted=Object.values(save.equipped[car]).includes(id);
 // A part that is not mounted is previewed as if it were, in its slot.
 const base=mounted?save:{...save,equipped:save.equipped.map((e,i)=>i===car?{...e,[p.slot]:id}:e)};
 const now=carFigures(effectiveLevels(base,car),carId),next=owned.rank<p.maxRank?carFigures(effectiveLevels(withRank(base,id,owned.rank+1),car),carId):null;
 const lines=[];const line=(label,a,b,unit='')=>{if(next&&b!==undefined&&b!==a)lines.push(`${label} ${a} → ${b}${unit}`);else lines.push(`${label} ${a}${unit}`);};
 line('Мощь',...show(now.rating,next?.rating,now.ratingExact,next?.ratingExact));
 if(p.stats[0])line('Макс. скорость',...show(now.topSpeed,next?.topSpeed,now.topSpeedExact,next?.topSpeedExact),' км/ч');
 if(p.stats[1])line('Сцепление на старте',now.grip,next?.grip);
 if(p.stats[2])line('Зелёная зона','±'+now.window,next?'±'+next.window:undefined,' об/мин');
 return {part:p,rank:owned.rank,maxRank:p.maxRank,mounted,now,next,lines,text:lines.join(' · ')};
}
