import * as T from 'three';
import {renderScale} from './render-quality.js';
// Only the car lacquer uses the extended physical shader. Concrete/rubber never carry clearcoat.
export function pbrMaterial(source,car=false){
 const n=source.name||'',lacquer=car&&/^Paint/.test(n);const m=lacquer?new T.MeshPhysicalMaterial():new T.MeshStandardMaterial();T.MeshStandardMaterial.prototype.copy.call(m,source);m.name=n;
 if(lacquer){m.defines.PHYSICAL='';m.metalness=.28;m.roughness=.29;m.clearcoat=1;m.clearcoatRoughness=.12;m.envMapIntensity=1.05;}
 else if(/smoked glass/i.test(n)){m.color.set(0x25363e);m.metalness=.12;m.roughness=.075;m.envMapIntensity=1.65;}
 else if(/aluminium|steel|chrome|brass/i.test(n)){m.metalness=/brass/i.test(n)?.8:.92;m.roughness=/Brake/.test(n)?.4:.23;}
 else if(/tyre|rubber|upholstery/i.test(n)){m.metalness=0;m.roughness=.91;}
 else if(/headlight|lens/i.test(n)){m.metalness=.12;m.roughness=.14;m.envMapIntensity=1.25;}
 else if(/brick|concrete|plywood|paper|rust/i.test(n)){m.metalness=0;m.roughness=/concrete/i.test(n)?.84:.94;}
 else if(/fresh workshop/i.test(n)){m.roughness=.30;m.metalness=.025;}
 m.side=T.FrontSide;return m;
}
export function shadowBudget(light,q,garage=false){if(!light)return;const s=light.shadow;if(s.mapSize.x!==q.shadow){s.map?.dispose();s.map=null;s.mapSize.set(q.shadow,q.shadow);}s.autoUpdate=!garage;s.needsUpdate=true;s.normalBias=garage?.025:.05;s.bias=-.00015;s.radius=2;}
// Prefiltered local lighting: capture once on scene creation, never six scene renders per frame.
export function captureEnvironment(renderer,scene,position,size=128){const pmrem=new T.PMREMGenerator(renderer),old=scene.environment;scene.environment=null;const target=pmrem.fromScene(scene,.045,.1,90,{size,position});scene.environment=old;pmrem.dispose();return target;}
export function outdoorEnvironment(renderer,cfg){const s=new T.Scene();s.background=new T.Color(cfg.sky);const sphere=new T.Mesh(new T.SphereGeometry(65,24,12),new T.ShaderMaterial({side:T.BackSide,uniforms:{sky:{value:new T.Color(cfg.sky)},horizon:{value:new T.Color(cfg.fog)},sun:{value:new T.Color(cfg.sun)},power:{value:cfg.intensity},sunDir:{value:new T.Vector3(...(cfg.id==='factory'?[-24,7,-30]:[12,24,-30])).normalize()}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform vec3 sky,horizon,sun;uniform float power;uniform vec3 sunDir;void main(){vec3 d=normalize(v);float h=smoothstep(-.08,.8,d.y);vec3 c=mix(horizon,sky,h);float spot=pow(max(dot(d,sunDir),0.),160.);c+=sun*spot*power*3.;if(d.y<-.05)c*=.16;gl_FragColor=vec4(c,1.);}'}));s.add(sphere);const geo=new T.BoxGeometry(1,1,1),mat=new T.MeshBasicMaterial({color:cfg.night?0x060a10:0x3b4545});for(let i=0;i<12;i++){const a=i/12*Math.PI*2,o=new T.Mesh(geo,mat);o.position.set(Math.sin(a)*22,2,Math.cos(a)*22);o.scale.set(5,5+i%3*2,5);s.add(o);}const rt=captureEnvironment(renderer,s,new T.Vector3(0,1.3,0));sphere.geometry.dispose();sphere.material.dispose();geo.dispose();mat.dispose();return rt;}
// Two draws total: HDR scene + fused edge smoothing, highlight glow and tone mapping.
export class GameRenderer{
 constructor(renderer){this.renderer=renderer;this.target=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,stencilBuffer:true/* puddles mask the mirrored cars through the stencil */});this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:this.target.texture},texel:{value:new T.Vector2(1,1)},glow:{value:.8}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`uniform sampler2D source;uniform vec2 texel;uniform float glow;varying vec2 uv0;
vec3 bright(vec2 p){vec3 c=texture2D(source,p).rgb;return c*max(0.,max(c.r,max(c.g,c.b))-1.15)/max(1.,max(c.r,max(c.g,c.b)));}
void main(){vec3 c=texture2D(source,uv0).rgb;vec3 n=texture2D(source,uv0+vec2(0.,texel.y)).rgb,s=texture2D(source,uv0-vec2(0.,texel.y)).rgb,e=texture2D(source,uv0+vec2(texel.x,0.)).rgb,w=texture2D(source,uv0-vec2(texel.x,0.)).rgb;vec3 l=vec3(.2126,.7152,.0722);float contrast=max(abs(dot(n-s,l)),abs(dot(e-w,l)));c=mix(c,(n+s+e+w)*.25,clamp(contrast*.18,0.,.32));vec3 bloom=vec3(0.);vec2 d=texel*5.;bloom+=bright(uv0+vec2(d.x,0.));bloom+=bright(uv0-vec2(d.x,0.));bloom+=bright(uv0+vec2(0.,d.y));bloom+=bright(uv0-vec2(0.,d.y));bloom+=bright(uv0+d*1.7);bloom+=bright(uv0-d*1.7);bloom+=bright(uv0+vec2(d.x,-d.y)*1.7);bloom+=bright(uv0+vec2(-d.x,d.y)*1.7);c+=bloom*.034*glow;vec2 v=uv0-.5;c*=1.-dot(v,v)*.18;gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.scene.add(this.quad);}
 resize(w,h,dpr,level,q){const scale=renderScale(w,h,dpr,level);this.renderer.setPixelRatio(scale);this.renderer.setSize(w,h,false);const x=Math.max(1,Math.floor(w*scale)),y=Math.max(1,Math.floor(h*scale));this.target.setSize(x,y);this.material.uniforms.texel.value.set(1/x,1/y);this.material.uniforms.glow.value=q.glow;}
 render(scene,camera){const r=this.renderer;r.info.reset();r.setRenderTarget(this.target);r.render(scene,camera);r.setRenderTarget(null);r.render(this.scene,this.camera);}
 dispose(){this.target.dispose();this.quad.geometry.dispose();this.material.dispose();}
}
