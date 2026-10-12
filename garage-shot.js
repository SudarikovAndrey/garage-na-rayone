// Снимок машины для приглашения: своя тачка — со своей краской, обвесом и колёсами — на мокром
// асфальте в полумраке. Настоящая, не витринная: это первое, что кореш видит про игру.
//
// Почему студия, а не гараж (решение Андрея, 18 сентября). Гараж в кадре растаскивал внимание:
// верстак, шкафы, кирпич — машина тонула среди мебели. Плюс камера считалась по габаритам и при
// большой тачке отъезжала за стену, и в чат уходил снимок стены. В студии стен нет вовсе: пол,
// темнота и свет, который эту тачку продаёт.
//
// Снимаем тем же рендером, что и игра, — он уже сводит кадр с тонмаппингом, блумом и виньеткой
// прямо на холст. Холст живёт без preserveDrawingBuffer, поэтому читать его можно только в той же
// задаче, где прошла отрисовка: любой await между render и drawImage — и браузер успеет показать
// кадр, а вернёт пустоту.
export const SHOT={width:1000,height:1000,quality:.9};

// Габариты именно машины. К объекту машины подвешена не только она: световой ковёр (ground-light.js)
// бьёт на метр в стороны и почти на два назад, неон добавляет своё. Box3.setFromObject считал кадр
// по ним, и камера отъезжала почти вдвое дальше нужного — за стену гаража. В чат уходил снимок
// чёрной стены с кусочком мастерской сбоку. Меши самой машины помечены userData.car ещё при сборке
// модели (modelInstance), по ним и меряем.
export function carBounds(THREE,car){
 const box=new THREE.Box3();
 car.traverse(o=>{if(o.isMesh&&o.userData?.car)box.expandByObject(o);});
 // Разметки нет — значит это не игровая машина, а витринный рендер или проверка: меряем целиком.
 return box.isEmpty()?new THREE.Box3().setFromObject(car):box;
}

// Ракурс. Гараж показывает машину сверху, витриной; для баннера нужен злой низкий три четверти
// спереди. Машина уводится вправо — слева на баннере живёт типографика.
// Ракурс. Низкий три четверти спереди: так тачка выглядит злее, чем с витринной высоты.
// Машина уводится вправо — слева на баннере живёт типографика. Стен вокруг больше нет, упереться
// камерой не во что, но проверка check-invite-card всё равно считает углы габарита в кадре и не
// даст увести нос за край: у длинных тачек парка запас невелик.
// Машина крупнее на пятую часть (Андрей, 18 сентября): zoom делится на 1.2. Кадр при этом
// пришлось пересобрать — на прежнем shift нос уходил за правый край, — и колонка типографики
// стала уже, зато тачка занимает кадр так, как ей и положено на продающем баннере.
export function stageCamera(THREE,box,{width=SHOT.width,height=SHOT.height,yaw=.74,pitch=.16,zoom=.983,shift=.16}={}){
 const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 const camera=new THREE.PerspectiveCamera(34,width/height,.1,220);
 // Дистанция по габаритам модели, а не на глаз: длинные машины иначе вылезают за кадр.
 const radius=Math.max(.6,size.length()*.5);
 const distance=radius/Math.sin(camera.fov*Math.PI/360)*zoom;
 const flat=Math.cos(pitch);
 camera.position.set(
  center.x+Math.sin(yaw)*flat*distance,
  center.y+Math.sin(pitch)*distance,
  center.z+Math.cos(yaw)*flat*distance,
 );
 // Смещаем не камеру, а точку взгляда — вдоль её же горизонтали. Так машина уезжает вправо,
 // а ракурс остаётся тем же.
 const view=new THREE.Vector3().subVectors(center,camera.position).normalize();
 const right=new THREE.Vector3().crossVectors(view,new THREE.Vector3(0,1,0)).normalize();
 const target=center.clone().addScaledVector(right,-radius*shift);
 target.y=center.y+size.y*.30;
 camera.lookAt(target);
 camera.updateProjectionMatrix();
 return camera;
}
// Прежний вход по объекту машины: им пользуются проверки и наладка.
export const shotCamera=(THREE,car,options)=>stageCamera(THREE,carBounds(THREE,car),options);

// Пустой кадр — чёрный кадр. На части телефонов чтение холста возвращает именно его, и лучше уйти
// на витринный рендер, чем отправить корешу чёрный прямоугольник.
export function looksLit(data,limit=7){
 let sum=0,count=0;
 for(let i=0;i<data.length;i+=4*997){sum+=data[i]+data[i+1]+data[i+2];count+=3;}
 return count>0&&sum/count>limit;
}
// Кадр со стеной — не чёрный, и прежняя проверка его пропускала: именно такой снимок и уехал в чат.
// Отличить стену от гаража можно разбросом яркости: у настоящего кадра есть машина, свет, пол и
// железо, у стены — ровная заливка. Порог низкий: лучше отправить тёмный, но живой кадр, чем
// отбраковать нормальный снимок ночного гаража.
export function looksAlive(data,spread=9){
 let sum=0,squares=0,count=0;
 for(let i=0;i<data.length;i+=4*397){
  const lum=(data[i]*.299+data[i+1]*.587+data[i+2]*.114);
  sum+=lum;squares+=lum*lum;count++;
 }
 if(count<16)return true;
 const mean=sum/count;
 return Math.sqrt(Math.max(0,squares/count-mean*mean))>spread;
}

// Студия. Всё, что в ней есть: пол, два световых короба и три источника. Ни стен, ни потолка —
// смотреть должно быть не на что, кроме машины.
export const STAGE={
 back:0x05070b,               // фон и туман: ночь, а не серое ничто
 floor:0x161d26,              // мокрый асфальт ночью не чёрный и не серый — тёмно-синий
 roughness:.24,               // блеск воды; выше — и пол становится сухим бетоном
 // Металличность нулевая: вода и асфальт — диэлектрики. С металлом пол отражает тёмное окружение
 // тёмным и пропадает из кадра вовсе; с нулём работает френель, и у края кадра появляется тот самый
 // мокрый отблеск.
 metalness:0,
  env:.95,                    // насколько сильно световые короба видны в лаке и в луже
 // Туман считается от камеры, а она стоит примерно в трёх габаритах от машины: начни его ближе —
 // и он съест не дальний край пола, а весь пол вместе с машиной.
 fogFrom:3.6,fogTo:10,

 // Свет — стандартная студийная тройка, а не один прожектор в упор. Прожектором капот выбивало
 // в белое: у пятна свой спад по поверхности, и на светлой краске он съедал цвет целиком.
 // Направленные источники светят ровно, их сила предсказуема, и форма кузова читается.
 //
 //   рисующий  — главный, сверху-справа перед машиной: он лепит объём и даёт тень;
 //   заполняющий — с другой стороны от оси камеры, втрое слабее: поднимает тени, своей не бросает;
 //   контровой — сзади-сверху напротив рисующего: отбивает крышу и плечо от темноты.
 //
 // Сила подобрана так, чтобы блик на капоте не уходил в белое даже на светлой краске: тонмаппинг
 // ACES и блум поверх легко добирают то, что кажется недосветом.
 // Азимут важнее силы. Камера смотрит на машину спереди-справа (yaw .74), и рисующий свет
 // нельзя ставить туда же: с оси камеры он бьёт в лоб и раскатывает по капоту и крыше сплошной
 // белый блик — краска пропадает целиком. Проверено: капот оставался белым даже при выключенном
 // окружении и приглушённых коробах. Разводим по канону: ключ уходит вбок градусов на сорок пять
 // от оси камеры, заполняющий — на столько же в другую сторону, контровой — за машину.
 // Высота решает не меньше азимута. Ключ над машиной выбивал крышу и капот в белое: горизонтальные
 // панели ловят его ровно под зеркальным углом. Опущенный, скользящий ключ ведёт блик по борту и
 // плечу — так кузов и снимают, — а крышу мягко доваривают световые короба сверху.
 key:{color:0xfff2e0,power:2.0,at:[1.55,.72,.28]},
 fill:{color:0xb9d2f2,power:.8,at:[.1,.45,1.5]},
 // Контровой слабый — и это не экономия. На силе 2.6 он выбивал крышу и капот в сплошное белое:
 // его блик уходил в камеру ровно через горизонтальные панели, и краска пропадала. Снимали серию
 // с поочерёдно выключенными источниками — белым оказывался именно он. На 0.8 он делает своё дело:
 // отбивает крышу и плечо от темноты мягкой полосой, не съедая цвет.
 rim:{color:0xdcebff,power:.8,at:[-1.25,.55,-1.2]},
 ambient:{sky:0x44586f,ground:0x0b0f15,power:.42},
};

// Окружение: два световых короба, как в студийной съёмке. В кадре их нет, но их отражения ложатся
// полосами на лак и на мокрый пол — именно это делает кадр продающим, а не просто тёмным.
// Считается один раз на рендерер: PMREM — вещь недешёвая, а короба не меняются.
const environments=new WeakMap();
function stageEnvironment(THREE,renderer){
 if(!renderer?.capabilities)return null; // без WebGL окружения нет, и это не повод падать
 const cached=environments.get(renderer);
 if(cached)return cached;
 const room=new THREE.Scene();
 room.background=new THREE.Color(0x05070b);
 const strip=(color,intensity,w,h,x,y,z,rx,ry)=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,toneMapped:false}));
  m.material.color.multiplyScalar(intensity);
  m.position.set(x,y,z);m.rotation.set(rx,ry,0);room.add(m);
 };
 // Короба держим мягкими. Ярче — и они отражаются в капоте и крыше сплошным белым: горизонтальные
 // панели ловят верхний свет ровно под зеркальным углом, и краска пропадает целиком. Форму лепят
 // направленные источники, короба здесь только ради полос в лаке.
 strip(0xfff0d8,3.2,11,2.0,0,4.4,3.6,-Math.PI/2.4,0);  // тёплый спереди-сверху
 strip(0xbcd9ff,2.2,12,1.5,0,4.8,-4.4,Math.PI/2.6,0);  // холодный сзади: очерчивает крышу и корму
 strip(0xffffff,2.2,3,6,-7,2.4,0,0,Math.PI/2);         // слабая боковая заливка слева, под типографику
 strip(0x9fb8d8,1.2,26,26,0,-1.2,0,Math.PI/2,0);       // слабый низ: без него днище и колёса проваливаются в уголь
 // Огни у горизонта. Мокрый асфальт под острым углом почти зеркало и отражает не то, что над ним,
 // а то, что вдали у самой земли. Без этой полосы пол остаётся чёрным пятном, сколько на него ни свети.
 strip(0xffc98a,4,30,1.1,0,.55,7.5,0,Math.PI);         // тёплая полоса спереди — она и ложится лужей света
 strip(0x9ec8ff,2.6,30,.8,0,.75,-8,0,0);               // холодная сзади: даёт вторую, дальнюю дорожку
 const pmrem=new THREE.PMREMGenerator(renderer);
 const texture=pmrem.fromScene(room,0,.1,80).texture;
 pmrem.dispose();
 room.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
 environments.set(renderer,texture);
 return texture;
}

// Асфальт рисуем, а не досвечиваем. Тёмный диэлектрик под острым углом отдаёт в камеру почти
// ничего, и сколько на него ни направляй источников, в кадре он остаётся чёрным пятном — проверено
// тремя заходами. Поэтому пол приходит готовым: лужа тёплого света под машиной, холодный отсвет
// сзади, крапчатая фактура и уход в темноту по краям. Светом добавляем только блик и тень.
const floors=new WeakMap();
export function stageFloorTexture(THREE,renderer,doc=globalThis.document){
 if(!doc?.createElement)return null; // без холста фактуры нет: сцена соберётся и так
 const cached=renderer&&floors.get(renderer);
 if(cached)return cached;
 const size=512,c=doc.createElement('canvas');c.width=c.height=size;
 const g=c.getContext('2d');
 g.fillStyle='#070a0f';g.fillRect(0,0,size,size);
 const glow=(x,y,r,color,alpha)=>{
  const grad=g.createRadialGradient(x,y,0,x,y,r);
  grad.addColorStop(0,`rgba(${color},${alpha})`);grad.addColorStop(1,`rgba(${color},0)`);
  g.fillStyle=grad;g.fillRect(0,0,size,size);
 };
 // Машина стоит в середине; «вперёд» у неё — вниз по текстуре. Свет держим пятном, а не заливкой:
 // залитый ровным светом пол читается серой плитой, а не мокрой дорогой в полумраке.
 glow(size*.5,size*.60,size*.26,'255,196,138',.42);  // тёплая лужа под передом
 glow(size*.5,size*.60,size*.13,'255,226,186',.30);  // её горячая сердцевина
 glow(size*.5,size*.36,size*.18,'150,190,255',.13);  // холодный отсвет за кормой
 // Фактура: крапины и длинные разводы воды. Без них пол читается как гладкий пластик.
 for(let i=0;i<3000;i++){
  const x=Math.random()*size,y=Math.random()*size,r=Math.random()*1.9+.3;
  g.fillStyle=`rgba(${Math.random()<.55?'0,0,0':'255,255,255'},${Math.random()*.07})`;
  g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();
 }
 for(let i=0;i<46;i++){
  const y=Math.random()*size,w=size*(.08+Math.random()*.4),x=Math.random()*size;
  g.fillStyle=`rgba(190,220,255,${Math.random()*.05})`;
  g.fillRect(x,y,w,Math.random()*2.4+.5);
 }
 // Контактная тень: без неё машина висит над полом, как наклейка. Пятно вытянуто вдоль машины —
 // в гараже она стоит носом по оси Z, а это вертикаль текстуры.
 g.save();
 g.translate(size*.5,size*.5);g.scale(.42,1);
 const shade=g.createRadialGradient(0,0,0,0,0,size*.105);
 shade.addColorStop(0,'rgba(0,0,0,.85)');shade.addColorStop(.55,'rgba(0,0,0,.45)');shade.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=shade;g.beginPath();g.arc(0,0,size*.105,0,Math.PI*2);g.fill();
 g.restore();

 // Дальше — только прозрачность. Пол обязан раствориться в темноте, а не оборваться краем круга:
 // на первом заходе он читался светлой плитой, приклеенной к чёрному фону.
 g.globalCompositeOperation='destination-out';
 const fade=g.createRadialGradient(size/2,size/2,size*.20,size/2,size/2,size*.5);
 fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,1)');
 g.fillStyle=fade;g.fillRect(0,0,size,size);
 // Окно под машиной: сквозь него проступает отражение. Без него зеркальная копия честно рисуется,
 // но её полностью закрывает сам пол.
 const hole=g.createRadialGradient(size*.5,size*.56,0,size*.5,size*.56,size*.26);
 hole.addColorStop(0,'rgba(0,0,0,.55)');hole.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=hole;g.fillRect(0,0,size,size);
 g.globalCompositeOperation='source-over';
 const texture=new THREE.CanvasTexture(c);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=4;
 if(renderer)floors.set(renderer,texture);
 return texture;
}

// Собрать студию под конкретную машину. Возвращает сцену и уборщика: всё созданное здесь живёт
// ровно один кадр, иначе за сессию накопятся десятки полов и источников.
export function buildStage(THREE,renderer,car,doc=globalThis.document){
 const scene0=new THREE.Scene();
 const home=car.parent;
 // Машину забираем в студию ровно на один кадр и возвращаем на место в любом случае — даже если
 // рендер упадёт. Иначе она пропадёт из гаража, и человек увидит пустую комнату.
 scene0.add(car);car.updateWorldMatrix(true,true);
 const box=carBounds(THREE,car);
 const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const span=Math.max(1,size.length());
 const scene=scene0;
 const night=new THREE.Color(STAGE.back);
 scene.background=night;
 scene.fog=new THREE.Fog(night,span*STAGE.fogFrom,span*STAGE.fogTo);
 scene.environment=stageEnvironment(THREE,renderer);

 // Пол. Круг, а не квадрат: край всё равно уходит в темноту, а треугольников вдвое меньше.
 // Рисунок асфальта идёт и в цвет, и в свечение: свечение держит кадр, когда прямого света мало,
 // а цвет ловит блик от ключа и тень от машины.
 const paint=stageFloorTexture(THREE,renderer,doc);
 const floor=new THREE.Mesh(
  new THREE.CircleGeometry(span*3.2,56),
  new THREE.MeshStandardMaterial({
   map:paint,emissiveMap:paint,emissive:0xffffff,emissiveIntensity:.34,
   color:0xffffff,roughness:STAGE.roughness,metalness:STAGE.metalness,envMapIntensity:STAGE.env,
   transparent:true,depthWrite:false,
  }),
 );
 floor.rotation.x=-Math.PI/2;
 floor.position.set(center.x,box.min.y,center.z); // ровно под колёсами: машина стоит, а не висит
 floor.receiveShadow=true;floor.renderOrder=-1; // поверх отражения, под машиной
 scene.add(floor);

 // Отражение. Мокрый асфальт тем и мокрый, что в нём стоит вторая машина — вверх ногами и тусклая.
 // Зеркалим относительно плоскости пола: точка (x,y,z) уходит в (x, 2F-y, z), это и делает держатель
 // со scale.y=-1 и сдвигом. Материалы у копии самые дешёвые: она идёт в четверть силы и под слоем
 // асфальта, разглядывать там нечего, а компилировать полноценный лак второй раз — полсекунды стопа.
 const mirrorMaterials=[];
 const mirror=car.clone(true);
 mirror.traverse(o=>{
  if(o.userData?.groundLight){o.visible=false;return;} // ковёр света зеркалить незачем
  if(!o.isMesh)return;
  const src=Array.isArray(o.material)?o.material[0]:o.material;
  // Непрозрачная тусклая копия (цвет ×0.3 вместо прозрачности 0.3): у новых моделей есть салон и мотор, и
  // полупрозрачное отражение без глубины показывало их сквозь кузов, как на рентгене. Стекло в отражении тёмное.
  const glass=/glass/i.test(src?.name||'');
  const flat=new THREE.MeshBasicMaterial({
   color:glass?new THREE.Color(0x0b0f12):(src?.color?.clone?.()||new THREE.Color(0x7d8b9c)).multiplyScalar(.30),map:src?.map||null,
   vertexColors:!!src?.vertexColors,
   side:THREE.DoubleSide, // зеркало выворачивает обход граней наизнанку
   fog:true,
  });
  mirrorMaterials.push(flat);
  o.material=flat;o.castShadow=o.receiveShadow=false;o.renderOrder=-2;
 });
 const holder=new THREE.Group();
 holder.position.y=box.min.y*2;holder.scale.y=-1;
 holder.add(mirror);
 scene.add(holder);

 // Свет: рисующий, заполняющий, контровой. Тень бросает только рисующий — две тени от двух
 // источников читаются как ошибка, а не как студия.
 const beam=({color,power,at})=>{
  const light=new THREE.DirectionalLight(color,power);
  light.position.set(center.x+span*at[0],box.min.y+span*at[1],center.z+span*at[2]);
  light.target.position.copy(center);
  return light;
 };
 const key=beam(STAGE.key),fill=beam(STAGE.fill),rim=beam(STAGE.rim);
 key.castShadow=true;
 key.shadow.mapSize.set(1024,1024);
 // Ортографическая камера тени по габариту машины: на глаз она либо режет тень, либо мылит её.
 const reach=span*.75;
 key.shadow.camera.left=-reach;key.shadow.camera.right=reach;
 key.shadow.camera.top=reach;key.shadow.camera.bottom=-reach;
 key.shadow.camera.near=span*.1;key.shadow.camera.far=span*4;
 key.shadow.bias=-.0016;key.shadow.normalBias=.02;
 const ambient=new THREE.HemisphereLight(STAGE.ambient.sky,STAGE.ambient.ground,STAGE.ambient.power);
 scene.add(key,key.target,fill,fill.target,rim,rim.target,ambient);

 return {scene,box,dispose(){
  // Сначала домой, потом уборка: порядок важен, scene.clear() иначе унесёт машину с собой.
  if(home)home.add(car);else scene.remove(car);
  floor.geometry.dispose();floor.material.dispose();
  for(const m of mirrorMaterials)m.dispose();
  key.dispose?.();fill.dispose?.();rim.dispose?.();ambient.dispose?.();
  scene.clear();
 }};
}

// Прогрев. Первая сборка карточки стоит секунд: надо собрать окружение и скомпилировать материалы
// машины под здешний свет — в сцене гаража их программы другие. Человек в этот момент уже выбрал
// фору и ждёт отправки, и пауза читается как «не работает». Поэтому греем заранее, пока он едет:
// compileAsync ничего не рисует, а машину из гаража можно забирать невидимо — гаража на экране нет.
//
// Всё, что стоит дорого, кэшируется по рендереру: окружение, фактура пола и программы материалов.
// Повторный прогрев поэтому дёшев, и звать его можно на каждый заезд.
export async function warmStage({THREE,graphics,car,width=SHOT.width,height=SHOT.height,doc=globalThis.document}={}){
 if(!THREE||!graphics?.renderer?.compileAsync||!car)return false;
 const stage=buildStage(THREE,graphics.renderer,car,doc);
 try{
  if(stage.box.isEmpty())return false;
  await graphics.renderer.compileAsync(stage.scene,stageCamera(THREE,stage.box,{width,height}));
  return true;
 }catch{return false;}
 finally{stage.dispose();}
}

export function captureGarageShot({THREE,graphics,car,level=0,settings,width=SHOT.width,height=SHOT.height,quality=SHOT.quality,doc=globalThis.document,...view}={}){
 if(!THREE||!graphics?.renderer||!car||!doc)return null;
 const stage=buildStage(THREE,graphics.renderer,car,doc);
 try{
  if(stage.box.isEmpty())return null;
  const camera=stageCamera(THREE,stage.box,{width,height,...view});
  // Между этими строками не должно быть ни одного await — см. комментарий наверху.
  graphics.resize(width,height,1,level,settings);
  graphics.render(stage.scene,camera);
  const flat=doc.createElement('canvas');flat.width=width;flat.height=height;
  const ctx=flat.getContext('2d');
  if(!ctx)return null;
  try{ctx.drawImage(graphics.renderer.domElement,0,0,width,height);}catch{return null;}
  try{
   const pixels=ctx.getImageData(0,0,width,height).data;
   // Обе проверки ведут в одно и то же место — к витринному рендеру. Он хуже собой, но в нём
   // гарантированно видно машину, а это и есть единственная задача баннера.
   if(!looksLit(pixels)||!looksAlive(pixels))return null;
   return flat.toDataURL('image/jpeg',quality);
  }catch{return null;}
 }finally{stage.dispose();}
}
