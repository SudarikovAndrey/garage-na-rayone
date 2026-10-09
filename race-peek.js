// Held camera gesture and two-car composition. Pure geometry; no render pass or raycasts.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mix=(a,b,t)=>a+(b-a)*t;
const blend=(a,b,t)=>Object.fromEntries(['x','y','z'].map(k=>[k,mix(a[k],b[k],t)]));
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const unit=v=>{const d=Math.hypot(v.x,v.y,v.z);return {x:v.x/d,y:v.y/d,z:v.z/d};};
export class RacePeek{
 constructor(){this.reset();}
 reset(){this.pointer=null;this.amount=0;this.wanted=0;this.side=-1;this.lift=0;this.moved=false;}
 begin(id,x,y,width){if(this.pointer!==null)return false;this.pointer=id;this.startX=x;this.startY=y;this.width=Math.max(200,width);this.moved=false;return true;}
 move(id,x,y){if(id!==this.pointer)return;const dx=x-this.startX,dy=y-this.startY,d=Math.hypot(dx,dy);if(d<8&&!this.moved)return;this.moved=true;this.wanted=clamp((d-8)/(this.width*.28),0,1);if(Math.abs(dx)>12)this.side=dx>0?-1:1;this.lift=clamp(-dy/(this.width*.4),-1,1);}
 end(id){if(id!==this.pointer)return;this.pointer=null;this.wanted=0;}
 update(dt){this.amount=mix(this.amount,this.wanted,1-Math.exp(-Math.min(.05,Math.max(0,dt))*(this.wanted?8:6)));if(!this.wanted&&this.amount<.001)this.amount=0;return this;}
}
// Bind only the canvas: gear/nitro buttons keep their own pointers, including multi-touch.
export function bindRacePeek(canvas,state,enabled){
 const down=e=>{if(!enabled()||(e.pointerType==='mouse'&&e.button!==0))return;if(state.begin(e.pointerId,e.clientX,e.clientY,canvas.clientWidth)){try{canvas.setPointerCapture(e.pointerId);}catch{};}};
 const move=e=>{if(e.pointerId!==state.pointer)return;if(!enabled()){cancel();return;}state.move(e.pointerId,e.clientX,e.clientY);};
 const up=e=>state.end(e.pointerId);
 const cancel=()=>{const id=state.pointer;state.end(id);if(id!==null&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);};
 const hidden=()=>{if(document.hidden)cancel();};
 for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]])canvas.addEventListener(name,fn);
 window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',hidden);
 return ()=>{cancel();for(const [name,fn] of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up]])canvas.removeEventListener(name,fn);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',hidden);};
}
// Fit actual car boxes in the safe area above the instruments. At large gaps the
// camera looks down the road: the player stays foreground, the rival remains in depth.
export function racePeekFrame({mine={x:-1.9,y:0,z:0,width:1.8,length:4.4,height:1.5},rival={x:1.9,y:0,z:0,width:1.8,length:4.4,height:1.5},aspect=.52,side=-1,lift=0,reduced=false}={}){
 const gap=rival.z-mine.z,apart=Math.tanh(Math.abs(gap)/6);
 const aim={x:mix(mine.x,rival.x,.34*(1-apart)+.12*apart),y:mine.y+1.05,z:mine.z+clamp(gap*.2,-3,3)};
 // Stay outside the player's lane; swipe direction chooses front/rear bias when
 // side by side. Rise through the overtake to stay clear of roadside walls, then
 // settle into a low shot looking along the pair instead of zooming far out.
 const axis=unit({x:mine.x-rival.x||-3.8,y:0,z:-gap}),angle=side*mix(.30,.06,apart),c=Math.cos(angle),s=Math.sin(angle);
 const back=unit({x:axis.x*c+axis.z*s,y:mix(1.8,.18,apart)+lift*.065,z:axis.z*c-axis.x*s});
 const right=unit({x:back.z,y:0,z:-back.x});
 const up={x:back.y*right.z,y:back.z*right.x-back.x*right.z,z:-back.y*right.x};
 const fov=60,tanV=Math.tan(fov*Math.PI/360),tanH=tanV*Math.max(.3,aspect);
 let distance=7.5;
 for(const car of [mine,rival])for(const x of [-1,1])for(const y of [0,1])for(const z of [-1,1]){
  const p={x:car.x+x*(car.width||1.8)*.5-aim.x,y:(car.y||0)+y*(car.height||1.5)-aim.y,z:car.z+z*(car.length||4.4)*.5-aim.z};
  const h=dot(p,right),v=dot(p,up),depth=dot(p,back);
  distance=Math.max(distance,depth+Math.abs(h)/(tanH*.76),depth+Math.abs(v)/(tanV*(v<0?.46:.78)));
 }
 return {pos:{x:aim.x+back.x*distance,y:aim.y+back.y*distance,z:aim.z+back.z*distance},aim,fov,roll:0,jitter:{x:0,y:0,z:0},lag:12};
}
export function composeRacePeek(base,state,options){
 if(!state.amount)return base;
 const shot=racePeekFrame({...options,side:state.side,lift:state.lift}),a=state.amount;
 return {pos:blend(base.pos,shot.pos,a),aim:blend(base.aim,shot.aim,a),fov:mix(base.fov,shot.fov,a),roll:base.roll*(1-a),jitter:blend(base.jitter,shot.jitter,a),lag:mix(base.lag,shot.lag,a)};
}
