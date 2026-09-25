// Водитель за рулём: главный персонаж (Heavy 15 из гаража) в кресле водителя каждой машины — в заезде и в студии.
// Посадка Восьмёрки подобрана Андреем на стенде 22 сентября; Копейка и Волга — по их рулю, креслу и педалям,
// снятым лучами с моделей 23 сентября (у классики руль ближе к спинке: ~45 см против 70 у Восьмёрки).
// Сидячая поза первого кадра, дальше руки и ноги доводятся простым обратным решением (CCD):
// кисти на руль «на девять и три», стопы к педалям, корпус выпрямлен над тазом.
import * as T from 'three';
import {addAnimatedGarageCharacter} from './garage-resident.js';
import {createGLTFLoader} from './gltf.js';
// Путь от модуля, а не от страницы: модуль зовут и игра, и студия из dev/.
let residentAsset=null;
const loadGarageResident=()=>residentAsset??=createGLTFLoader().loadAsync(new URL('./assets/characters/garage-resident.glb',import.meta.url).href);

// Координаты в системе модели машины (нос по −X, левый борт по −Z), сняты с самой модели.
// Координаты в системе модели: нос по −X, значит левый борт с места водителя — это +Z.
// Руль у модели слева; передние кресла при сборке модели сдвинуты назад.
// Посадка — по схеме Андрея: таз на подушке у спинки, корпус почти вертикально, голова под крышей.
export const SEAT={
 hip:new T.Vector3(.255,.45,.38),              // таз по посадке, выбранной Андреем на стенде
 wheel:new T.Vector3(-.44,.72,.38),            // центр обода (задний край на «девять и три» — x −0.42)
 grip:.180,                                    // полуразмах хвата: обод от z 0.20 до 0.56
 pedal:new T.Vector3(-.80,.34,.38),            // район педалей
 feet:.085                                     // полуразвод стоп
};
// Посадка по машинам. У Копейки и Волги руль слит с панелью (узла Steering_wheel нет) — колонку не двигаем.
export const SEATS={
 samara:{seat:SEAT,pose:{}},
 kopeyka:{seat:{hip:new T.Vector3(-.29,.53,.35),wheel:new T.Vector3(-.63,.91,.35),grip:.18,pedal:new T.Vector3(-1.0,.42,.35),feet:.085},pose:{wheelShift:0,arms:1.0,lean:.08}},
 volga:{seat:{hip:new T.Vector3(-.24,.53,.40),wheel:new T.Vector3(-.53,.92,.40),grip:.19,pedal:new T.Vector3(-.92,.40,.40),feet:.09},pose:{wheelShift:0,arms:1.0,lean:.08}},
 // Двенашка и Нива (23 сентября): руль отдельным узлом, кресло и педали сняты лучами с моделей.
 twelve:{seat:{hip:new T.Vector3(-.07,.455,.385),wheel:new T.Vector3(-.40,.94,.385),grip:.18,pedal:new T.Vector3(-.88,.38,.385),feet:.085},pose:{wheelShift:0,arms:1.0,lean:.08}},
 niva:{seat:{hip:new T.Vector3(.07,.67,.32),wheel:new T.Vector3(-.30,1.02,.32),grip:.19,pedal:new T.Vector3(-.90,.55,.32),feet:.085},pose:{wheelShift:0,arms:1.0,lean:.06}},
};
export const seatFor=carId=>SEATS[carId]||null;

const v1=new T.Vector3(),v2=new T.Vector3(),q1=new T.Quaternion(),q2=new T.Quaternion(),q3=new T.Quaternion();
// CCD: крутим суставы цепочки от ближнего к дальнему, чтобы конечная кость пришла к цели.
function ccd(chain,effector,target,{iterations=16,maxStep=.35}={}){
 for(let it=0;it<iterations;it++){
  for(let j=chain.length-1;j>=0;j--){
   const joint=chain[j];
   joint.getWorldPosition(v1);effector.getWorldPosition(v2);
   const toEffector=v2.sub(v1).normalize(),toTarget=target.clone().sub(v1).normalize();
   const angle=toEffector.angleTo(toTarget);
   if(angle<1e-4)continue;
   q1.setFromUnitVectors(toEffector,toTarget);
   if(angle>maxStep)q1.slerp(new T.Quaternion(),1-maxStep/angle);
   joint.getWorldQuaternion(q2);joint.parent.getWorldQuaternion(q3);
   joint.quaternion.copy(q3.invert().multiply(q1.multiply(q2)));
   joint.updateMatrixWorld(true);
  }
 }
}
const bone=(root,name)=>{let found=null;root.traverse(o=>{if(!found&&o.isBone&&o.name===name)found=o;});return found;};

// Настройки посадки: всё можно переопределить со стенда, не трогая константы.
export const POSE={scale:1,arms:1.12,wheelShift:.20,lean:.10,neckPitch:.34,headPitch:.49};/* посадка Андрея со стенда; руль к водителю на 20 см и руки длиннее на 12%, чтобы кисти легли на обод */
export async function attachDriver(model,opts={}){
 const seat={...SEAT,...(opts.seat||{})},pose={...POSE,...(opts.pose||{})};
 const car=model.children[0];if(!car)return null;
 const asset=await loadGarageResident();
 if(opts.requireParent!==false&&!model.parent&&!opts.detached)return null;// машину убрали, пока персонаж грузился
 // Руль: отдельный узел Steering_wheel, двигается к водителю как регулируемая колонка.
 const steer=car.getObjectByName('Steering_wheel');
 if(steer){steer.userData.baseX??=steer.position.x;steer.position.x=steer.userData.baseX+pose.wheelShift;steer.updateMatrixWorld(true);}
 seat.wheel=seat.wheel.clone();seat.wheel.x+=pose.wheelShift;
 const p=addAnimatedGarageCharacter(car,asset,{name:'Driver',reduced:true,yaw:-Math.PI/2,scale:pose.scale,clipName:'Sitting_Rubbing_Arm'});
 if(!p)return null;
 const root=p.root;
 root.updateMatrixWorld(true);
 const toCar=w=>car.worldToLocal(w.clone());
 const toWorld=l=>car.localToWorld(l.clone());
 if(pose.arms!==1)for(const side of ['Left','Right']){bone(root,side+'_ForeArm').position.multiplyScalar(pose.arms);bone(root,side+'_Hand').position.multiplyScalar(pose.arms);}
 root.updateMatrixWorld(true);
 // Кузов мог опуститься вместе с обвесом: берём смещение корня модели.
 const body=car.children.find(o=>!/^Wheel_|^Steering_wheel/.test(o.name)&&o.name!=='Driver');
 const drop=body?body.position.y:0;
 // Таз — в кресло.
 const hips=bone(root,'Hips');
 root.updateMatrixWorld(true);
 const hipNow=toCar(hips.getWorldPosition(new T.Vector3()));
 const hipGoal=seat.hip.clone();hipGoal.y+=drop;
 root.position.add(hipGoal.sub(hipNow));
 root.updateMatrixWorld(true);
 // Корпус: лёгкий наклон к рулю (вперёд у машины — минус по X), затем шея почти вертикально,
 // чтобы взгляд шёл на дорогу, а не в потолок.
 const spine=bone(root,'Spine_0'),neck=bone(root,'Neck'),head=bone(root,'Head');
 const chestGoal=toWorld(new T.Vector3(seat.hip.x+pose.lean,seat.hip.y+drop+.50,seat.hip.z));
 ccd([spine,bone(root,'Spine_1')],bone(root,'Spine_2'),chestGoal,{iterations:10,maxStep:.2});
 const neckAt=toCar(neck.getWorldPosition(new T.Vector3()));
 ccd([bone(root,'Spine_2'),neck],head,toWorld(neckAt.clone().add(new T.Vector3(-.035,.13,0))),{iterations:8,maxStep:.2});
 // Голова: в сидячей позе первого кадра она запрокинута. Опускаем взгляд на дорогу поворотом
 // вокруг поперечной оси машины (плюс по Z наклоняет лицо вниз, к капоту).
 const pitch=(b,angle)=>{const axis=new T.Vector3(0,0,1).transformDirection(car.matrixWorld);q1.setFromAxisAngle(axis,angle);b.getWorldQuaternion(q2);b.parent.getWorldQuaternion(q3);b.quaternion.copy(q3.invert().multiply(q1.multiply(q2)));b.updateMatrixWorld(true);};
 pitch(neck,pose.neckPitch);pitch(head,pose.headPitch);
 // Плечи ровно поперёк машины: в сидячей позе корпус развёрнут, правое плечо уходило на 8 см назад.
 {const l=toCar(bone(root,'Left_Arm').getWorldPosition(new T.Vector3())),r=toCar(bone(root,'Right_Arm').getWorldPosition(new T.Vector3()));
  const v=r.sub(l),angle=Math.atan2(v.x,-v.z),top=bone(root,'Spine_2');
  const axis=new T.Vector3(0,1,0).transformDirection(car.matrixWorld);q1.setFromAxisAngle(axis,angle);
  top.getWorldQuaternion(q2);top.parent.getWorldQuaternion(q3);top.quaternion.copy(q3.invert().multiply(q1.multiply(q2)));top.updateMatrixWorld(true);}
 // Руки на руль. Цель — запястье: оно на ладонь ближе к плечу, чем точка хвата на ободе.
 const wristTarget=(side,dz)=>{const g=seat.wheel.clone().add(new T.Vector3(.02,.03,dz*seat.grip));g.y+=drop;
  const sh=toCar(bone(root,side+'_Arm').getWorldPosition(new T.Vector3()));return g.add(sh.sub(g).normalize().multiplyScalar(.065));};
 const wrists={Left:wristTarget('Left',1),Right:wristTarget('Right',-1)};
 for(const side of ['Left','Right'])ccd([bone(root,side+'_Arm'),bone(root,side+'_ForeArm')],bone(root,side+'_Hand'),toWorld(wrists[side]));
 // Ноги к педалям.
 for(const [side,dz] of [['Left',1],['Right',-1]]){
  const foot=seat.pedal.clone().add(new T.Vector3(0,0,dz*seat.feet));foot.y+=drop;
  ccd([bone(root,side+'_UpLeg'),bone(root,side+'_Leg')],bone(root,side+'_Foot'),toWorld(foot));
 }
 root.updateMatrixWorld(true);
 const report={
  missL:toCar(bone(root,'Left_Hand').getWorldPosition(new T.Vector3())).distanceTo(wrists.Left),
  missR:toCar(bone(root,'Right_Hand').getWorldPosition(new T.Vector3())).distanceTo(wrists.Right),
  hip:toCar(hips.getWorldPosition(new T.Vector3())),
  head:toCar(head.getWorldPosition(new T.Vector3())),
  handL:toCar(bone(root,'Left_Hand').getWorldPosition(new T.Vector3())),
  handR:toCar(bone(root,'Right_Hand').getWorldPosition(new T.Vector3())),
  footL:toCar(bone(root,'Left_Foot').getWorldPosition(new T.Vector3()))
 };
 // Макушка — верх кожи персонажа в текущей позе; крыша — первое попадание луча вверх по кузову.
 const top=new T.Box3();root.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();top.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
 const headTop=toCar(new T.Vector3(0,top.max.y,0)).y,headAt=report.head;
 const ray=new T.Raycaster(toWorld(new T.Vector3(headAt.x,headAt.y-.2,headAt.z)),new T.Vector3(0,1,0).transformDirection(car.matrixWorld));
 const targets=[];car.traverse(o=>{if(o.isMesh&&!o.isSkinnedMesh&&!/glass/i.test(o.material.name)&&!root.getObjectById(o.id))targets.push(o);});
 const hit=ray.intersectObjects(targets,false)[0];
 report.headTop=headTop;report.roof=hit?toCar(hit.point).y:null;report.clearance=hit?report.roof-headTop:null;
 // Водитель уходит вместе с машиной: освобождаем его вместе с кастомизацией.
 const prev=model.userData.disposeCustomization;
 model.userData.disposeCustomization=()=>{p.dispose();prev?.();};
 model.userData.driver=p;
 return {person:p,report};
}

// Сравнение роста: тот же персонаж стоя, с анимацией стойки механика (скелет у них общий).
let standingClip=null;
export async function standingFigure(parent,{scale=1,position=[0,0,1.35],yaw=Math.PI}={}){
 const [asset,mechanic]=await Promise.all([loadGarageResident(),standingClip?null:createGLTFLoader().loadAsync(new URL('./assets/characters/garage-mechanic.glb',import.meta.url).href)]);
 standingClip??=mechanic.animations.find(a=>/Standing/i.test(a.name))||mechanic.animations[0];
 const p=addAnimatedGarageCharacter(parent,asset,{name:'Standing',reduced:true,scale,position,yaw});
 if(!p)return null;
 p.mixer.stopAllAction();p.mixer.clipAction(standingClip).play();p.mixer.setTime(0);p.root.updateMatrixWorld(true);
 const box=new T.Box3();p.root.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingBox();box.union(o.boundingBox.clone().applyMatrix4(o.matrixWorld));}});
 let shoulder=null;p.root.traverse(o=>{if(!shoulder&&o.isBone&&o.name==='Left_Arm')shoulder=o;});
 const local=v=>parent.worldToLocal(v.clone());
 return {person:p,height:local(new T.Vector3(0,box.max.y,0)).y-local(new T.Vector3(0,box.min.y,0)).y,top:local(new T.Vector3(0,box.max.y,0)).y,shoulder:local(shoulder.getWorldPosition(new T.Vector3())).y};
}
