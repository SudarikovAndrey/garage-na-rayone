import {kitClearance,fitBumperHeight} from './kit-clearance.js';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Curved cross sections and side returns keep the nose volumetric at every kit level.
export function sweptRail(width,depth,height,returnDepth){
 const vertices=[],uv=[],indices=[],rows=36,ring=12;
 for(let i=0;i<=rows;i++){
  const u=i/rows*2-1,z=u*width/2,x=-returnDepth*Math.pow(Math.abs(u),6);
  for(let j=0;j<ring;j++){
   const a=j/ring*Math.PI*2;
   vertices.push(x+depth*Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.5),height*Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.5),z);
   uv.push(i/rows,j/ring);
  }
 }
 for(let i=0;i<rows;i++)for(let j=0;j<ring;j++){
  const a=i*ring+j,b=i*ring+(j+1)%ring,c=b+ring,d=a+ring;
  indices.push(a,b,d,b,c,d);
 }
 for(let j=1;j<ring-1;j++){indices.push(0,j+1,j);const last=rows*ring;indices.push(last,last+j,last+j+1);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function buildBumperKit({car,fit,rarity,partId,kit,add,paint,dark}){
 const box=(parent,name,size,position,material=paint)=>add(parent,name,new RoundedBoxGeometry(...size,1,.012),material,position);
 const stock=car.getObjectByName('StockBumpers');if(stock)stock.visible=false;
 const group=new T.Group();group.name='Kit_bumpers';group.userData.partId=partId;kit.add(group);
 const length=fit.length||4.05,width=fit.width,y=['niva','uaz','bukhanka'].includes(fit.id)?.56:['oka','smz'].includes(fit.id)?.44:.50;
 for(const front of [true,false]){
  const end=new T.Group();end.name=front?'Kit_bumpers_front':'Kit_bumpers_rear';group.add(end);
  // Local +X points outwards. The rear of the UAZ is inset ahead of its spare wheel.
  end.position.set(front?-length/2+.045:length/2-(fit.id==='uaz'?.27:.045),y,0);end.rotation.y=front?Math.PI:0;
  const sweep=front?.32:.20;
  // A shallow centre recess leaves the existing registration plate visible.
  const rail=sweptRail(width*.99,.055,.085,sweep);const p=rail.attributes.position;
  for(let i=0;i<p.count;i++)if(Math.abs(p.getZ(i))<.24)p.setX(i,p.getX(i)-.09*(1-Math.pow(Math.abs(p.getZ(i))/.24,4)));
  rail.computeVertexNormals();add(end,'Painted bumper shell',rail,paint,[0,0,0]);
  for(const side of [-1,1]){
   box(end,'Bumper cheek',[.12,.12+rarity*.024,width*.23],[-.005,-.065-rarity*.01,side*width*.32]);
   box(end,'Recessed cooling vent',[.014,.042+rarity*.014,width*.15],[.061,-.075,side*width*.32],dark);
   if(rarity>0)for(let i=0;i<3;i++)box(end,'Vent louvre',[.023,.012,width*.13],[.069,-.06-i*.022,side*width*.32],dark);
  }
  const lipY=-.12-rarity*.018;
  if(fit.id==='kopeyka'&&rarity>=1)add(end,'2101 continuous racing apron',sweptRail(width*.99,.037,(-lipY-.035)/2,sweep),paint,[-.023,(lipY-.035)/2,0]);
  add(end,'Curved lower lip',sweptRail(width*(1+rarity*.013),.075+rarity*.012,.018,sweep),rarity?dark:paint,[.014+rarity*.006,lipY,0]);
  if(rarity>=1)box(end,front?'Centre intake':'Rear diffuser',[.025,.052,width*.42],[.018,lipY+.045,0],dark);
  if(rarity>=2)for(const side of [-1,1]){
   const blade=box(end,'Corner aero blade',[.26,.025,.13+rarity*.012],[-.08,lipY+.04,side*width*.49],dark);blade.rotation.x=side*.12;
  }
  if(rarity>=2&&!front)for(let i=-2;i<=2;i++)box(end,'Diffuser fin',[.21,.078,.018],[-.02,lipY+.007,i*width*.09],dark);
  if(rarity===3&&front)for(const side of [-1,1]){
   const blade=box(end,'Upper canard',[.20,.02,.12],[-.045,-.015,side*width*.48],dark);blade.rotation.x=side*.22;
  }
  fitBumperHeight(end,kitClearance(fit,rarity));
 }
 return group;
}
