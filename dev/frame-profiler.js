export const percentile=(values,p)=>{if(!values.length)return null;const a=[...values].sort((a,b)=>a-b);return +a[Math.min(a.length-1,Math.floor((a.length-1)*p))].toFixed(3);};
export class FrameProfiler{
 constructor(renderer){this.gl=renderer.getContext();this.ext=this.gl.getExtension('EXT_disjoint_timer_query_webgl2');this.pending=[];this.gpu=[];this.cpu=[];this.intervals=[];this.draws=[];this.tris=[];this.disjoint=0;}
 begin(){this.poll();this.query=null;if(this.ext&&this.pending.length<8){this.query=this.gl.createQuery();this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,this.query);}this.start=performance.now();}
 end(info,interval){const cpu=performance.now()-this.start;if(this.query){this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);this.pending.push(this.query);}this.cpu.push(cpu);if(interval>0)this.intervals.push(interval);this.draws.push(info.calls);this.tris.push(info.triangles);}
 poll(){if(!this.ext)return;const gl=this.gl;if(gl.getParameter(this.ext.GPU_DISJOINT_EXT)){this.disjoint++;for(const q of this.pending)gl.deleteQuery(q);this.pending=[];this.gpu=[];return;}
 while(this.pending.length&&gl.getQueryParameter(this.pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=this.pending.shift();this.gpu.push(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}}
 counts(){return Object.fromEntries(['cpu','gpu','intervals','draws','tris'].map(k=>[k,this[k].length]));}
 summary(since={}){this.poll();const stats=(key)=>{const a=this[key].slice(since[key]||0);return ({median:percentile(a,.5),p95:percentile(a,.95),samples:a.length});};return {cpuSubmitMs:stats('cpu'),gpuMs:stats('gpu'),frameIntervalMs:stats('intervals'),drawCalls:stats('draws'),triangles:stats('tris'),gpuTimerAvailable:!!this.ext,disjointEvents:this.disjoint};}
 dispose(){for(const q of this.pending)this.gl.deleteQuery(q);this.pending=[];}
}
