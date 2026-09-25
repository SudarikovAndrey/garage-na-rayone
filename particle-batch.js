import * as T from 'three';
// One instanced draw for an entire transparent pool, never one draw per puff/ripple.
export class ParticleBatch{
 constructor(scene,count,kind,map=null,color=0xffffff){
  this.count=count;const plane=new T.PlaneGeometry(1,1),g=new T.InstancedBufferGeometry();g.index=plane.index.clone();for(const [k,v] of Object.entries(plane.attributes))g.setAttribute(k,v.clone());plane.dispose();
  this.positions=new T.InstancedBufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage);this.shapes=new T.InstancedBufferAttribute(new Float32Array(count*4),4).setUsage(T.DynamicDrawUsage);g.setAttribute('offset',this.positions);g.setAttribute('shape',this.shapes);if(kind==='ringn'){this.axes=new T.InstancedBufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage);for(let i=0;i<count;i++)this.axes.setXYZ(i,0,1,0);g.setAttribute('axis',this.axes);}g.instanceCount=count;
  const m=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:['trail','flame'].includes(kind)?T.AdditiveBlending:T.NormalBlending,uniforms:{map:{value:map},color:{value:new T.Color(color)}},defines:{KIND:kind==='smoke'?0:kind==='skid'?1:kind==='trail'?3:kind==='flame'?4:kind==='spray'?5:kind==='mist'?6:kind==='splash'?7:kind==='waterfan'?8:kind==='rubber'?9:kind==='ringn'?10:2},vertexShader:`attribute vec3 offset;attribute vec4 shape;attribute vec3 axis;varying vec2 vUv;varying float alpha;varying float shapeSeed;void main(){vUv=uv;alpha=shape.w;shapeSeed=shape.z*37.;vec2 p=position.xy*shape.xy;float c=cos(shape.z),s=sin(shape.z);float rawX=p.x;
#if KIND != 8
p=mat2(c,-s,s,c)*p;
#endif
#if KIND == 0 || KIND == 5 || KIND == 6 || KIND == 9
vec4 mvPosition=modelViewMatrix*vec4(offset,1.);mvPosition.xy+=p;
#elif KIND == 8
vec4 mvPosition=modelViewMatrix*vec4(offset+vec3(rawX*c,p.y,rawX*s),1.);
#elif KIND == 10
// Кольцо в плоскости поверхности: базис из нормали инстанса (капли по крыше — крыша скруглена, а не плоская).
vec3 n=normalize(axis);vec3 t=normalize(cross(n,abs(n.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.)));vec3 b=cross(n,t);
vec4 mvPosition=modelViewMatrix*vec4(offset+t*p.x+b*p.y,1.);
#else
vec4 mvPosition=modelViewMatrix*vec4(offset+vec3(p.x,0.,p.y),1.);
#endif
gl_Position=projectionMatrix*mvPosition;}`,fragmentShader:`uniform sampler2D map;uniform vec3 color;varying vec2 vUv;varying float alpha;varying float shapeSeed;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
void main(){vec2 p=vUv-.5;float a=alpha;vec3 tint=color;
#if KIND == 0
a*=texture2D(map,vUv).a*(.83+.17*sin(p.x*37.+sin(p.y*23.)*3.));
#elif KIND == 5
float drop=length(vec2(p.x*2.,p.y*1.6));a*=1.-smoothstep(.15,.48,drop);
#elif KIND == 6
vec2 q=vUv*vec2(4.,2.)+shapeSeed;float n=noise(q)*.65+noise(q*2.1)*.35;
float veil=exp(-p.y*p.y*18.)*(.35+.65*n);a*=veil*smoothstep(0.,.3,vUv.x)*smoothstep(0.,.3,1.-vUv.x)*smoothstep(0.,.18,vUv.y)*smoothstep(0.,.18,1.-vUv.y);
#elif KIND == 9
vec2 q=vUv*vec2(3.2,2.4)+shapeSeed;float n=noise(q)*.6+noise(q*2.03)*.28+noise(q*4.1)*.12;
vec2 warp=p+vec2(n-.5,noise(q+7.)-.5)*.23;
float cloud=exp(-dot(warp*vec2(2.9,3.5),warp*vec2(2.9,3.5)));
a*=cloud*smoothstep(.12,.64,n)*smoothstep(0.,.23,vUv.x)*smoothstep(0.,.23,1.-vUv.x)*smoothstep(0.,.23,vUv.y)*smoothstep(0.,.23,1.-vUv.y);tint*=.88+n*.18;
#elif KIND == 8
float crest=.30+.61*pow(max(0.,1.-abs(p.x)*2.),.55);
crest+=sin(vUv.x*19.+shapeSeed)*.06+sin(vUv.x*37.+shapeSeed*.6)*.02;
float sheet=smoothstep(0.,.10,vUv.y)*(1.-smoothstep(crest-.25,crest,vUv.y));
float veins=.72+.28*sin(vUv.x*19.+sin(vUv.y*13.+shapeSeed)*3.)*sin(vUv.y*29.+shapeSeed);
a*=sheet*veins*smoothstep(0.,.09,vUv.x)*smoothstep(0.,.09,1.-vUv.x);
#elif KIND == 7 || KIND == 10
float r=length(p);float ring=(1.-smoothstep(.36,.49,r))*smoothstep(.24,.36,r);float broken=smoothstep(.05,.6,sin(atan(p.y,p.x)*7.+shapeSeed));a*=ring*broken;
#elif KIND == 1
a*=(1.-smoothstep(.37,.5,abs(p.x)));
#elif KIND == 3
a*=exp(-p.x*p.x*36.)*pow(1.-vUv.y,1.6)*smoothstep(0.,.12,vUv.y);
#elif KIND == 4
float width=(1.-vUv.y)*.43+.015;
float wave=sin(vUv.y*31.+alpha*19.)*.035*vUv.y;
a*=(1.-smoothstep(width*.25,width,abs(p.x-wave)))*smoothstep(0.,.07,vUv.y)*(1.-smoothstep(.65,1.,vUv.y));
tint=mix(vec3(2.8,.28,.025),vec3(3.5,2.6,1.3),pow(1.-vUv.y,3.));
#else
float r=length(p);a*=(1.-smoothstep(.43,.5,r))*smoothstep(.32,.4,r);
#endif
if(a<.005)discard;gl_FragColor=vec4(tint,a);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});m.forceSinglePass=true;this.mesh=new T.Mesh(g,m);this.mesh.frustumCulled=false;this.mesh.renderOrder=kind==='skid'?1:3;scene.add(this.mesh);
 }
 sync(items){for(let i=0;i<this.count;i++){const o=items[i]?.m||items[i]?.o;const p=o?.position;this.positions.setXYZ(i,p?.x||0,p?.y||0,p?.z||0);this.shapes.setXYZW(i,o?.scale.x||1,o?.scale.y||1,o?.material.rotation||0,o?.visible?o.material.opacity:0);if(this.axes){const n=items[i]?.normal;this.axes.setXYZ(i,n?.x??0,n?.y??1,n?.z??0);}}this.positions.needsUpdate=this.shapes.needsUpdate=true;if(this.axes)this.axes.needsUpdate=true;}
 dispose(){this.mesh.removeFromParent();this.mesh.geometry.dispose();this.mesh.material.dispose();}
}
export function particleObject(){const o=new T.Object3D();o.visible=false;o.material={opacity:0,rotation:0};return o;}
