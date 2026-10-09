import {pooledShaderMaterial} from './shader-material-pool.js';
import * as T from 'three';
import {renderScale,MOBILE_RENDER} from './render-quality.js';
import {compositeFragment} from './post-process.js';
import {applyPaintSurface} from './paint-surface.js';
import {filterShadow} from './race-shadows.js';
// Only the car lacquer uses the extended physical shader. Concrete/rubber never carry clearcoat.
export function pbrMaterial(source,car=false){
 const n=source.name||'',lacquer=car&&/^Paint/.test(n);const m=lacquer?new T.MeshPhysicalMaterial():new T.MeshStandardMaterial();T.MeshStandardMaterial.prototype.copy.call(m,source);m.name=n;
 if(lacquer){m.defines.PHYSICAL='';m.metalness=.28;m.roughness=.29;m.clearcoat=1;m.clearcoatRoughness=.12;m.envMapIntensity=1.05;applyPaintSurface(m);}
 else if(/smoked glass/i.test(n)){m.color.set(0x142023);m.metalness=0;m.roughness=.055;m.envMapIntensity=1.15;
  m.transparent=true;m.opacity=.58;m.depthWrite=false;
  // Tinted absorption with unattenuated surface reflection. No transmission buffer:
  // the existing transparent pass reveals the cabin and PMREM supplies the reflection.
  m.onBeforeCompile=function(shader){shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float glassF=pow(1.-saturate(dot(normal,normalize(vViewPosition))),5.);
   diffuseColor.a=max(diffuseColor.a,mix(.58,.96,glassF));
   vec3 glassSpecular=reflectedLight.directSpecular+reflectedLight.indirectSpecular;
   outgoingLight+=glassSpecular*(1./max(diffuseColor.a,.01)-1.);
   #include <opaque_fragment>`);};
  m.customProgramCacheKey=()=> 'tinted-glass-v1';}
 else if(/aluminium|steel|chrome|brass/i.test(n)){m.metalness=/brass/i.test(n)?.8:.92;m.roughness=/Brake/.test(n)?.4:.23;}
 else if(/tyre|rubber|upholstery/i.test(n)){m.metalness=0;m.roughness=.91;}
 else if(/headlight|lens/i.test(n)){m.metalness=.12;m.roughness=.14;m.envMapIntensity=1.25;}
 else if(/brick|concrete|plywood|paper|rust/i.test(n)){m.metalness=0;m.roughness=/concrete/i.test(n)?.84:.94;}
 else if(/fresh workshop/i.test(n)){m.roughness=.30;m.metalness=.025;}
 // Импортные модели с незамкнутыми панелями (новые Копейка и Восьмёрка) помечены extras.twoSided: им нужны обе стороны.
 m.side=car&&source.userData?.twoSided?T.DoubleSide:T.FrontSide;if(car)filterShadow(m);return m;
}
export function shadowBudget(light,q,garage=false){if(!light)return;const s=light.shadow;if(s.mapSize.x!==q.shadow){s.map?.dispose();s.map=null;s.mapSize.set(q.shadow,q.shadow);}s.autoUpdate=!garage;s.needsUpdate=true;s.normalBias=garage?.025:.05;s.bias=-.00015;s.radius=2;}
// One PMREM generator per renderer; its blur materials/source IDs survive races.
// Targets remain owned by callers. Renderer disposal releases the generator.
const environmentGenerators=new WeakMap();
export function environmentGenerator(renderer){
 let generator=environmentGenerators.get(renderer);
 if(!generator){generator=new T.PMREMGenerator(renderer);environmentGenerators.set(renderer,generator);
  const dispose=renderer.dispose.bind(renderer);renderer.dispose=()=>{generator.dispose();environmentGenerators.delete(renderer);dispose();};
 }
 return generator;
}
// Prefiltered local lighting: capture once on scene creation, never six scene renders per frame.
export function captureEnvironment(renderer,scene,position,size=128){const wet=!!scene.userData.wetRoad&&(scene.userData.lighting?.current.wet??1)>.01,pmrem=environmentGenerator(renderer),old=scene.environment;scene.environment=null;const debug=scene.userData.lighting?.debugGroup,debugVisible=debug?.visible;if(debug)debug.visible=false;const cars=scene.children.filter(o=>o.userData.racing&&o.visible);for(const car of cars)car.visible=false;/* Include the 270 m sky dome; never capture a car into its own reflection. */const target=pmrem.fromScene(scene,wet?.006:.045,.1,320,{size:wet&&!MOBILE_RENDER?Math.max(256,size):size,position});scene.environment=old;for(const car of cars)car.visible=true;if(debug)debug.visible=debugVisible;return target;}
// Небо трассы: градиент от горизонта к зениту плюс пятно солнца. Один материал и на снимок окружения, и на
// видимый купол — иначе отражения в лаке и то, что за машиной, живут по разным законам.
// Ночью (night=1) к градиенту добавляются город на горизонте — тёплое зарево и россыпь огней двумя рядами — и луна.
// Это и задний план, и то, что отражается в лаке: без огней ночной снимок окружения чёрный, и мокрая машина в нём не
// блестит вовсе — «ночной заезд очень чёрный» (Андрей, 22 сентября). Огни — хэш по азимуту, без текстур.
export const NIGHT_SKY={glow:.06,lights:1.5,moon:2.2};
export function outdoorSunDirection(cfg){return cfg.sunDirection||(cfg.look==='sunset'||cfg.id==='factory'?[-3,11,-30]:cfg.look==='dawn'?[-12,12,-30]:[12,24,-30]);}
function cloudTexture(){
 const n=128,data=new Uint8Array(n*n*4),hash=(x,y)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
 const noise=(x,y)=>{const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;};
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const v=(noise(x/20,y/20)*.68+noise(x/7,y/7)*.24+noise(x/3,y/3)*.08)*255,i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;}
 const t=new T.DataTexture(data,n,n);t.wrapS=t.wrapT=T.MirroredRepeatWrapping;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return t;
}
export function skyMaterial(cfg){
 return pooledShaderMaterial('sky-v1',{side:T.BackSide,depthWrite:false,fog:false,
  uniforms:{cloudMap:{value:cloudTexture()},clouds:{value:cfg.clouds??.25},sky:{value:new T.Color(cfg.sky)},horizon:{value:new T.Color(cfg.fog)},sun:{value:new T.Color(cfg.sun)},
   power:{value:cfg.intensity},sunDir:{value:new T.Vector3(...outdoorSunDirection(cfg)).normalize()},night:{value:cfg.night?1:0}},
  vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 v;uniform vec3 sky,horizon,sun;uniform float power;uniform vec3 sunDir;uniform float night;uniform sampler2D cloudMap;uniform float clouds;
float hash(float n){return fract(sin(n)*43758.5453);}
vec3 cityLights(vec3 d){
 float az=atan(d.x,d.z);vec3 c=vec3(0.);
 // Зарево над крышами: тёплое, тонкой полосой у самого горизонта.
 c+=vec3(.95,.55,.28)*exp(-max(d.y,0.)*38.)*smoothstep(-.06,0.,d.y)*${NIGHT_SKY.glow};
 // Два ряда огней: нижний плотнее и теплее, верхний реже. Часть окон холодные.
 for(int r=0;r<2;r++){
  float rows=float(r),n=150.+rows*90.;
  float cell=floor(az*n);float h=hash(cell*12.9898+rows*7.7);
  float y0=.004+h*.022+rows*.010,az0=(cell+.5)/n;
  float dx=(az-az0)*n*2.2,dy=(d.y-y0)*420.;
  float spot=exp(-(dx*dx+dy*dy)*2.2)*step(.28,h);
  c+=mix(vec3(1.,.72,.38),vec3(.78,.88,1.),step(.84,h))*spot*(.5+h)*${NIGHT_SKY.lights};
 }
 // Луна с мягким гало — главный блик на крыше и капоте.
 vec3 moonDir=normalize(vec3(-.35,.42,-.84));float m=max(dot(d,moonDir),0.);
 c+=vec3(.9,.95,1.)*pow(m,1400.)*${NIGHT_SKY.moon}+vec3(.55,.65,.9)*pow(m,40.)*.06;
 return c;
}
void main(){vec3 d=normalize(v);float h=smoothstep(-.08,.8,d.y);vec3 c=mix(horizon,sky,h);float mu=max(dot(d,sunDir),0.);float cloud=texture2D(cloudMap,d.xz/max(.18,d.y+.23)*.13).r;float cover=smoothstep(.68-clouds*.35,.79-clouds*.23,cloud)*smoothstep(.015,.16,d.y);vec3 cloudTint=mix(horizon,vec3(.91,.94,.97),.65)*(1.-night*.95);c=mix(c,cloudTint,cover*(1.-night*.72));float spot=smoothstep(.9994,.99985,mu);c+=sun*power*(spot*5.+pow(mu,90.)*.28+pow(mu,12.)*.025);if(night>0.)c+=cityLights(d)*night;if(d.y<-.05)c*=.16;gl_FragColor=vec4(c,1.);}`});
}
// Видимый купол над трассой. Без него за машиной оставалась плоская заливка цвета неба: на пролёте камеры после
// финиша, где объектив смотрит машине в лоб и мимо неё назад, это читалось как обрыв кадра и отсутствие заднего
// плана (Андрей, 18 сентября). Купол даёт горизонт, к которому уходит туманящаяся земля.
// Радиус меньше дальней плоскости камеры (300), глубину не пишет и рисуется первым.
export function skyDome(cfg,radius=270){
 const dome=new T.Mesh(new T.SphereGeometry(radius,24,12),skyMaterial(cfg));
 dome.name='Sky';dome.frustumCulled=false;dome.renderOrder=-10000;dome.castShadow=dome.receiveShadow=false;
 return dome;
}
export function outdoorEnvironment(renderer,cfg){const s=new T.Scene();s.background=new T.Color(cfg.sky);const sphere=new T.Mesh(new T.SphereGeometry(65,24,12),skyMaterial(cfg));s.add(sphere);const geo=new T.BoxGeometry(1,1,1),mat=new T.MeshBasicMaterial({color:cfg.night?0x060a10:0x3b4545});for(let i=0;i<12;i++){const a=i/12*Math.PI*2,o=new T.Mesh(geo,mat);o.position.set(Math.sin(a)*22,2,Math.cos(a)*22);o.scale.set(5,5+i%3*2,5);s.add(o);}const rt=captureEnvironment(renderer,s,new T.Vector3(0,1.3,0));sphere.geometry.dispose();sphere.material.uniforms.cloudMap.value.dispose();sphere.material.dispose();geo.dispose();mat.dispose();return rt;}

// Two draws total: HDR scene + fused edge smoothing, highlight glow and tone mapping.
// Собранные шейдеры живут всю сессию. three.js удаляет программу, как только её последний материал освобождён, а сцена
// заезда при выходе освобождается целиком — и каждый следующий заезд собирал 60–100 программ заново: на Redmi Note 14 Pro
// вход в заезд 8–14 с с замороженным экраном (9.10.2026). Новая программа получает лишнюю ссылку и до конца сессии
// не удаляется; потолок — чтобы редкие варианты не копились без счёта.
export const PINNED_PROGRAMS_MAX=400;
export function pinPrograms(renderer,max=PINNED_PROGRAMS_MAX){const list=renderer.info.programs;if(!list||list.pinned!==undefined)return;list.pinned=0;const push=list.push;list.push=function(...programs){for(const p of programs)if(list.pinned<max){p.usedTimes++;list.pinned++;}return push.apply(this,programs);};}
export class GameRenderer{
 constructor(renderer){this.renderer=renderer;pinPrograms(renderer);this.target=new T.WebGLRenderTarget(1,1,{type:renderer.extensions.has('EXT_color_buffer_float')?T.HalfFloatType:T.UnsignedByteType,depthBuffer:true,stencilBuffer:false/* Water uses alpha; mirrored cars are disabled. */});this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.material=new T.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{source:{value:this.target.texture},texel:{value:new T.Vector2(1,1)},glow:{value:.8},lensWater:{value:0}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:compositeFragment});this.quad=new T.Mesh(new T.PlaneGeometry(2,2),this.material);this.scene.add(this.quad);}
 resize(w,h,dpr,level,q){const scale=renderScale(w,h,dpr,level);this.renderer.setPixelRatio(scale);this.renderer.setSize(w,h,false);const x=Math.max(1,Math.floor(w*scale)),y=Math.max(1,Math.floor(h*scale));this.target.setSize(x,y);this.material.uniforms.texel.value.set(1/x,1/y);this.material.uniforms.glow.value=q.glow;}
 render(scene,camera){const lighting=scene.userData.lighting;if(lighting){const now=performance.now(),dt=Math.min(.05,(now-(lighting.lastFrameTime||now-16.7))/1000);lighting.lastFrameTime=now;lighting.update(dt);this.renderer.toneMappingExposure=lighting.current.exposure;
 if(lighting.reflectionDirty&&lighting.transition===0){lighting.reflectionDirty=false;const probe=captureEnvironment(this.renderer,scene,new T.Vector3(-1.9,1.1,-2));scene.environment=probe.texture;lighting.probe?.dispose();lighting.probe=probe;}}
 this.material.uniforms.lensWater.value=scene.userData.wetRoad?.lensSplash||0;const r=this.renderer;r.info.reset();r.setRenderTarget(this.target);r.render(scene,camera);r.setRenderTarget(null);r.render(this.scene,this.camera);}
 dispose(){this.target.dispose();this.quad.geometry.dispose();this.material.dispose();}
}
