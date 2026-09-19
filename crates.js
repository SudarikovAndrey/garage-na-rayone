export const CRATE_FINISHES=5;
// В первых районах ящик приходит реже: именно ящики, а не деньги, разгоняли мощь так, что к середине
// кампании покупать было уже нечего (Андрей, 17 сентября — «урезаем ранний доход»).
export const CRATE_STEPS=[7,6,5,5,5];
export const crateStepFor=rank=>CRATE_STEPS[Math.min(CRATE_STEPS.length-1,Math.max(0,Math.floor((Number(rank)||0)/45)))];
export const finishesToCrate=s=>crateStepFor(s?.rank)-(s.crateProgress||0);
export const CRATES=[
 {id:'street',name:'С РЫНКА',rarity:0,type:'Любая деталь',slots:null,weights:[55,28,13,4,0],art:0,currency:'cash',price:3000},
 {id:'tech',name:'ПОД КАПОТ',rarity:1,type:'Мотор · шины · КПП',slots:['engine','tires','gearbox'],weights:[0,75,22,3,0],art:1,currency:'cash',price:6500},
 {id:'body',name:'НА СТИЛЕ',rarity:1,type:'Обвесы · диски',slots:['spoiler','skirts','fenders','rims','bumpers'],weights:[0,75,22,3,0],art:2,currency:'cash',price:6500},
 {id:'boss',name:'СО СКЛАДА',rarity:2,type:'Любая деталь · эпическая+',slots:null,weights:[0,0,13,4,0],art:3,currency:'hard',price:90,cashPrice:32000},
 {id:'legend',name:'ЧЁРНЫЙ ЧЕМОДАН',rarity:3,type:'Легендарная деталь',slots:null,weights:[0,0,0,1,0],art:4,currency:'hard',price:240,cashPrice:90000},
 // Красный ящик: только уникальные детали. Падает за босса четвёртого и пятого районов и за двадцать друзей,
 // купить можно, но цена неприличная — это трофей, а не покупка.
 // Уникальные не продаются за рубли ни деталью, ни ящиком: их либо выигрывают, либо берут за баксы.
 {id:'unique',name:'КРАСНЫЙ ЯЩИК',rarity:4,type:'Уникальная деталь',slots:null,weights:[0,0,0,0,1],art:4,currency:'hard',price:900,cashPrice:null},
];
export const crateById=id=>CRATES.find(c=>c.id===id);
// Курс баксов в рублях: по нему у ящиков сделана рублёвая альтернатива (90 $ = 32 000 ₽,
// 240 $ = 90 000 ₽). Нужен там, где товар за баксы надо оценить в рублях — например на дороге
// корешей, где рядом стоят и рублёвые, и баксовые призы.
export const HARD_RATE=375;
// Чего товар стоит в рублях: своя рублёвая цена, иначе пересчёт баксов по курсу.
export const crateRubles=c=>c?c.cashPrice??(c.currency==='hard'?c.price*HARD_RATE:c.price):0;
export const crateCount=(s,id)=>id==='street'?s.boxes:id==='boss'?s.bossBoxes:s.crates?.[id]||0;
export const totalCrates=s=>CRATES.reduce((a,c)=>a+crateCount(s,c.id),0);
export function adjustCrate(s,id,amount){if(!crateById(id)||crateCount(s,id)+amount<0)return false;if(id==='street')s.boxes+=amount;else if(id==='boss')s.bossBoxes+=amount;else{s.crates??={};s.crates[id]=(s.crates[id]||0)+amount;}return true;}
export function noteLoot(s,id,reason){s.lootLog??=[];s.lootLog.unshift({id,reason});s.lootLog=s.lootLog.slice(0,20);}
export function grantCrate(s,id,reason){adjustCrate(s,id,1);noteLoot(s,id,reason);return {id,reason};}
export function restoreEconomy(s,d,integer){
 s.economyVersion=1;s.crateProgress=integer(d.crateProgress??((d.races||0)%CRATE_FINISHES),0,Math.max(...CRATE_STEPS)-1);s.hard=integer(d.hard??(50+s.rank*5+Math.floor(s.rank/5)*40),0,1e7);
 s.crates=Object.fromEntries(['tech','body','legend','unique'].map(id=>[id,integer(d.crates?.[id],0,10000)]));
 s.lootLog=Array.isArray(d.lootLog)?d.lootLog.filter(x=>crateById(x?.id)&&typeof x.reason==='string').slice(0,20).map(x=>({id:x.id,reason:x.reason.slice(0,80)})):[];
 if(!d.economyVersion){for(const c of CRATES)if(crateCount(s,c.id)>0)noteLoot(s,c.id,d.version?'Из прежних наград':'Подарок на старт');}
}
