import * as T from 'three';
// Aggregate normal and macro roughness use independent spatial scales.
const hash=(x,y,s)=>{const v=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return v-Math.floor(v);};
function lattice(u,v,cells,seed,rows=cells){
 const x=u*cells,y=v*rows,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
 const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),wrap=k=>((k%cells)+cells)%cells,wrapY=k=>((k%rows)+rows)%rows;
 const a=hash(wrap(x0),wrapY(y0),seed),b=hash(wrap(x0+1),wrapY(y0),seed);
 const c=hash(wrap(x0),wrapY(y0+1),seed),d=hash(wrap(x0+1),wrapY(y0+1),seed);
 const top=a+(b-a)*sx,bottom=c+(d-c)*sx;return top+(bottom-top)*sy;
}
export function asphaltDetail(wet=0){
 const n=128,w=128,h=512,norm=new Uint8Array(n*n*4),rough=new Uint8Array(w*h*4);
 // Only small aggregate repeats every ~2 m; no recognizable hills in its normal map.
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,f=hash(x,y,0),g=hash(x,y,9);
  norm[i]=128+(f-.5)*(wet?15:32);norm[i+1]=128+(g-.5)*(wet?14:30);norm[i+2]=254;norm[i+3]=255;
 }
 // One roughness atlas spans the entire street width and 64 m of travel, versus
 // repeating every 2 m. A separate UV transform keeps the old fine aggregate scale.
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,f=hash(x,y,3);
  const blot=(lattice(x/w,y/h,3,1,23)*.66+lattice(x/w,y/h,9,2,71)*.34-.5)*2;
  const r=wet?175+f*24+blot*44:190+f*60+blot*22;
  rough[i]=rough[i+1]=rough[i+2]=Math.max(0,Math.min(255,Math.round(r)));rough[i+3]=255;
 }
 const normal=new T.DataTexture(norm,n,n),roughness=new T.DataTexture(rough,w,h);
 normal.repeat.set(4,190);roughness.repeat.set(1,470/64);
 for(const t of [normal,roughness]){t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.anisotropy=8;t.generateMipmaps=true;t.needsUpdate=true;}
 // Macro roughness has no fine edges: four anisotropic taps are sufficient.
 roughness.anisotropy=4;
 return {normal,roughness};
}
