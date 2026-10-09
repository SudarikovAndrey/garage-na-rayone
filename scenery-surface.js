import * as T from 'three';
// Static contact field for the 480 m scenery ring. One R8 texture, no render pass.
export class ScenerySurface{
 constructor(){
  this.width=128;this.height=512;this.footprints=[];
  this.uniforms={sceneryContact:{value:null},sceneryTravel:{value:0},sceneryDetail:{value:0}};
  this.materials=new WeakSet();
 }
 bake(geometry,object,collect=true){
  const p=new T.Vector3().setFromMatrixPosition(object.matrixWorld);
  const hash=Math.sin(p.x*12.9898+p.y*7.19+p.z*3.719)*43758.5453;
  const tone=hash-Math.floor(hash);
  geometry.setAttribute('sceneryTone',new T.Uint8BufferAttribute(new Uint8Array(geometry.attributes.position.count).fill(Math.round(tone*255)),1,true));
  if(!collect||object.geometry.type!=='BoxGeometry')return;
  object.geometry.computeBoundingBox();const b=object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld),s=b.getSize(new T.Vector3());
  if(b.min.y<.3&&s.y>2&&s.x>2.5&&s.z>2.5)this.footprints.push({x:(b.min.x+b.max.x)/2,z:(b.min.z+b.max.z)/2,hx:s.x/2,hz:s.z/2});
 }
 build(){
  const data=new Uint8Array(this.width*this.height),reach=2;
  // Union, not accumulation: adjoining buildings cannot produce black seams.
  for(const p of this.footprints){
   const lo=Math.max(0,Math.floor((p.x-p.hx-reach+50)/100*this.width)),hi=Math.min(this.width-1,Math.ceil((p.x+p.hx+reach+50)/100*this.width));
   const z0=Math.floor((p.z-p.hz-reach)/480*this.height),z1=Math.ceil((p.z+p.hz+reach)/480*this.height);
   for(let row=z0;row<=z1;row++)for(let col=lo;col<=hi;col++){
    const dx=Math.max(0,Math.abs((col+.5)/this.width*100-50-p.x)-p.hx),dz=Math.max(0,Math.abs((row+.5)/this.height*480-p.z)-p.hz);
    const t=Math.max(0,1-Math.hypot(dx,dz)/reach),v=Math.round(150*t*t*(3-2*t));
    const i=((row%this.height+this.height)%this.height)*this.width+col;data[i]=Math.max(data[i],v);
   }
  }
  this.texture=new T.DataTexture(data,this.width,this.height,T.RedFormat);
  Object.assign(this.texture,{wrapS:T.ClampToEdgeWrapping,wrapT:T.RepeatWrapping,generateMipmaps:true,minFilter:T.LinearMipmapLinearFilter,magFilter:T.LinearFilter});this.texture.needsUpdate=true;
  this.uniforms.sceneryContact.value=this.texture;
 }
 attach(material){
  if(this.materials.has(material)||!material.isMeshStandardMaterial||material.userData.raceContactReceiver||material.emissiveIntensity>0||material.roughness<.65||material.metalness>.2)return;
  this.materials.add(material);material.userData.scenerySurface=true;
  const previous=material.onBeforeCompile,key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{
   previous.call(material,shader,renderer);Object.assign(shader.uniforms,this.uniforms);
   shader.vertexShader='attribute float sceneryTone; varying float vSceneryTone; varying vec3 vSceneryWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nvSceneryWorld=(modelMatrix*vec4(transformed,1.)).xyz;vSceneryTone=sceneryTone;');
   shader.fragmentShader='varying float vSceneryTone; varying vec3 vSceneryWorld; uniform sampler2D sceneryContact; uniform float sceneryTravel,sceneryDetail;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    // Leave road markings/covers alone. All variation is anchored to the moving world.
    float sceneryAmount=sceneryDetail*smoothstep(3.8,4.2,abs(vSceneryWorld.x));
    float groundMix=1.-smoothstep(.1,.6,vSceneryWorld.y);
    vec2 sceneryXZ=vec2(vSceneryWorld.x,vSceneryWorld.z-sceneryTravel);
    float groundTone=.88+.06*sin(sceneryXZ.x*.27+sin(sceneryXZ.y*.157079633))+.04*sin(sceneryXZ.y*.314159265);
    float surfaceTone=mix(.77+.20*vSceneryTone,groundTone,groundMix);
    diffuseColor.rgb*=mix(1.,surfaceTone,sceneryAmount);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
    float foundation=(1.-groundMix)*(1.-smoothstep(.1,1.8,vSceneryWorld.y))*.25;
    float groundContact=0.;
    if(sceneryAmount>.001&&vSceneryWorld.y<1.1)groundContact=texture2D(sceneryContact,vec2(vSceneryWorld.x/100.+.5,(vSceneryWorld.z-sceneryTravel)/480.)).r;
    float sceneryAO=1.-sceneryAmount*max(foundation,groundContact*(1.-smoothstep(.15,1.1,vSceneryWorld.y)));
    reflectedLight.indirectDiffuse*=sceneryAO;
    reflectedLight.indirectSpecular*=sceneryAO;`);
  };
  material.customProgramCacheKey=()=>key+'-scenery-surface-v1';
 }
 update(travel){this.uniforms.sceneryTravel.value=((travel%480)+480)%480;}
 dispose(){this.texture?.dispose();}
}
