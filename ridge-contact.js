import {roadForwardSpeed,applyRoadImpulse} from './ridge-recovery.js';
import {CARS} from './fleet.js';
import {ridgeLocal,ridgePoint} from './ridge-terrain.js';
import {driftState,breakChain} from './ridge-drift.js';
import {offRidge} from './ridge-tyres.js';
import {beginRidgeCrash} from './ridge-body.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1],cross=(r,n)=>r[1]*n[0]-r[0]*n[1];
const travel=c=>c.finished?(c.travelDistance??c.distance):c.distance;
export function hull(c,origin){
 const fit=CARS.find(f=>f.id===c.carId)||CARS[0],p=ridgeLocal(travel(c),(c.ridgeLane||0)+(c.ridgeSlide||0),origin),angle=p.heading+(c.ridgeYaw||0),cs=Math.cos(angle),sn=Math.sin(angle),w=fit.width*.5,l=fit.length*.5,mass=clamp(fit.length*fit.width*180,650,2200),center=[p.x,-p.z],axes=[[cs,-sn],[sn,cs]];
 return {center,w,l,axes,right:[Math.cos(p.heading),-Math.sin(p.heading)],forward:[Math.sin(p.heading),Math.cos(p.heading)],mass,inertia:mass*(w*w+l*l)/3,vertices:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>[center[0]+axes[0][0]*w*x+axes[1][0]*l*z,center[1]+axes[0][1]*w*x+axes[1][1]*l*z])};
}
// Clip the overlap polygon to find a stable contact patch, not an arbitrary corner.
function patch(A,B){let poly=A.vertices;for(let axis=0;axis<2;axis++)for(const sign of [-1,1]){const n=B.axes[axis].map(v=>v*sign),limit=dot(B.center,n)+(axis?B.l:B.w),out=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=dot(p,n)-limit,dq=dot(q,n)-limit;if(dp<=0)out.push(p);if((dp<=0)!==(dq<=0)){const t=dp/(dp-dq);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}poly=out;if(!poly.length)return [(A.center[0]+B.center[0])*.5,(A.center[1]+B.center[1])*.5];}return poly.reduce((s,p)=>[s[0]+p[0]/poly.length,s[1]+p[1]/poly.length],[0,0]);}
export function resolveBattleContact(a,b,dt){
 if(a.crashed||b.crashed||dt<=0)return false;const origin=travel(a),A=hull(a,origin),B=hull(b,origin),delta=B.center.map((v,i)=>v-A.center[i]);if(Math.abs(delta[1])>8||Math.abs(delta[0])>7)return false;
 let depth=Infinity,n;
 for(const axis of [...A.axes,...B.axes]){const extent=h=>h.w*Math.abs(dot(h.axes[0],axis))+h.l*Math.abs(dot(h.axes[1],axis)),sep=dot(delta,axis),overlap=extent(A)+extent(B)-Math.abs(sep);if(overlap<=0)return false;if(overlap<depth){depth=overlap;n=axis.map(v=>v*(sep<0?-1:1));}}
 const point=patch(A,B),ra=point.map((v,i)=>v-A.center[i]),rb=point.map((v,i)=>v-B.center[i]),ia=1/A.mass,ib=1/B.mass;
 const velocity=(c,h,r)=>{const w=driftState(c).angularVelocity;return [h.right[0]*(c.ridgeLateralSpeed||0)+h.forward[0]*roadForwardSpeed(c)+w*r[1],h.right[1]*(c.ridgeLateralSpeed||0)+h.forward[1]*roadForwardSpeed(c)-w*r[0]];};
 const va=velocity(a,A,ra),vb=velocity(b,B,rb),rv=vb.map((v,i)=>v-va[i]),closing=dot(rv,n),rnA=cross(ra,n),rnB=cross(rb,n),normalMass=ia+ib+rnA*rnA/A.inertia+rnB*rnB/B.inertia;
 // Low restitution: body panels absorb energy, the cars do not bounce like balls.
 const impulse=closing<0?-(1+(closing<-.7?.06:0))*closing/normalMass:0,tangent=[-n[1],n[0]],rtA=cross(ra,tangent),rtB=cross(rb,tangent),sliding=dot(rv,tangent),postSliding=sliding+impulse*(rnA*rtA/A.inertia+rnB*rtB/B.inertia),friction=clamp(-postSliding/(ia+ib+rtA*rtA/A.inertia+rtB*rtB/B.inertia),-impulse*.32,impulse*.32),J=n.map((v,i)=>v*impulse+tangent[i]*friction);
 const correction=Math.min(.075,Math.max(0,depth-.008)*(1-Math.exp(-dt*40)));
 for(const [c,h,r,sign,inv] of [[a,A,ra,-1,ia],[b,B,rb,1,ib]]){
  const d=driftState(c);applyRoadImpulse(c,sign*dot(J,h.forward)*inv,sign*dot(J,h.right)*inv);d.angularVelocity+=sign*cross(r,J)/h.inertia;
  c.ridgeSlide+=sign*dot(n,h.right)*correction*inv/(ia+ib);const advance=sign*dot(n,h.forward)*correction*inv/(ia+ib);
  if(c.finished)c.travelDistance=Math.max(c.distance,(c.travelDistance??c.distance)+advance);else c.travelDistance=c.distance=Math.max(0,c.distance+advance);
  const kick=impulse*inv;if((Math.abs(cross(r,J)/h.inertia)>.6&&Math.abs(d.angularVelocity)>.8)||kick>3)d.impactTime=Math.max(d.impactTime||0,1.25);if(kick>.06)d.contactTime=Math.max(d.contactTime||0,.55);d.bankVelocity+=sign*dot(J,h.right)*inv*.13;
  if(kick>1.3&&!c.finished)breakChain(d);
  c.battle??={contacts:0,lastHit:-10};c.battle.touchClock=c.battle.clock||0;c.battle.scrape=Math.min(1,Math.abs(sliding)/7+kick*.15);
 }
 const clock=a.battle.clock||0,old=a.battle.contact;
 const originPoint=ridgePoint(origin),cos=Math.cos(originPoint.heading),sin=Math.sin(originPoint.heading),touchPoint={x:originPoint.x+cos*point[0]+sin*point[1],z:originPoint.z+sin*point[0]-cos*point[1]};for(const c of [a,b])c.battle.touchPoint=touchPoint;
 if(closing<-.55&&(!old||clock-old.clock>.12)){
  const p=ridgePoint(origin),cs=Math.cos(p.heading),sn=Math.sin(p.heading),event={id:Math.max(old?.id||0,b.battle.contact?.id||0)+1,clock,point:{x:p.x+cs*point[0]+sn*point[1],z:p.z+sn*point[0]-cs*point[1]},strength:Math.min(1,impulse*Math.max(ia,ib)/3),closing:-closing};
  for(const c of [a,b]){c.battle.contact=event;c.battle.impact=impulse/(c===a?A.mass:B.mass);c.battle.contacts++;c.battle.lastHit=c.finished?-10:c.time;}
 }
 for(const c of [a,b])if(!c.finished&&offRidge(c))beginRidgeCrash(c);
 return true;
}
