import * as T from 'three';
// Мелкие общие нецветовые карты: зерно щебня в нормали и разброс шероховатости для рваного мокрого блика.
//
// Шероховатость мокрого асфальта раньше бралась как sin(x)·cos(y) по пикселям тайла. Периодов по тайлу выходило
// 2.44 на 3.06 — не целое число, поэтому тайл не сходился сам с собой, и на дороге проступала регулярная сетка
// клеток около 0,8 м со швами каждые 2 и 3,5 м (проба 17 сентября, «сетчатый асфальт, видны клетки»).
// Здесь вместо синусов — тайлящийся решётчатый шум: узлы берутся по модулю числа ячеек, поэтому правый край тайла
// равен левому, а пятна не выстраиваются в решётку.
const hash=(x,y,s)=>{const v=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return v-Math.floor(v);};
function lattice(u,v,cells,seed){
 const x=u*cells,y=v*cells,x0=Math.floor(x),y0=Math.floor(y),fx=x-x0,fy=y-y0;
 const sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),wrap=k=>((k%cells)+cells)%cells;
 const a=hash(wrap(x0),wrap(y0),seed),b=hash(wrap(x0+1),wrap(y0),seed);
 const c=hash(wrap(x0),wrap(y0+1),seed),d=hash(wrap(x0+1),wrap(y0+1),seed);
 const top=a+(b-a)*sx,bottom=c+(d-c)*sx;return top+(bottom-top)*sy;
}
export function asphaltDetail(wet=0){
 const n=128,norm=new Uint8Array(n*n*4),rough=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4,grain=Math.sin(x*127.1+y*311.7)*43758.5453,f=grain-Math.floor(grain);
  // Две октавы пятен: крупные наплывы битума и мелкая рябь поверх, обе бесшовные.
  const blot=(lattice(x/n,y/n,5,1)*.66+lattice(x/n,y/n,11,2)*.34-.5)*2;
  norm[i]=128+(f-.5)*(wet?15:32);norm[i+1]=128+Math.sin(grain)*(wet?7:16);norm[i+2]=254;norm[i+3]=255;
  const r=wet?90+f*50+blot*18:190+f*60;
  rough[i]=rough[i+1]=rough[i+2]=r;rough[i+3]=255;
 }
 const normal=new T.DataTexture(norm,n,n),roughness=new T.DataTexture(rough,n,n);
 // Квадратный тайл: 2 м поперёк и 2 м вдоль. Раньше вдоль дороги он был растянут в 1,7 раза, и зерно щебня ложилось
 // полосами. Анизотропия — против мерцания того же зерна на дальнем конце дороги.
 for(const t of [normal,roughness]){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,190);t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.anisotropy=8;t.generateMipmaps=true;t.needsUpdate=true;}
 return {normal,roughness};
}
