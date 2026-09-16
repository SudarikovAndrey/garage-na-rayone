import {kitClearance} from './kit-clearance.js';
import * as T from 'three';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
// Same rounded monocoque cross-section used by the authored fleet, in physical metres.
// No raycasts or mesh processing in a frame: attachment is a small analytic surface evaluation.
export function bodyWidthAt(fit,x,y){
 const p=fit.body||{belt:.9,floor:.245,hoodStart:-.8,hoodDrop:.115,power:.23},w=fit.width/2,nose=-(fit.length||4.006)/2+.125,tail=(fit.length||4.006)/2-(p.family==='uaz'?.35:.125);
 const u=clamp((x-nose)/(tail-nose)),edge=Math.sin(Math.PI*u);
 let width=w*(.91+.09*Math.pow(edge,.4));
 if(p.family==='van')width=w*(.83+.17*Math.pow(edge,.28));
 if(p.family==='uaz'&&x<p.hoodStart)width*=.83+.17*clamp((x-nose)/(p.hoodStart-nose));
 const top=p.belt-p.hoodDrop*Math.pow(Math.max(0,(p.hoodStart-x)/Math.max(.01,p.hoodStart-nose)),1.25),cy=(top+p.floor)/2,ry=(top-p.floor)/2;
 let result=width*Math.pow(Math.max(.01,1-Math.pow(clamp(Math.abs((y-cy)/ry),0,.9999),2/p.power)),p.power/2);
 // Near the nose, the swept front corner narrows the body before the side loft begins.
 const corner=fit.id==='kopeyka'?.125:({round:.25,van:.20,volga:.15,samara:.14,oka:.12,classic:.10,offroad:.12,smz:.075,uaz:.13}[p.family]||.14);
 const faceWidth=w*(p.family==='uaz'?.91*.83:p.family==='van'?.83:.91),faceTop=p.belt-p.hoodDrop,vertical=clamp(Math.abs((y-(faceTop+p.floor)/2)/((faceTop-p.floor)/2)),0,1.1);
 const b=.024*(1-vertical*vertical),c=.035*vertical**6-b-(x-nose),t=(-b+Math.sqrt(Math.max(0,b*b-4*corner*c)))/(2*corner);
 result=Math.min(result,faceWidth*Math.sqrt(Math.max(0,t)));
 if(p.family==='uaz'){
  // The 469 has a separate broad front wing above its narrower bonnet.
  const front=-fit.wheelbase/2+(fit.axleOffset||0),radius=.055,dx=Math.max(0,Math.abs(x-front)-(.455-radius)),dy=Math.max(0,Math.abs(y-.92));
  if(dx*dx+dy*dy<radius*radius)result=Math.max(result,w*.92+.115-radius+Math.sqrt(radius*radius-dx*dx-dy*dy));
 }
 return result;
}
// Indexed surface: shared vertices carry a continuous normal through the shoulder and rolled lip.
function sweep(rows,section,point,reverse=false){
 const positions=[],uv=[],indices=[];
 for(let i=0;i<=rows;i++)for(let j=0;j<section;j++){positions.push(...point(i/rows,j));uv.push(i/rows,j/section);}
 for(let i=0;i<rows;i++)for(let j=0;j<section;j++){
  const a=i*section+j,b=i*section+(j+1)%section,c=b+section,d=a+section;
  indices.push(...(reverse?[a,d,b,b,d,c]:[a,b,d,b,c,d]));
 }
 for(let j=1;j<section-1;j++){
  const end=rows*section;indices.push(...(reverse?[0,j,j+1,end,end+j+1,end+j]:[0,j+1,j,end,end+j,end+j+1]));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function flareGeometry(fit,axle,side,rarity,racing=false){
 const r=fit.radius,inner=r+.053,band=.068+rarity*.018,extension=.028+rarity*.022;
 // Inside return, small rolled lip, then a broad shoulder whose tangent flattens into the body.
 const cross=[[-.010,0],[-.012,.72],[-.008,.95],[0,1],[.012,.98]];
 for(let j=1;j<=12;j++){const u=j/12;cross.push([.012+(band-.012)*u,1-smooth(u)]);}
 const minimum=Math.max(.13,Math.asin(clamp(((fit.body?.floor||.245)+.07-r)/inner,0,.65)));
 const g=sweep(racing?64:96,cross.length,(u,j)=>{
  const a=minimum+(Math.PI-2*minimum)*u,rr=inner+cross[j][0],x=axle+rr*Math.cos(a),y=r+rr*Math.sin(a);
  const tip=smooth(u/.12)*smooth((1-u)/.12),body=bodyWidthAt(fit,x,y);
  const z=body-.020+(.010+extension)*cross[j][1]*tip;
  return [x-axle,y-r,side*z];
 },side<0);
 // The buried return must not pull the visible attachment normal inward.
 const pos=g.attributes.position,norm=g.attributes.normal,section=cross.length;
 for(let row=0;row<=(racing?64:96);row++){
  const i=row*section+section-1,x=pos.getX(i)+axle,y=pos.getY(i)+r,e=.001;
  const dx=(bodyWidthAt(fit,x+e,y)-bodyWidthAt(fit,x-e,y))/(2*e),dy=(bodyWidthAt(fit,x,y+e)-bodyWidthAt(fit,x,y-e))/(2*e),normal=new T.Vector3(-dx,-dy,side).normalize();
  norm.setXYZ(i,normal.x,normal.y,normal.z);
 }
 g.userData={attachment:'body',clearance:inner-.012-r,rows:racing?64:96};return g;
}
export function buildSculptedFenders({car,fit,rarity,partId,kit,add,paint,racing}){
 const stock=car.getObjectByName('StockFenders');if(stock)stock.visible=false;
 const group=new T.Group();group.name='Kit_fenders';group.userData.partId=partId;kit.add(group);
 for(const axle of [-fit.wheelbase/2+(fit.axleOffset||0),fit.wheelbase/2+(fit.axleOffset||0)])for(const side of [-1,1])add(group,'Blended wheel arch',flareGeometry(fit,axle,side,rarity,racing),paint,[axle,fit.radius,0]);
 return group;
}
export function skirtGeometry(fit,side,rarity,flareRarity=null,racing=false,blade=false){
 const floor=fit.body?.floor||.245,r=fit.radius,top=floor+.16,bottom=kitClearance(fit,rarity)+(rarity>0?.004:0),inner=r+.053;
 const endClearance=Math.sqrt(Math.max(.01,inner*inner-(top-r)**2))+.025,half=fit.wheelbase/2-endClearance;
 const extension=.025+rarity*.020,join=flareRarity===null?0:.010+flareRarity*.006;
 // Rounded lower sill, with its upper edge buried inside the original shoulder.
 const profile=blade?[[bottom+.020,-.018],[bottom+.021,extension+.020],[bottom+.013,extension+.028],[bottom+.001,extension+.024],[bottom-.004,extension+.011],[bottom-.004,-.018]]:
 [[top,-.015],[top-.015,-.009],[top-.048,extension*.22],[bottom+.055,extension*.85],[bottom+.023,extension],[bottom+.007,extension*.93],[bottom,extension*.65],[bottom,-.023],[top-.065,-.029]];
 return sweep(racing?36:56,profile.length,(u,j)=>{
  const x=(2*u-1)*half,wx=x+(fit.axleOffset||0),end=smooth(u/.12)*smooth((1-u)/.12);
  const y=profile[j][0]+Math.max(0,floor+.105-profile[j][0])*(1-end);
  const tucked=(1-end)*.022,z=bodyWidthAt(fit,wx,Math.max(y,floor+.085))+profile[j][1]*end+join*(1-end)-tucked;
  return [x,y,side*z];
 },side<0);
}
export function buildSculptedSkirts({car,fit,rarity,flareRarity,partId,kit,add,paint,dark,racing}){
 const stock=car.getObjectByName('StockSkirts');if(stock)stock.visible=false;
 const group=new T.Group();group.name='Kit_skirts';group.userData.partId=partId;group.position.x=fit.axleOffset||0;kit.add(group);
 for(const side of [-1,1]){
  add(group,'Sculpted sill',skirtGeometry(fit,side,rarity,flareRarity,racing),paint,[0,0,0]);
  if(rarity>0)add(group,'Rolled sill lip',skirtGeometry(fit,side,rarity,flareRarity,racing,true),dark,[0,0,0]);
 }
 return group;
}
