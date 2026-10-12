// Светофор старта. Три лампы на столбе у линии: две жёлтые сверху, зелёная снизу — как на настоящем драговом
// «дереве». До этого лампы горели ровно всегда: у обеих жёлтых был один кэшированный материал, а отсчёт трогал
// только цифры на экране (Андрей, 22 сентября: «на всех трассах не работает светофор»).
//
// Логика вынесена из игры в чистую функцию: по фазе заезда и остатку отсчёта она отдаёт накал трёх ламп, а игра
// только раскладывает его по материалам. Порядок — [зелёная, жёлтая нижняя, жёлтая верхняя].
export const TREE={
 glow:2.6,        // накал горящей лампы: выше порога свечения композита, чтобы днём тоже читалась
 night:1.6,       // ночью ниже — иначе ореол больше самой лампы
 hold:3.2,        // сколько секунд зелёная горит после старта, потом столб всё равно уходит за камеру
 colors:[0x7cf05a,0xffb02a,0xffb02a],
 off:[0x2d4a2a,0x5a4520,0x5a4520],
};

// countdown идёт от 3 к 0: на «3» верхняя жёлтая, на «2» обе, на последней секунде обе часто мигают —
// сигнал «сейчас». greenAge — сколько секунд прошло со старта, до него null.
export function treeLevels(phase,countdown=3,greenAge=null,time=0){
 if(phase==='countdown'){
  const step=Math.ceil(Math.max(0,countdown));
  if(step>=3)return [0,0,1];
  if(step===2)return [0,1,1];
  const blink=Math.sin(time*26)>0?1:.25;
  return [0,blink,blink];
 }
 if(['launch','running','coasting','finished','crashing','crashed'].includes(phase)){
  const age=greenAge??0;
  return [Math.max(0,1-Math.max(0,age-TREE.hold)/1.2),0,0];
 }
 return [0,0,0];
}

// Раскладываем накал по материалам ламп. Цвет тоже меняем: выключенная лампа тёмная, иначе днём при
// нулевом emissive она выглядит просто крашеным шаром и горящую от негорящей не отличить.
export function paintTree(lamps,levels,night=false){
 if(!lamps)return;
 const glow=night?TREE.night:TREE.glow;
 for(let i=0;i<3&&i<lamps.length;i++){
  const m=lamps[i],level=levels[i]||0;
  if(m.userData.treeLevel===level)continue;
  m.userData.treeLevel=level;
  m.emissiveIntensity=glow*level;
  m.color.setHex(level>.5?TREE.colors[i]:TREE.off[i]);
 }
}
