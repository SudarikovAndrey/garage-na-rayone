import * as T from 'three';
// Small spatial batches let a narrow camera skip off-screen yards. Shadow proxies
// remain independent: buildings outside the picture can still shade the road.
export class MobileScenery{
 constructor(){this.items=[];this.frustum=new T.Frustum();this.matrix=new T.Matrix4();this.box=new T.Box3();this.stats={total:0,visible:0,culled:0};}
 register(group){for(const mesh of group.children){if(!mesh.isMesh||mesh.castShadow)continue;mesh.geometry.computeBoundingBox();this.items.push({mesh,bounds:mesh.geometry.boundingBox.clone()});}}
 prepare(camera){camera.updateMatrixWorld();this.matrix.copy(camera.projectionMatrix);this.matrix.elements[0]*=.90;this.matrix.elements[5]*=.90;this.matrix.multiply(camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.matrix);let visible=0;
  for(const {mesh,bounds} of this.items){mesh.updateWorldMatrix(true,false);this.box.copy(bounds).applyMatrix4(mesh.matrixWorld);const inFrame=this.frustum.intersectsBox(this.box);mesh.visible=(mesh.material.userData.industrial?mesh.visible:true)&&inFrame;if(mesh.visible&&mesh.parent.visible)visible++;}
  Object.assign(this.stats,{total:this.items.length,visible,culled:this.items.length-visible});
 }
}
export function sceneryCell(geometry){geometry.computeBoundingBox();const b=geometry.boundingBox,x=(b.min.x+b.max.x)/2,z=(b.min.z+b.max.z)/2;return (x<-4?'left':x>4?'right':'road')+':'+Math.floor((z+30)/20);}
