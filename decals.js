const styles=[
 ['volt','Высокое напряжение','Кислотные молнии режут кузов по диагонали',2,'#c8ff24','#0a1110','#f5f1d8','repeating-linear-gradient(135deg,#0a1110 0 14%,#c8ff24 14% 24%,#0a1110 24% 42%,#f5f1d8 42% 47%,#0a1110 47% 64%)'],
 ['finish','Шахматный финиш','Крупная клетка и красная гоночная ось',2,'#f3ead0','#111719','#e53632','repeating-conic-gradient(#111719 0 25%,#f3ead0 0 50%) 0 0/24px 24px'],
 ['tiger','Тигр района','Рваные оранжевые полосы поверх твоей краски',1,'#ff6a16','#151718','#f0d76a','repeating-linear-gradient(112deg,#ff6a16 0 13%,#151718 13% 18%,#ff6a16 18% 30%,#f0d76a 30% 33%)'],
 ['hazard','Опасная зона','Жёлто-чёрные шевроны в духе уличной техники',1,'#ffd333','#171a19','#fff3bd','repeating-linear-gradient(45deg,#ffd333 0 13%,#171a19 13% 26%)'],
 ['glitch','Глитч 2000','Цифровые блоки кобальта, циана и мадженты',3,'#2054ff','#0c1024','#ff28a8','linear-gradient(90deg,#2054ff 0 24%,#0c1024 24% 32%,#ff28a8 32% 48%,#0c1024 48% 62%,#37e4ff 62% 78%,#0c1024 78%)'],
 ['arctic','Арктический осколок','Белые и синие ломаные плоскости',2,'#e9f3ee','#1656a4','#59d6ed','conic-gradient(from 25deg,#e9f3ee,#1656a4,#e9f3ee,#59d6ed,#1656a4,#e9f3ee)'],
 ['pulse','Неоновый пульс','Световые волны бирюзы и розового',3,'#14e2cf','#1b1231','#ff3b9d','repeating-radial-gradient(ellipse at 0 50%,#1b1231 0 12px,#14e2cf 13px 18px,#1b1231 19px 30px,#ff3b9d 31px 35px)'],
 ['tag','Тэг района','Слои маркера, мазков и ярких подписей',2,'#b8ff33','#24113f','#ff593d','repeating-linear-gradient(160deg,#24113f 0 17%,#b8ff33 17% 22%,#24113f 22% 36%,#ff593d 36% 44%)'],
 ['sunset','Закатный экспресс','Тёплый диск заката и скоростные полосы',2,'#ff7139','#231b4d','#ffc43d','radial-gradient(circle at 68% 48%,#ffc43d 0 18%,#ff7139 19% 31%,transparent 32%),repeating-linear-gradient(0deg,#231b4d 0 16%,#ff7139 16% 19%)'],
 ['phantom','Серый призрак','Матовый графит и серебряные следы скорости',3,'#ccd5d3','#111618','#6bffdc','repeating-linear-gradient(168deg,#111618 0 18%,#ccd5d3 18% 21%,#111618 21% 36%,#6bffdc 36% 38%)'],
];

export const DECALS=styles.map(([id,name,description,rarity,a,b,c,preview])=>({id,name,description,rarity,colors:[a,b,c],preview}));
export const DECAL_CHANCE=.18;
export const decalById=id=>DECALS.find(d=>d.id===id);
export const bossDecal=id=>DECALS[Math.floor(Math.max(0,Number(id)||0)/5)%DECALS.length].id;
// A decal won on any car belongs to the whole garage: every car can wear it.
export const ownsDecal=(s,id)=>!!decalById(id)&&Array.isArray(s.ownedDecals)&&s.ownedDecals.some(list=>Array.isArray(list)&&list.includes(id));
export function restoreDecals(s,d,count){
 s.decalUnlockVersion=1;
 s.ownedDecals=Array.from({length:count},(_,car)=>[...new Set((Array.isArray(d.ownedDecals?.[car])?d.ownedDecals[car]:[]).filter(id=>decalById(id)))]);
 s.decal=Array.from({length:count},(_,car)=>ownsDecal(s,d.decal?.[car])?d.decal[car]:null);
}
export function addDecal(s,id,car=s.selected){
 const decal=decalById(id),index=Math.max(0,Math.min(s.ownedDecals.length-1,Math.floor(Number(car)||0)));if(!decal)throw Error('Неизвестная декаль');
 const duplicate=ownsDecal(s,id),scrap=duplicate?30:0;if(duplicate)s.scrap+=scrap;else s.ownedDecals[index].push(id);return {id,car:index,duplicate,scrap};
}
export function rollDecalBonus(s,rng=Math.random){
 const chance=Number(rng());if(!Number.isFinite(chance)||chance>=DECAL_CHANCE)return null;
 const pool=DECALS.filter(d=>!ownsDecal(s,d.id));if(!pool.length){s.scrap+=30;return {car:s.selected,duplicate:true,scrap:30};}
 const roll=Math.max(0,Math.min(.999999,Number(rng())||0)),decal=pool[Math.floor(roll*pool.length)];return addDecal(s,decal.id);
}

const hex=value=>{const n=parseInt(value.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];};
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const fract=n=>n-Math.floor(n);
const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453);
const line=(v,w)=>Math.abs(v-Math.round(v))<w;
export function decalPixels(id,paint='#781523',size=256){
 const decal=decalById(id);if(!decal)return null;const base=hex(paint),a=hex(decal.colors[0]),b=hex(decal.colors[1]),c=hex(decal.colors[2]),data=new Uint8Array(size*size*4);
 for(let py=0;py<size;py++)for(let px=0;px<size;px++){
  const x=px/size,y=py/size;let color=base,mask=0,accent=0;
  if(id==='volt'){const bolt=Math.abs(fract(x*1.15+y*.58)-(.30+.12*Math.sin(y*13))-.5);mask=bolt<.075;accent=Math.abs(fract(x*1.15+y*.58+.23)-.5)<.018;}
  else if(id==='finish'){mask=((Math.floor(x*10)+Math.floor(y*8))&1)===0;accent=Math.abs(x-.5)<.035;}
  else if(id==='tiger'){const wave=fract(x*2.2+y*.72+.08*Math.sin(y*31));mask=wave<.15+.045*Math.sin(y*17);accent=wave>.45&&wave<.49;}
  else if(id==='hazard'){const chevron=Math.abs(fract((x+y)*3)-.5);mask=chevron<.23;accent=Math.abs(fract((x-y)*3)-.5)<.035;}
  else if(id==='glitch'){const cell=hash(Math.floor(x*18),Math.floor(y*13));mask=cell>.48;accent=cell<.18||line(y*13,.06);}
  else if(id==='arctic'){const shard=fract(x*2.6+y*1.8+hash(Math.floor(x*7),Math.floor(y*7))*.7);mask=shard>.48;accent=Math.abs(shard-.48)<.055;}
  else if(id==='pulse'){const wave=Math.abs(y-(.5+.20*Math.sin(x*17)));mask=wave<.075;accent=Math.abs(y-(.5+.31*Math.sin(x*12+1.4)))<.025;}
  else if(id==='tag'){const slash=Math.abs(fract(x*1.8-y*.62+.18*Math.sin(y*25))-.5);mask=slash<.105;accent=Math.abs(fract(x*3.4+y*1.4)-.5)<.04||Math.hypot(x-.72,y-.38)<.13;}
  else if(id==='sunset'){const sun=Math.hypot(x-.68,y-.48);mask=sun<.25&&fract(y*22)<.58;accent=line(y*10,.045)||Math.abs(x+y-.58)<.025;}
  else {const speed=fract(x*2.2+y*.28+hash(0,Math.floor(y*16))*.5);mask=speed<.13*(1-y*.45);accent=speed>.34&&speed<.37;}
  if(mask)color=a;if(accent)color=c;const grain=(hash(px,py)-.5)*10;const i=(py*size+px)*4;data[i]=Math.max(0,Math.min(255,color[0]+grain));data[i+1]=Math.max(0,Math.min(255,color[1]+grain));data[i+2]=Math.max(0,Math.min(255,color[2]+grain));data[i+3]=255;
 }
 return data;
}
