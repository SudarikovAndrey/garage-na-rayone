// Рубежи за корешей. Один рубеж «трое доехали — редкий ящик» упирался в потолок: позвал четвёртого —
// и звать больше незачем. Лестница решает это тем же способом, что и кампания: следующая ступень
// видна всегда, а награда на ней заметно дороже предыдущей.
//
// Замысел ступеней:
// · 3 и 5 — сила. Человек только начал звать, ему нужно то, что сразу едет быстрее: деталь и материалы.
// · 8 и 12 — то, что видно. Краска и неон стоят в магазине десятки тысяч, и получить их за корешей
//   приятнее, чем купить: машина начинает отличаться от чужих.
// · 15 и 20 — статус. Легендарный ящик и золото с ксеноном: это уже «смотрите, сколько я привёл».
// · Дальше — бесконечный хвост: каждые десять корешей ещё один легендарный ящик, чтобы лестница
//   не заканчивалась на двадцати и звать было зачем всегда.
//
// Засчитывается доехавший до финиша, а не открывший ссылку — это правило старше лестницы и не меняется.
export const REFERRAL_TIERS=[
 {mates:3,key:'mates3',payload:{crate:'boss'},title:'Эпический ящик',short:'ящик'},
 {mates:5,key:'mates5',payload:{scrap:400,cash:25000},title:'400 ⚒ и 25 000 ₽',short:'материалы'},
 {mates:8,key:'mates8',payload:{paint:'mint',hard:100},title:'Краска «Мятный» и 100 $',short:'краска'},
 {mates:12,key:'mates12',payload:{neon:'xenon',crate:'boss',hard:50},title:'Неон «Ксенон», ящик и 50 $',short:'неон'},
 {mates:15,key:'mates15',payload:{crate:'legend'},title:'Легендарный ящик',short:'легендарный ящик'},
 {mates:20,key:'mates20',payload:{paint:'gold',neon:'lagoon',crate:'unique'},title:'Золото, неон и КРАСНЫЙ ЯЩИК',short:'красный ящик'},
];
// Хвост: после последней именной ступени — легендарный ящик за каждые следующие десять корешей.
export const REFERRAL_TAIL={every:10,payload:{crate:'legend'},title:'Легендарный ящик',short:'легендарный ящик'};
// Совместимость: первая ступень и есть старая цель. Бот и тексты считают по ней, пока не дошли до своей.
export const REFERRAL_GOAL=REFERRAL_TIERS[0].mates;

const tail=index=>{
 const mates=REFERRAL_TIERS[REFERRAL_TIERS.length-1].mates+REFERRAL_TAIL.every*index;
 return {mates,key:'mates'+mates,payload:{...REFERRAL_TAIL.payload},title:REFERRAL_TAIL.title,short:REFERRAL_TAIL.short,tail:true};
};
// Все ступени, которые уже закрыты этим числом доехавших корешей.
export function reachedTiers(activated){
 const done=REFERRAL_TIERS.filter(t=>activated>=t.mates);
 const last=REFERRAL_TIERS[REFERRAL_TIERS.length-1].mates;
 for(let i=1;activated>=last+REFERRAL_TAIL.every*i;i++)done.push(tail(i));
 return done;
}
// Следующая ступень: именная, пока они не кончились, дальше — очередная десятка.
export function nextTier(activated){
 const named=REFERRAL_TIERS.find(t=>activated<t.mates);
 if(named)return named;
 const last=REFERRAL_TIERS[REFERRAL_TIERS.length-1].mates;
 return tail(Math.floor((activated-last)/REFERRAL_TAIL.every)+1);
}
// Сколько осталось до следующей ступени — это и есть то число, которое видит человек.
export const matesLeft=activated=>Math.max(0,nextTier(activated).mates-activated);
