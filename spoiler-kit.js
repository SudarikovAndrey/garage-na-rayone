import {kitTier} from './sculpted-body-kit.js';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
// Rear wing ladder from the drift references: ducktail → low wing → GT on swan-neck struts → big GT with end plates.
// Everything hangs off the boot lip (fit.spoilerX / spoilerY) and scales with body width; never wider than the car.
export const SPOILER_BUDGET=3000;
function blade(chord,thickness,span,camber=.1){
 const s=new T.Shape();s.moveTo(-chord/2,0);s.quadraticCurveTo(-chord*.2,thickness*(1+camber*6),chord/2,thickness*.35);s.lineTo(chord/2,thickness*.05);s.quadraticCurveTo(-chord*.2,thickness*.3,-chord/2,0);
 const g=new T.ExtrudeGeometry(s,{depth:span,bevelEnabled:false,steps:1,curveSegments:8});g.translate(0,0,-span/2);g.computeVertexNormals();return g;
}
function swanNeck(height,thickness){
 // Strut rises from the boot behind the blade and hooks forward over its top surface.
 const s=new T.Shape();s.moveTo(-.09,0);s.lineTo(.01,0);s.quadraticCurveTo(.075,height*.55,.05,height+.02);s.lineTo(-.08,height+.02);s.lineTo(-.08,height-.01);s.lineTo(.015,height-.01);s.quadraticCurveTo(.03,height*.5,-.09,0);
 const g=new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false,steps:1,curveSegments:6});g.translate(0,0,-thickness/2);g.computeVertexNormals();return g;
}
function ducktail(height,depth,span){
 const s=new T.Shape();s.moveTo(-depth,0);s.quadraticCurveTo(-depth*.25,height*.35,.02,height);s.lineTo(.035,height*.92);s.lineTo(.035,0);
 const g=new T.ExtrudeGeometry(s,{depth:span,bevelEnabled:false,steps:1,curveSegments:8});g.translate(0,0,-span/2);g.computeVertexNormals();return g;
}
// Стили: Дрифт (null) — утиный хвост → GT на лебединых стойках; Кольцо — губа багажника → туринг-крыло на торцевых
// пластинах без центральных стоек; Ралли — полка → рамка с плавниками → двухэтажное крыло; Заклёпки — хвост с
// рёбрами и болтами → плоское крыло на прямых высоких пилонах.
export function buildSpoilerKit({car,fit,rarity,partId,kit,add,paint,dark,style=null}){rarity=kitTier(rarity);
 const stock=car.getObjectByName('StockSpoiler');if(stock)stock.visible=false;
 const g=new T.Group();g.name='Kit_spoiler';g.position.set(fit.spoilerX??fit.length*.4,fit.spoilerY??fit.height*.8,0);g.userData.partId=partId;kit.add(g);
 const span=fit.width*[.9,.92,.95,.98][rarity],box=(name,size,pos,mat=dark)=>add(g,name,new RoundedBoxGeometry(...size,1,.004),mat,pos);
 if(style==='soyuz'){
  if(rarity===0){box('Trunk lip',[.06,.04,span],[-.01,.02,0],paint);return g;}
  const height=[0,.12,.24,.32][rarity],chord=[0,.14,.22,.25][rarity],bx=Math.min(.03,(fit.length??4)/2-(fit.spoilerX??fit.length*.4)+.012-chord/2);/* короткие кузова: крыло не свисает за корму */
  for(const z of [-span*.3,span*.3])box('Wing pylon',[.04,height,.03],[bx-.03,height/2,z],paint);
  if(rarity===1){box('Low blade',[chord,.016,span],[bx,height,0],paint);return g;}
  add(g,'Wing blade',blade(chord,.022,span,.1),paint,[bx,height,0]);
  const plate=[0,0,[.26,.12,.012],[.32,.18,.012]][rarity];for(const z of [-span/2,span/2])box('Wing endplate',plate,[bx-.01,height+plate[1]/2-.03,z-Math.sign(z)*plate[2]/2],paint);
  if(rarity===3)box('Gurney flap',[.01,.02,span*.96],[bx+chord/2-.006,height+.02,0]);
  return g;
 }
 if(style==='ring'){
  if(rarity<=1){const h=[.035,.06][rarity];box('Trunk lip',[.05,h,span],[-.01,h/2,0],paint);if(rarity===1)box('Lip edge',[.052,.01,span*.98],[-.01,h+.005,0]);return g;}
  const height=[0,0,.16,.22][rarity],chord=[0,0,.2,.24][rarity],plate=[0,0,[.26,height+.06,.012],[.32,height+.09,.012]][rarity];
  add(g,'Wing blade',blade(chord,.02,span,.12),paint,[.03,height,0]);
  for(const z of [-span/2,span/2])box('Wing endplate',plate,[.03,plate[1]/2,z-Math.sign(z)*plate[2]/2]);
  if(rarity===3)box('Gurney flap',[.01,.02,span*.96],[.03+chord/2-.006,height+.02,0]);
  return g;
 }
 if(style==='rally'){
  if(rarity===0){box('Roof shelf',[.16,.02,span],[-.02,.04,0],paint);for(const z of [-span*.4,span*.4])box('Shelf riser',[.05,.03,.04],[-.02,.015,z]);return g;}
  const height=[0,.11,.19,.26][rarity],fin=[0,[.2,.14,.015],[.24,.21,.015],[.28,.3,.015]][rarity];
  for(const z of [-span/2,span/2])box('Side fin',fin,[.0,fin[1]/2,z-Math.sign(z)*fin[2]/2]);
  box('Rally blade',[.16,.016,span-.03],[0,height,0],paint);
  if(rarity>=2)box('Lower blade',[.12,.012,span-.03],[.02,height*.5,0]);
  if(rarity===3)box('Upper deck',[.14,.014,span-.03],[-.02,height-.08,0],paint);
  return g;
 }
 if(style==='bunny'){
  add(g,'Ducktail lip',ducktail(.07,.14,span),paint,[0,0,0]);box('Duck ridge',[.02,.018,span*.96],[.024,.078,0]);
  for(let i=0;i<5+rarity;i++)box('Tail bolt',[.012,.012,.012],[-.06,.02,(i/(4+rarity)-.5)*span*.9]);
  if(rarity===0)return g;
  const height=[0,.12,.28,.34][rarity],chord=[0,.12,.22,.26][rarity];
  if(rarity===1){box('Bar wing',[chord,.015,span],[.02,height,0]);for(const z of [-span*.25,span*.25])box('Wing pylon',[.05,height,.02],[.0,height/2,z]);return g;}
  for(const z of [-span*.3,span*.3]){const pylon=box('Straight pylon',[.035,height,.02],[-.02,height/2+.02,z]);pylon.rotation.z=-.15;/* наклон не должен опускать угол ниже кромки багажника */}
  add(g,'Wing blade',blade(chord,.02,span,.08),paint,[.03,height,0]);
  const plate=[0,0,[.24,.1,.01],[.32,.16,.01]][rarity];for(const z of [-span/2,span/2])box('Wing endplate',plate,[.03,height+plate[1]/2-.02,z-Math.sign(z)*plate[2]/2]);
  if(rarity===3)box('Second blade',[.16,.012,span*.9],[.03,height*.5,0]);
  return g;
 }
 if(rarity===0){add(g,'Ducktail lip',ducktail(.07,.14,span),paint,[0,0,0]);return g;}
 const height=[0,.11,.20,.27][rarity],chord=[0,.16,.21,.25][rarity],thick=[0,.02,.022,.024][rarity];
 add(g,'Wing blade',blade(chord,thick,span,rarity===3?.14:.1),rarity>=2?dark:paint,[.03,height,0]);
 if(rarity===1)for(const z of [-span*.3,span*.3])box('Wing pedestal',[.07,height,.035],[.0,height/2,z]);
 else for(const z of [-span*.28,span*.28])add(g,'Swan-neck strut',swanNeck(height,.03),dark,[.02,0,z]);
 const plate=[0,[.17,.055,.01],[.24,.09,.01],[.30,.125,.01]][rarity];
 for(const z of [-span/2,span/2])box('Wing endplate',plate,[.03,height+plate[1]/2-thick*.6,z-Math.sign(z)*plate[2]/2]);
 if(rarity===3)box('Gurney flap',[.01,.022,span*.96],[.03+chord/2-.006,height+thick*.35+.011,0]);
 return g;
}
