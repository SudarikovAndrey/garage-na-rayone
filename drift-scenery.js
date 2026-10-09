import {ridgePoint} from './ridge-terrain.js';
import * as T from 'three';
// Baked static instances, grouped into 80-metre sectors by the world builder.
export function decorateDriftCourse({course,prop,mat,box,cylinder,rock,geometries,random}){
 const rubber=mat(0x232823),white=mat(0xe8dec0),orange=mat(0xe58337),steel=mat(0x6c7370,.65);
 if(course.terrain==='city'){
  const wall=mat(0x928d7d),brick=mat(0x887668),glass=mat(0x344b51,.4),yellow=mat(0xdec25d),concrete=mat(0xaaa99a);
  const tyre=new T.TorusGeometry(.43,.16,5,12);geometries.push(tyre);
  for(let d=-65;d<1150;d+=8){for(const side of [-1,1]){
   // Parking bays extend beyond the signed course; the continuous tyre corridor remains inside the parking bays.
   prop(box,white,d,side*13,.03,[7,.012,.1]);prop(box,white,d+3,side*16.4,.03,[.1,.012,6]);
   if(d%24===7)for(let k=0;k<6;k++)prop(tyre,k%3?rubber:white,d+k*.9,side*10.4,.35,[1,1,1],[Math.PI/2,0,0]);
  }}
  for(let d=-50;d<1300;d+=62)for(const side of [-1,1]){
   const x=side*(30+random()*13),h=8+random()*12,w=9+random()*8,base=ridgePoint(d,x);
   // Keep whole structures clear of every arm of the serpentine route.
   let clear=true;for(let q=0;q<1140;q+=8){const p=ridgePoint(q);if(Math.hypot(p.x-base.x,p.z-base.z)<Math.hypot(w/2,12.5)+10){clear=false;break;}}if(!clear)continue;
   const at=(m,dx,y,dz,size)=>prop(box,m,d,x,y,size,[0,0,0],{d,lane:x,x:dx,z:dz});
   at(side<0?wall:brick,0,h*.5,0,[w,h,25]);at(concrete,0,h+.16,0,[w+.45,.3,25.5]);
   for(let y=2;y<h-1;y+=3)for(let z=-9;z<=9;z+=4)at(glass,-side*(w/2+.025),y,z,[.04,1.6,2.4]);
   at(steel,-side*3,h+1,5,[3,2,3]);

  }
  for(let d=12;d<1150;d+=32)for(const side of [-1,1]){
   prop(cylinder,steel,d,side*30,4,[.07,8,.07]);prop(box,steel,d,side*29.2,7.9,[1.8,.12,.12]);prop(box,white,d,side*28.4,7.8,[.8,.18,.5]);
  }
  for(let d=-25;d<1150;d+=18)for(const side of [-1,1]){prop(box,concrete,d,side*13,.3,[1.4,.6,3]);prop(box,steel,d+5,side*17,1.1,[2.4,2.2,5]);}
  // Flush repairs, drains and rumble strips give the open asphalt real surface scale.
  for(let d=25;d<1150;d+=27){prop(box,rubber,d,random()*12-6,.025,[1.2,.016,.5]);for(let k=0;k<7;k++)prop(box,steel,d-.2+k*.065,-7.3,.035,[.75,.018,.025]);}
  for(const d of [90,310,520,715])for(let x=-8;x<9;x+=.9)prop(box,yellow,d,x,.025,[.45,.016,.4]);
 }else{
  const bark=mat(0x705039),pine=mat(0x354f2d),litPine=mat(0x536b35),grass=mat(0x7b7841),earth=mat(0x9c7449);
  const cone=new T.ConeGeometry(1,1,7);geometries.push(cone);
  for(let d=-65;d<1380;d+=5)for(const side of [-1,1]){
   // Clearings alternate between the two sides, opening warm views through the canopy.
   const clearing=Math.sin(d*.018+side*1.8)>.52;
   for(let row=0;row<3;row++){
    if(clearing&&row<2)continue;
    const x=side*(8.5+row*11+random()*7),dd=d+random()*5,h=7+random()*7;
    prop(cylinder,bark,dd,x,h*.45,[.16+random()*.12,h*.9,.16]);
    for(let tier=0;tier<3;tier++)for(let crown=0;crown<3;crown++){const angle=crown*2.1+tier*.7,radius=(tier===2?1.1:2.1)*(h/10),spread=tier===2?.4:1.0;prop(rock,(tier+crown)%2?pine:litPine,dd+Math.sin(angle)*spread,x+Math.cos(angle)*spread,h*(.65+tier*.12),[radius,.8+random()*.4,radius*.9],[.1,random()*6,.15]);}
    for(let j=0;j<3;j++)prop(cylinder,bark,dd,x,h*(.35+j*.12),[.05,2.1,.05],[.65,random()*6,.75]);
   }
   for(let j=0;j<3;j++){const x=side*(5.8+random()*14),s=.1+random()*.3;prop(rock,earth,d+random()*4,x,.08,[s,.12,s*1.7]);prop(cone,grass,d+j,x,.16,[.15,.4,.12],[.1,random()*6,.15]);}
   if(clearing&&random()<.12)prop(cylinder,bark,d,side*13,.35,[.3,4,.3],[0,0,1.5]);
  }
  // Wheel ruts on dirt; restrained tonal variation, no asphalt lane markings.
  for(let d=-70;d<1420;d+=4)for(const side of [-1,1]){const x=side*(1.4+random()*.35);prop(rock,earth,d,x,.013,[.08,.016,.10]);}
 }
}
