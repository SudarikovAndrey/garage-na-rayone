import {roadForwardSpeed,applyRoadImpulse} from './ridge-recovery.js';
import {ridgePoint,ridgeLocal,driftCourse} from './ridge-terrain.js';
import {hull} from './ridge-contact.js';
import {driftState} from './ridge-drift.js';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1],clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Shared by physics and visual instances. Sacrificial roadside posts, not concrete barriers.
export function createRidgePosts(){const out=[];const add=(d,lane,kind,radius,height,mass)=>out.push({id:out.length,d,lane,kind,radius,height,mass,broken:false,angle:0,omega:0,direction:[0,0]});
 const course=driftCourse();
 if(course.terrain==='city'){
  // Linked tyre stacks form a continuous, non-destructible energy-absorbing corridor.
  for(let d=-35;d<1120;d+=1.15)for(const side of [-1,1])add(d,side*8.2,'barrier',.68,.95,650);
  for(let lane=-8;lane<=8;lane+=1.15)add(1120,lane,'barrier',.68,.95,650);
  for(let d=24;d<1300;d+=30)for(const side of [-1,1])add(d,side*9.8,'flag',.06,2.6,6);
  for(const [d,side] of [[78,1],[160,-1],[242,1],[330,-1],[425,1],[525,-1],[625,1],[740,-1]]){
   for(let n=0;n<3;n++)add(d+n*1.2,side*6.2,'tyres',.68,.95,65);
   add(d+4,side*7.3,'island',.85,.5,380);
  }
  return out;
 }
 if(course.terrain==='forest'){for(let d=25;d<1300;d+=27)for(const side of [-1,1])add(d,side*5.65,'stake',.09,.85,7);return out;}
 for(let d=20;d<1250;d+=22)for(const side of [-1,1])add(d,side*4.5,'stake',.10,1.12,8);
 for(const [d,side] of [[115,-1],[220,1],[410,-1],[595,1],[700,-1]])add(d,side*4.8,'sign',.08,1.9,28);
 for(const d of [45,205,390,585,780])add(d,-5.3,'sock',.07,4.2,22);
 for(let d=72;d<1200;d+=96)for(const side of [-1,1])add(d,side*4.9,'lamp',.12,5.2,85);
 return out;
}
export function hitRidgePosts(car,dt){
 if(car.crashed)return;hitRidgeSolids(car,dt);if(!car.ridgePosts)return;const distance=car.finished?(car.travelDistance??car.distance):car.distance;
 for(const post of car.ridgePosts){if(post.broken||Math.abs(post.d-distance)>5)continue;
  const h=hull(car,distance),p=ridgeLocal(post.d,post.lane,distance),delta=[p.x-h.center[0],-p.z-h.center[1]],x=dot(delta,h.axes[0]),z=dot(delta,h.axes[1]),qx=clamp(x,-h.w,h.w),qz=clamp(z,-h.l,h.l);let dx=x-qx,dz=z-qz,len=Math.hypot(dx,dz),depth=post.radius-len;
  if(len>post.radius)continue;
  if(len<1e-6){if(h.w-Math.abs(x)<h.l-Math.abs(z)){dx=Math.sign(x)||1;dz=0;depth=post.radius+h.w-Math.abs(x);}else{dx=0;dz=Math.sign(z)||1;depth=post.radius+h.l-Math.abs(z);}len=1;}
  const n=[h.axes[0][0]*dx/len+h.axes[1][0]*dz/len,h.axes[0][1]*dx/len+h.axes[1][1]*dz/len],r=[h.axes[0][0]*qx+h.axes[1][0]*qz,h.axes[0][1]*qx+h.axes[1][1]*qz],d=driftState(car),lever=r[1]*n[0]-r[0]*n[1];
  const velocity=[h.forward[0]*roadForwardSpeed(car)+h.right[0]*(car.ridgeLateralSpeed||0)+d.angularVelocity*r[1],h.forward[1]*roadForwardSpeed(car)+h.right[1]*(car.ridgeLateralSpeed||0)-d.angularVelocity*r[0]],closing=dot(velocity,n);
  // Split position correction works even at rest; it adds no kinetic impulse.
  if(post.kind==='barrier'||post.kind==='island'){const push=Math.min(.08,Math.max(0,depth-.006)*(1-Math.exp(-dt*35)));car.ridgeSlide=(car.ridgeSlide||0)-push*dot(n,h.right);const shift=-push*dot(n,h.forward);if(car.finished)car.travelDistance+=shift;else car.distance+=shift;}
  if(closing<=0)continue;d.obstacleNormal=[dot(n,h.right),dot(n,h.forward)];d.obstacleAt=car.time;
  // Break energy includes bending/anchor failure. Once released the pole has finite mass.
  const inv=1/h.mass+lever*lever/h.inertia,breakEnergy=post.mass*8,rigidJ=closing/inv,breaks=post.kind!=='island'&&post.kind!=='barrier'&&closing*closing/(2*inv)>breakEnergy;
  const J=breaks?Math.min(rigidJ,(closing+Math.sqrt(2*breakEnergy*inv))/(inv+1/post.mass)):rigidJ;
  const tangent=[-n[1],n[0]],arm=r[1]*tangent[0]-r[0]*tangent[1],remaining=dot(velocity,tangent)-J*lever*arm/h.inertia,friction=post.kind==='barrier'?clamp(remaining/(1/h.mass+arm*arm/h.inertia),-J*.38,J*.38):0,impulse=n.map((v,i)=>v*J+tangent[i]*friction);
  applyRoadImpulse(car,-dot(impulse,h.forward)/h.mass,-dot(impulse,h.right)/h.mass);d.angularVelocity-=(J*lever+friction*arm)/h.inertia;
  if(post.kind==='barrier')post.compression=Math.min(.20,(post.compression||0)+J/h.mass*.025);if(Math.abs(J*lever/h.inertia)>.6)d.impactTime=1.25;d.bankVelocity-=J*dot(n,h.right)/h.mass*.13;d.contactTime=Math.max(d.contactTime||0,.6);
  const world=ridgePoint(post.d,post.lane),o=ridgePoint(distance),cs=Math.cos(o.heading),sn=Math.sin(o.heading);post.direction=[cs*n[0]+sn*n[1],sn*n[0]-cs*n[1]];
  if(breaks){post.broken=true;post.omega=Math.min(6,Math.max(1.2,J/(post.mass*post.height)));}

  car.battle??={contacts:0,lastHit:-10,clock:car.time};const b=car.battle;b.contact={id:(b.contact?.id||0)+1,clock:b.clock||0,point:{x:world.x,z:world.z},strength:Math.min(1,J/h.mass/2),closing};b.contacts++;b.lastHit=car.finished?-10:car.time;
 }
}
export function tickRidgePosts(posts,dt){for(const p of posts){if(p.compression)p.compression*=Math.exp(-dt*9);if(p.broken&&p.angle<Math.PI/2){p.omega+=(14.715/p.height*Math.sin(p.angle)-p.omega*.4)*dt;p.angle=Math.min(Math.PI/2,p.angle+p.omega*dt);}}}

// The visible ground-reaching props supply their actual footprint. No collision-only scenery.
export function hitRidgeSolids(car,dt){
 const distance=car.finished?(car.travelDistance??car.distance):car.distance;
 for(const box of car.ridgeObstacles||[]){if(!box.ground||Math.abs(box.d-distance)>box.reach+5)continue;
  const half=box.foot||box.half,h=hull(car,distance),p=ridgeLocal(box.d,box.lane,distance),yaw=box.yaw+p.heading,cs=Math.cos(yaw),sn=Math.sin(yaw),axes=[[cs,-sn],[sn,cs]],delta=[p.x-h.center[0],-p.z-h.center[1]];
  let depth=Infinity,n;for(const axis of [...h.axes,...axes]){const a=h.w*Math.abs(dot(h.axes[0],axis))+h.l*Math.abs(dot(h.axes[1],axis)),b=half[0]*Math.abs(dot(axes[0],axis))+half[2]*Math.abs(dot(axes[1],axis)),sep=dot(delta,axis),overlap=a+b-Math.abs(sep);if(overlap<=0){depth=0;break;}if(overlap<depth){depth=overlap;n=axis.map(v=>v*(sep<0?-1:1));}}
  if(depth<=0)continue;
  // Midpoint of the closest face avoids spurious corner torques during a flat side scrape.
  const local=axes.map(a=>dot(h.center.map((v,i)=>v-[p.x,-p.z][i]),a)),touch=[p.x,-p.z];for(let i=0;i<2;i++){const q=clamp(local[i],-half[i?2:0],half[i?2:0]);touch[0]+=axes[i][0]*q;touch[1]+=axes[i][1]*q;}
  const r=touch.map((v,i)=>v-h.center[i]),d=driftState(car),lever=r[1]*n[0]-r[0]*n[1],v=[h.forward[0]*roadForwardSpeed(car)+h.right[0]*(car.ridgeLateralSpeed||0)+d.angularVelocity*r[1],h.forward[1]*roadForwardSpeed(car)+h.right[1]*(car.ridgeLateralSpeed||0)-d.angularVelocity*r[0]],closing=dot(v,n),J=Math.max(0,closing)/(1/h.mass+lever*lever/h.inertia);
  applyRoadImpulse(car,-J*dot(n,h.forward)/h.mass,-J*dot(n,h.right)/h.mass);d.angularVelocity-=J*lever/h.inertia;
  const push=Math.min(.08,Math.max(0,depth-.008)*(1-Math.exp(-dt*35)));car.ridgeSlide=(car.ridgeSlide||0)-dot(n,h.right)*push;const move=-dot(n,h.forward)*push;if(car.finished)car.travelDistance+=move;else car.distance+=move;
  if(J>0){d.obstacleNormal=[dot(n,h.right),dot(n,h.forward)];d.obstacleAt=car.time;}
  if(J/h.mass>.5){d.impactTime=1.25;d.contactTime=.6;const w=ridgePoint(distance),c=Math.cos(w.heading),s=Math.sin(w.heading);car.battle??={contacts:0,lastHit:-10};const b=car.battle;b.contact={id:(b.contact?.id||0)+1,clock:b.clock||0,point:{x:w.x+c*touch[0]+s*touch[1],z:w.z+s*touch[0]-c*touch[1]},strength:Math.min(1,J/h.mass/3),closing};b.contacts++;}

 }
}
