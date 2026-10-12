// Парадный кадр машины: три четверти спереди.
//
// Профиль сбоку (fleet-views, превью в списке) годится, когда машину выбирают: видно длину и силуэт.
// Когда машину вручают — «тачка твоя» после подмены, — профиль читается плоско и буднично.
// Здесь другой кадр: камера встаёт перед носом, уходит на борт и поднимается чуть выше капота,
// свет тёплый спереди и холодный из-за спины, под колёсами тень. Машина получает объём и блики.
//
// Модели лежат вдоль X носом в −X, борта по ±Z (как в car-driver.js). Кадр считается от габаритов
// самой машины, а не подбирается на глаз: Нива выше Копейки, и камера обязана это учитывать.

export const HERO_FOV=38;
// Доли габаритов: вынос вперёд, высота над полом, отход на борт, куда целимся и наклон кадра.
// Камера низкая (чуть выше капота) и близкая — так машина нависает, а не лежит на витрине.
export const HERO_RIG={ahead:.52,height:.58,side:1.04,aim:.4,lead:.02,tilt:-.05};
// Фронтальный кадр для подарка на плакате: камера почти перед носом, чуть сбоку, невысоко.
export const HERO_FRONT_RIG={ahead:1.05,height:.5,side:.42,aim:.4,lead:0,tilt:0};

// Студия для плаката: световые короба, которых в кадре нет, но их отражения ложатся полосами на
// лак — это и делает краску «дорогой», а не матовой. Короба яркие нарочно: на экране вручения их
// держат мягкими, а плакату нужен контраст — в чате он размером с ладонь.
function posterEnvironment(THREE,renderer){
 const room=new THREE.Scene();room.background=new THREE.Color(0x04060a);
 const strip=(color,intensity,w,h,x,y,z,rx,ry)=>{
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,toneMapped:false}));
  m.material.color.multiplyScalar(intensity);m.position.set(x,y,z);m.rotation.set(rx,ry,0);room.add(m);
 };
 strip(0xfff4e0,9,14,1.6,0,4.6,2.8,-Math.PI/2.3,0);    // длинный тёплый короб спереди-сверху: полоса по капоту и крыше
 strip(0xcfe4ff,7,12,1.2,0,4.4,-4.2,Math.PI/2.5,0);    // холодный сзади-сверху: кромка крыши и корма
 strip(0xffffff,5,3,5,-7.5,2.2,.5,0,Math.PI/2);         // боковой слева: блик по крылу и двери
 strip(0x8fd8ff,3.5,30,30,0,-1.4,0,Math.PI/2,0);        // холодный низ в цвет неона: пороги и арки не проваливаются
 strip(0xff9a4a,4,20,1,0,.5,8,0,Math.PI);               // тёплая полоса у горизонта спереди — ответ жару на плакате
 const pmrem=new THREE.PMREMGenerator(renderer);
 const texture=pmrem.fromScene(room,0,.1,60).texture;
 pmrem.dispose();room.traverse(o=>{o.geometry?.dispose?.();o.material?.dispose?.();});
 return texture;
}

export function heroFraming(box,rig=HERO_RIG){
 const size={x:box.max.x-box.min.x,y:box.max.y-box.min.y,z:box.max.z-box.min.z};
 const center={x:(box.max.x+box.min.x)/2,y:(box.max.y+box.min.y)/2,z:(box.max.z+box.min.z)/2};
 return {
  fov:HERO_FOV,
  position:{x:center.x-size.x*rig.ahead,y:box.min.y+size.y*rig.height,z:center.z+size.z*rig.side},
  target:{x:center.x-size.x*rig.lead,y:box.min.y+size.y*rig.aim,z:center.z},
  tilt:rig.tilt||0,
 };
}

// Мягкое пятно тени под колёсами: радиальная прозрачность, нарисованная в канвасе.
let blot=null;
function blotTexture(THREE){
 if(blot)return blot;
 const n=128,c=document.createElement('canvas');c.width=c.height=n;
 const g=c.getContext('2d'),grad=g.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);
 grad.addColorStop(0,'rgba(0,0,0,1)');grad.addColorStop(.45,'rgba(0,0,0,.72)');grad.addColorStop(1,'rgba(0,0,0,0)');
 g.fillStyle=grad;g.fillRect(0,0,n,n);
 blot=new THREE.CanvasTexture(c);blot.colorSpace=THREE.SRGBColorSpace;
 return blot;
}

// model — уже собранная машина (modelInstance). Рендерер свой и одноразовый: кадр нужен раз за экран.
// poster — свет под плакат в чат (12 октября): ключ и контровой сильнее, снизу холодная подсветка
// в цвет неона, экспозиция выше. Тёмно-синяя машина на экране вручения читалась, а в превью чата
// размером с ладонь превращалась в чёрное пятно.
export async function renderCarHero({THREE,model,width=760,height=475,exposure=1.15,rig=HERO_RIG,poster=false}){
 const r=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 try{
  r.setPixelRatio(1);r.setSize(width,height,false);r.outputColorSpace=THREE.SRGBColorSpace;
  r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=poster?exposure*1.3:exposure;r.setClearColor(0,0);
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf0e6d2,poster?0x2a3a44:0x1b1f1c,poster?1.6:1.2));
  // Ключ тёплый спереди-слева — он лепит капот и крыло. Контровой холодный из-за спины рисует
  // кромку крыши: без него тёмная машина сливается с тёмным экраном.
  const key=new THREE.DirectionalLight(0xffdfae,poster?6:4.4);key.position.set(-6,5.5,5);scene.add(key);
  const back=new THREE.DirectionalLight(0xbcd8ff,poster?5.2:3.2);back.position.set(5,4,-5.5);scene.add(back);
  const warm=new THREE.DirectionalLight(0xe8bb60,poster?1.4:.9);warm.position.set(-2,-2.5,2);scene.add(warm);
  // На плакате за машиной жар, а под ней «лёд»: кромка порогов и арок ловит холодный отсвет снизу.
  let env=null;
  if(poster){const ice=new THREE.DirectionalLight(0x8fe3ff,2.2);ice.position.set(1,-3,3);scene.add(ice);env=posterEnvironment(THREE,r);scene.environment=env;scene.environmentIntensity=1.35;}
  scene.add(model);
  model.updateWorldMatrix(true,true);
  const box=new THREE.Box3().setFromObject(model);
  const size=box.getSize(new THREE.Vector3());
  // Тень — мягкое пятно, а не прямоугольник: плоскости с ровной заливкой видно краями.
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(size.x*1.6,size.z*3.2),
   new THREE.MeshBasicMaterial({map:blotTexture(THREE),transparent:true,opacity:.5,depthWrite:false}));
  shadow.rotation.x=-Math.PI/2;
  shadow.position.set((box.max.x+box.min.x)/2,box.min.y+.004,(box.max.z+box.min.z)/2);
  scene.add(shadow);
  const frame=heroFraming({max:box.max,min:box.min},{...HERO_RIG,...rig});
  const cam=new THREE.PerspectiveCamera(frame.fov,width/height,.1,60);
  cam.position.set(frame.position.x,frame.position.y,frame.position.z);
  cam.lookAt(frame.target.x,frame.target.y,frame.target.z);
  if(frame.tilt)cam.rotateZ(frame.tilt);
  cam.updateProjectionMatrix();
  r.render(scene,cam);
  const src=r.domElement.toDataURL('image/webp',.92);
  scene.remove(model);env?.dispose();
  return src;
 }finally{r.dispose();}
}
