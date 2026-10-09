// Атмосфера заставки: частицы и росчерки собираются кодом, чтобы их было много и с разным темпом.
// Разметка держит только два пустых слоя — дальний (за фигурой) и ближний (перед ней), а параметры
// каждого элемента приходят inline: так можно менять плотность одним числом, не трогая стили.
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=list=>list[Math.floor(Math.random()*list.length)];

function make(parent,cls,style){
 const el=document.createElement('i');el.className=cls;
 for(const [k,v] of Object.entries(style))el.style.setProperty(k,v);
 parent.append(el);return el;
}

// Плотность подобрана под телефон: около полусотни элементов, все анимируются только transform и opacity.
export const DENSITY={beams:3,smoke:5,streaksFar:7,dust:22,streaksNear:5,sparks:8};

export function buildAtmosphere(far,near,density=DENSITY){
 if(!far||!near)return;
 far.textContent='';near.textContent='';
 for(let i=0;i<density.beams;i++)make(far,'fx-beam',{
  '--top':rnd(6,42)+'%','--dur':rnd(7,13)+'s','--delay':-rnd(0,13)+'s',
  '--h':rnd(16,32)+'%','--tint':pick(['#ffe0a8','#c6dcff','#ffd08a'])});
 for(let i=0;i<density.smoke;i++)make(far,'fx-smoke',{
  '--left':rnd(-18,72)+'%','--w':rnd(38,70)+'%','--h':rnd(30,54)+'%',
  '--dur':rnd(12,26)+'s','--delay':-rnd(0,26)+'s','--drift':rnd(-14,16)+'%'});
 // Дальние росчерки — свет далёких машин: длинные, медленные, тусклые.
 for(let i=0;i<density.streaksFar;i++)make(far,'fx-streak',{
  '--top':rnd(4,64)+'%','--len':rnd(22,46)+'%','--thick':rnd(1.5,3)+'px',
  '--dur':rnd(1.6,3.2)+'s','--delay':-rnd(0,9)+'s','--tint':pick(['#ffe6bb','#bcd8ff']),'--alpha':rnd(.18,.38)});
 for(let i=0;i<density.dust;i++)make(near,'fx-dust',{
  '--left':rnd(2,98)+'%','--bottom':rnd(0,46)+'%','--size':rnd(2,6)+'px',
  '--dur':rnd(6,16)+'s','--delay':-rnd(0,16)+'s','--rise':-rnd(90,220)+'px','--side':rnd(-46,22)+'px'});
 // Ближние росчерки летят быстро и ярко: это они дают ощущение скорости.
 for(let i=0;i<density.streaksNear;i++)make(near,'fx-streak fx-streak-near',{
  '--top':rnd(10,86)+'%','--len':rnd(30,62)+'%','--thick':rnd(2,4)+'px',
  '--dur':rnd(.7,1.4)+'s','--delay':-rnd(0,7)+'s','--tint':pick(['#fff0cf','#ffd89b']),'--alpha':rnd(.45,.8)});
 // Искры из-под колёс: короткие, резкие, с разлётом в стороны.
 for(let i=0;i<density.sparks;i++)make(near,'fx-spark',{
  '--left':rnd(18,82)+'%','--dur':rnd(1.1,2.4)+'s','--delay':-rnd(0,6)+'s',
  '--rise':-rnd(60,150)+'px','--side':rnd(-70,70)+'px','--size':rnd(2,4)+'px'});
}
