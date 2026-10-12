import * as T from 'three';
import {ringDelta} from './puddle-layout.js';
// Baked linear data, not a reflection: R broad wet zone, G wet shore, B broken rut.
// One periodic texture over the entire scenery ring avoids all chunk-edge seams.
export function createWetnessField(layout){
 const c=layout.config,w=c.fieldWidth,h=c.fieldHeight,data=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const px=((x+.5)/w-.5)*c.roadWidth,d=(y+.5)/h*c.span;let wet=0,shore=0,rut=0;
  for(const z of layout.zones){const u=(px-z.x)/z.width,v=ringDelta(d,z.d,c.span)/(z.length*.65);wet=Math.max(wet,Math.max(0,1-u*u-v*v)**2*z.intensity);}
  for(const p of layout.puddles){const dz=ringDelta(d,p.d,c.span);if(Math.abs(dz)>p.length+p.halo+1)continue;const co=Math.cos(p.angle),si=Math.sin(p.angle),dx=px-p.x,u=(co*dx+si*dz)/(p.width*.55+p.halo),v=(-si*dx+co*dz)/(p.length*.55+p.halo),f=Math.max(0,1-u*u-v*v);shore=Math.max(shore,f);if(p.kind==='rut')rut=Math.max(rut,f);}
  const i=(y*w+x)*4;data[i]=wet*255;data[i+1]=shore*255;data[i+2]=rut*255;data[i+3]=255;
 }
 const t=new T.DataTexture(data,w,h);t.name='Road drainage: wet zones / shore / ruts';t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.needsUpdate=true;return t;
}
