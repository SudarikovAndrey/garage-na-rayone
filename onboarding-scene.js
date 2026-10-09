import * as T from 'three';
import {outdoorEnvironment} from './pbr-renderer.js';
import {disposeCustomizedCar} from './car-customization.js';
import {frontWheelSteer,leanDriftBody} from './drift-feedback.js';

// A small, silent driving diorama. It owns only its renderer and scenery;
// the customized model shares the game's cached geometry and is never simulated.
export class LessonDriveScene{
 constructor(host,car){
  this.host=host;this.car=car;this.angle=0;this.x=0;this.travel=0;this.cursor=0;this.stamps=[];this.owned=[];
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
  this.scene=new T.Scene();this.scene.background=new T.Color(0x29382e);this.scene.fog=new T.Fog(0x29382e,19,42);
  this.camera=new T.PerspectiveCamera(39,2,.1,65);this.camera.position.set(0,3.1,6.2);this.camera.lookAt(0,.65,-.4);
  this.scene.add(new T.HemisphereLight(0xf4efd6,0x4e6950,3));const sun=new T.DirectionalLight(0xffe5b4,3);sun.position.set(-4,8,4);this.scene.add(sun);this.environment=outdoorEnvironment(this.renderer,{sky:0xaabbaa,fog:0xd6cdb0,sun:0xffddaa,intensity:2});this.scene.environment=this.environment.texture;
  car.rotation.set(0,-Math.PI/2,0);car.position.set(0,0,0);const span=car.userData.carLength||4.1;car.scale.setScalar(4.1/span);this.scene.add(car);
  this.plane(30,70,0x3a3528,0,-.04,-15);this.plane(8,70,0x242b28,0,-.015,-15);
  for(const x of [-3.8,3.8])this.plane(.075,70,0xd8cd9d,x,.003,-15);
  this.dashes=[];for(let i=0;i<16;i++)for(const x of [-2,2])this.dashes.push(this.plane(.075,1.6,0xb8b69d,x,.005,-i*4));
  // Continuous paired tyre marks scroll backward from the actual rear axle.
  for(let i=0;i<100;i++){const m=this.plane(.15,.5,0x151b17,0,.012,0);m.material.transparent=true;m.visible=false;this.stamps.push(m);}
  this.rear=[...(car.userData.wheels||[])].filter(w=>w.name.startsWith('Wheel_R'));this.front=[...(car.userData.wheels||[])].filter(w=>w.name.startsWith('Wheel_F'));
  host.append(this.renderer.domElement);this.resize=new ResizeObserver(()=>this.fit());this.resize.observe(host);this.fit();
 }
 plane(w,h,color,x,y,z){const geometry=new T.PlaneGeometry(w,h),material=new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide});const mesh=new T.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);this.scene.add(mesh);this.owned.push(mesh);return mesh;}
 fit(){const {width,height}=this.host.getBoundingClientRect();if(width<1||height<1)return;this.renderer.setSize(width,height,false);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
  const position=this.car.position.clone(),rotation=this.car.rotation.clone();this.camera.position.set(0,3.1,6.2);
  for(let attempt=0;attempt<8;attempt++){this.camera.lookAt(0,.65,-.4);this.camera.updateMatrixWorld();let extent=0;
   for(const a of [-.63,0,.63]){this.car.rotation.y=-Math.PI/2-a;this.car.position.x=Math.sign(a)*.85;this.car.updateMatrixWorld(true);const b=new T.Box3().setFromObject(this.car);for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){const p=new T.Vector3(x,y,z).project(this.camera);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));}}
   if(extent<.92)break;this.camera.position.multiplyScalar(1.08);
  }this.car.position.copy(position);this.car.rotation.copy(rotation);
 }
 reset(release=false){this.angle=release?.48:0;this.x=release?.6:0;this.previous=null;this.sample=0;for(const s of this.stamps)s.visible=false;}
 update(dt,steer,step,reduced){
  const input=Math.abs(steer),sliding=input>=.72;const target=sliding?Math.sign(steer)*(.20+(input-.50)*1.60):steer*.14;
  this.angle+=(target-this.angle)*(1-Math.exp(-dt*(sliding?5:3)));this.x+=(steer*.85-this.x)*(1-Math.exp(-dt*3));
  this.car.position.x=this.x;this.car.rotation.y=-Math.PI/2-this.angle;
  leanDriftBody(this.car,-this.angle*.075);for(const w of this.front)w.rotation.y=frontWheelSteer({drift:{angle:sliding||Math.abs(this.angle)>.10?this.angle:0,steer}});
  const motion=reduced?0:dt*7;this.travel+=motion;for(const w of this.car.userData.wheels||[])w.rotation.z+=motion/(this.car.userData.wheelRadius||.32);
  for(let i=0;i<this.dashes.length;i++){this.dashes[i].position.z=6-((Math.floor(i/2)*4-this.travel%4+64)%64);}
  for(const s of this.stamps)if(s.visible){s.position.z+=motion;s.material.opacity=Math.max(0,.72-s.position.z*.07);if(s.position.z>10)s.visible=false;}
  this.car.updateMatrixWorld(true);this.sample=(this.sample||0)+motion;
  if(Math.abs(this.angle)>.15&&this.sample>.25&&!reduced){this.sample=0;const contacts=this.rear.map(w=>w.getWorldPosition(new T.Vector3()));for(let i=0;i<contacts.length;i++){const p=contacts[i],old=this.previous?.[i];if(old){const end=old.clone();end.z+=this.travel-this.previousTravel;const dz=end.z-p.z,dx=end.x-p.x;const s=this.stamps[this.cursor++%this.stamps.length];s.visible=true;s.position.set((p.x+end.x)/2,.012,(p.z+end.z)/2);s.scale.y=Math.max(.65,Math.hypot(dx,dz)/.5);s.rotation.z=Math.atan2(dx,dz);s.material.opacity=.72;}}this.previous=contacts;this.previousTravel=this.travel;}else if(Math.abs(this.angle)<.1)this.previous=null;
  this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.resize.disconnect();this.environment.dispose();disposeCustomizedCar(this.car);for(const m of this.owned){m.geometry.dispose();m.material.dispose();}this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();}
}
