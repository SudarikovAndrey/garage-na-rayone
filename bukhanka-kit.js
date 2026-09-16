import {kitClearance,fitBumperHeight} from './kit-clearance.js';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {sweptRail} from './bumper-kit.js';

// UAZ-452-specific aero: high roof mounts, rounded wraparound nose and rally hardware.
export function buildBukhankaKit({slot,rarity,partId,fit,car,kit,add,paint,dark,materials,racing}){
 const g=new T.Group();g.name='Kit_'+slot;g.userData.partId=partId;kit.add(g);
 const stock=car.getObjectByName('Stock'+slot[0].toUpperCase()+slot.slice(1));if(stock)stock.visible=false;
 const rubber=new T.MeshStandardMaterial({name:'Rally rubber',color:0x181b1c,roughness:.82});
 const steel=new T.MeshStandardMaterial({name:'Rally hardware',color:0x41484c,metalness:.78,roughness:.31});
 materials.add(rubber);materials.add(steel);
 const box=(p,n,s,v,m=dark)=>add(p,n,new RoundedBoxGeometry(...s,2,Math.min(.035,...s.map(v=>v*.24))),m,v);
 const rod=(p,n,a,b,r=.017,m=steel)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),d=bv.clone().sub(av),o=add(p,n,new T.CylinderGeometry(r,r,d.length(),racing?8:12),m,av.add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;};
 if(slot==='spoiler'){
  const y=fit.height;
  if(rarity===0){add(g,'Roof trailing lip',sweptRail(fit.width*.80,.085,.028,.035),paint,[1.83,y-.09,0]);return g;}
  const height=rarity===3?.36:.13+rarity*.035,span=fit.width*(rarity===3?1.04:.96),x=1.84;
  for(const z of [-.57,.57]){
   box(g,'Roof mounting foot',[.28,.028,.13],[1.66,y-.024,z]);
   rod(g,'Angled wing upright',[1.64,y-.01,z],[x,y+height-.02,z],.025);
  }
  const shape=new T.Shape();shape.moveTo(-.19,0);shape.quadraticCurveTo(-.12,.075,.23,.035);shape.lineTo(.23,.012);shape.quadraticCurveTo(-.10,.026,-.19,0);
  const blade=new T.ExtrudeGeometry(shape,{depth:span,bevelEnabled:true,bevelSize:.007,bevelThickness:.007,bevelSegments:3,curveSegments:16,steps:1});blade.translate(0,0,-span/2);add(g,'Roof airfoil',blade,dark,[x,y+height,0]);
  for(const z of [-span/2,span/2])box(g,'Wing end plate',[.45,.18,.023],[x+.015,y+height+.025,z],steel);
  if(rarity===3){
   const railY=y+.12,side=.77;
   for(const z of [-side,side]){
    rod(g,'Roof basket rail',[-.88,railY,z],[1.48,railY,z],.021);
    for(const xx of [-.82,.25,1.38])rod(g,'Gutter bracket',[xx,y-.105,z+.075*Math.sign(z)],[xx,railY,z],.019);
   }
   for(const xx of [-.88,1.48])rod(g,'Basket end rail',[xx,railY,-side],[xx,railY,side],.021);
   for(let i=0;i<8;i++)rod(g,'Basket crossbar',[-.83+i*.32,y+.055,-side],[-.83+i*.32,y+.055,side],.013);
   for(const z of [-.39,.39]){
    const centre=[.55,y+.17,z],tire=add(g,'Roof spare tyre',new T.TorusGeometry(.268,.092,racing?8:12,racing?32:48),rubber,centre);tire.rotation.x=Math.PI/2;
    const rim=add(g,'Spare steel rim',new T.TorusGeometry(.172,.026,8,32),steel,[.55,y+.25,z]);rim.rotation.x=Math.PI/2;
    add(g,'Spare hub',new T.CylinderGeometry(.063,.065,.08,12),steel,[.55,y+.245,z]);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(g,'Spare rim spoke',[.55+Math.cos(a)*.05,y+.25,z+Math.sin(a)*.05],[.55+Math.cos(a)*.17,y+.25,z+Math.sin(a)*.17],.020);}
    for(const row of [-1,1])for(let i=0;i<(racing?20:28);i++){const a=(i+(row>0?.45:0))/(racing?20:28)*Math.PI*2,o=add(g,'Spare tread',new RoundedBoxGeometry(.06,.055,.024,1,.005),rubber,[.55+Math.cos(a)*.350,y+.17+row*.038,z+Math.sin(a)*.350]);o.rotation.y=-a-Math.PI/2;}
    rod(g,'Spare retaining strap',[.19,y+.27,z],[.91,y+.27,z],.019,rubber);
   }
   box(g,'Roof light housing',[.10,.09,1.28],[-.91,railY+.018,0]);
   // Lens only: no extra dynamic lights or shadow maps on mobile.
   const lens=new T.MeshStandardMaterial({name:'Rally lamp lens',color:0xe3e2ca,roughness:.24,metalness:.2,emissive:0x827b62,emissiveIntensity:.15});materials.add(lens);
   box(g,'Roof light lens',[.009,.043,1.20],[-.965,railY+.02,0],lens);
  }
 }
 if(slot==='bumpers'){
  for(const front of [true,false]){
   const end=new T.Group();end.name='Kit_bumpers_'+(front?'front':'rear');g.add(end);end.position.set(front?-fit.length/2+.045:fit.length/2-.045,.51,0);end.rotation.y=front?Math.PI:0;
   const width=fit.width*.99,returnDepth=front?.34:.24;
   add(end,'Wraparound rally bumper',sweptRail(width,.064,.063,returnDepth),rarity===0?paint:dark,[0,.065,0]);
   const low=-.11-rarity*.015;
   add(end,'Continuous front splitter',sweptRail(width*(1+rarity*.018),.115,.019,returnDepth),dark,[.025,low,0]);
   // Outer cheeks follow the rounded corners; a real gap between the rails forms the intake.
   for(const side of [-1,1]){
    const cheek=box(end,'Rounded bumper corner',[.27,.16,.24],[-.13,-.017,side*width*.438],rarity===0?paint:dark);cheek.rotation.y=side*.34;
   }
   if(front){
    box(end,'Recessed intake shadow',[.018,.12,width*.68],[-.075,-.02,0],dark);
    for(const z of [-.39,.39])rod(end,'Intake vertical brace',[.042,low,z],[.013,.026,z],.012,dark);
    if(rarity>=2)for(const side of [-1,1])rod(end,'Splitter support stay',[.06,.094,side*.70],[.13,low+.026,side*.72],.012,steel);
    if(rarity===3)for(const side of [-1,1]){const wing=box(end,'Corner canard',[.25,.018,.13],[-.045,.013,side*.94]);wing.rotation.z=-.08;}
   }else{
    box(end,'Diffuser tray',[.29,.045,width*.72],[-.025,low+.015,0]);
    if(rarity>=1)for(let i=-2;i<=2;i++){const fin=box(end,'Diffuser fin',[.34,.09,.018],[.025,low-.020,i*.22]);fin.rotation.z=-.12;}
    if(rarity>=2){const exhaust=add(end,'Rolled exhaust tip',new T.TorusGeometry(.064,.011,10,28),steel,[.125,low+.075,-.64]);exhaust.rotation.y=Math.PI/2;add(end,'Exhaust dark bore',new T.CircleGeometry(.053,24),dark,[.114,low+.075,-.64]).rotation.y=Math.PI/2;}
   }
   fitBumperHeight(end,kitClearance(fit,rarity));
  }
 }
 return g;
}
