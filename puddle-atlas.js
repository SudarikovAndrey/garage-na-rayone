import * as T from 'three';
// Eight linear-data masks, not photographs/reflections: R water, G damp shore,
// B small edge variation. Black gutters stay black throughout the mip chain.
export function createPuddleAtlas(){
 const tile=128,width=tile*4,height=tile*2,data=new Uint8Array(width*height*4);
 const smooth=(a,b,x)=>T.MathUtils.smoothstep(x,a,b);
 for(let k=0;k<8;k++)for(let y=0;y<tile;y++)for(let x=0;x<tile;x++){
  const u=(x+.5)/tile*2-1,v=(y+.5)/tile*2-1,a=Math.atan2(v,u),phase=k*2.399;
  const r=.69+.10*Math.sin(3*a+phase)+.06*Math.sin(5*a-phase*.7)+.025*Math.sin(11*a+phase*2);
  const grain=Math.sin(u*47+Math.sin(v*23))*Math.sin(v*51+u*13);
  const d=Math.hypot(u,v)-r+grain*.023;
  const i=(((k>>2)*tile+y)*width+(k%4)*tile+x)*4;
  data[i]=(1-smooth(-.065,-.015,d))*255;data[i+1]=(1-smooth(-.005,.075,d))*255;data[i+2]=(grain*.5+.5)*255;data[i+3]=255;
 }
 const t=new T.DataTexture(data,width,height);t.name='Puddle masks: water / damp edge / detail';t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;return t;
}
