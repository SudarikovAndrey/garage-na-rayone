export const FINISH_FILM_DURATION=7;

const clamp01=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp01(n);return n*n*(3-2*n);};
const mix=(a,b,t)=>a+(b-a)*t;
const point=(a,b,t)=>({x:mix(a.x,b.x,t),y:mix(a.y,b.y,t),z:mix(a.z,b.z,t)});

// Коридор дороги. По сторонам трассы стоят заборы и стены (|x| 5.6–6.5), фонарные столбы высотой 6 м (5.25)
// и бордюр (4.65). Камера, вынесенная за них низко, снимает машину сквозь забор — это и читалось как глюк.
// Поэтому низкие пролёты держим внутри коридора и добираем расстояние вдоль дороги, а не вбок. Верхним
// кадрам можно чуть дальше: с высоты 8.8–11.6 м луч на машину проходит над забором и над верхушкой столба.
export const LANE={low:4.4,high:6.5,open:4.8};
const lane=(v,limit)=>Math.max(-limit,Math.min(limit,v));

// Кино начинается не с чужой точки, а ровно там, где камера была на финише: если первый кадр
// поставить в заранее выбранное место, на финише получается рывок — камера «отрывается» от машины.
function shots(car,side,start=null){
 const x=car.x??-1.9,y=car.y??0,w=car.width||1.7,h=car.height||1.45,l=car.length||4.1;
 const from=start?.position?{...start.position}:{x:2,y:y+12,z:21};
 const low=v=>lane(v,LANE.low);
 const lookFrom=start?.target?{...start.target}:{x:0,y:y+h*.44,z:1.4};
 const openFov=Number.isFinite(start?.fov)?start.fov:52;
 return [
  {id:'finish',start:0,end:1.55,from,to:{x:lane(x+side*3.7,LANE.open),y:y+7.2,z:13.6},lookFrom,lookTo:{x,y:y+h*.48,z:-l*.3},fov:[openFov,42],roll:0},
  /* Пролёт вдоль борта: вбок ровно до кромки коридора, недостающую дистанцию берём вдоль дороги. */
  {id:'tracking',start:1.55,end:3.25,from:{x:low(x+side*(w+8.2)),y:y+1.75,z:10.5},to:{x:low(x+side*(w+6.4)),y:y+1.18,z:6},lookFrom:{x,y:y+h*.48,z:.65},lookTo:{x,y:y+h*.46,z:-.55},fov:[40,34],roll:0},
  /* Кран поднимается по своей стороне, не перелетая через крышу: перелёт над машиной читался как переворот кадра. */
  {id:'crane',start:3.25,end:4.95,from:{x:lane(x+side*7.6,LANE.high),y:y+8.8,z:-3.4},to:{x:lane(x+side*4.4,LANE.high),y:y+11.6,z:4.6},lookFrom:{x,y:y+h*.4,z:-.45},lookTo:{x,y:y+h*.3,z:.15},fov:[38,34],roll:0},
  {id:'hero',start:4.95,end:FINISH_FILM_DURATION,from:{x:low(x+side*8.8),y:y+2.5,z:-12.6},to:{x:low(x+side*6.5),y:y+1.48,z:-8.8},lookFrom:{x,y:y+h*.5,z:-.35},lookTo:{x,y:y+h*.47,z:.45},fov:[38,32],roll:side*.012}
 ];
}

export function finishCameraFrame(time,car={},side=1,start=null){
 const sequence=shots(car,side<0?-1:1,start),t=Math.max(0,time);
 const shot=sequence.find(s=>t<s.end)||sequence.at(-1),progress=ease((t-shot.start)/(shot.end-shot.start));
 return {id:shot.id,position:point(shot.from,shot.to,progress),target:point(shot.lookFrom,shot.lookTo,progress),fov:mix(shot.fov[0],shot.fov[1],progress),roll:shot.roll};
}
