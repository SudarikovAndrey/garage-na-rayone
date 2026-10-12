// All composition controls live here. Metres; one seamless scenery ring, generated once.
export const PUDDLE_CONFIG={
 seed:7319,density:1,areaScale:1,span:480,segmentLength:60,roadWidth:8,
 emptyGapMin:16,emptyGapMax:32,zoneLengthMin:10,zoneLengthMax:24,
 clusterCountWeights:[.12,.50,.31,.07],minClusterSpacing:4.5,
 edgeBias:.76,centerSuppression:.08,rutBias:.48,sideBias:.65,
 largeProbability:.20,curbPuddleProbability:.22,rutProbability:.18,
 curbLengthMin:3,curbLengthMax:11,curbWidthMin:.22,curbWidthMax:.62,
 primaryMedium:[.65,1.15,1.1,2.5],primaryLarge:[1.2,1.8,3.1,5.1],
 secondaryCount:[1,3],secondarySizeWeights:{tiny:.55,small:.35,medium:.10},
 wetHaloMin:.1,wetHaloMax:.4,nearDistance:28,midDistance:75,farDistance:170,
 wetRoughness:.34,veryWetRoughness:.23,zoneStrength:.40,haloStrength:.42,shallowRoughness:.13,waterRoughness:.065,waterDiffuse:.025,
 fieldWidth:64,fieldHeight:1024
};
// Track drainage changes coverage without changing weather or the scenery RNG.
export const TRACK_WATER={
 district:{density:1.55,largeProbability:.34},factory:{density:1.10,largeProbability:.26},
 construction:{density:1.85,largeProbability:.42},country:{density:.85,largeProbability:.22},
 railway:{density:1.30,largeProbability:.30}
};
export function trackPuddleOptions(cfg){const profile=TRACK_WATER[cfg.id]||{};return {clusterCountWeights:[.04,.30,.48,.18],...profile,...cfg.puddles,density:(profile.density||1)*(cfg.puddles?.density??1)};}
export const seededRandom=seed=>{let s=seed>>>0;return()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);};
export const wrap=(x,span)=>((x%span)+span)%span;
export const ringDelta=(a,b,span)=>wrap(a-b+span/2,span)-span/2;
const mix=(a,b,t)=>a+(b-a)*t;
const weighted=(r,weights)=>{let v=r()*weights.reduce((a,b)=>a+b,0);for(let i=0;i<weights.length;i++){v-=weights[i];if(v<0)return i;}return weights.length-1;};
// A slowly changing one-sided drainage bias, with shoulders and broken wheel ruts.
export function lateralWaterProbability(u,d,c=PUDDLE_CONFIG){
 const x=(u-.5)*c.roadWidth,edge=Math.pow(Math.min(1,Math.abs(x)/(c.roadWidth*.5)),3);
 const side=1+c.sideBias*Math.sin(d/c.span*Math.PI*2+.7)*Math.sign(x);
 const rut=Math.exp(-Math.pow((Math.abs(x)-2.65)/.30,2))+.65*Math.exp(-Math.pow((Math.abs(x)-1.15)/.25,2));
 return c.centerSuppression+c.edgeBias*edge*side+c.rutBias*rut;
}
export function generatePuddleLayout(seed,options={}){
 const c={...PUDDLE_CONFIG,...options},r=seededRandom((seed??1)^c.seed),zones=[],clusters=[],puddles=[];
 c.areaScale=Math.max(1,Math.min(10,Number(c.areaScale)||1));const sizeScale=Math.sqrt(c.areaScale);
 const phase=r()*c.span;let cursor=0,id=0;
 const chooseX=d=>{for(let i=0;i<32;i++){const x=(r()-.5)*(c.roadWidth-1.3);if(r()*1.65<lateralWaterProbability(x/c.roadWidth+.5,d,c))return x;}return (r()<.5?-1:1)*3.05;};
 const push=(p,cluster)=>{p.id=puddles.length;p.cluster=cluster.id;p.zone=cluster.zone;p.d=wrap(p.d,c.span);p.halo=mix(c.wetHaloMin,c.wetHaloMax,Math.pow(r(),.7));p.tile=(r()*8)|0;p.mirror=r()<.5;p.shapeSeed=(r()*4294967295)>>>0;p.exclusion=p.role==='primary'?Math.max(c.minClusterSpacing*.5,p.length*.65):0;p.segment=Math.floor(wrap(p.d+c.segmentLength/2,c.span)/c.segmentLength);p.localZ=ringDelta(p.segment*c.segmentLength,p.d,c.span);puddles.push(p);return p;};
 while(cursor<c.span){
  const gap=mix(c.emptyGapMin,c.emptyGapMax,r())/Math.max(.3,c.density),length=mix(c.zoneLengthMin,c.zoneLengthMax,r());
  cursor+=gap;if(cursor+length>c.span-8)break;
  const d=wrap(phase+cursor+length*.5,c.span),x=chooseX(d),intensity=.45+r()*.55;
  const zone={id:zones.length,d,x,length,width:2+r()*2,intensity};zones.push(zone);
  const count=weighted(r,c.clusterCountWeights);
  for(let n=0;n<count;n++){
   let candidate=null;
   for(let attempt=0;attempt<18;attempt++){
    const cd=wrap(d+(r()-.5)*length*.65,c.span),cx=n===0?x:chooseX(cd);
    const kind=r()<c.curbPuddleProbability?'curb':r()<c.rutProbability?'rut':'pool',large=kind==='pool'&&r()<c.largeProbability;
    const size=large?c.primaryLarge:c.primaryMedium;
    const baseWidth=kind==='curb'?mix(c.curbWidthMin,c.curbWidthMax,r()):kind==='rut'?.18+r()*.18:mix(size[0],size[1],r()*r());
    const baseLength=kind==='curb'?mix(c.curbLengthMin,c.curbLengthMax,r()*r()):kind==='rut'?1.5+r()*2.7:mix(size[2],size[3],r());
    // Increase physical area, not the count. Wider pools extend along the road;
    // narrow curb/rut chains retain their characteristic shape.
    const width=Math.min(baseWidth*sizeScale,c.roadWidth*.7),len=baseLength*c.areaScale*baseWidth/width;
    const side=cx<0?-1:1,px=kind==='curb'?side*(3.70-width*.5):kind==='rut'?side*(r()<.5?1.15:2.65):Math.max(-3.6+width*.6,Math.min(3.6-width*.6,cx));
    const exclusion=Math.max(c.minClusterSpacing*.5,len*.65);
    if(clusters.some(q=>Math.hypot(px-q.x,ringDelta(cd,q.d,c.span))<exclusion+q.exclusion))continue;
    candidate={id:id++,zone:zone.id,d:cd,x:px,width,length:len,baseLength,intensity,kind,large,exclusion,angle:kind==='pool'?(r()-.5)*1.2/sizeScale:(r()-.5)*.06};break;
   }
   if(!candidate)continue;const cl=candidate;clusters.push(cl);
   const parts=cl.kind==='pool'?1:Math.max(2,Math.ceil(cl.baseLength/1.8));
   // Long curb/rut water is a correlated chain of short shapes, not a stretched blob.
   for(let part=0;part<parts;part++){
    const primary=part===Math.floor(parts/2),step=cl.length/parts;
    push({...cl,x:cl.x+(r()-.5)*.08,d:cl.d+(part-(parts-1)/2)*step,width:cl.width*(primary?1:.55+r()*.3),length:parts===1?cl.length:step*(primary?1.1:.48+r()*.42),role:primary?'primary':'secondary',sizeClass:primary?(cl.large?'large':cl.kind==='curb'?'curb':'medium'):'small',roughness:cl.kind==='rut'?c.shallowRoughness:c.waterRoughness},cl);
   }
   const count=c.secondaryCount[0]+((r()*(c.secondaryCount[1]-c.secondaryCount[0]+1))|0);
   for(let j=0;j<count;j++){
    const k=weighted(r,Object.values(c.secondarySizeWeights)),a=r()*Math.PI*2,small=k===0?mix(.08,.23,r()*r()):k===1?mix(.26,.55,r()*r()):mix(.55,.8,r()*r());
    const dx=Math.cos(a)*(cl.width*.6+.2+r()*.25),dz=Math.sin(a)*(cl.length*.6+.3+r());
    push({x:Math.max(-3.73,Math.min(3.73,cl.x+dx)),d:cl.d+dz,width:Math.min(small,cl.width*.48),length:Math.min(small*(1.2+r()*1.3),cl.length/parts*.48),angle:r()*Math.PI,role:k===0?'satellite':'secondary',sizeClass:['tiny','small','medium'][k],kind:cl.kind,roughness:c.shallowRoughness},cl);
   }

  }
  cursor+=length;
 }
 const stats={zones:zones.length,clusters:clusters.length,large:0,medium:0,small:0,tiny:0,curb:0,rut:0,total:puddles.length,batches:new Set(puddles.map(p=>p.segment)).size};
 for(const p of puddles){if(p.sizeClass in stats)stats[p.sizeClass]++;if(p.kind==='rut'&&p.role==='primary')stats.rut++;}
 return {config:c,zones,clusters,puddles,stats};
}
