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
export async function renderCarHero({THREE,model,width=760,height=475,exposure=1.15,rig=HERO_RIG}){
 const r=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
 try{
  r.setPixelRatio(1);r.setSize(width,height,false);r.outputColorSpace=THREE.SRGBColorSpace;
  r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=exposure;r.setClearColor(0,0);
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf0e6d2,0x1b1f1c,1.2));
  // Ключ тёплый спереди-слева — он лепит капот и крыло. Контровой холодный из-за спины рисует
  // кромку крыши: без него тёмная машина сливается с тёмным экраном.
  const key=new THREE.DirectionalLight(0xffdfae,4.4);key.position.set(-6,5.5,5);scene.add(key);
  const back=new THREE.DirectionalLight(0xbcd8ff,3.2);back.position.set(5,4,-5.5);scene.add(back);
  const warm=new THREE.DirectionalLight(0xe8bb60,.9);warm.position.set(-2,-2.5,2);scene.add(warm);
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
  scene.remove(model);
  return src;
 }finally{r.dispose();}
}
