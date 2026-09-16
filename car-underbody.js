import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Authored in the fleet's local frame: nose -X, up Y. All pieces are closed solids.
// Two batches keep the same underside on both garage models and race LODs.
export function buildUnderbody(fit){
 const {length:L=4,width:W=1.65,wheelbase:wb=2.46,radius:R=.292,axleOffset:axle=0}=fit;
 const floor=fit.body?.floor??.245,front=-wb/2+axle,rear=wb/2+axle,ends=L*.45;
 const dark=[],steel=[],group=new T.Group();group.name='CarUnderbody';
 const box=(list,size,p)=>list.push(new T.BoxGeometry(...size).translate(...p));
 const tube=(list,a,b,r)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),d=end.clone().sub(start);const g=new T.CylinderGeometry(r,r,d.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());list.push(g);};
 const outline=[[-ends,W*.35],[front-R*.85,W*.34],[front+R*.85,W*.34],[front+R+.10,W*.45],[rear-R-.10,W*.45],[rear-R*.85,W*.34],[rear+R*.85,W*.34],[ends,W*.35]];
 const shape=new T.Shape();shape.moveTo(...outline[0]);for(const p of outline.slice(1))shape.lineTo(...p);for(const [x,z] of [...outline].reverse())shape.lineTo(x,-z);shape.closePath();
 dark.push(new T.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false,steps:1}).rotateX(Math.PI/2).translate(0,floor+.025,0));
 for(const z of [-W*.27,W*.27])box(dark,[L*.78,.075,.095],[0,floor-.045,z]);
 for(const x of [front+.25,0,rear-.25])box(dark,[.10,.065,W*.74],[x,floor-.04,0]);
 // Stamped ribs, sump, transmission tunnel and fuel tank catch light when overturned.
 for(let x=front+.55;x<rear-.3;x+=.22)for(const z of [-W*.18,W*.18])box(steel,[.035,.016,W*.19],[x,floor-.04,z]);
 box(steel,[.48,.08,.43],[fit.id==='smz'?rear:front+.18,floor-.055,0]);
 if(fit.drive!==0){tube(steel,[front+.4,floor-.055,0],[rear,floor-.055,0],.037);box(dark,[.26,.105,.29],[rear,floor-.06,0]);}
 box(dark,[.43,.09,W*.42],[rear-.18,floor-.065,W*.13]);
 for(const x of [front,rear])tube(dark,[x,R,-W*.42],[x,R,W*.42],.045);
 const ez=-W*.28; tube(steel,[front+.2,floor-.08,ez],[L*.42,floor-.08,ez],.027);
 box(steel,[.5,.085,.18],[rear-.1,floor-.065,ez]);
 for(const [name,gs,color,roughness] of [['Underbody_Chassis',dark,0x303333,.83],['Underbody_Mechanical',steel,0x74776e,.62]]){
  const geometries=gs.map(g=>{const n=g.index?g.toNonIndexed():g;return n;});
  const geometry=mergeGeometries(geometries);for(const g of new Set([...gs,...geometries]))g.dispose();
  const material=new T.MeshStandardMaterial({color,metalness:.55,roughness});material.name=name;
  const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
 }
 return group;
}
