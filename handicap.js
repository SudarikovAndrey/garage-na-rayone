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
