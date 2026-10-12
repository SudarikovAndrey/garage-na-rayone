import {CARS} from './fleet.js';
import {ridgePoint,ridgeSurface} from './ridge-terrain.js';

// A small rigid body solver used only after leaving the crest. Units: metres, seconds,
// mass-normalised impulses. Tyres, underbody and roof all collide with the actual slope.
const add=(a,b)=>a.map((v,i)=>v+b[i]),scale=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>scale(a,1/(Math.hypot(...a)||1));
// Грунт насыпи — не асфальт: мягкая земля вязнет под кузовом и колёсами, гасит скорость и вращение,
// и машина ложится на покой, а не кувыркается по дну без конца. На полотне (|lane| ≤ 4.8) пахоты нет.
const PLOW=.010;
const conjugate=q=>[-q[0],-q[1],-q[2],q[3]];
export function rotateVector(q,v){const t=scale(cross(q,v),2);return add(v,add(scale(t,q[3]),cross(q,t)));}
const multiply=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
function inverseInertia(b,v){const local=rotateVector(conjugate(b.q),v);return rotateVector(b.q,local.map((x,i)=>x/b.inertia[i]));}
function effectiveMass(b,r,n){return 1+dot(n,cross(inverseInertia(b,cross(r,n)),r));}
function impulse(b,r,j){b.v=add(b.v,j);b.w=add(b.w,inverseInertia(b,cross(r,j)));}
export function beginRidgeCrash(car){
 if(car.crashBody)return car.crashBody;
 const fit=CARS.find(c=>c.id===car.carId)||CARS[0],cg=fit.height*.43,point=ridgePoint(car.distance,(car.ridgeLane??-1.9)+(car.ridgeSlide||0));
 const heading=point.heading+(car.ridgeYaw||0),q=[0,Math.sin(-heading/2),0,Math.cos(-heading/2)];
 const sideSpeed=car.ridgeLateralSpeed||0,forward=car.speed,c=Math.cos(point.heading),s=Math.sin(point.heading);
 const contacts=[];for(const x of [-1,1])for(const z of [-1,1])contacts.push({p:[x*fit.width*.42,fit.radius-cg,z*fit.wheelbase*.5],radius:fit.radius,tyre:true});
 for(const x of [-1,1])for(const z of [-1,1]){
  contacts.push({p:[x*fit.width*.45,fit.body.floor-cg+.06,z*fit.length*.43],radius:.06});
  contacts.push({p:[x*fit.width*.32,fit.height-cg-.09,z*fit.wheelbase*.40],radius:.09});
 }
 const b={p:[point.x,cg-.02,point.z],v:[s*forward+c*sideSpeed,0,-c*forward+s*sideSpeed],q,w:[0,-(car.ridgeYawRate||0),0],cg,contacts,obstacles:car.ridgeObstacles||[],
  inertia:[(fit.height**2+fit.length**2)/12,(fit.width**2+fit.length**2)/12,(fit.width**2+fit.height**2)/12].map(v=>v*1.1),hint:car.distance,elapsed:0,accumulator:0,firstImpact:null,lastHardImpact:null,impacts:0,impact:0,grounded:0,airTime:0,settleTime:0,resting:false,rolled:false,maxAngularSpeed:0,wheelSpeed:forward};
 // Carry the banking already visible in the skid into the release pose; no artificial spin.
 const bank=car.ridgeBank||0;b.q=multiply(b.q,[0,0,Math.sin(bank/2),Math.cos(bank/2)]);
 b.w=add(b.w,rotateVector(b.q,[0,0,car.drift?.bankVelocity||0]));
 car.crashed=true;car.crashSide=Math.sign((car.ridgeLane??0)+(car.ridgeSlide||0))||1;
 car.crashLane=(car.ridgeLane??-1.9)+(car.ridgeSlide||0);car.crashSpeed=car.speed;car.crashElapsed=0;car.braking=false;car.crashBody=b;return b;
}
function step(b,dt){
 b.previousP=[...b.p];b.previousQ=[...b.q];b.elapsed+=dt;b.impact*=Math.exp(-dt*10);
 if(b.resting)return;
 b.v[1]-=9.81*dt;const drag=Math.exp(-.0018*Math.hypot(...b.v)*dt);b.v=scale(b.v,drag);b.w=scale(b.w,Math.exp(-.04*dt));
 b.p=add(b.p,scale(b.v,dt));
 const dq=multiply([...b.w,0],b.q);b.q=norm(b.q.map((x,i)=>x+dq[i]*dt*.5));
 const active=[],nearby=b.obstacles.filter(o=>Math.hypot(o.p[0]-b.p[0],o.p[2]-b.p[2])<6);
 for(const contact of b.contacts){
  const r=rotateVector(b.q,contact.p),p=add(b.p,r),surface=ridgeSurface(p[0],p[2],b.hint),n=surface.normal;
  const depth=(surface.height-p[1])*n[1]+contact.radius;
  function register(normal,penetration){const arm=add(r,scale(normal,-contact.radius)),vn=dot(add(b.v,cross(b.w,arm)),normal);active.push({contact,r:arm,n:normal,depth:penetration,bounce:vn< -4?-vn*.035:0,normal:0,push:0,tangent:[0,0,0],surface});if(vn< -2){b.impact=Math.max(b.impact,-vn);b.firstImpact??=b.elapsed;b.impacts++;if(vn< -2.5)b.lastHardImpact=b.elapsed;}}
  if(depth>0)register(n,depth);
  for(const box of nearby){const local=rotateVector(conjugate(box.q),add(p,scale(box.p,-1))),closest=local.map((x,i)=>Math.max(-box.half[i],Math.min(box.half[i],x))),delta=add(local,scale(closest,-1)),distance=Math.hypot(...delta);if(distance<contact.radius){let normal;if(distance>.0001)normal=scale(delta,1/distance);else{const gaps=local.map((x,i)=>box.half[i]-Math.abs(x)),axis=gaps.indexOf(Math.min(...gaps));normal=[0,0,0];normal[axis]=Math.sign(local[axis])||1;}register(rotateVector(box.q,normal),contact.radius-distance);}}

 }
 b.grounded=active.length;if(!active.length)b.airTime+=dt;
 const soft=active.filter(h=>Math.abs(h.surface.lane)>4.8).length;if(soft)b.v=scale(b.v,Math.exp(-PLOW*soft*Math.hypot(...b.v)*dt));
 // Sequential impulses resist sideways tyre motion but allow rolling. The force's lever arm
 // at a catching wheel creates a roll naturally; there is no timed or random flip animation.
 for(let iteration=0;iteration<12;iteration++)for(const hit of active){
  const {r,n,bounce,contact,surface}=hit;
  let velocity=add(b.v,cross(b.w,r)),vn=dot(velocity,n);
  const old=hit.normal;
  hit.normal=Math.max(0,old+(-vn+bounce)/effectiveMass(b,r,n));impulse(b,r,scale(n,hit.normal-old));
  velocity=add(b.v,cross(b.w,r));
  // Chassis friction is isotropic: avoid a flipping tangent basis when resting on a side.
  let right=contact.tyre?rotateVector(b.q,[1,0,0]):[1,0,0];
  if(Math.abs(dot(right,n))>.95)right=[0,0,1];
  const side=norm(add(right,scale(n,-dot(right,n)))),forward=norm(cross(side,n));
  const muSide=contact.tyre?(Math.abs(surface.lane)>4?.72:1):.5,muForward=contact.tyre?(Math.abs(surface.lane)>4?.12:.035):.5;
  let jt=add(scale(side,-dot(velocity,side)/effectiveMass(b,r,side)),scale(forward,-dot(velocity,forward)/effectiveMass(b,r,forward)));
  const proposed=add(hit.tangent,jt),sx=dot(proposed,side),sz=dot(proposed,forward),ellipse=Math.hypot(sx/Math.max(.00001,muSide*hit.normal),sz/Math.max(.00001,muForward*hit.normal));
  let next=proposed;if(ellipse>1){const x=Math.max(-muSide*hit.normal,Math.min(muSide*hit.normal,sx)),z=Math.max(-muForward*hit.normal,Math.min(muForward*hit.normal,sz)),k=Math.max(1,Math.hypot(x/Math.max(.00001,muSide*hit.normal),z/Math.max(.00001,muForward*hit.normal)));next=add(scale(side,x/k),scale(forward,z/k));}impulse(b,r,add(next,scale(hit.tangent,-1)));hit.tangent=next;
 }
 // Split impulses remove overlap without injecting energy into the real velocities.
 // Correct orientation too, instead of lifting the whole car at its deepest corner.
 const correction={q:b.q,inertia:b.inertia,v:[0,0,0],w:[0,0,0]};
 for(let iteration=0;iteration<8;iteration++)for(const hit of active){
  const {r,n}=hit,target=Math.min(1.0,Math.max(0,hit.depth-.008)*.12/dt);
  const vn=dot(add(correction.v,cross(correction.w,r)),n),old=hit.push;
  hit.push=Math.max(0,old+(target-vn)/effectiveMass(b,r,n));impulse(correction,r,scale(n,hit.push-old));
 }
 b.p=add(b.p,scale(correction.v,dt));
 const dqPush=multiply([...correction.w,0],b.q);b.q=norm(b.q.map((x,i)=>x+dqPush[i]*dt*.5));
 const surface=ridgeSurface(b.p[0],b.p[2],b.hint);b.hint=surface.d;
 const up=rotateVector(b.q,[0,1,0]);b.rolled ||= up[1]<0;b.maxAngularSpeed=Math.max(b.maxAngularSpeed,Math.hypot(...b.w));
 b.wheelSpeed*=Math.exp(-dt*(active.length?.45:.05));
 b.settleTime=active.length&&Math.hypot(...b.v)<.7&&Math.hypot(...b.w)<.35?b.settleTime+dt:0;
 if(b.settleTime>.8){b.resting=true;b.v=[0,0,0];b.w=[0,0,0];}
}
export function tickRidgeCrash(car,dt){
 if(!car.crashed||dt<=0)return;const b=beginRidgeCrash(car);b.accumulator+=Math.min(dt,.20);
 const fixed=1/120;while(b.accumulator+1e-9>=fixed){step(b,fixed);b.accumulator-=fixed;}
 car.crashElapsed=b.elapsed;car.speed=Math.hypot(b.v[0],b.v[2]);car.rpm=Math.max(950,car.rpm*Math.exp(-dt*.9));
}
export function ridgeBodyPose(car,origin){
 const body=car.crashBody;if(!body)return null;const alpha=Math.max(0,Math.min(1,body.accumulator*120)),sign=body.previousQ&&dot(body.previousQ,body.q)<0?-1:1;const b={...body,p:body.previousP?body.previousP.map((v,i)=>v+(body.p[i]-v)*alpha):body.p,q:body.previousQ?norm(body.previousQ.map((v,i)=>v+(body.q[i]*sign-v)*alpha)):body.q};const o=ridgePoint(origin),c=Math.cos(o.heading),s=Math.sin(o.heading),offset=rotateVector(b.q,[0,-b.cg,0]);
 const p=add(b.p,offset),dx=p[0]-o.x,dz=p[2]-o.z;
 const q=multiply([0,Math.sin(o.heading/2),0,Math.cos(o.heading/2)],b.q);
 return {x:c*dx+s*dz,y:p[1],z:-s*dx+c*dz,q};
}

export function ridgeCrashPresentationDone(car,reducedMotion=false){
 const b=car.crashBody;if(!b)return false;
 // Показ живёт до последнего сильного удара, а не до первого касания, и не кончается, пока машина летит
 // или съезжает по насыпи: естественный вылет сначала скользит по склону на колёсах без единого толчка,
 // удар о дно и переворот приходят позже и раньше обрывались монтажом. Потолок прежний.
 const last=b.lastHardImpact??b.firstImpact,descending=b.v[1]< -3;
 return b.elapsed>=(reducedMotion?1.8:3)||(b.elapsed>=1.4&&!descending&&((last!=null&&b.elapsed-last>=.75)||b.resting));
}
