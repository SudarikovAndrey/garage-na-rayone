// Вид машины сбоку для экрана «Машины» и кнопки выбора: чистый профиль, мягкий студийный свет, тень под колёсами.
// Закрытые машины — тёмные силуэты. Рендер кэшируется в памяти и в localStorage, чтобы не грузить 13 моделей каждый раз.
const STORAGE='rayon-fleet-views-v1';
export function createFleetViews({THREE,loadModel,modelInstance,cars,width=480,height=200}){
 const memory=new Map();let stored={};try{stored=JSON.parse(localStorage.getItem(STORAGE)||'{}');}catch{stored={};}
 let preview=null;
 const renderer=()=>{if(preview)return preview;preview=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});preview.setPixelRatio(1);preview.setSize(width,height,false);preview.outputColorSpace=THREE.SRGBColorSpace;preview.toneMapping=THREE.ACESFilmicToneMapping;preview.toneMappingExposure=1.05;preview.setClearColor(0,0);return preview;};
 const persist=()=>{try{localStorage.setItem(STORAGE,JSON.stringify(stored));}catch{}};
 const keyOf=(i,silhouette,look)=>(silhouette?'s':'c')+i+'|'+(silhouette?'':look);
 // Cars are modelled along X; the camera looks along -Z at the left side of the car, orthographic so every car keeps its true length.
 async function renderOne(i,silhouette,look){
  const r=renderer(),scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf7f0e2,0x2a302c,silhouette?0:2.1));
  const key=new THREE.DirectionalLight(0xffe9c4,3.2);key.position.set(-3,6,6);scene.add(key);
  const rim=new THREE.DirectionalLight(0xbcd8e8,1.4);rim.position.set(3,4,-5);scene.add(rim);
  await loadModel(i);const root=modelInstance(i,...(look||[]));scene.add(root);
  if(silhouette){const dark=new THREE.MeshBasicMaterial({color:0x1b201d});root.traverse(o=>{if(o.isMesh)o.material=dark;});}
  root.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
  // Ground shadow: a soft dark disc under the car (skipped for silhouettes).
  if(!silhouette){const shadow=new THREE.Mesh(new THREE.PlaneGeometry(size.x*1.05,size.z*1.6),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.28}));shadow.rotation.x=-Math.PI/2;shadow.position.set(center.x,box.min.y+.005,center.z);scene.add(shadow);}
  const span=size.x*1.12,aspect=width/height,cam=new THREE.OrthographicCamera(-span/2,span/2,span/aspect/2,-span/aspect/2,.1,50);
  cam.position.set(center.x,center.y+size.y*.05,center.z+12);cam.lookAt(center.x,center.y+size.y*.05,center.z);cam.updateProjectionMatrix();
  r.render(scene,cam);const src=r.domElement.toDataURL('image/webp',silhouette?.7:.88);
  scene.remove(root);root.userData.disposeCustomization?.();return src;
 }
 return {
  // look: [equipment,paint,racing,decal] for owned cars; omitted for silhouettes.
  async view(i,{silhouette=false,look=null,lookKey=''}={}){const k=keyOf(i,silhouette,lookKey);if(memory.has(k))return memory.get(k);if(silhouette&&stored[k]){memory.set(k,stored[k]);return stored[k];}const src=await renderOne(i,silhouette,look);memory.set(k,src);if(silhouette){stored[k]=src;persist();}return src;},
  async all(indices,options){const out={};for(const i of indices)out[i]=await this.view(i,options(i));return out;},
  dispose(){preview?.dispose();preview=null;memory.clear();},
 };
}
