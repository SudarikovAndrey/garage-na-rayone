// Sound-design identities, not claims that the stock bodies contain these swaps.
// Samara/Niva keep their approved WRX voices; other tuned cars use separate recordings.
const PROFILES={
 samara:{name:'Восьмёрка',bank:'wrx',label:'оппозитный рык',stockRate:1,stockBody:.8,stockCenter:700,stockColor:1,stockGain:1,sportBody:2.5,sportThroat:440,sportAir:1,sportGain:1,popRate:1},
 kopeyka:{name:'Копейка',bank:'street',label:'мягкий басовый выпуск',stockRate:1.10,stockBody:-1,stockCenter:1050,stockColor:1.22,stockGain:.94,sportBody:2.4,sportThroat:320,sportAir:.84,sportGain:.74,popRate:1.13},
 volga:{name:'Волга',bank:'mustang',label:'тяжёлый басовый выхлоп',stockRate:.83,stockBody:4,stockCenter:380,stockColor:.74,stockGain:1.03,sportBody:2.7,sportThroat:240,sportAir:.75,sportGain:1.02,popRate:.78},
 twelve:{name:'Двенашка',bank:'coupe',label:'чистый спортивный бас',stockRate:1.04,stockBody:.4,stockCenter:850,stockColor:1.1,stockGain:.98,sportBody:2.2,sportThroat:480,sportAir:.9,sportGain:.94,popRate:1.06},
 niva:{name:'Нива',bank:'wrx',label:'низкий раллийный рык',stockRate:.92,stockBody:3,stockCenter:430,stockColor:.82,stockGain:1,sportBody:3.3,sportThroat:340,sportAir:.9,sportGain:.98,popRate:.88},
};
for(const p of Object.values(PROFILES))Object.freeze(p);
export const CAR_ENGINE_PROFILES=Object.freeze(PROFILES);
export const engineProfile=id=>PROFILES[id]||PROFILES.samara;
// A loud exhaust needs an open pipe. ECU and turbo progressively enable bursts;
// neither engine level alone nor a turbo on a muffled stock exhaust shoots.
export function exhaustMode(voice={}){
 if(!(voice.pipe>0&&voice.pops>0))return 'quiet';
 if(voice.antilag>0&&voice.spool>0)return 'antilag';
 return voice.antilag>0?'crackle':'street';
}
