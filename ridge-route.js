import {ridgeHeading,driftCourse} from './ridge-terrain.js';
export {RIDGE_DISTANCE,ridgeHeading,ridgePoint,ridgeLocal} from './ridge-terrain.js';
export function ridgeWind(d){return driftCourse().wind*(.45+.55*Math.pow(.5+.5*Math.sin(d*.041+Math.sin(d*.013)),2));}
export function ridgeConditions(car,d=car.distance){
 const curvature=(ridgeHeading(d+1)-ridgeHeading(d-1))*.5,wind=ridgeWind(d);
 // Arcade grip keeps bends fast; the limit is a departure risk, not an invisible brake.
 const grip=13.5*driftCourse().grip*(1+Math.min(14,car.levels[1])*.025)*(car.handling.traction||1),available=grip-wind*1.2;
 const safeSpeed=Math.min(60,Math.sqrt(available/Math.max(.001,Math.abs(curvature))));
 return {curvature,wind,safeSpeed,available,load:car.speed*car.speed*Math.abs(curvature)/available};
}
