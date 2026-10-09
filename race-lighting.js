import {StreetSurfaceLight} from './street-surface-light.js';
import * as T from 'three';
import {lightingConfig,STREET_LIGHTING,headlightColor} from './lighting-state.js';

// Reuses the scene's sun, hemisphere, PBR materials and RaceShadowCascades.
// Pool objects survive environment/weather changes. Only parameters change.
export class RaceLighting{
 constructor(scene,cfg,{sun,hemi,sky,shadows}){
  Object.assign(this,{scene,cfg,sun,hemi,sky,shadows,lamps:[],emissives:[],roadMaterials:[],poolMeshes:[],quality:'balanced',sourceId:null,started:false,transition:0,reflectionDirty:false});
  this.surface=new StreetSurfaceLight();this.gridDirty=true;
  this.target=lightingConfig(cfg);this.current={...this.target};this.current.direction=new T.Vector3(...this.target.direction).normalize();
  this.colors={};for(const k of ['sky','fog','sun','fill','ground'])this.colors[k]=new T.Color(this.target[k]);
  this.street=[];for(let i=0;i<4;i++){const light=new T.SpotLight(STREET_LIGHTING.color,0,23,.88,.78,2);light.name='StreetPool_'+i;light.shadow.bias=-.00005;light.shadow.normalBias=.025;light.shadow.camera.near=.3;light.shadow.focus=1;scene.add(light,light.target);this.street.push(light);}
  this.headlights=[];for(let car=0;car<2;car++)for(const side of [-1,1]){const light=new T.SpotLight(0xffdeb5,0,45,.36,.82,2);light.name='VehicleHeadlight_'+car+'_'+side;light.castShadow=false;scene.add(light,light.target);this.headlights.push({light,car,side});}
  this.vehicleMaterials=new WeakMap();this.headPositions=Array.from({length:4},()=>new T.Vector3());
  this.scratch=new T.Vector3();this.probe=null;this.setQuality({name:'balanced'});
 }
 registerLamp(group,x,y,z){const lamp={id:this.lamps.length,group,x,y,z,world:new T.Vector3(),score:0};this.lamps.push(lamp);this.gridDirty=true;return lamp;}
 registerEmissive(material,intensity){this.emissives.push({material,intensity});}
 setQuality(q){this.quality=q.name||'balanced';const n=STREET_LIGHTING.shadow[this.quality]||1024,s=this.street[0].shadow;if(s.mapSize.x!==n){s.map?.dispose();s.map=null;s.mapSize.set(n,n);}}
 setEnvironment(name,duration=1.4){this.change(lightingConfig(this.cfg,name,this.target.weatherState),duration);}
 setWeather(name,duration=1.2){this.change(lightingConfig(this.cfg,this.target.environmentState,name),duration);}
 change(target,duration){this.target=target;this.transition=Math.max(0,duration);Object.assign(this.cfg,target);this.onWeatherChange?.(target);this.reflectionDirty=true;}
 apply(dt){
  const a=this.started&&this.transition>0?1-Math.exp(-dt*5):1;
  for(const k of ['intensity','ambient','environment','fogDensity','exposure','street','headlights','wet','rain','clouds','sceneryDetail','contactDensity','hazeStart','hazeEnd'])this.current[k]+=(this.target[k]-this.current[k])*a;
  this.scratchColor??=new T.Color();for(const k of Object.keys(this.colors)){this.scratchColor.set(this.target[k]);this.colors[k].lerp(this.scratchColor,a);}
  this.scratch.fromArray(this.target.direction).normalize();this.current.direction.lerp(this.scratch,a).normalize();
  this.shadows.setDirection(this.current.direction);this.sun.color.copy(this.colors.sun);this.scene.userData.baseSun=this.current.intensity;this.sun.intensity=this.current.intensity+(this.scene.userData.lightning||0);
  this.sun.position.copy(this.sun.target.position).addScaledVector(this.current.direction,450);this.sun.updateMatrixWorld();
  this.shadows.near.position.copy(this.sun.position);this.shadows.near.target.position.copy(this.sun.target.position);this.shadows.near.updateMatrixWorld();this.shadows.near.target.updateMatrixWorld();
  this.shadows.haze.raceHazeRange.value.set(this.current.hazeStart,this.current.hazeEnd);
  this.shadows.contact.raceContactDensity.value=this.current.contactDensity;
  this.hemi.color.copy(this.colors.fill);this.hemi.groundColor.copy(this.colors.ground);this.hemi.intensity=this.current.ambient;
  this.scene.background.copy(this.colors.sky);this.scene.fog.color.copy(this.colors.fog);this.scene.fog.density=this.current.fogDensity;this.scene.environmentIntensity=this.current.environment;
  const u=this.sky.material.uniforms;u.sky.value.copy(this.colors.sky);u.horizon.value.copy(this.colors.fog);u.sun.value.copy(this.colors.sun);u.power.value=this.current.intensity;u.sunDir.value.copy(this.current.direction);u.night.value=this.current.street;u.clouds.value=this.current.clouds;
  for(const {material,intensity} of this.emissives)material.emissiveIntensity=intensity*this.current.street;
  for(const o of this.poolMeshes)o.visible=!this.surface.enabled&&this.current.street>.015;
  this.transition=Math.max(0,this.transition-dt);
 }
 update(dt=1/60){
  if(this.gridDirty){this.surface.configure(this.lamps);this.gridDirty=false;}
  this.apply(dt);const actors=this.scene.children.filter(o=>o.userData.racing&&o.visible),actor=actors[0];
  const origin=actor?.position||this.scratch.set(-1.9,0,0),candidates=[];
  for(const l of this.lamps){l.world.set(l.x+l.group.position.x,l.y,l.z+l.group.position.z);l.score=(l.world.x-origin.x)**2+(l.world.z-origin.z)**2;if(l.group.visible&&l.score<180**2)candidates.push(l);}
  candidates.sort((a,b)=>a.score-b.score);
  const active=STREET_LIGHTING.count[this.quality]||3,selected=candidates.slice(0,active);
  let main=selected[0],previous=selected.find(l=>l.id===this.sourceId);
  if(previous&&main&&previous.score<main.score*1.25+12)main=previous;
  this.sourceId=main?.id??null;
  const ordered=main?[main,...selected.filter(l=>l!==main)]:[];
  // At the pool boundary the incoming and outgoing fixtures both have zero
  // weight. Fade energy there; never animate a source between physical lamps.
  const boundary=candidates[active]?Math.sqrt(candidates[active].score):Infinity;
  for(let i=0;i<4;i++){
   const light=this.street[i],source=ordered[i];light.visible=!!source&&this.current.street>.35&&(!this.surface.enabled||i===0);
   if(!light.visible){light.intensity=0;light.userData.source=null;continue;}
   light.position.copy(source.world);light.userData.source=source.id;
   const weight=Number.isFinite(boundary)?1-T.MathUtils.smoothstep(Math.sqrt(source.score),Math.max(0,boundary-STREET_LIGHTING.fadeDistance),boundary):1;
   light.target.position.set(source.world.x,0,source.world.z);
   // One zero-energy light carries the local shadow; the surface equations
   // provide the same illumination for every fixture, near and far.
   light.intensity=this.surface.enabled?0:STREET_LIGHTING.intensity*this.current.street*weight;
   light.updateMatrixWorld();light.target.updateMatrixWorld();
  }
  this.surface.update(this.scene.userData.raceTravel||0,this.current.street,main);
  const night=this.current.street>.6&&!!main;this.shadows.setMainSource(night?this.street[0]:null);
  this.sun.shadow.intensity=1-T.MathUtils.smoothstep(this.current.street,.2,.6);this.shadows.near.shadow.intensity=this.sun.shadow.intensity;this.street[0].shadow.intensity=T.MathUtils.smoothstep(this.current.street,.6,1)*.9;
  for(let i=0;i<this.headlights.length;i++){
   const {light,car,side}=this.headlights[i],model=actors[car];light.visible=!!model&&this.current.headlights>.3;
   if(!model){light.intensity=0;continue;}
   const u=model.userData,half=(u.carLength||4)/2,color=headlightColor(u.headlightTemperature||3900);light.color.setRGB(...color);
   // Source and aim use the actual body yaw; a pitched chassis cannot tilt the road beam into the sky.
   this.scratch.set(-half,u.lampY||.64,side*(u.carWidth||1.7)*.36).applyAxisAngle(T.Object3D.DEFAULT_UP,model.rotation.y).add(model.position);light.position.copy(this.scratch);
   this.scratch.set(-half-13,-model.position.y,side*(u.carWidth||1.7)*.36).applyAxisAngle(T.Object3D.DEFAULT_UP,model.rotation.y).add(model.position);light.target.position.copy(this.scratch);light.intensity=360*this.current.headlights;
   light.updateMatrixWorld();light.target.updateMatrixWorld();this.headPositions[i].copy(light.position);
   if(side<0){
    let materials=this.vehicleMaterials.get(model);if(!materials){materials={head:[],tail:[]};model.traverse(o=>{for(const m of [].concat(o.material||[])){this.surface.attach(m);if(!m?.emissive)continue;if(/headlight/i.test(m.name))materials.head.push(m);if(/^Red lens/i.test(m.name))materials.tail.push(m);}});this.vehicleMaterials.set(model,materials);}
    for(const m of materials.head){m.emissive.copy(light.color);m.emissiveIntensity=.10+this.current.headlights*1.65;}
    for(const m of materials.tail)if(m.emissiveIntensity<=1)m.emissiveIntensity=.10+this.current.street*.5;
    const tail=Math.max(.10,...materials.tail.map(m=>m.emissiveIntensity||0));
    u.groundLight?.setAmbient(.26+this.current.street*.74);
    u.groundLight?.setBeam(this.current.headlights*.3);u.groundLight?.setTail(tail*(.20+this.current.wet*.32));
    const beam=u.groundLight?.beamUniforms;if(beam)beam.beamColor.value.copy(light.color).multiplyScalar(.34);
   }
  }
  const water=this.scene.userData.wetRoad;if(water){water.cfg=this.cfg;water.uniforms.waterRain.value=this.current.rain;water.uniforms.waterNight.value=this.current.street;water.uniforms.waterAmount.value=Math.min(1,this.current.wet*5);}
  this.onMaterialUpdate?.(this.current);this.started=true;
 }
 stats(renderer){const all=[...this.street,...this.headlights.map(p=>p.light),this.sun,this.shadows.near];return {environment:this.target.environmentState,weather:this.target.weatherState,wetness:+this.current.wet.toFixed(2),streetLights:this.street.filter(l=>l.visible).length,streetFixtures:this.surface.enabled&&this.current.street>.35?this.lamps.length:0,headlights:this.headlights.filter(p=>p.light.visible&&p.light.intensity>.01).length,shadowLights:all.filter(l=>l.castShadow&&l.visible).length,main:this.shadows.mainSource?.name||'Sun',shadowResolution:this.shadows.mainSource?this.street[0].shadow.mapSize.x:this.sun.shadow.mapSize.x,drawCalls:renderer?.info.render.calls||0,triangles:renderer?.info.render.triangles||0};}
 dispose(){for(const light of [...this.street,...this.headlights.map(p=>p.light)]){light.shadow?.map?.dispose();light.removeFromParent();light.target.removeFromParent();light.dispose();}this.probe?.dispose();}
}
