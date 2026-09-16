import * as T from 'three';
// A feathered, chipped repair in the road plane; shared road shading continues
// through it. No raised black boxes or unlit overlays that mask the lamp spill.
export function repairMaterial(road){
 const m=road.clone(),previous=road.onBeforeCompile,key=road.customProgramCacheKey();
 m.name='RoadRepair';m.userData.roadRepair=true;m.color.multiplyScalar(.78);m.roughness=Math.min(1,road.roughness+.045);m.transparent=true;m.depthWrite=false;m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;
 m.onBeforeCompile=(shader,renderer)=>{previous.call(m,shader,renderer);shader.vertexShader='attribute float repairAlpha;varying float vRepairAlpha;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvRepairAlpha=repairAlpha;');shader.fragmentShader='varying float vRepairAlpha;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','diffuseColor.a*=vRepairAlpha;\n#include <opaque_fragment>');};
 m.customProgramCacheKey=()=>key+'-asphalt-repair-v1';return m;
}
export function repairGeometry(rand=Math.random){
 const count=16,pos=[0,0,0],uv=[.5,.5],alpha=[.78],idx=[],rim=[];
 for(let i=0;i<count;i++){const a=i/count*Math.PI*2,c=Math.cos(a),s=Math.sin(a);rim.push([Math.sign(c)*Math.pow(Math.abs(c),.35)*(.45+rand()*.05),Math.sign(s)*Math.pow(Math.abs(s),.35)*(.45+rand()*.05)]);}
 for(const scale of [.84,1])for(const [x,z] of rim){pos.push(x*scale,0,z*scale);uv.push(x*scale+.5,z*scale+.5);alpha.push(scale===1?0:.78);}
 for(let i=0;i<count;i++){const j=(i+1)%count;idx.push(0,1+j,1+i,1+i,1+j,1+count+j,1+i,1+count+j,1+count+i);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('repairAlpha',new T.Float32BufferAttribute(alpha,1));g.setIndex(idx);g.computeVertexNormals();return g;
}
