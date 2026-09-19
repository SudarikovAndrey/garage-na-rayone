// Камера заезда. Раньше это был штатив: одна точка высоко и далеко, машины в середине кадра мелкие.
// Так гонки не снимают — ни в кино, ни в трансляции ралли.
//
// Что взято оттуда:
// · СТАРТ — низкая камера на три четверти от своей машины. Ближняя машина крупно в нижнем углу,
//   соперник уходит вглубь кадра. В портрете это единственный способ показать обе машины крупно:
//   если ставить их рядом на одной линии, ширина кадра заставляет отъехать далеко.
// · ПУСК — оператор всегда чуть опаздывает. Камера не срывается вместе с машиной, а догоняет,
//   и объектив на мгновение раскрывается: это читается как рывок.
// · ЗАЕЗД — вид с дрона над осью трассы, машины в нижней трети, впереди видно дорогу. Дрон живой:
//   его сносит ветром, он покачивается и никогда не летит по идеальной прямой.
// · СКОРОСТЬ — чем быстрее, тем шире объектив и дальше камера. Так делают на трансляциях, чтобы
//   в кадр влезала дорога впереди, а скорость при этом читалась сильнее.
//
// Модуль — чистая математика: ни сцены, ни three.js. Поэтому кадр проверяется без браузера.
export const SPEED_TOP=58; // м/с: дальше камера уже «на полном отлёте»
// Кадр рассчитан на портрет телефона. На вытянутых экранах по горизонтали видно меньше, и машины
// начинает резать по краям — тогда камера отходит ровно настолько, чтобы ширина кадра сошлась.
export const REF_ASPECT=.52;
// Насколько далеко можно увести камеру пальцем: четверть оборота — уже не заезд, а осмотр машины.
export const ORBIT_LIMIT=.42;

// Опорные положения. pos — где камера, fov — объектив, drop — насколько низко в кадре сидят машины
// (0 — по центру, .3 — чуть ниже середины, но выше приборов). Точку наводки считаем из drop, а не задаём руками: тогда
// кадр одинаково собирается и на узком телефоне, и на широком экране.
export const RIG={
 // Машины стоят на x=±1.9, z≈0, и в портрете обе влезают только у оси трассы: увести камеру вбок,
 // как на трансляции, нельзя — соперник тут же уходит за край. Поэтому «крупно» здесь берётся
 // не ракурсом, а близостью, широким объективом и наводкой поверх машин.
 grid:{pos:[0,6,11.5],fov:58,drop:.28},
 run:{pos:[.15,6.7,13.6],fov:48,drop:.26},
 fast:{pos:[.5,7.4,14.8],fov:50,drop:.3},
 // Бережный режим: старая спокойная камера без полётов и тряски.
 calm:{pos:[3.1,11.2,22],fov:46,drop:0},
};
// Середина пары машин: вокруг неё и строится кадр.
export const CARS={x:0,y:.7,z:0};
// Своя машина: к ней уезжает внимание, когда соперник отстал или укатил вперёд.
export const MINE={x:-1.9,y:.7,z:0};

const clamp01=v=>v<0?0:v>1?1:v;
const mix=(a,b,k)=>a+(b-a)*k;
const ease=v=>{v=clamp01(v);return v*v*(3-2*v);};
const mixRig=(a,b,k)=>({
 pos:[mix(a.pos[0],b.pos[0],k),mix(a.pos[1],b.pos[1],k),mix(a.pos[2],b.pos[2],k)],
 fov:mix(a.fov,b.fov,k),
 drop:mix(a.drop,b.drop,k),
});
// Куда смотреть, чтобы машины сели на нужную высоту кадра. Поднимаем наводку над машинами ровно
// на столько, сколько занимает половина кадра, помноженная на drop.
export function aimFor(pos,fov,drop,centre=CARS){
 const dist=Math.hypot(pos[0]-centre.x,pos[1]-centre.y,pos[2]-centre.z);
 return [centre.x,centre.y+dist*drop*Math.tan(fov*Math.PI/360),centre.z];
}

// Полёт дрона. Болтанка по синусам читалась как поплавок на волне, а не как съёмка: дрон идёт
// осмысленной линией. Поэтому основное движение — медленная дуга вдоль заезда (её считает
// droneArc), а здесь остаётся только лёгкая неровность хода, чтобы линия не выглядела рельсовой.
export function droneDrift(time,strength){
 if(strength<=0)return {x:0,y:0,z:0,ax:0,ay:0,roll:0};
 return {
  x:(Math.sin(time*.29)*.20+Math.sin(time*.61+1.3)*.09)*strength,
  y:(Math.sin(time*.37+.7)*.15+Math.sin(time*.83+2.2)*.06)*strength,
  z:Math.sin(time*.23+2.1)*.2*strength,
  ax:Math.sin(time*.31+.5)*.1*strength,
  ay:Math.sin(time*.61+2.6)*.07*strength,
  roll:Math.sin(time*.41+1.1)*.006*strength,
 };
}
// Дуга: за первые секунды заезда камера переходит с одной стороны оси на другую и поднимается.
// Один проход за заезд, с креном в сторону движения — так снимают с дрона, идущего рядом.
export const ARC={span:1.1,rise:.55,seconds:9};
export function droneArc(sinceLaunch,strength=1){
 const t=ease(Math.min(1,Math.max(0,sinceLaunch)/ARC.seconds));
 const speed=Math.abs(sinceLaunch)<ARC.seconds?(1-Math.abs(2*t-1))*.9:0;
 return {x:mix(-ARC.span,ARC.span,t)*strength,y:t*ARC.rise*strength,roll:-speed*.02*strength};
}
// Толчок в подвес: переключение, удар, нитро. Раньше здесь жила ещё и постоянная дрожь на 3–4 Гц; на экране
// она читалась не как съёмка, а как мелкая тряска, и не унималась даже когда машина уже стояла (Андрей,
// 17 сентября). Настоящий подвес гасит вибрацию, а не добавляет её, поэтому периодики тут больше нет —
// остался короткий сдвиг кадра, который гаснет вместе с самим толчком. Игра добавляет его после сглаживания:
// иначе сглаживание съело бы и толчок.
export function gimbalJitter(time,speed01,strength,shake=0){
 if(!(shake>0))return {x:0,y:0,z:0};
 const push=shake*Math.max(.35,strength);
 return {x:0,y:push*.4,z:push*.8};
}

// Кадр на текущий момент. sinceLaunch — сколько прошло с зелёного, shake — толчок от переключения
// или удара. game.js догоняет это положение с запаздыванием, отсюда и ощущение живого оператора.
export function dragCameraFrame({phase='ready',time=0,speed=0,sinceLaunch=99,shake=0,reduced=false,aspect=REF_ASPECT,rivalZ=0,orbit=0}={}){
 if(reduced){
  // Бережный режим отключает полёт, но не свайп: это движение игрока, а не самой камеры.
  const turn=Math.max(-ORBIT_LIMIT,Math.min(ORBIT_LIMIT,orbit)),cos=Math.cos(turn),sin=Math.sin(turn);
  const dx=RIG.calm.pos[0]-CARS.x,dz=RIG.calm.pos[2]-CARS.z;
  const pos=[CARS.x+dx*cos+dz*sin,RIG.calm.pos[1],CARS.z-dx*sin+dz*cos];
  const aim=aimFor(pos,RIG.calm.fov,RIG.calm.drop);
  return {pos:{x:pos[0],y:pos[1],z:pos[2]},aim:{x:aim[0],y:aim[1],z:aim[2]},jitter:{x:0,y:0,z:0},fov:RIG.calm.fov,roll:0,lag:4.5};
 }
 const speed01=clamp01(speed/SPEED_TOP);
 const flight=mixRig(RIG.run,RIG.fast,ease(speed01));
 const grid=['ready','countdown'].includes(phase);
 // Взлёт: полторы секунды от стартовой точки к полёту. Резкой склейки нет — это один подъём.
 const lift=grid?0:ease(sinceLaunch/1.5);
 const base=mixRig(RIG.grid,flight,lift);
 // Пока машины идут рядом, кадр строится вокруг середины между ними. Как только разъехались,
 // следить за соперником незачем: камера плавно переводит внимание на свою машину и перестаёт
 // отползать назад. Плавно — потому что любой скачок в кадре виден сильнее самого отрыва.
 const apart=ease(Math.min(1,Math.abs(rivalZ)/13));
 const pairZ=Math.max(-7,Math.min(7,rivalZ*.5));
 // Свайп — это «посмотреть на свою машину сбоку», поэтому вместе с объездом точка слежения
 // переходит на неё: иначе кадр объезжает пустоту между полосами, а машина уезжает за край.
 const turn=Math.max(-ORBIT_LIMIT,Math.min(ORBIT_LIMIT,orbit)),peek=Math.abs(turn)/ORBIT_LIMIT;
 const focus=Math.max(apart*.75,peek*.85);
 const centre={x:mix(0,MINE.x,focus),y:CARS.y,z:mix(pairZ,MINE.z,Math.max(apart,peek))};
 // Отход под узкий кадр: по вертикали всё сходится само, а по горизонтали на вытянутых экранах
 // видно меньше — значит, отходим ровно настолько, чтобы обе машины остались в кадре.
 const spread=Math.max(1,Math.min(1.45,REF_ASPECT/(aspect||REF_ASPECT)));
 const axes=['x','y','z'];
 for(let i=0;i<3;i++)base.pos[i]=centre[axes[i]]+(base.pos[i]-CARS[axes[i]])*spread;
 // Одной машине нужно меньше кадра, чем двум: на отрыве камера чуть подбирается, а не убегает.
 for(let i=0;i<3;i++)base.pos[i]=centre[axes[i]]+(base.pos[i]-centre[axes[i]])*mix(1,.88,apart);
 // Свайп: камера объезжает точку слежения, а не уходит в сторону — машина остаётся на своём месте
 // в кадре, зато видно её сбоку. Наводка не трогается, поэтому никуда не «плывёт».
 if(turn){
  const dx=base.pos[0]-centre.x,dz=base.pos[2]-centre.z,cos=Math.cos(turn),sin=Math.sin(turn);
  base.pos[0]=centre.x+dx*cos+dz*sin;
  base.pos[2]=centre.z-dx*sin+dz*cos;
 }
 const aim=aimFor(base.pos,base.fov,base.drop,centre);
 // На стойке дрон висит ровнее, в полёте его несёт. И над остановившейся машиной он почти замирает:
 // после финиша кадр продолжал жить своей жизнью, хотя на экране уже ничего не двигалось.
 const hover=.3+.7*clamp01(speed/14);
 const strength=(grid?.3:mix(.3,1,lift))*hover;
 const drift=droneDrift(time,strength),arc=droneArc(grid?0:sinceLaunch,strength);
 // Объектив на пуске раскрывается и возвращается — короткий «рывок» вместо плавного разгона.
 const punch=grid?0:Math.exp(-sinceLaunch*4.5)*5;
 return {
  pos:{x:base.pos[0]+drift.x+arc.x,y:base.pos[1]+drift.y+arc.y,z:base.pos[2]+drift.z},
  aim:{x:aim[0]+drift.ax,y:aim[1]+drift.ay,z:aim[2]},
  jitter:gimbalJitter(time,speed01,strength,shake),
  fov:base.fov+punch+shake*3,
  roll:drift.roll+arc.roll+shake*.02,
  // Пока камера догоняет старт — она ленивее: оператор всегда опаздывает за рывком.
  lag:grid?5:mix(2.2,5.5,lift),
 };
}
