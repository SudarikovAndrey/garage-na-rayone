import * as T from 'three';
// One lower datum for a matching pair of bumpers and sills, in metres.
export function kitClearance(fit,rarity){
 const floor=fit.body?.floor||.245;
 return [Math.max(.25,floor-.035),Math.max(.20,floor-.13),.15,.105][rarity];
}
export function fitBumperHeight(end,clearance){
 // Keep the upper attachment on the body; lengthen the apron down to the kit datum.
 let minimum=Infinity;
 end.traverse(o=>{if(!o.isMesh)return;o.updateMatrix();o.geometry.applyMatrix4(o.matrix);o.position.set(0,0,0);o.rotation.set(0,0,0);o.scale.set(1,1,1);o.updateMatrix();const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)minimum=Math.min(minimum,a.getY(i));});
 const top=.065,target=clearance-end.position.y,scale=(top-target)/(top-minimum);
 end.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)if(a.getY(i)<top)a.setY(i,top-(top-a.getY(i))*scale);a.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();});
 end.userData.clearance=clearance;
}
