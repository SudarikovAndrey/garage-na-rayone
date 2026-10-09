// Фора дистанцией. Новичок и прокачанный едут каждый на своей машине, но финиш у слабого ближе,
// и это видно на его полосе. Считает всегда сервер, формула лежит здесь одна на клиент и сервер.
// Задача форы: дать реальный шанс, а не гарантию. Слабее в два раза по мощи — примерно треть дистанции долой.
// Замеры на реальной физике: прокачанный (мощь 375) едет 402 м за 8.58 с. Новичок (мощь 120) выходит
// на то же время примерно на 205 м, середняк (256) — на 330 м. Показатель .6 даёт ровно такие дистанции,
// поэтому он и выбран; нижняя граница 180 м держит заезд заездом при совсем диком разрыве.
export const HANDICAP={base:402,min:180,step:5,curve:.6};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Дистанция одного гонщика: сильнейший в паре всегда едет полную, остальные — меньше.
export function handicapDistance(power,topPower,{base=HANDICAP.base,min=HANDICAP.min,step=HANDICAP.step,curve=HANDICAP.curve}={}){
 if(!(power>0)||!(topPower>0)||power>=topPower)return base;
 const raw=base*Math.pow(power/topPower,curve);
 return clamp(Math.round(raw/step)*step,min,base);
}
export function handicapDistances(powerA,powerB,options={}){
 const top=Math.max(powerA||0,powerB||0);
 return {a:handicapDistance(powerA,top,options),b:handicapDistance(powerB,top,options),top};
}
// Насколько фора вообще заметна: для подписи в интерфейсе и для проверок баланса.
export const handicapGap=(powerA,powerB,options={})=>{const d=handicapDistances(powerA,powerB,options);return Math.abs(d.a-d.b);};

// Фора по выбору вызывающего (Андрей, 17 сентября). Он уже проехал полную дистанцию за timeA, теперь решает,
// сколько срезать сопернику: «малая» — соперник должен проехать идеально, чтобы взять; «большая» — возьмёт даже
// с ошибками. Считается не по мощи, а по физике: подбираем дистанцию, на которой эталонный водитель нужного
// уровня приезжает ровно к timeA. Сильнее вызвавшего — форы не получает: дистанция упирается в полную.
import {duelCar,duelStep,DUEL} from './duel-rules.js';
export const HANDICAP_LEVELS={none:{name:'Без форы',hint:'Полная дистанция обоим'},small:{name:'Малая фора',hint:'Возьмёт, только если проедет идеально'},big:{name:'Большая фора',hint:'Возьмёт даже с ошибками'}};
// Эталонные водители: идеальный старт и переключения на пике; смазанный — поздний старт и перекрут.
const DRIVERS={small:{late:0,launch:12,margin:.05},big:{late:900,launch:48,margin:.25}};
export function driveTime(build,distance,{late=0,launch=12}={}){
 const car=duelCar(build,distance),inputs=[launch];
 for(let f=0;f<DUEL.maxSteps&&!car.finished;f++){if(car.hasLaunched&&car.gear<car.maxGear&&!car.shiftPause&&car.rpm>=car.handling.shift+late)inputs.push(f);duelStep(car,f,inputs);}
 return car.finished?car.finishTime:Infinity;
}
export function handicapForTime(build,timeA,level='none',{base=HANDICAP.base,min=HANDICAP.min,step=HANDICAP.step}={}){
 const driver=DRIVERS[level];if(!driver||!(timeA>0))return base;
 const target=timeA-driver.margin;
 if(driveTime(build,base,driver)<=target)return base; // соперник и так успевает — форы нет
 let lo=min,hi=base; // время растёт с дистанцией: двоичный поиск
 if(driveTime(build,lo,driver)>target)return min;
 for(let i=0;i<14;i++){const mid=(lo+hi)/2;if(driveTime(build,mid,driver)<=target)lo=mid;else hi=mid;}
 return clamp(Math.floor(lo/step)*step,min,base);
}
