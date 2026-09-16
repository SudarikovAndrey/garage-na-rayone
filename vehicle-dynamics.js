// Arcade handling, tuned for short mobile races. These are game values, not factory specifications.
// Gear speeds are km/h at the limiter. Acceleration and drag retain each car's character after upgrades.
// ride: how well the suspension swallows a broken dirt road (1 = off-roader, .25 = tiny low car).
const profiles={
 samara:      {tag:'Ровный разгон',     gears:[43,75,111,153,195], rpm:7500, shift:6168, accel:5.40, drag:.064, low:.40, traction:1.00, wet:.00, inertia:1.00, pitch:1.00, rating:110, ride:.40},
 kopeyka:     {tag:'Тяга с низов',     gears:[40,72,111,164],     rpm:6800, shift:5550, accel:5.65, drag:.078, low:.62, traction:.98, wet:-.02, inertia:1.10, pitch:1.12, rating:104, ride:.50},
 oka:         {tag:'Резкий старт',     gears:[32,59,93,144],      rpm:7000, shift:5770, accel:6.60, drag:.121, low:.68, traction:1.08, wet:-.035,inertia:.83, pitch:.90, rating:101, ride:.30},
 pyaterka:    {tag:'Короткая коробка', gears:[37,65,98,132,174],  rpm:7100, shift:5820, accel:5.55, drag:.078, low:.52, traction:.99, wet:-.02, inertia:1.00, pitch:1.05, rating:107, ride:.50},
 nine:        {tag:'Цепкий старт',     gears:[39,69,105,147,188], rpm:7500, shift:6230, accel:5.75, drag:.080, low:.46, traction:1.04, wet:.015,inertia:.94, pitch:.95, rating:111, ride:.40},
 'ninety-nine':{tag:'Длинный разгон', gears:[45,80,120,164,204], rpm:7500, shift:6350, accel:5.18, drag:.050, low:.42, traction:1.00, wet:.00, inertia:1.03, pitch:1.02, rating:113, ride:.40},
 ten:         {tag:'Любит обороты',    gears:[45,79,119,163,214], rpm:8000, shift:6700, accel:5.48, drag:.051, low:.35, traction:1.02, wet:.01, inertia:.94, pitch:.87, rating:119, ride:.40},
 niva:        {tag:'Держит мокрый',    gears:[33,60,94,148],      rpm:6500, shift:5270, accel:5.85, drag:.118, low:.74, traction:1.13, wet:.085,inertia:1.20, pitch:1.40, rating:101, ride:1.00},
 moskvich:    {tag:'Тянет без суеты',  gears:[43,78,118,166],     rpm:6700, shift:5470, accel:5.25, drag:.076, low:.65, traction:1.01, wet:-.01, inertia:1.15, pitch:1.18, rating:101, ride:.55},
 smz:         {tag:'Лёгкий коротыш',   gears:[27,47,74,112],      rpm:6200, shift:5000, accel:5.75, drag:.140, low:.58, traction:1.05, wet:-.04, inertia:.78, pitch:1.25, rating:83, ride:.25},
 volga:       {tag:'Раскрывается вдаль',gears:[51,89,135,196],    rpm:6500, shift:5300, accel:4.85, drag:.037, low:.72, traction:1.00, wet:.02, inertia:1.32, pitch:1.20, rating:115, ride:.60},
 uaz:         {tag:'Тягач на старте',  gears:[30,55,86,134],      rpm:6200, shift:5020, accel:5.60, drag:.123, low:.82, traction:1.17, wet:.09, inertia:1.28, pitch:1.50, rating:94, ride:1.00},
 bukhanka:    {tag:'Тяжёлая тяга',     gears:[29,53,84,126],      rpm:6100, shift:4920, accel:4.95, drag:.113, low:.84, traction:1.12, wet:.08, inertia:1.40, pitch:1.55, rating:88, ride:.90},
};
export const HANDLING=Object.freeze(Object.fromEntries(Object.entries(profiles).map(([id,p])=>[id,Object.freeze({...p,id,gears:Object.freeze(p.gears)})])));
export const handlingFor=id=>HANDLING[typeof id==='object'?id?.id:id]||HANDLING.samara;
// Глубокие тиры коробки: с девятого уровня в неё встаёт длинная верхняя ступень.
// Плотность рядов не трогаем — сблизить передачи в этой модели значит просто добавить пауз на переключение.
// Растёт потолок: там, где сток упирался в ограничитель последней передачи, коробка ещё тянет.
// Ступень раскрывается постепенно, с 9-го уровня по 15-й, чтобы кривая сложности не прыгала на одном уровне.
export const EXTRA_GEAR_LEVEL=9,EXTRA_GEAR_FULL=15;
export const extraGearReach=level=>level<EXTRA_GEAR_LEVEL?0:.25+.75*Math.min(1,(level-EXTRA_GEAR_LEVEL)/(EXTRA_GEAR_FULL-EXTRA_GEAR_LEVEL));
export function gearsFor(id,levels=[0,0,0]){
 const gears=[...handlingFor(id).gears],reach=extraGearReach(levels[2]||0);
 if(!reach)return gears;
 // Шаг мягче обычного: это длинная передача, а не ещё один такой же ряд.
 const step=Math.sqrt(gears.at(-1)/gears.at(-2));
 gears.push(Math.round(gears.at(-1)*(1+(step-1)*reach)));
 return gears;
}
export function vehicleStats(id,levels=[0,0,0]){const p=handlingFor(id);return {tag:p.tag,gears:gearsFor(id,levels).length,stockGears:p.gears.length,topSpeed:Math.round(gearsFor(id,levels).at(-1)*(1+levels[0]*.012)),rating:Math.round(p.rating+levels[0]*14+levels[1]*5+levels[2]*3)};}
