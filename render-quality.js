// Conservative portrait defaults; frame-time feedback handles thermal throttling without device sniffing.
export const QUALITY=[
 {name:'safe',dpr:1.5,pixels:850000,shadow:512,particles:.45,rain:.45,glow:.55},
 {name:'balanced',dpr:2,pixels:1300000,shadow:1024,particles:.75,rain:.7,glow:.8},
 {name:'high',dpr:2,pixels:1600000,shadow:1536,particles:1,rain:1,glow:1},
];
export function renderScale(w,h,dpr,level){const q=QUALITY[level];return Math.min(dpr||1,q.dpr,Math.sqrt(q.pixels/Math.max(1,w*h)));}
export class AdaptiveQuality{
 constructor(){this.level=1;this.reset();}
 reset(){this.goodSeconds=0;this.elapsed=0;this.slow=0;this.fast=0;this.frames=0;this.cooldown=2;}
 // canRise=false — только вниз: в гараже кадры дешёвые, и по ним нельзя поднимать уровень для заезда.
 sample(seconds,canRise=true){if(!Number.isFinite(seconds)||seconds<=0||seconds>.25)return false;if(this.cooldown>0){this.cooldown-=seconds;return false;}this.elapsed+=seconds;this.frames++;if(seconds>.039)this.slow++;if(seconds<.019)this.fast++;if(this.elapsed<4)return false;const bad=this.slow/this.frames>.35,good=this.fast/this.frames>.96;this.goodSeconds=good?(this.goodSeconds||0)+this.elapsed:0;let next=this.level;if(bad)next=Math.max(0,next-1);else if(canRise&&this.goodSeconds>24)next=Math.min(2,next+1);this.elapsed=this.slow=this.fast=this.frames=0;if(next===this.level)return false;this.level=next;this.goodSeconds=0;this.cooldown=4;return true;}
 get settings(){return QUALITY[this.level];}
}
