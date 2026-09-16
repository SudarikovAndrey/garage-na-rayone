export const FINISH_FILM_DURATION=7;

const clamp01=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp01(n);return n*n*(3-2*n);};
const mix=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),z:mix(a.z,b.z,t)});

function shots(car,side){
 const x=car.x??-1.9,y=car.y??0,w=car.width||1.7,h=car.height||1.45,l=car.length||4.1;
 return [
  {id:'finish',start:0,end:1.55,from:{x:2,y:y+12,z:21},to:{x:x+side*3.7,y:y+7.2,z:13.6},lookFrom:{x:0,y:y+h*.44,z:1.4},lookTo:{x,y:y+h*.48,z:-l*.3},fov:[52,42],roll:0},
  {id:'tracking',start:1.55,end:3.25,from:{x:x+side*(w+8.2),y:y+1.75,z:6.8},to:{x:x+side*(w+6.4),y:y+1.18,z:1.5},lookFrom:{x,y:y+h*.48,z:.65},lookTo:{x,y:y+h*.46,z:-.55},fov:[36,30],roll:0},
  {id:'crane',start:3.25,end:4.95,from:{x:x-side*6.8,y:y+9.4,z:-3.2},to:{x:x+side*3.8,y:y+13.4,z:4.8},lookFrom:{x,y:y+h*.4,z:-.45},lookTo:{x,y:y+h*.3,z:.15},fov:[38,34],roll:0},
  {id:'hero',start:4.95,end:FINISH_FILM_DURATION,from:{x:x+side*8.8,y:y+2.5,z:-11.2},to:{x:x+side*6.5,y:y+1.48,z:-7.8},lookFrom:{x,y:y+h*.5,z:-.35},lookTo:{x,y:y+h*.47,z:.45},fov:[36,30],roll:side*.012}
 ];
}

export function finishCameraFrame(time,car={},side=1){
 const sequence=shots(car,side<0?-1:1),t=Math.max(0,time);
 const shot=sequence.find(s=>t<s.end)||sequence.at(-1),progress=ease((t-shot.start)/(shot.end-shot.start));
 return {id:shot.id,position:point(shot.from,shot.to,progress),target:point(shot.lookFrom,shot.lookTo,progress),fov:mix(shot.fov[0],shot.fov[1],progress),roll:shot.roll};
}
