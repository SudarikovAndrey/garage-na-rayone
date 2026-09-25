// Arcade handling, tuned for short mobile races. These are game values, not factory specifications.
// Gear speeds are km/h at the limiter. Acceleration and drag retain each car's character after upgrades.
// ride: how well the suspension swallows a broken dirt road (1 = off-roader, .25 = tiny low car).
const profiles={
 samara:      {tag:'Ровный разгон',     gears:[43,75,111,153,195], rpm:7500, shift:6168, accel:5.40, drag:.064, low:.40, traction:1.00, wet:.00, inertia:1.00, pitch:1.00, rating:110, ride:.40},
 twelve:      {tag:'Любит обороты',    gears:[45,79,119,163,214], rpm:8000, shift:6700, accel:5.48, drag:.051, low:.35, traction:1.02, wet:.01, inertia:.94, pitch:.87, rating:119, ride:.40},// профиль Десятки: мотор и коробка у 2112 те же
 niva:        {tag:'Держит мокрый',    gears:[33,60,94,148],      rpm:6500, shift:5270, accel:5.85, drag:.118, low:.74, traction:1.13, wet:.085,inertia:1.20, pitch:1.40, rating:101, ride:1.00},
 kopeyka:     {tag:'Тяга с низов',     gears:[40,72,111,164],     rpm:6800, shift:5550, accel:5.65, drag:.078, low:.62, traction:.98, wet:-.02, inertia:1.10, pitch:1.12, rating:104, ride:.50},
 volga:       {tag:'Раскрывается вдаль',gears:[51,89,135,196],    rpm:6500, shift:5300, accel:4.85, drag:.037, low:.72, traction:1.00, wet:.02, inertia:1.32, pitch:1.20, rating:115, ride:.60},
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
