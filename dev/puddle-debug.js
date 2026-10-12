import * as T from 'three';
import {ringDelta,wrap} from '../puddle-layout.js';
// Diagnostic geometry exists only in this dev page and is invisible/off by default.
export function createPuddleDebug(water,moving){
 if(!water)return {set(){},text:()=> 'Лужи отключены в ясную погоду'};
 const c=water.layout.config,material=new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.85,depthWrite:false}),lines=[];
 const circle=(pos,col,x,z,rx,rz,color)=>{for(let i=0;i<48;i++)for(const a of [i/48*Math.PI*2,(i+1)/48*Math.PI*2]){pos.push(x+Math.cos(a)*rx,.07,z+Math.sin(a)*rz);col.push(...color);}};
 for(let k=0;k<c.span/c.segmentLength;k++){
  const pos=[],col=[];
  for(const z of water.layout.zones)if(Math.floor(wrap(z.d+30,c.span)/60)===k)circle(pos,col,z.x,ringDelta(k*60,z.d,c.span),z.width,z.length*.65,[.03,.4,1]);
  for(const cl of water.layout.clusters)if(Math.floor(wrap(cl.d+30,c.span)/60)===k){const z=ringDelta(k*60,cl.d,c.span);circle(pos,col,cl.x,z,cl.exclusion,cl.exclusion,[1,1,1]);circle(pos,col,cl.x,z,.12,.12,[1,.25,0]);}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new T.Float32BufferAttribute(col,3));
  const mesh=new T.LineSegments(geometry,material);mesh.name='PuddleDebug';mesh.visible=false;mesh.renderOrder=8;moving[k].obj.add(mesh);lines.push(mesh);
 }
 return {set(on){water.uniforms.wetDebug.value=on?1:0;for(const l of lines)l.visible=on;},text(){const s=water.layout.stats;return `Цикл ${c.span} м · зоны ${s.zones} · группы ${s.clusters}\nКрупные ${s.large} · средние ${s.medium} · мелкие ${s.small} · капли ${s.tiny}\nБордюр ${s.curb} · колея ${s.rut}\nФормы ${s.total} → meshes ${water.batches.length} · water draws ${water.drawCalls||0}\nСиний фон — влажность · белые окружности — exclusion\nОранжевый — основные · жёлтый — вторичные · зелёный — спутники\nГолубой — бордюр · фиолетовый — колея`;},dispose(){for(const l of lines){l.removeFromParent();l.geometry.dispose();}material.dispose();}};
}
