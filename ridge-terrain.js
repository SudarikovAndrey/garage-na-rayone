// Metres along the centreline, not Z distance: both lanes share the same race timing.
export const RIDGE_DISTANCE=804;
const DEFAULT_KEYS=[[0,0],[60,0],[170,.64],[245,-.42],[365,-.62],[452,.60],[535,.35],[650,-.56],[746,.26],[804,0],[1600,0]];
export const DRIFT_COURSES={
 ridge:{width:4,wind:1,grip:1,terrain:'ridge',keys:DEFAULT_KEYS},
 switchback:{width:4,wind:.85,grip:1,terrain:'ridge',keys:[[0,0],[48,0],[162,-.57],[282,.54],[348,.65],[445,-.48],[550,-.25],[650,.58],[750,-.34],[804,0],[1600,0]]},
 parking:{width:18,guideWidth:6,wind:.12,grip:1.05,terrain:'city',keys:[[0,0],[30,0],[160,2.1],[185,2.1],[320,-.2],[350,-.2],[490,2.25],[525,2.25],[680,.1],[804,0],[1600,0]]},
 pines:{width:5.2,wind:.22,grip:.90,terrain:'forest',keys:[[0,0],[55,0],[170,-.55],[260,.43],[352,.6],[450,-.48],[575,.48],[690,-.5],[760,-.26],[804,0],[1600,0]]}
};
let course=DRIFT_COURSES.ridge,KEYS=course.keys,points=[];
export const driftCourse=()=>course;
// Only one race is simulated at a time. Rebuild the metre lookup before constructing its world.
export function setDriftCourse(id='ridge'){course=DRIFT_COURSES[id]||DRIFT_COURSES.ridge;KEYS=course.keys;points=[{x:0,z:0}];for(let d=1;d<=1600;d++){const h=ridgeHeading(d-.5),p=points[d-1];points.push({x:p.x+Math.sin(h),z:p.z-Math.cos(h)});}return course;}
export function ridgeHeading(d){
 for(let i=1;i<KEYS.length;i++)if(d<KEYS[i][0]){const [a,h]=KEYS[i-1],[b,k]=KEYS[i],t=Math.max(0,(d-a)/(b-a));return h+(k-h)*(1-Math.cos(Math.PI*t))*.5;}
 return 0;
}
setDriftCourse();
export function ridgePoint(d,lane=0){
 const n=Math.max(0,Math.min(1599,Math.floor(d))),t=Math.max(0,Math.min(1,d-n)),a=points[n],b=points[n+1],h=ridgeHeading(d);
 return {x:(d<0?0:d>1600?points[1600].x:a.x+(b.x-a.x)*t)+lane*Math.cos(h),z:(d<0?-d:d>1600?points[1600].z-(d-1600):a.z+(b.z-a.z)*t)+lane*Math.sin(h),heading:h};
}
export function ridgeLocal(d,lane,origin){const p=ridgePoint(d,lane),o=ridgePoint(origin),c=Math.cos(o.heading),s=Math.sin(o.heading),x=p.x-o.x,z=p.z-o.z;return {x:c*x+s*z,z:-s*x+c*z,heading:p.heading-o.heading};}

// The collision surface and the visible embankment use the same height field.
export function ridgeHeight(d,lane){
 const x=Math.abs(lane);if(course.terrain==='city')return -.04;if(course.terrain==='forest')return -.04-Math.min(.8,Math.max(0,x-course.width-.6)*.15);const base=x<=4.8?-.04:x<20?-.04-(x-4.8)*.74:-11.288-Math.min(2,(x-20)*.025);
 const ripple=x>5&&x<20?Math.sin(d*.13+lane*1.7)*Math.sin(lane*.8)*.16*Math.sin(Math.PI*(x-5)/15):0;
 return base+ripple;
}
export function ridgeCoordinates(x,z,hint=0){
 let d=hint;
 for(let i=0;i<6;i++){const p=ridgePoint(d),along=(x-p.x)*Math.sin(p.heading)-(z-p.z)*Math.cos(p.heading);d+=Math.max(-40,Math.min(40,along));if(Math.abs(along)<.001)break;}
 const p=ridgePoint(d);return {d,lane:(x-p.x)*Math.cos(p.heading)+(z-p.z)*Math.sin(p.heading),heading:p.heading};
}
export function ridgeSurface(x,z,hint=0){
 const p=ridgeCoordinates(x,z,hint),h=ridgeHeight(p.d,p.lane),e=.08;
 const across=(ridgeHeight(p.d,p.lane+e)-ridgeHeight(p.d,p.lane-e))/(2*e),along=(ridgeHeight(p.d+e,p.lane)-ridgeHeight(p.d-e,p.lane))/(2*e);
 const nx=-across*Math.cos(p.heading)-along*Math.sin(p.heading),nz=-across*Math.sin(p.heading)+along*Math.cos(p.heading),length=Math.hypot(nx,1,nz);
 return {...p,height:h,normal:[nx/length,1/length,nz/length]};
}
