import {kitTier} from './sculpted-body-kit.js';
import {kitClearance,fitBumperHeight} from './kit-clearance.js';
import {bodyWidthAt,SKIRT_STYLES,FLARE_STYLES} from './sculpted-body-kit.js';
import {SOYUZ_BUMPERS} from './soyuz-bumper-mesh.js';
// «Союз»: бампер — не примитивы, а меш, вырезанный из модели красной Волги. Поперёк — под ширину машины, по высоте —
// от верха бампера до нижней линии обвеса (лестница редкостей), по глубине — от кромки арки до носа/кормы.
function soyuzBumper(fit,front,rarity,drop,end,add,paint){
 const src=SOYUZ_BUMPERS[front?'front':'rear'],[x0,y0,z0,x1,y1,z1]=src.box,length=fit.length||4.05,axle=(front?-1:1)*fit.wheelbase/2+(fit.axleOffset||0),inner=fit.radius+.035+drop;
 const archEdge=axle+(front?-1:1)*(inner+.012),tip=(front?-1:1)*(length/2+.015),cut=front?z0:z1,nose=front?z1:z0;
 const sz=(tip-archEdge)/(nose-cut),sx=fit.width*.99/(x1-x0),bottom=kitClearance(fit,rarity)+drop,top=end.position.y+.03/* срез прячется под линию бампера */,sy=(top-bottom)/(y1-y0);
 const pos=new Float32Array(src.p.length);for(let i=0;i<src.p.length;i+=3){const X=archEdge+(src.p[i+2]-cut)*sz,Y=bottom+(src.p[i+1]-y0)*sy,Z=src.p[i]*sx;/* в локальные координаты конца: +X наружу */pos[i]=front?end.position.x-X:X-end.position.x;pos[i+1]=Y-end.position.y;pos[i+2]=front?-Z:Z;}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setIndex(src.i);if(front!==(sx<0))g.index.array.reverse();g.computeVertexNormals();
 add(end,front?'Volga race apron':'Volga race tail',g,paint,[0,0,0]);
}
// Стили: Дрифт (null) — рот и блоки фар; Кольцо — глубокий плоский фартук с тремя щелями; Ралли — тёмная защита и
// круглые противотуманки; Заклёпки — плоский тёмный подбородок-сплиттер, вертикальные канарды и болты по губе.
const lamp=(add,parent,name,radius,depth,material,pos)=>{const m=add(parent,name,new T.CylinderGeometry(radius,radius,depth,10,1),material,pos);m.rotation.z=Math.PI/2;return m;};
const wedgeFin=(depth,height,thickness)=>{const s=new T.Shape();s.moveTo(0,0);s.lineTo(depth,0);s.lineTo(0,height);s.lineTo(0,0);const g=new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false,steps:1});g.translate(0,0,-thickness/2);g.computeVertexNormals();return g;};
const bolts=(add,parent,count,x,y,spanZ,material)=>{for(let i=0;i<count;i++)add(parent,'Lip bolt',new T.BoxGeometry(.012,.012,.012),material,[x,y,(i/(count-1)-.5)*spanZ]);};
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// Curved cross sections and side returns keep the nose volumetric at every kit level.
export function sweptRail(width,depth,height,returnDepth,rows=36){
 const vertices=[],uv=[],indices=[],ring=12;
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

// Drift-kit ladder from the references: painted cover, dark mouth, light blocks, splitter; rear diffuser with exhaust cut-outs.
const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
export function buildBumperKit({car,fit,rarity,partId,kit,add,paint,dark,light=dark,drop=0,style=null,fenderRarity=null,fenderStyle=null}){rarity=kitTier(rarity);fenderRarity=kitTier(fenderRarity);
 const box=(parent,name,size,position,material=paint)=>add(parent,name,new RoundedBoxGeometry(...size,1,.008),material,position);
 const stock=car.getObjectByName('StockBumpers');if(stock)stock.visible=false;
 const group=new T.Group();group.name='Kit_bumpers';group.userData.partId=partId;kit.add(group);
 const length=fit.length||4.05,width=fit.width,y=['niva','uaz','bukhanka'].includes(fit.id)?.56:['oka','smz'].includes(fit.id)?.44:.50;
 for(const front of [true,false]){
  // У модели Волги корма — тонкая планка, бампер из неё не вырезать: сзади «Союз» носит накладку в цвет по типу «Кольца».
  const endStyle=style==='soyuz'&&!front?'ring':style;
  const end=new T.Group();end.name=front?'Kit_bumpers_front':'Kit_bumpers_rear';group.add(end);
  // Local +X points outwards. The rear of the UAZ is inset ahead of its spare wheel.
  end.position.set(front?-length/2+.045:length/2-(fit.id==='uaz'?.27:.045),y,0);end.rotation.y=front?Math.PI:0;
  if(endStyle==='soyuz'){soyuzBumper(fit,front,rarity,drop,end,add,paint);end.userData.clearance=kitClearance(fit,rarity)+drop;continue;}
  const sweep=front?.32:.20;
  // Painted cover: one continuous shell, deeper with every level. A shallow centre recess keeps the registration plate visible.
  const lipY=-.13-rarity*.02,face=endStyle==='bunny'?.045+rarity*.004:endStyle==='ring'||endStyle==='soyuz'?.065+rarity*.006:.055+rarity*.006,shellHalf=endStyle==='bunny'?.07+rarity*.006:.09+rarity*.008,railSweep=endStyle==='ring'?sweep*.6:endStyle==='soyuz'?sweep*.5:sweep;
  const rail=sweptRail(width*.99,face,shellHalf,railSweep,28);const p=rail.attributes.position;
  const stretch=(-lipY+.006)/shellHalf;for(let i=0;i<p.count;i++){if(p.getY(i)<0)p.setY(i,p.getY(i)*stretch);if(Math.abs(p.getZ(i))<.24)p.setX(i,p.getX(i)-.08*(1-Math.pow(Math.abs(p.getZ(i))/.24,4)));}
  rail.computeVertexNormals();add(end,'Painted bumper shell',rail,paint,[0,0,0]);
    if(endStyle==='ring'){
   // Кольцо: три горизонтальные щели в плоском фартуке, снизу тонкая тёмная линия, на легендарном — плоский сплиттер.
   const slotH=.03+rarity*.008;
   box(end,front?'Centre slot':'Rear slot',[.03,slotH,width*(front?.4:.5)],[face-.004,lipY+.055+slotH/2,0],dark);
   if(rarity>=1)for(const side of [-1,1])box(end,front?'Side slot':'Exhaust slot',[.03,front?.028:.045,width*(front?.16:.1)],[face-.004,front?-.05:-.06,side*width*(front?.33:.3)],dark);
   if(rarity>=2)box(end,'Lower trim line',[.02,.012,width*.9],[face+.004,lipY+.03,0],dark);
   if(rarity>=2&&!front)for(let i=-1;i<=1;i++)box(end,'Diffuser strake',[.14,.06,.012],[-.03,lipY+.03,i*width*.15],dark);
  }else if(endStyle==='rally'){
   // Ралли: нижняя треть — тёмная защита картера, противотуманки в тёмных стаканах с редкой (две) и эпической (четыре).
   const guardH=.09+rarity*.02;
   box(end,front?'Sump guard':'Rear skid plate',[.05,guardH,width*.72],[face-.012,lipY+.04+guardH/2,0],dark);
   if(front){const lamps=rarity>=2?[-.30,-.18,.18,.30]:rarity>=1?[-.2,.2]:[];for(const k of lamps){lamp(add,end,'Fog lamp housing',.05,.05,dark,[face-.01,-.03,k*width]);lamp(add,end,'Fog lamp',.04,.012,light,[face+.02,-.03,k*width]);}
    if(rarity===0)box(end,'Number plate lamp bar',[.02,.02,width*.36],[face+.004,-.045,0],dark);}
   else{box(end,'Exhaust cut-out',[.04,.05,.09],[face-.004,-.05,-width*.31],dark);if(rarity>=2)box(end,'Tow hook',[.06,.03,.03],[face+.02,lipY+.09,width*.25],dark);}
   if(rarity>=3)box(end,front?'Brush guard bar':'Rear guard bar',[.04,.03,width*.8],[face+.03,-.015,0],dark);
  }else if(endStyle==='bunny'){
   // Заклёпки: узкая тёмная щель, широкий плоский подбородок, вертикальные канарды парами, болты по губе.
   box(end,front?'Chin slot':'Rear slot',[.03,.03,width*(front?.3:.5)],[face-.004,-.055,0],dark);
   const chin=.08+rarity*.025;box(end,front?'Chin splitter':'Rear diffuser plate',[chin,.012,width*(1+rarity*.02)],[chin/2-.02,lipY-.006,0],dark);
   if(front){const pairs=rarity>=2?[.47,.36]:rarity>=1?[.47]:[];for(const k of pairs)for(const side of [-1,1]){const fin=box(end,'Vertical canard',[.12,.09,.012],[.03,lipY+.07,side*width*k],dark);fin.rotation.y=-side*.2;}}
   else for(let i=-2;i<=2;i++)box(end,'Diffuser fin',[.2,.09+rarity*.01,.012],[-.04,lipY+.04,i*width*.12],dark);
   if(rarity>=2)bolts(add,end,7+rarity*2,face+.002,lipY+.02,width*.9,dark);
  }else if(front){
   // Wide dark mouth below the plate, growing with rarity; light blocks either side from the rare kit up.
   const mouthW=width*(.34+rarity*.04),mouthH=.055+rarity*.022;
   box(end,'Bumper mouth',[.04,mouthH,mouthW],[face-.005,lipY+.06+mouthH/2,0],dark);
   for(let i=0;i<2+rarity;i++)box(end,'Mouth bar',[.012,.008,mouthW*.96],[face+.018,lipY+.06+mouthH*(i+1)/(3+rarity),0],dark);
   for(const side of [-1,1]){
    if(rarity>=1){box(end,'Light frame',[.03,.062+rarity*.006,width*.125],[face-.004,-.045,side*(mouthW/2+width*.085)],dark);box(end,'Light block',[.03,.05+rarity*.006,width*.11],[face+.006,-.045,side*(mouthW/2+width*.085)],light);}
    else box(end,'Bumper cheek vent',[.03,.04,width*.1],[face,-.05,side*(mouthW/2+width*.08)],dark);
    if(rarity>=2)box(end,'Corner intake',[.04,.075+rarity*.01,width*.085],[face-.008,lipY+.075,side*width*.43],dark);
   }
  }else{
   // Rear: dark diffuser recess with fins, exhaust cut-outs from the rare kit up.
   const recessW=width*(.42+rarity*.03),recessH=.05+rarity*.018;
   box(end,'Rear diffuser',[.04,recessH,recessW],[face-.006,lipY+.045+recessH/2,0],dark);
   if(rarity>=1)for(let i=-(1+rarity);i<=1+rarity;i++)box(end,'Diffuser fin',[.16+rarity*.02,recessH+.02,.012],[-.03,lipY+.035+recessH/2,i*recessW/(3+2*rarity)],dark);
   if(rarity>=1)for(const side of [-1,1])box(end,'Exhaust cut-out',[.04,.05,.09],[face-.004,-.05,side*width*.31],dark);
  }
  // Splitter lip: painted on the common kit, a dark blade from rare, a wide plate with winglets on the legendary.
  if(endStyle==='ring')add(end,'Curved lower lip',sweptRail(width*(1+rarity*.01),.06+rarity*.012,.012,sweep*.3,16),rarity===3?dark:paint,[.012+rarity*.004,lipY,0]);
  else if(endStyle==='rally')add(end,'Curved lower lip',sweptRail(width*.98,.06+rarity*.01,.02,sweep*.5,16),dark,[.014+rarity*.004,lipY,0]);
  else if(style!=='bunny')add(end,'Curved lower lip',sweptRail(width*(1+rarity*.012),.07+rarity*.018,.012,sweep*.5,16),rarity?dark:paint,[.014+rarity*.006,lipY,0]);
  if(!style){
   if(rarity>=2&&front)for(const side of [-1,1]){const blade=box(end,'Corner aero blade',[.24,.02,.12+rarity*.01],[-.08,lipY+.04,side*width*.49],dark);blade.rotation.x=side*.12;}
   if(rarity===3){box(end,'Splitter plate',[.18,.01,width*1.02],[.03,lipY-.012,0],dark);for(const side of [-1,1])box(end,front?'Splitter winglet':'Diffuser side fin',[.16,.05,.012],[-.02,lipY+.015,side*width*.505],dark);}
   if(rarity===3&&front)for(const side of [-1,1]){const blade=box(end,'Upper canard',[.18,.016,.11],[-.04,-.01,side*width*.47],dark);blade.rotation.x=side*.22;}
  }
  if(endStyle==='ring'&&rarity===3)box(end,'Splitter plate',[.16,.01,width*1.0],[.02,lipY-.012,0],dark);
  fitBumperHeight(end,kitClearance(fit,rarity)+drop);
  // Corner returns: the cover continues along the flank up to the arch and follows its curve, so no tyre shows between bumper and wheel.
  const floor=fit.body?.floor||.245,bottom=kitClearance(fit,rarity)+drop,top=floor+.07,axle=(front?-1:1)*fit.wheelbase/2+(fit.axleOffset||0),inner=fit.radius+.035+drop;
  // Возврат заходит под внешний край накладки арки (полка + плечо) и сходит на нет к нему: без ступеньки и щели.
  const flare=FLARE_STYLES[fenderStyle]||FLARE_STYLES[null],outerArch=inner+(fenderRarity===null?0:flare.band(fenderRarity)*.9),flareFoot=fit.radius+inner*Math.sin(.13);
  const xStart=front?-length/2+.10:length/2-(fit.id==='uaz'?.32:.10),extension=(SKIRT_STYLES[style]||SKIRT_STYLES[null]).ext[rarity]*.8;
  const profile=[[top,-.03],[top-.012,-.008],[top-.03,extension*.2],[bottom+.06,extension*.85],[bottom+.02,extension],[bottom+.005,extension*.9],[bottom,extension*.6],[bottom,-.03]];
  for(const side of [-1,1]){
   const geo=strip(20,profile.length,(u,j)=>{
    const y=profile[j][0],rr=fenderRarity!==null&&y>flareFoot-.03?outerArch:inner,reach=Math.sqrt(Math.max(0,rr*rr-(y-fit.radius)**2))+.006,xEnd=axle+(front?-reach:reach),x=xStart+(xEnd-xStart)*u;
    const taper=1-.65*smooth((u-.78)/.22),z=side*(bodyWidthAt(fit,x,Math.max(y,floor+.085))+profile[j][1]*taper);
    return front?[end.position.x-x,y-end.position.y,-z]:[x-end.position.x,y-end.position.y,z];
   },(side<0)!==front);
   add(end,'Bumper corner return',geo,paint,[0,0,0]);
  }
 }
 return group;
}
// Indexed strip with shared vertices (same convention as the sculpted kit).
function strip(rows,section,point,reverse=false){
 const positions=[],uv=[],indices=[];
 for(let i=0;i<=rows;i++)for(let j=0;j<section;j++){positions.push(...point(i/rows,j));uv.push(i/rows,j/section);}
 for(let i=0;i<rows;i++)for(let j=0;j<section-1;j++){const a=i*section+j,b=a+1,c=b+section,d=a+section;indices.push(...(reverse?[a,d,b,b,d,c]:[a,b,d,b,c,d]));}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
