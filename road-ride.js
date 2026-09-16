const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
// Contact with visible repair patches drives a damped body response; no physics raycasts.
import {roughBump} from './physics.js';
export class RoadRide{
 constructor(rough=0){this.patches=[];this.states=new WeakMap();this.rough=rough;}
 add(mesh,group){this.patches.push({group,x:mesh.position.x,z:mesh.position.z,w:mesh.scale.x*.5,l:mesh.scale.z*.5});}
 sample(x,z,oldZ=z){let h=0;for(const p of this.patches){if(!p.group.visible)continue;const dx=Math.abs(x-p.x-p.group.position.x);if(dx>p.w)continue;const cz=p.z+p.group.position.z,near=clamp(cz,Math.min(oldZ,z),Math.max(oldZ,z)),dz=Math.abs(near-cz);if(dz>p.l)continue;h=Math.max(h,.032*Math.min(1,(p.w-dx)/.10)*Math.min(1,(p.l-dz)/.16));}return h;}
 update(dt,model,speed,travel,reduced=false){
 let s=this.states.get(model);if(!s){s={height:0,pitch:0,roll:0,vh:0,vp:0,vr:0,travel,z:model.position.z};this.states.set(model,s);}
 const fit=model.userData.fit||model.userData.dimensions||{},wb=fit.wheelbase||model.userData.wheelbase||2.5,w=(fit.width||model.userData.carWidth||1.67)*.48,offset=fit.axleOffset||model.userData.axleOffset||0;
 const delta=travel-s.travel+s.z-model.position.z;s.travel=travel;s.z=model.position.z;
 // On a broken dirt road every wheel also rides the deterministic rut profile; soft suspension swallows most of it.
 const soft=this.rough?Math.max(.15,1-(model.userData.ride??.5))*this.rough:0;
 const values=[];for(const axle of [-wb/2+offset,wb/2+offset])for(const side of [-1,1]){const x=model.position.x+side*w,z=model.position.z+axle;let h=this.sample(x,z,z+Math.max(0,delta));if(soft)h+=.075*soft*roughBump(travel-axle+side*.9);values.push(h);}
 const strength=reduced?.15:Math.min(1,speed/12),targets={height:(values[0]+values[1]+values[2]+values[3])*.25*strength,pitch:((values[2]+values[3])-(values[0]+values[1]))*.5/wb*strength,roll:((values[0]+values[2])-(values[1]+values[3]))*.5/(w*2)*strength};
 for(let remaining=dt;remaining>0;){const step=Math.min(remaining,1/120);remaining-=step;for(const [key,v] of [['height','vh'],['pitch','vp'],['roll','vr']]){s[v]+=((targets[key]-s[key])*190-s[v]*16)*step;s[key]+=s[v]*step;}}
 return s;
 }
}
