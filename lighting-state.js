// One parameter vocabulary for every drag scene. Legacy campaign looks stay valid.
export const ENVIRONMENTS={
 day:{sky:0x539de0,fog:0x9cbad2,sun:0xffdfa5,intensity:3.2,ambient:.78,fill:0x96bce9,ground:0x303c51,environment:.72,fogDensity:.0062,exposure:1.02,direction:[12,28,-30],street:0,headlights:0,clouds:.28},
 dawn:{sky:0x929fc0,fog:0xc5b6ad,sun:0xffc995,intensity:2.15,ambient:.66,fill:0xabc4e3,ground:0x37373d,environment:.67,fogDensity:.008,exposure:1.03,direction:[-13,10,-32],street:.18,headlights:.22,clouds:.35},
 sunset:{sky:0x777eaa,fog:0xcba47f,sun:0xffc17e,intensity:3.05,ambient:.64,fill:0xa7bfdc,ground:0x302a25,environment:.75,fogDensity:.006,exposure:1,direction:[-3,10,-32],street:.10,headlights:.12,clouds:.36},
 night:{sky:0x0a1325,fog:0x111d2c,sun:0x9cb5df,intensity:.11,ambient:.27,fill:0x91acd4,ground:0x1c222c,environment:1.05,fogDensity:.0085,exposure:1.08,direction:[-12,24,-30],street:1,headlights:1,clouds:.1},
 overcast:{sky:0x8b9ba8,fog:0xa8b7bf,sun:0xd3deea,intensity:.65,ambient:1.18,fill:0xd4e1e9,ground:0x4b4e4c,environment:.8,fogDensity:.009,exposure:1.02,direction:[8,30,-24],street:0,headlights:.18,clouds:.85}
};
export const WEATHER={dry:{wetness:0,rain:0,haze:0},wet:{wetness:.42,rain:0,haze:.0008},rain:{wetness:.72,rain:.65,haze:.0035},storm:{wetness:1,rain:1,haze:.005}};
export const STREET_LIGHTING={count:{safe:2,balanced:3,high:4},shadow:{safe:512,balanced:1024,high:1536},color:0xffddb0,intensity:350,radius:6,distance:19,fadeDistance:4.5};
export function environmentName(cfg){if(cfg.environmentState in ENVIRONMENTS)return cfg.environmentState;return cfg.look==='storm'||cfg.night?'night':cfg.look==='rain'?'overcast':cfg.look in ENVIRONMENTS?cfg.look:cfg.id==='factory'?'sunset':cfg.id==='country'?'dawn':cfg.id==='construction'?'overcast':'day';}
export function weatherName(cfg){return cfg.weatherState in WEATHER?cfg.weatherState:!cfg.wet?'dry':cfg.damp?'wet':cfg.storm||cfg.wet>=.95?'storm':'rain';}
export function lightingConfig(cfg,environment=environmentName(cfg),weather=weatherName(cfg)){
 const e=ENVIRONMENTS[environment]||ENVIRONMENTS.day,w=WEATHER[weather]||WEATHER.dry,rain=w.rain;
 return {...cfg,...e,environmentState:environment,weatherState:weather,look:environment,night:environment==='night',damp:weather==='wet',wet:w.wetness,rain,storm:weather==='storm'?1:0,sunDirection:e.direction,
  intensity:e.intensity*(1-rain*.56),ambient:e.ambient*(1+rain*.12),fogDensity:e.fogDensity*(environment==='day'&&weather==='dry'?.65:1)+w.haze,hazeStart:environment==='day'&&weather==='dry'?165:140,hazeEnd:environment==='day'&&weather==='dry'?198:195,sceneryDetail:environment==='day'?1:0,contactDensity:environment==='day'?1:0,street:e.street,headlights:Math.max(e.headlights,rain*.38)};
}
// Approximate incandescent/halogen/LED white, parameterized for future tuning.
export function headlightColor(kelvin=3900){const t=Math.max(2500,Math.min(6500,kelvin));return t<4500?[1,.76+(t-2500)/2000*.13,.47+(t-2500)/2000*.24]:[1,.89+(t-4500)/2000*.11,.71+(t-4500)/2000*.29];}
