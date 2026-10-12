// Conservative portrait defaults; frame-time feedback handles thermal throttling without device sniffing.
export function phoneRenderer(){return typeof window!=='undefined'&&(new URLSearchParams(location.search).get('mobile')==='1'||(navigator.maxTouchPoints>0&&matchMedia('(pointer: coarse)').matches&&Math.min(screen.width,screen.height)<=600));}
export const MOBILE_RENDER=phoneRenderer();
const desktopQuality=[
 {name:'safe',dpr:1.5,pixels:850000,shadow:512,particles:.45,rain:.45,glow:.55},
 {name:'balanced',dpr:2,pixels:1300000,shadow:1024,particles:.75,rain:.7,glow:.8},
 {name:'high',dpr:2,pixels:1600000,shadow:1536,particles:1,rain:1,glow:1},
];
export const QUALITY=desktopQuality.map((q,i)=>MOBILE_RENDER?{...q,dpr:[1.25,1.5,1.75][i],pixels:[600000,850000,1100000][i],rain:q.rain*.75,particles:q.particles*.8}:q);
// Keep ProMotion devices at 60 rendered frames/s; elapsed simulation time is retained.
export function deferMobileFrame(now,last,mobile=MOBILE_RENDER){return mobile&&last>0&&now-last<1000/60-1;}
export function renderScale(w,h,dpr,level){const q=QUALITY[level];return Math.min(dpr||1,q.dpr,Math.sqrt(q.pixels/Math.max(1,w*h)));}
export class AdaptiveQuality{
 constructor(mobile=MOBILE_RENDER){this.mobile=mobile;this.level=1;this.ceiling=2;this.reset();}
 reset(){this.goodSeconds=0;this.elapsed=0;this.slow=0;this.fast=0;this.frames=0;this.cooldown=2;}
 // canRise=false — только вниз: в гараже кадры дешёвые, и по ним нельзя поднимать уровень для заезда.
 sample(seconds,canRise=true){if(!Number.isFinite(seconds)||seconds<=0||seconds>.25)return false;if(this.cooldown>0){this.cooldown-=seconds;return false;}this.elapsed+=seconds;this.frames++;if(seconds>(this.mobile?.025:.039))this.slow++;if(seconds<.019)this.fast++;if(this.elapsed<(this.mobile?2:4))return false;/* На телефоне при vsync 60 «50 кадров» — это кадры 16 и 33 мс вперемешку: медленных ~20%, порог 35% не срабатывал,
    и Redmi Note 14 Pro сидел на balanced с рывками (8.10.2026). Там же смотрим среднее: дольше 1/55 с — вниз. */
 const mean=this.elapsed/this.frames,bad=this.slow/this.frames>.35||(this.mobile&&mean>1/55),good=this.fast/this.frames>.96;this.goodSeconds=good?(this.goodSeconds||0)+this.elapsed:0;let next=this.level;if(bad){next=Math.max(0,next-1);if(this.mobile)this.ceiling=Math.min(this.ceiling,next);}else if(canRise&&this.goodSeconds>24)next=Math.min(this.ceiling,next+1);this.elapsed=this.slow=this.fast=this.frames=0;if(next===this.level)return false;this.level=next;this.goodSeconds=0;this.cooldown=4;return true;}
 get settings(){return QUALITY[this.level];}
}
