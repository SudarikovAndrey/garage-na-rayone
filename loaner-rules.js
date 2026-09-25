// Подмена — первый вход по приглашению (docs/loaner-invite.md). Новичок едет на тачке кореша против
// «чувака с района» и выигрывает свою первую машину. Правила общие клиенту и серверу, как у форы:
// сервер ставит соперника и проверяет заезд, игра показывает ровно то же самое.
//
// Соперник — не запись живого игрока. Это заезд, поставленный под конкретную тачку так, чтобы две
// несильные ошибки прощались, а три — чаще нет. Несильная ошибка — переключиться на кадр раньше или
// позже зелёной зоны: оценка «нормально», пауза вдвое дольше идеальной. Замеры по парку — в спеке
// и в scripts/check-loaner-rules.mjs --report.
import {duelCar,duelStep,verifyReplay,normalizeDuelBuild,DUEL,DUEL_BOTS,botBuild} from './duel-rules.js';
import {shiftZone} from './physics.js';

export const LOANER_RULES={
 distance:DUEL.distance,
 // Старт автоматом, на этом кадре после зелёного. Без него планку не поставить: поздний старт на
 // стоковой тачке стоит почти секунду — дороже любых ошибок в переключениях.
 launchFrame:12,
 // Последний кадр, на котором старт ещё чёткий (реакция до 0.24 с): соперник стартует не позже.
 lastSharpFrame:Math.floor(.24/DUEL.step),
 // Сколько несильных ошибок прощается, и на сколько кадров старта соперник отстаёт от худшего
 // такого заезда: кто ошибся ровно дважды, выигрывает на фотофинише (0.025 с), а не проигрывает на нём.
 errors:2,
 marginFrames:3,
 // Модели, на которых «чувак с района» смешон: Ока, инвалидка, буханка.
 skipCars:[2,9,12],
 // Приз. Своя Восьмёрка у новичка стартовая, так что выигрывает он гараж и два ящика к ней.
 car:0,
 prize:{newbie:{crates:['tech','body']},lender:{crates:['tech']}},
};

const choose=(items,k)=>k===0?[[]]:items.flatMap((x,i)=>choose(items.slice(i+1),k-1).map(rest=>[x,...rest]));
const sides=k=>k===0?[[]]:sides(k-1).flatMap(s=>[[...s,'early'],[...s,'late']]);
const hash=s=>[...String(s)].reduce((n,c)=>(n*33+c.charCodeAt(0))>>>0,5381);

// Эталонный водитель. plan[i] — как он берёт i-е переключение: 'ideal' — середина зелёной зоны,
// 'early' — последний кадр перед ней, 'late' — первый кадр после неё, 'miss' — у самой отсечки.
export function referenceRun(build,plan=[],{launch=LOANER_RULES.launchFrame}={}){
 const car=duelCar(normalizeDuelBuild(build),LOANER_RULES.distance),inputs=[launch];
 let n=0,prev=0;
 for(let frame=0;frame<DUEL.maxSteps&&!car.finished;frame++){
  if(car.hasLaunched&&car.gear<car.maxGear&&!car.shiftPause){
   const [low,high]=shiftZone(car),kind=plan[n]||'ideal',rise=car.rpm-prev;
   // «Раньше» ловится с упреждением: следующий кадр уже был бы в зоне. Если стрелка перескочила
   // зону целиком, переключаемся сразу — такой заезд отсеется проверкой оценок.
   const go=kind==='late'?car.rpm>high:kind==='early'?car.rpm+rise>=low:kind==='miss'?car.rpm>=car.redline-120:car.rpm>=car.handling.shift;
   if(go){inputs.push(frame);n++;}
  }
  prev=car.rpm;duelStep(car,frame,inputs);
 }
 return {inputs,time:car.finishTime,perfect:car.perfect,good:car.good,missed:car.missed};
}

// Худший заезд с k несильными ошибками: по всем передачам, где их можно сделать, и по обе стороны
// зелёной зоны. Заезд, где ошибка не легла в «нормально», в счёт не идёт: на прокачанной коробке
// зона бывает так широка, что кадр за ней — уже «мимо». Возвращает время и сам план ошибок.
export function worstWithErrors(build,k=LOANER_RULES.errors){
 const shifts=referenceRun(build).inputs.length-1;
 let worst={time:0,plan:null};
 for(const at of choose([...Array(shifts).keys()],Math.min(k,shifts)))for(const side of sides(at.length)){
  const plan=Array(shifts).fill('ideal');at.forEach((gear,i)=>plan[gear]=side[i]);
  const run=referenceRun(build,plan);
  if(run.good===at.length&&run.missed===0&&run.time>worst.time)worst={time:run.time,plan};
 }
 return worst;
}

// Соперник под конкретную тачку — это и есть худший из водителей с двумя несильными ошибками, только
// стартует он на пару кадров позже. Каждый кадр реакции до порога чёткого старта сдвигает финиш ровно
// на 1/120 с и больше ничего в заезде не меняет: переключается эталон по оборотам, а не по часам.
// Подстраивать соперника опозданием нельзя: на прокачанной коробке позднее переключение не медленнее,
// а переход в «мимо» стоит секунду разом.
//
// Время соперника — не обещание, а итог повтора его же входов: клиент и сервер видят одно число,
// и «чувак» на экране финиширует ровно тогда, когда сказано.
export function loanerRival(build){
 const b=normalizeDuelBuild(build),R=LOANER_RULES;
 const ideal=referenceRun(b).time,worst=worstWithErrors(b);
 // Ни одной честной пары ошибок не нашлось — такого в парке нет, но соперник всё равно нужен:
 // чистый заезд с самым поздним чётким стартом.
 const plan=worst.plan||[],late=worst.plan?R.marginFrames:R.lastSharpFrame-R.launchFrame;
 const run=referenceRun(b,plan,{launch:R.launchFrame+late});
 return {inputs:run.inputs,time:verifyReplay(run.inputs,b,R.distance).time,target:(worst.time||ideal)+late*DUEL.step,ideal,worst:worst.time};
}

// Победа засчитывается и на фотофинише: ровно в ноль — это «сделал», а не «почти».
export const loanerWon=(time,rivalTime)=>Number.isFinite(time)&&time<=rivalTime+1e-9;

// Кто этот «чувак». Один из ботов дуэлей, но не на той же модели, что тачка кореша: две одинаковые
// машины рядом на старте читаются как ошибка. Выбор привязан к стрелке — при повторе соперник тот же.
// Едет он физикой тачки кореша: внешность своя, а время честно поставлено под новичка.
export function loanerRivalLook(build,seed){
 const b=normalizeDuelBuild(build);
 const pool=DUEL_BOTS.filter(bot=>bot.car!==b.car&&!LOANER_RULES.skipCars.includes(bot.car));
 const bot=pool[hash(seed)%pool.length],look=botBuild(bot,b.power);
 return {id:bot.id,name:bot.name,look:{car:look.car,equipment:look.equipment,paint:look.paint,decal:look.decal,neon:look.neon}};
}
