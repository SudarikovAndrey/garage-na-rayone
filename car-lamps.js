// Где на самом деле стоят фонари машины. Считается по треугольникам линз, а не по общему габариту:
// общий габарит всех «Amber lens» — это коробка во всю машину, и лампа на её углу (−0.1 по длине, +0.14 вбок)
// оказывается на крыле рядом с фонарём, а не в нём.

// Треугольники мешей в системе root: центр, площадь, нормаль.
function triangles(T,root,meshes){
 root.updateWorldMatrix(true,true);
 const inverse=root.matrixWorld.clone().invert(),out=[],a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),n=new T.Vector3();
 for(const mesh of meshes){
  const g=mesh.geometry,pos=g.attributes.position,idx=g.index,m=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);
  const count=idx?idx.count:pos.count,at=i=>idx?idx.getX(i):i;
  for(let i=0;i+2<count;i+=3){
   a.fromBufferAttribute(pos,at(i)).applyMatrix4(m);b.fromBufferAttribute(pos,at(i+1)).applyMatrix4(m);c.fromBufferAttribute(pos,at(i+2)).applyMatrix4(m);
   n.subVectors(c,b).cross(new T.Vector3().subVectors(a,b));const area=n.length()/2;if(area<1e-9)continue;
   out.push({centre:new T.Vector3().add(a).add(b).add(c).divideScalar(3),area,normal:n.clone().normalize()});
  }
 }
 return out;
}
// Центр кластера и наружная нормаль (от центра машины). Треугольники смотрят то внутрь, то наружу — усредняем
// по модулю, развернув каждую нормаль наружу.
function cluster(T,tris,centreY){
 if(!tris.length)return null;
 const p=new T.Vector3(),n=new T.Vector3(),out=new T.Vector3();let w=0;
 for(const t of tris){p.addScaledVector(t.centre,t.area);w+=t.area;}
 p.divideScalar(w);
 for(const t of tris){out.set(t.centre.x,t.centre.y-centreY,t.centre.z);n.addScaledVector(t.normal,(t.normal.dot(out)<0?-1:1)*t.area);}
 return {position:p,normal:n.lengthSq()>1e-12?n.normalize():new T.Vector3(Math.sign(p.x)||1,0,0)};
}

// Четыре угла поворотников в системе root, порядок (sx>0?1:0)+(sz>0?2:0) — как в bindIndicators.
// Берём только крайние по длине треугольники в своём углу: боковой повторитель на крыле мигает тем же
// материалом, но своей лампы у него нет (в гараже ровно 4 точечных источника под поворотники).
export function lensCorners(T,root,meshes,{lift=.05}={}){
 const tris=triangles(T,root,meshes);if(!tris.length)return null;
 const y=tris.reduce((s,t)=>s+t.centre.y,0)/tris.length,corners=[];
 for(let k=0;k<4;k++){
  const sx=k&1?1:-1,sz=k&2?1:-1,mine=tris.filter(t=>Math.sign(t.centre.x)===sx&&Math.sign(t.centre.z)===sz);
  if(!mine.length){corners.push(null);continue;}
  const edge=Math.max(...mine.map(t=>Math.abs(t.centre.x)));
  const c=cluster(T,mine.filter(t=>Math.abs(t.centre.x)>edge-.3),y);
  corners.push(c&&c.position.clone().addScaledVector(c.normal,lift));
 }
 return corners;
}

// Центры двух фар в мировых координатах: стекло фар часто один меш на обе стороны, делим по знаку z машины.
export function headCentres(T,car,meshes){
 const tris=triangles(T,car,meshes);if(!tris.length)return null;
 const sides=[-1,1].map(s=>cluster(T,tris.filter(t=>Math.sign(t.centre.z)===s),0));
 if(sides.some(s=>!s))return null;
 return sides.map(s=>car.localToWorld(s.position.clone()));
}
