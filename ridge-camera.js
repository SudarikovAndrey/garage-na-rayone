import {Vector3} from 'three';
import {ridgeLocal,driftCourse} from './ridge-terrain.js';
// Track both the camera and its aim. Tracking only position pushes a sideways car out of frame.
export function followRidgeCamera(camera,model,car,dt,reduced=false,rivalModel=null){
 const parking=driftCourse().terrain==='city';
 const travel=car.travelDistance??car.distance,ahead=ridgeLocal(travel+14,0,travel),speed=Math.min(1,Math.max(0,car.speed/43));
 const aim=camera.userData.driftAim??=new Vector3(model.position.x,.45,1.2);
 const battle=car.ridgeBattle&&rivalModel&&Math.abs(rivalModel.position.z-model.position.z)<16,centerX=battle?model.position.x*.7+rivalModel.position.x*.3:model.position.x;
 const follow=1-Math.exp(-dt*5),targetFollow=1-Math.exp(-dt*7);
 camera.position.lerp(new Vector3(centerX+.45-(car.ridgeYaw||0)*.45,parking?9.8:2.8,parking?13.8:battle?9.2+Math.max(0,rivalModel.position.z)*.55:8.6),follow);
 aim.lerp(new Vector3(centerX*.94+ahead.x*.06,.65,parking?-3.5:battle?Math.max(0,rivalModel.position.z)*.2:.2),targetFollow);
 camera.up.set(0,1,0);camera.lookAt(aim);
 const desired=parking?52:reduced?58:57+speed*11,minFov=2*Math.atan(Math.tan((parking?38:battle?58:50)*Math.PI/360)/camera.aspect)*180/Math.PI;
 camera.fov+=(Math.max(desired,minFov)-camera.fov)*(1-Math.exp(-dt*2.5));camera.updateProjectionMatrix();
}
