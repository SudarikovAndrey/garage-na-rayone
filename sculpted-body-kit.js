import {kitClearance} from './kit-clearance.js';
import * as T from 'three';
import {BODY_PROFILES} from './body-profiles.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
// Same rounded monocoque cross-section used by the authored fleet, in physical metres.
// No raycasts or mesh processing in a frame: attachment is a small analytic surface evaluation.
// Геометрия обвеса знает четыре ступени: размеры лежат в массивах по редкости. Уникальная (5-я) деталь
// строится по легендарной форме — иначе RoundedBoxGeometry получает undefined и машина не рисуется вовсе.
// Отличается она не формой, а силой и красной окантовкой в интерфейсе.
// Настоящий профиль ширины кузова, снятый с модели (scripts/measure-body-profiles.mjs). Есть — берём его:
// аналитическое сечение ниже подобрано под старые модели, у новых оно у носа и кормы уже кузова, и детали
// обвеса уходили внутрь. В колёсной арке и там, где кузов не окрашен, — ближайшая ширина на той же высоте.
// Сетка готовится один раз на машину: пустоты внутри кузова (колёсная арка, неокрашенные вставки) заполняются
// по краям проёма, затем два прохода сглаживания 5×5 внутри кузова (у края клетка остаётся как снята). Без сглаживания у накладок арок,
// которые считают нормаль по производной ширины, на каждом шаге сетки выходил излом.
const profileGrids=new Map();
function profileGrid(id){
 if(profileGrids.has(id))return profileGrids.get(id);const P=BODY_PROFILES[id];if(!P){profileGrids.set(id,null);return null;}
 let g=P.mm.map(row=>row.map((w,i)=>{if(w>0)return w;let a=0,b=0,ka=0,kb=0;
  for(let k=1;k<=24&&!a;k++)if((row[i-k]||0)>0){a=row[i-k];ka=k;}for(let k=1;k<=24&&!b;k++)if((row[i+k]||0)>0){b=row[i+k];kb=k;}
  return a&&b?a+(b-a)*ka/(ka+kb):0;}));
 for(let pass=0;pass<2;pass++)g=g.map((row,j)=>row.map((w,i)=>{if(!w)return 0;let n=0,sum=0;
  for(let dj=-2;dj<=2;dj++)for(let di=-2;di<=2;di++){const v=g[j+dj]?.[i+di]||0;if(!v)return w;/* край кузова не размываем */sum+=v;n++;}return sum/n;}));
 const out={...P,g};profileGrids.set(id,out);return out;
}
function measuredWidth(fit,x,y){
 const P=profileGrid(fit.id);if(!P)return null;
 const fx=clamp((x-P.x0)/P.dx,0,P.nx-1),fy=clamp((y-P.y0)/P.dy,0,P.ny-1),i=Math.floor(fx),j=Math.floor(fy),i1=Math.min(P.nx-1,i+1),j1=Math.min(P.ny-1,j+1),u=fx-i,v=fy-j;
 const a=P.g[j][i],b=P.g[j][i1],c=P.g[j1][i],d=P.g[j1][i1];
 const vals=[[a,(1-u)*(1-v)],[b,u*(1-v)],[c,(1-u)*v],[d,u*v]].filter(([w])=>w>0);if(!vals.length)return null;
 const wsum=vals.reduce((n,[,k])=>n+k,0);if(wsum<1e-6)return Math.max(a,b,c,d)/1000;
 return vals.reduce((n,[w,k])=>n+w*k,0)/wsum/1000;
}
export const kitTier=r=>r===null||r===undefined?r:Math.min(3,Math.max(0,r|0));
export function bodyWidthAt(fit,x,y){
 const measured=measuredWidth(fit,x,y);if(measured!==null)return measured;
 // body.width — ширина сечения для обвеса, если оно у модели уже заводской ширины (завал бортов у новой Копейки);
 // сама ширина машины (физика, неон, наклейки) остаётся fit.width.
 const p=fit.body||{belt:.9,floor:.245,hoodStart:-.8,hoodDrop:.115,power:.23},w=(p.width??fit.width)/2,nose=-(fit.length||4.006)/2+.125,tail=(fit.length||4.006)/2-(p.family==='uaz'?.35:.125);
 const u=clamp((x-nose)/(tail-nose)),edge=Math.sin(Math.PI*u);
 let width=w*(.91+.09*Math.pow(edge,.4));
 if(p.family==='van')width=w*(.83+.17*Math.pow(edge,.28));
 if(p.family==='uaz'&&x<p.hoodStart)width*=.83+.17*clamp((x-nose)/(p.hoodStart-nose));
 const top=p.belt-p.hoodDrop*Math.pow(Math.max(0,(p.hoodStart-x)/Math.max(.01,p.hoodStart-nose)),1.25),cy=(top+p.floor)/2,ry=(top-p.floor)/2;
 let result=width*Math.pow(Math.max(.01,1-Math.pow(clamp(Math.abs((y-cy)/ry),0,.9999),2/p.power)),p.power/2);
 // Near the nose, the swept front corner narrows the body before the side loft begins.
 // body.corner в паспорте — у машин, где нос померен по модели (новая Копейка квадратнее старой).
 const corner=p.corner??(fit.id==='kopeyka'?.125:({round:.25,van:.20,volga:.15,samara:.14,oka:.12,classic:.10,offroad:.12,smz:.075,uaz:.13}[p.family]||.14));
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
// Стили обвеса. Дрифт (null) — округлое плечо с полкой; Кольцо — коробчатая стеклопластиковая накладка с плоской
// вертикальной гранью (Gulf-Копейка); Ралли — квадратные расширители с брызговиками; Заклёпки — овер-крылья на
// открытом фланце с болтами (Rocket Bunny). Числа — метры за поверхностью кузова.
export const FLARE_STYLES={
 null:{ext:[.03,.06,.095,.125],rear:1.15,band:r=>.07+r*.03,shelf:[0,.15,.3,.45],square:2,flange:false,bead:true},
 ring:{ext:[.04,.075,.11,.14],rear:1.1,band:r=>.06+r*.02,shelf:[.6,.7,.8,.85],square:3.2,flange:false,bead:false},
 rally:{ext:[.035,.07,.10,.13],rear:1.12,band:r=>.07+r*.025,shelf:[.5,.6,.7,.75],square:2.6,flange:false,bead:true,mudflap:true},
 bunny:{ext:[.04,.08,.12,.15],rear:1.15,band:r=>.05+r*.02,shelf:[0,.1,.2,.3],square:2,flange:true,bead:false},
 soyuz:{ext:[.04,.075,.11,.14],rear:1.1,band:r=>.06+r*.02,shelf:[.6,.7,.8,.85],square:3,flange:false,bead:false,bolts:true,plastic:true}, // чёрный пластик на болтах, как у красной Волги
};
const flareStyle=style=>FLARE_STYLES[style]||FLARE_STYLES[null];
// Widebody ladder (metres beyond the body surface). Rear arches sit wider than the front, as on the drift references.
export function flareExtension(rarity,rear=false,style=null){rarity=kitTier(rarity);const st=flareStyle(style);return st.ext[rarity]*(rear?st.rear:1);}
// Lowered stance with the widebody: body, underbody and kit drop towards the wheels (metres). Wheels and shadow stay on the road.
export function bodyDrop(fendersRarity){fendersRarity=kitTier(fendersRarity);return fendersRarity===null||fendersRarity===undefined?0:[0,.015,.025,.035][fendersRarity];}
// Tyres grow with the arches; the rim face always sits in the tyre plane.
// Ширина резины (множитель к заводской). Андрей, 23 сентября: «колёса как правило узкие везде; задние при прокачке
// должны быть сильно широкие, шире передних». Заводская чуть шире модели, спортивная — с дисками обвеса, дальше растёт
// с крыльями; зад всегда шире переда.
export function tyreScale(fendersRarity,rear=false,rimsRarity=null){fendersRarity=kitTier(fendersRarity);rimsRarity=kitTier(rimsRarity);
 // 24 сентября: «слишком уж широкие задние колёса» — заводская снова заводской ширины, зад шире переда умеренно.
 const fenders=fendersRarity===null||fendersRarity===undefined?null:(rear?[1.25,1.38,1.5,1.62]:[1.15,1.24,1.32,1.4])[fendersRarity];
 const rims=rimsRarity===null||rimsRarity===undefined?null:rear?1.2:1.12;
 return Math.max(1,fenders??0,rims??0);}
// Wheel moves out until the tyre face sits just inside the new arch lip: visual only, physics keeps fit.width.
export function wheelOffset(fit,rarity,rear,tyreOuter,wheelZ,style=null){rarity=kitTier(rarity);const axle=(rear?1:-1)*fit.wheelbase/2+(fit.axleOffset||0),lip=bodyWidthAt(fit,axle,fit.radius+.12)-.01+flareExtension(rarity,rear,style);return Math.max(0,lip-.012-(Math.abs(wheelZ)+tyreOuter));}
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
export const FLARE_ROWS=racing=>racing?48:72,FLARE_SECTION=17;
function flareArc(fit,rear,drop=0){const r=fit.radius,inner=r+.035+drop;return {r,inner,minimum:Math.max(.13,Math.asin(clamp(((fit.body?.floor||.245)+.07-r)/inner,0,.65))),rear};}
// Squared outer contour (superellipse) for box arches: the opening stays round for the tyre, the outer edge squares up.
const squircle=(a,n)=>n<=2?1:1/Math.pow(Math.pow(Math.abs(Math.cos(a)),n)+Math.pow(Math.abs(Math.sin(a)),n),1/n);
export function flareGeometry(fit,axle,side,rarity,racing=false,rear=axle>0,drop=0,style=null){rarity=kitTier(rarity);
 const st=flareStyle(style),{r,inner,minimum}=flareArc(fit,rear,drop),extension=flareExtension(rarity,rear,style),band=st.band(rarity),shelf=st.shelf[rarity];
 // Inside return, rolled lip, then a shoulder: rounded on the stock arch, a flat shelf with a sharp edge on the widebody.
 const cross=[[-.010,0],[-.012,.72],[-.008,.95],[0,1],[.012,.98]];
 if(st.flange){
  // Overfender: steep wall from the lip down to a flat bolt-on flange lying almost on the panel.
  const flange=.028/(.010+extension);
  for(let j=1;j<=7;j++){const u=j/7,fall=smooth(u);cross.push([.012+(band-.012)*u,flange+(1-flange)*(1-fall)]);}
  cross.push([band+.006,flange],[band+.03,flange],[band+.034,flange*.5],[band+.034,0]);
 }else for(let j=1;j<=12;j++){const u=j/12,fall=u<shelf?0:smooth((u-shelf)/(1-shelf));cross.push([.012+(band-.012)*u,1-fall]);}
 const rows=FLARE_ROWS(racing);
 const g=sweep(rows,cross.length,(u,j)=>{
  const a=minimum+(Math.PI-2*minimum)*u,outer=clamp(cross[j][0]/band),rr=inner+cross[j][0]*(1+(squircle(a,st.square)-1)*outer),x=axle+rr*Math.cos(a),y=r+rr*Math.sin(a);
  const tip=smooth(u/.12)*smooth((1-u)/.12),body=bodyWidthAt(fit,x,y);
  const z=body-.020+(.010+extension)*cross[j][1]*tip;
  return [x-axle,y-r,side*z];
 },side<0);
 // The buried return must not pull the visible attachment normal inward.
 const pos=g.attributes.position,norm=g.attributes.normal,section=cross.length;
 for(let row=0;row<=rows;row++){
  const i=row*section+section-1,x=pos.getX(i)+axle,y=pos.getY(i)+r,e=.001;
  const dx=(bodyWidthAt(fit,x+e,y)-bodyWidthAt(fit,x-e,y))/(2*e),dy=(bodyWidthAt(fit,x,y+e)-bodyWidthAt(fit,x,y-e))/(2*e),normal=new T.Vector3(-dx,-dy,side).normalize();
  norm.setXYZ(i,normal.x,normal.y,normal.z);
 }
 g.userData={attachment:'body',clearance:inner-.012-r,rows};return g;
}
// Dark trim bead along the outer edge of a bolt-on arch: reads as a separate part, hides the seam.
export function flareEdgeGeometry(fit,axle,side,rarity,racing=false,rear=axle>0,drop=0,style=null){rarity=kitTier(rarity);
 const {r,inner,minimum}=flareArc(fit,rear,drop),extension=flareExtension(rarity,rear,style);
 const bead=[[-.006,0],[-.014,.7],[-.009,1.1],[.004,1.15],[.014,.75],[.010,0]];
 return sweep(racing?32:48,bead.length,(u,j)=>{
  const a=minimum+(Math.PI-2*minimum)*u,rr=inner+bead[j][0],x=axle+rr*Math.cos(a),y=r+rr*Math.sin(a);
  const tip=smooth(u/.12)*smooth((1-u)/.12),body=bodyWidthAt(fit,x,y);
  return [x-axle,y-r,side*(body-.020+(.010+extension)*tip+bead[j][1]*.012*tip)];
 },side<0);
}
export function buildSculptedFenders({car,fit,rarity,partId,kit,add,paint,dark,racing,drop=0,style=null}){rarity=kitTier(rarity);
 const stock=car.getObjectByName('StockFenders');if(stock)stock.visible=false;
 const group=new T.Group();group.name='Kit_fenders';group.userData.partId=partId;kit.add(group);
 const offset=fit.axleOffset||0,st=flareStyle(style);
 for(const rear of [false,true]){const axle=(rear?1:-1)*fit.wheelbase/2+offset;for(const side of [-1,1]){
  add(group,'Blended wheel arch',flareGeometry(fit,axle,side,rarity,racing,rear,drop,style),paint,[axle,fit.radius,0]);
  if(st.bead&&rarity>0&&dark&&!racing)add(group,'Arch trim bead',flareEdgeGeometry(fit,axle,side,rarity,racing,rear,drop,style),dark,[axle,fit.radius,0]);
  const {inner,minimum}=flareArc(fit,rear,drop),extension=flareExtension(rarity,rear,style);
  // Заклёпки: ряд болтов по фланцу — визитная карточка овер-крыльев; только в гараже.
  if((st.flange||st.bolts)&&dark&&!racing){const count=6+rarity*2,rb=inner+st.band(rarity)+(st.flange?.018:-.012);for(let i=0;i<count;i++){const a=minimum+.08+(Math.PI-2*minimum-.16)*(i+.5)/count,x=axle+rb*Math.cos(a),y=fit.radius+rb*Math.sin(a);const bolt=add(group,'Flange bolt',new T.BoxGeometry(.016,.016,.012),dark,[x,y,side*(bodyWidthAt(fit,x,y)+.012)]);bolt.rotation.z=a;}}
  // Ралли: брызговик за аркой с редкой редкости.
  if(st.mudflap&&rarity>0&&dark&&!racing){const reach=Math.sqrt(Math.max(0,inner*inner-(fit.radius-.16)**2)),x=axle+reach+.03,y=kitClearance(fit,Math.min(rarity,2))+drop+.09;add(group,'Mud flap',new RoundedBoxGeometry(.03,.17+rarity*.01,.12+extension*.5,1,.004),dark,[x,y,side*(bodyWidthAt(fit,x,fit.radius)+extension*.55)]);}
  // Vent gills behind the front arch let the widebody breathe. Bead and gills are garage-only detail: invisible at race distance, saved as draws.
  if(rarity>=2&&!rear&&dark&&!racing&&fit.id!=='bukhanka')for(let i=0;i<3;i++){const x=axle+fit.radius+drop+.115+i*.05,y=fit.radius+.16-i*.012;const gill=add(group,'Arch vent gill',new RoundedBoxGeometry(.028,.075,.014,1,.004),dark,[x,y,side*(bodyWidthAt(fit,x,y)+.002)]);gill.rotation.x=side*.15;gill.rotation.z=-.35;}
 }}
 return group;
}
export const SKIRT_STYLES={
 null:{ext:[.02,.045,.07,.09]},
 ring:{ext:[.025,.05,.075,.10]},   // клин из стеклопластика: плоская панель уходит наружу к низу, острая нижняя кромка
 rally:{ext:[.02,.035,.05,.06]},   // порог в цвет и тёмная труба-слайдер под ним
 bunny:{ext:[.015,.02,.025,.03],blade:[.05,.08,.11,.13]}, // плоская доска и широкое тёмное лезвие
 soyuz:{ext:[.03,.045,.06,.075],ledge:[.02,.03,.04,.05]}, // глубокая плита в цвет с нижней полкой, как у Волги
};
export function skirtGeometry(fit,side,rarity,flareRarity=null,racing=false,blade=false,drop=0,style=null){rarity=kitTier(rarity);flareRarity=kitTier(flareRarity);
 const floor=fit.body?.floor||.245,r=fit.radius,top=floor+.115,bottom=kitClearance(fit,rarity)+drop+(rarity>0?.004:0),inner=r+.035+drop,st=SKIRT_STYLES[style]||SKIRT_STYLES[null];
 // Straight vertical cut just outside the widest point of the arch opening: no slant, no gap to the tyre.
 const endClearance=inner+.012,half=fit.wheelbase/2-endClearance;
 const extension=st.ext[rarity],bladeExt=st.blade?st.blade[rarity]:extension;
 // Rounded lower sill, with its upper edge buried inside the original shoulder; the epic kit adds a step ledge.
 const step=rarity>=2?.55:1;
 let profile;
 if(blade)profile=style==='bunny'?[[bottom+.024,-.018],[bottom+.026,bladeExt],[bottom+.014,bladeExt+.012],[bottom,bladeExt+.008],[bottom-.004,extension],[bottom-.004,-.018]]:
  [[bottom+.020,-.018],[bottom+.021,bladeExt+.020],[bottom+.013,bladeExt+.028],[bottom+.001,bladeExt+.024],[bottom-.004,bladeExt+.011],[bottom-.004,-.018]];
 else if(style==='ring')profile=[[top,-.015],[top-.01,-.004],[top-.03,.004],[bottom+.012,extension],[bottom,extension*.96],[bottom,-.02],[top-.05,-.029]];
 else if(style==='rally')profile=[[top,-.015],[top-.01,-.004],[bottom+.09,extension*.6],[bottom+.075,extension],[bottom+.065,extension*.9],[bottom+.06,-.02],[top-.05,-.029]];
 else if(style==='bunny')profile=[[top,-.015],[top-.01,-.004],[top-.03,extension],[bottom+.03,extension],[bottom+.012,extension*.8],[bottom+.01,-.02],[top-.05,-.029]];
 else if(style==='soyuz'){const ledge=st.ledge[rarity];profile=[[top,-.015],[top-.01,-.004],[top-.03,extension*.9],[bottom+.04,extension],[bottom+.032,extension+ledge],[bottom,extension+ledge],[bottom,-.02],[top-.05,-.029]];}
 else profile=[[top,-.015],[top-.012,-.006],[top-.03,extension*.15],[bottom+.075,extension*.45*step],[bottom+.062,extension*.85],[bottom+.02,extension],[bottom+.006,extension*.93],[bottom,extension*.65],[bottom,-.023],[top-.05,-.029]];
 return sweep(racing?24:40,profile.length,(u,j)=>{
  const x=(2*u-1)*half,wx=x+(fit.axleOffset||0),y=profile[j][0];
  return [x,y,side*(bodyWidthAt(fit,wx,Math.max(y,floor+.085))+profile[j][1])];
 },side<0);
}
export function buildSculptedSkirts({car,fit,rarity,flareRarity,partId,kit,add,paint,dark,racing,drop=0,style=null}){rarity=kitTier(rarity);flareRarity=kitTier(flareRarity);
 const stock=car.getObjectByName('StockSkirts');if(stock)stock.visible=false;
 const group=new T.Group();group.name='Kit_skirts';group.userData.partId=partId;group.position.x=fit.axleOffset||0;kit.add(group);
 const floor=fit.body?.floor||.245,bottom=kitClearance(fit,rarity)+drop,inner=fit.radius+.035+drop,half=fit.wheelbase/2-inner-.012;
 for(const side of [-1,1]){
  add(group,'Sculpted sill',skirtGeometry(fit,side,rarity,flareRarity,racing,false,drop,style),paint,[0,0,0]);
  if(style==='rally'){
   // Труба-слайдер на двух-трёх кронштейнах; c обычной редкости только порог.
   if(rarity>0){const ext=SKIRT_STYLES.rally.ext[rarity],z=bodyWidthAt(fit,fit.axleOffset||0,floor+.1)+ext+.02,rad=.018+rarity*.004,tube=add(group,'Rock slider',new T.CylinderGeometry(rad,rad,half*2*.92,8,1),dark,[0,bottom+rad+.002,side*z]);tube.rotation.z=Math.PI/2;
    for(const k of [-.6,0,.6].slice(rarity>=2?0:1,rarity>=2?3:2))add(group,'Slider bracket',new T.BoxGeometry(.03,.05,.05),dark,[k*half,bottom+.04,side*(z-.03)]);}
  }else if((rarity>0||style==='bunny')&&style!=='soyuz')add(group,'Rolled sill lip',skirtGeometry(fit,side,rarity,flareRarity,racing,true,drop,style),dark,[0,0,0]);
  // Заклёпки: канард на переднем торце доски с эпической.
  if(style==='bunny'&&rarity>=2){const x=-half+.05,z=bodyWidthAt(fit,x+(fit.axleOffset||0),floor+.1)+.06;const fin=add(group,'Sill canard',new RoundedBoxGeometry(.09,.04,.11,1,.003),dark,[x,bottom+.05,side*z]);fin.rotation.y=-side*.3;}
  // Legendary: a small winglet ahead of the rear arch, angled out for the drift look.
  if(rarity===3&&style!=='rally'){const x=fit.wheelbase/2-fit.radius-drop-.17,y=bottom+.035,z=bodyWidthAt(fit,x+(fit.axleOffset||0),floor+.1)+.05;const wing=add(group,'Sill winglet',new RoundedBoxGeometry(.11,.05,.10,1,.004),dark,[x,y,side*z]);wing.rotation.y=side*.28;}
 }
 return group;
}
