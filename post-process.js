// Single HDR composite. Edge-directed AA leaves flat areas and texture detail alone.
// Luminance is compressed only for edge detection; the filtered colour stays linear HDR.
export const compositeFragment = `
uniform sampler2D source;
uniform vec2 texel;
uniform float glow;
uniform float lensWater;
varying vec2 uv0;
float perceptualLuma(vec3 c){float y=dot(c,vec3(.2126,.7152,.0722));return sqrt(y/(1.+y));}
vec3 antialias(vec2 uv){
 vec3 c=texture2D(source,uv).rgb;
 float m=perceptualLuma(c);
 float nw=perceptualLuma(texture2D(source,uv+texel*vec2(-1.,1.)).rgb);
 float ne=perceptualLuma(texture2D(source,uv+texel*vec2(1.,1.)).rgb);
 float sw=perceptualLuma(texture2D(source,uv+texel*vec2(-1.,-1.)).rgb);
 float se=perceptualLuma(texture2D(source,uv+texel*vec2(1.,-1.)).rgb);
 float lo=min(m,min(min(nw,ne),min(sw,se))),hi=max(m,max(max(nw,ne),max(sw,se)));
 if(hi-lo<max(.025,hi*.10))return c;
 vec2 dir=vec2(-((nw+ne)-(sw+se)),(nw+sw)-(ne+se));
 float reduce=max((nw+ne+sw+se)*(.25*.125),1./128.);
 dir=clamp(dir/(min(abs(dir.x),abs(dir.y))+reduce),vec2(-6.),vec2(6.))*texel;
 vec3 a=.5*(texture2D(source,uv-dir/6.).rgb+texture2D(source,uv+dir/6.).rgb);
 vec3 b=a*.5+.25*(texture2D(source,uv-dir*.5).rgb+texture2D(source,uv+dir*.5).rgb);
 float lb=perceptualLuma(b);
 return lb<lo||lb>hi?a:b;
}
vec3 bright(vec2 p){
 vec3 c=max(texture2D(source,p).rgb,vec3(0.));
 float peak=max(c.r,max(c.g,c.b));
 // Soft knee, hue-preserving extraction; isolated hot pixels cannot blow out the halo.
 float soft=clamp(peak-.65,0.,1.);soft=soft*soft*.5;
 float contribution=max(peak-1.15,soft)/max(peak,.0001);
 return c*contribution*min(1.,8./max(peak,.0001));
}
void main(){
 vec2 sampleUv=uv0;
 // Three fleeting lens drops share the existing composite; no additional render pass.
 if(lensWater>0.){
  float age=.22-lensWater,fade=smoothstep(0.,.05,lensWater);
  for(int i=0;i<3;i++){
   float k=float(i);vec2 center=vec2(.24+k*.25,.30+sin(k*5.)*.12-age*.18);
   vec2 d=(uv0-center)*vec2(texel.y/texel.x,1.);float radius=.012+k*.003;
   float mask=1.-smoothstep(radius*.65,radius,length(d));sampleUv+=d*mask*.24*fade;
  }
 }
 vec3 c=antialias(sampleUv);
 // Eight samples on two rotated rings, no axial cross/star around headlights.
 vec2 d=texel*3.;vec3 bloom=vec3(0.);
 bloom+=bright(uv0+d*vec2(.924,.383));bloom+=bright(uv0+d*vec2(-.383,.924));
 bloom+=bright(uv0+d*vec2(-.924,-.383));bloom+=bright(uv0+d*vec2(.383,-.924));
 bloom*=.16;
 d=texel*7.;
 bloom+=bright(uv0+d*vec2(.383,.924))*.09;bloom+=bright(uv0+d*vec2(-.924,.383))*.09;
 bloom+=bright(uv0+d*vec2(-.383,-.924))*.09;bloom+=bright(uv0+d*vec2(.924,-.383))*.09;
 c+=bloom*.26*glow;
 vec2 v=uv0-.5;c*=1.-dot(v,v)*.18;
 gl_FragColor=vec4(c,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 gl_FragColor.rgb+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/255.;
}`;
