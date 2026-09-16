import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Static geometry is batched by material and wall root. No extra shadow maps or frame loop.
const inferLevel=room=>['Stage_5_5','Stage_4_5','Stage_3_5','Stage_2_5'].findIndex(n=>room.getObjectByName(n)?.visible)>=0?5-['Stage_5_5','Stage_4_5','Stage_3_5','Stage_2_5'].findIndex(n=>room.getObjectByName(n)?.visible):1;
export function addEveningGarage(scene,room,atlas,level=inferLevel(room)){
 const textures=[],buckets=new Map(),wallMeshes=[],clusters=[];let seed=93;
 // Каждый предмет — своя группа: отдельный merged mesh на материал, чтобы его можно было прятать перед машиной.
 const cluster=(name,pos,yaw=0,scale=1)=>{const g=new T.Group();g.name=name;g.position.set(...pos);g.rotation.y=yaw;g.scale.setScalar(scale);owner.add(g);clusters.push(g);return g;};
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const mat=(color,roughness=.86,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const tile=(x,y,repeat=1)=>{const t=atlas.clone();t.repeat.set(.5,y?580/1254:674/1254);t.offset.set(x*.5,y?0:580/1254);t.needsUpdate=true;textures.push(t);return t;};
 const fabric=mat(0xb49b83),posterA=mat(0xffffff),posterB=mat(0xffffff),asphalt=mat(0x666974,.94);fabric.map=tile(0,1);posterA.map=tile(0,0);posterB.map=tile(1,0);asphalt.map=tile(1,1);
 const wood=mat(0x352719),foam=mat(0xb39555),dark=mat(0x151818,.7),rust=mat(0x603d27),steel=mat(0x555d5f,.43,.65),paper=mat(0x958266),tape=mat(0x796c3c),plaster=mat(0x938b73),black=mat(0x141719),cloth=mat(0x463d39),glass=mat(0x22453e,.22,.15);
 glass.emissive=new T.Color(0x5cba9c);glass.emissiveIntensity=.5;
 const screenLines=mat(0x253f35);screenLines.emissive=new T.Color(0x7caf8e);screenLines.emissiveIntensity=.3;
 const amber=mat(0xffbf64,.3);amber.emissive=new T.Color(0xffbc67);amber.emissiveIntensity=3;
 const owner=new T.Group();owner.name='EveningGarageProps';scene.add(owner);
 function add(geo,m,pos,rot=[0,0,0],parent=owner){const transform=new T.Matrix4().compose(new T.Vector3(...pos),new T.Quaternion().setFromEuler(new T.Euler(...rot)),new T.Vector3(1,1,1));geo.applyMatrix4(transform);const key=parent.uuid+':'+m.uuid;if(!buckets.has(key))buckets.set(key,{parent,m,geos:[]});buckets.get(key).geos.push(geo.index?geo.toNonIndexed():geo);if(geo.index)geo.dispose();}
 const box=(p,s,m,r=.015,parent=owner,rot=[0,0,0])=>add(r?new RoundedBoxGeometry(...s,2,r):new T.BoxGeometry(...s),m,p,rot,parent);
 const cyl=(a,b,r,m,parent=owner)=>{const av=new T.Vector3(...a),bv=new T.Vector3(...b),dir=bv.clone().sub(av);const g=new T.CylinderGeometry(r,r,dir.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),dir.clone().normalize()));add(g,m,av.add(bv).multiplyScalar(.5).toArray(),[0,0,0],parent);};
 // The raised slab sits in a continuous, dark courtyard rather than an empty studio.
 for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++){if(!x&&!z)continue;add(new T.PlaneGeometry(10,10),asphalt,[x*10,-.17,z*10],[-Math.PI/2,0,0]);}
 // Under the slab nothing is drawn: the floor is translucent over the mirrored car (garage-layout.js).
 for(const [w,h,x,z] of [[10,1.1,0,-4.45],[10,1.1,0,4.45],[.6,7.8,-4.7,0],[.6,7.8,4.7,0]])add(new T.PlaneGeometry(w,h),asphalt,[x,-.17,z],[-Math.PI/2,0,0]);
 // Larger fissures cross the pool of light, supplementing fine aggregate in the atlas.
 for(let i=0;i<24;i++){let x=4.5+random()*8,z=-5+random()*10;for(let j=0;j<4;j++){const nx=x+.12+random()*.6,nz=z+(random()-.5)*.8;cyl([x,-.157,z],[nx,-.157,nz],.01+random()*.012,black);x=nx;z=nz;}}
 for(let i=0;i<35;i++){const x=4.7+random()*7,z=-5+random()*10;if(Math.abs(z-.4)<1.5&&x<6)continue;box([x,-.11,z],[.08+random()*.2,.08,.10+random()*.18],i%3?rust:plaster,.015,owner,[0,random()*6,0]);}
 // Patched sofa, with separate sagging cushions and exposed foam, along the left wall.
 // Sofa 2.0 m long, 0.9 m high — a real two-seater next to a 4 m car. It faces the TV in the north-west corner.
 const sofaSpot=level>=2?[-3.38,0,1.45]:[-3.5,0,.1],sofa=cluster('Sofa',sofaSpot,level>=2?.55:.3,.9);
 box([0,.26,0],[.87,.3,2.25],wood,.05,sofa);
 for(const z of [-1.03,1.03])box([.06,.58,z],[1.02,.46,.17],fabric,.07,sofa);
 box([-.37,.72,0],[.21,.96,2.14],fabric,.07,sofa,[0,0,-.06]);
 for(const z of [-.67,-.02,.62]){box([.09,.45,z],[.8,.23,.62],fabric,.08,sofa,[.02,0,.02]);box([-.26,.82,z],[.25,.64,.63],fabric,.07,sofa,[0,0,-.13]);}
 for(const [z,w] of [[-.69,.13],[.53,.2]]){box([.42,.566,z],[.2,.007,w],foam,.004,sofa);for(let j=0;j<7;j++)cyl([.29+j*.032,.573,z-w*.5],[.31+j*.032,.58,z-w*.5-.045-random()*.025],.003,paper,sofa);}
 box([.16,.598,-.12],[.42,.032,.52],cloth,.009,sofa,[.03,.15,0]);
 for(const z of [-.96,.92])for(const x of [-.3,.4])box([x,.12,z],[.085,.22,.085],wood,.012,sofa);
 // CRT on a hand-built stand; screen is a convex quad surface, not a flat card.
 // 21" CRT on a stand in the north-west corner, screen turned to the sofa; scaled to a real set (68 cm wide).
 const tvSpot=[-1.05,0,-2.45],tvYaw=Math.atan2(sofaSpot[0]-tvSpot[0],sofaSpot[2]-tvSpot[2]),tv=cluster('TV',tvSpot,tvYaw,.75);
 box([0,.36,0],[.94,.09,.62],wood,.012,tv);for(const x of [-.39,.39])for(const z of [-.24,.24])box([x,.17,z],[.07,.37,.07],wood,.008,tv);
 box([0,.79,0],[.9,.74,.62],wood,.085,tv);box([0,.79,.295],[.87,.67,.045],dark,.065,tv);
 const g=new T.PlaneGeometry(.63,.47,20,16),a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i);a.setZ(i,.05*(1-(x/.38)**2)*(1-(y/.29)**2));}g.computeVertexNormals();add(g,glass,[-.055,.82,.332],[0,0,0],tv);
 for(let i=0;i<18;i++)box([-.055,.62+i*.022,.35],[.55,.004,.003],screenLines,0,tv);
 for(const y of [.92,.7])cyl([.345,y,.32],[.345,y,.375],.041,steel,tv);
 for(let i=0;i<9;i++)box([.33,.44+i*.021,.327],[.09,.007,.005],steel,0,tv);
 for(let i=0;i<11;i++)box([-.31+i*.057,1.158,-.03],[.026,.009,.23],black,0,tv);
 box([0,1.173,-.04],[.24,.032,.15],black,.02,tv);cyl([0,1.19,0],[-.42,1.77,-.04],.008,steel,tv);cyl([0,1.19,0],[.36,1.83,.02],.006,steel,tv);
 for(let i=0;i<4;i++){box([-.31+i*.19,.435,.02],[.16,.055,.27],black,.006,tv);box([-.31+i*.19,.465,.04],[.11,.004,.15],paper,0,tv);}
 // Boxes have open tops, flaps, tape, and a visibly mixed stash of spare bits.
 for(const [bx,bz,scale] of [[3.65,2.8,.75],[3.75,-2.7,.6],[-2.8,-3.28,.5]]){const crate=cluster('Crate',[bx,0,bz]),x=0,z=0,h=scale*.72;box([x,.04,z],[scale,.04,scale*.75],paper,0,crate);for(const dx of [-1,1])box([x+dx*scale*.48,h*.5,z],[.027,h,scale*.75],paper,0,crate);for(const dz of [-1,1]){box([x,h*.5,z+dz*scale*.36],[scale,h,.025],paper,0,crate);box([x,h+.045,z+dz*scale*.50],[scale,.016,scale*.30],paper,0,crate,[dz*.65,0,0]);}box([x,h*.45,z+scale*.38],[scale*.22,h*.8,.003],tape,0,crate);for(let j=0;j<8;j++)box([x+(random()-.5)*scale*.68,.16+random()*h*.7,z+(random()-.5)*scale*.48],[.08+random()*.1,.11,.13],j%2?steel:black,.012,crate,[random(),random(),random()]);}
 // Rough patches and posters inherit the correct disappearing wall assembly.
 const walls=[['Wall_North',0],['Wall_West',1],['Wall_South',2],['Wall_East',3]];
 for(const [name,side] of walls){const parent=room.getObjectByName(name);if(!parent)continue;const wallPoint=(u,y)=>side===0?[u,y,-3.704]:side===1?[-4.198,y,u]:side===2?[u,y,3.704]:[4.195,y,u];
 for(let i=0;i<30;i++){const u=(random()-.5)*(side%2?7.1:8),y=.12+random()*.92;if(side===3&&u> -1.2&&u<2)continue;const w=.04+random()*.22,h=.018+random()*.11;box(wallPoint(u,y),side%2?[.007,h,w]:[w,h,.007],i%3?plaster:rust,0,parent);}
 for(let i=0;i<8;i++){const u=(random()-.5)*7;if(side===3&&u>-1.2&&u<2)continue;let p=wallPoint(u,.4+random()*2);for(let j=0;j<4;j++){const next=[...p];next[1]-=.10+random()*.12;next[side%2?2:0]+=(random()-.5)*.13;cyl(p,next,.007,black,parent);p=next;}}
 }
 const north=room.getObjectByName('Wall_North'),west=room.getObjectByName('Wall_West');
 // West wall posters above the sofa, well away from the tool boards.
 for(const [z,m,w,h] of [[-.95,posterA,.86,1.02],[1.35,posterB,.88,1.06]]){add(new T.PlaneGeometry(w,h),m,[-4.185,2.65,z],[0,Math.PI/2,0],west);for(const dz of [-1,1])box([-4.172,2.65+h*.45,z+dz*w*.38],[.008,.055,.12],tape,0,west,[0,0,.1]);}
 // A sagging string of small warm bulbs makes the battered room feel inhabited.
 let prev=null;for(let i=0;i<=24;i++){const x=-3.95+i*.325,y=3.1-.17*Math.sin(i/24*Math.PI);const p=[x,y,-3.55];if(prev)cyl(prev,p,.007,black,north);if(i%2===0){cyl(p,[x,y-.065,-3.55],.014,dark,north);add(new T.SphereGeometry(.024,8,6),amber,[x,y-.085,-3.55],[0,0,0],north);}prev=p;}
 // Spotlight fixture and a single unshadowed cone of real light on the apron.
 box([4.43,3.23,.4],[.18,.14,.55],dark,.022);box([4.54,3.18,.4],[.025,.075,.42],amber,.009);
 const spot=new T.SpotLight(0xffca84,100,15,Math.PI*.25,.65,1.7);spot.position.set(4.5,3.18,.4);spot.target.position.set(7.3,-.15,.4);scene.add(spot,spot.target);
 // Replace the old bright concrete ramp with weathered asphalt too.
 room.getObjectByName('Open_gates')?.traverse(o=>{if(o.isMesh&&/Workshop concrete/.test(o.material.name)){o.material.map=asphalt.map;o.material.color.set(0x666974);o.material.roughness=.94;}});
 for(const {parent,m,geos} of buckets.values()){const merged=mergeGeometries(geos,false);for(const g of geos)g.dispose();const actual=/^Wall_/.test(parent.name)||clusters.includes(parent)?m.clone():m;const mesh=new T.Mesh(merged,actual);mesh.name='Evening_'+m.uuid;mesh.castShadow=parent!==owner||m!==asphalt;mesh.receiveShadow=true;parent.add(mesh);if(/^Wall_/.test(parent.name)){actual.transparent=true;actual.forceSinglePass=true;const normal={Wall_North:[0,0,-1],Wall_South:[0,0,1],Wall_West:[-1,0,0],Wall_East:[1,0,0]}[parent.name];wallMeshes.push({mesh,normal:new T.Vector3(...normal)});}}
 return {wallMeshes,clusters,dispose(){textures.forEach(t=>t.dispose());}};
}
