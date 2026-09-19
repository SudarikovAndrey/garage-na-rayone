// Финиш краски задаёт шейдинг кузова, а не только цвет: металлик отражает сильнее, эмаль копейки
// мягкая и глубокая, чёрный — рояльный лак, хаки и кислотный — сухие матовые.
export const FINISHES={
 metallic:{metalness:.62,roughness:.30,clearcoat:1,clearcoatRoughness:.07,envMapIntensity:1.45,specularIntensity:1},
 enamel:{metalness:.04,roughness:.36,clearcoat:.55,clearcoatRoughness:.24,envMapIntensity:.95,specularIntensity:.8},
 gloss:{metalness:.22,roughness:.16,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.3,specularIntensity:1},
 matte:{metalness:.05,roughness:.72,clearcoat:0,clearcoatRoughness:.5,envMapIntensity:.7,specularIntensity:.5},
 // Хамелеон: тонкоплёночная иридесценция MeshPhysicalMaterial — цвет уходит от базового к пурпуру и золоту по углу взгляда.
 // Хамелеон: цвет меняется по углу взгляда — зелёный в лоб, пурпур на скулах, золото на скользящих гранях (шейдерный хук
 // colorShift в car-customization). Сверху лёгкая физическая иридесценция для перелива в бликах.
 chameleon:{metalness:.55,roughness:.2,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.4,specularIntensity:1,iridescence:.6,iridescenceIOR:1.6,iridescenceThicknessRange:[200,600],shift:['#1e8f66','#7a2fb0','#e0a83a']},
};
export const paintFinish=id=>FINISHES[PAINTS.find(p=>p.id===id)?.finish]||FINISHES.enamel;
export const PAINTS=[{id:'cherry',name:'Вишня',color:'#781523',rarity:0,finish:'enamel'},{id:'ivory',name:'Слоновая кость',color:'#cec6a8',rarity:0,finish:'enamel'},{id:'black',name:'Чёрный',color:'#171a1c',rarity:0,finish:'gloss'},{id:'blue',name:'Синий',color:'#254973',rarity:1,finish:'metallic'},{id:'green',name:'Зелёный',color:'#295144',rarity:1,finish:'enamel'},{id:'silver',name:'Серебро',color:'#9da5ac',rarity:2,finish:'metallic'},{id:'orange',name:'Оранжевый',color:'#cb541e',rarity:2,finish:'enamel'},
 // Заводские цвета конкретных моделей: не выпадают и не продаются, их носит только та машина, на которой
 // они стояли с завода. Названия и коды — из заводских таблиц автоэмалей ВАЗ, ГАЗ, АЗЛК и УАЗ, а не придуманы:
 // 110 «Рубин», 170 «Торнадо», 377 «Мурена», 690 «Снежная королева», 420 «Балтика», 215 «Сафари» и так далее.
 // Гамма каждой модели собрана в STOCK_PAINTS ниже: что реально красили на конвейере в годы её выпуска.
 {id:'champagne',name:'Брызги шампанского',color:'#c9c2a4',rarity:0,finish:'metallic',stock:true},{id:'riesling',name:'Рислинг',color:'#d8d08a',rarity:0,finish:'enamel',stock:true},{id:'safari',name:'Сафари',color:'#ddc49a',rarity:0,finish:'enamel',stock:true},{id:'murena',name:'Мурена',color:'#1d3b38',rarity:0,finish:'metallic',stock:true},{id:'snow-queen',name:'Снежная королева',color:'#b9c6cc',rarity:0,finish:'metallic',stock:true},{id:'cypress',name:'Кипарис',color:'#3b5134',rarity:0,finish:'enamel',stock:true},{id:'garnet',name:'Гранат',color:'#6d1d20',rarity:0,finish:'enamel',stock:true},{id:'baltika',name:'Балтика',color:'#1b4763',rarity:0,finish:'metallic',stock:true},{id:'khaki',name:'Хаки',color:'#6b6a42',rarity:0,finish:'matte',stock:true},{id:'bright-white',name:'Ярко-белый',color:'#ddddd6',rarity:0,finish:'enamel',stock:true},
 // ВАЗ, классика и переднеприводные. Код эмали в скобках: по нему цвет ищут в любом малярном каталоге.
 {id:'rubin',name:'Рубин',color:'#7e1520',rarity:0,finish:'enamel',stock:true},/* 110 — главный красный «классики», в гамме с 1975 по 2000 */
 {id:'kardinal',name:'Кардинал',color:'#a11420',rarity:0,finish:'enamel',stock:true},/* 101 — ярко-красный, только на 2101 */
 {id:'ohra',name:'Охра золотистая',color:'#a35c1c',rarity:0,finish:'enamel',stock:true},/* 208 — ранние «Жигули» и «Нивы» 1970-х */
 {id:'adriatika',name:'Адриатика',color:'#3a5e74',rarity:0,finish:'enamel',stock:true},/* 425 — голубой семейства 2101–2103 */
 {id:'olivkovy',name:'Оливковый',color:'#5b5120',rarity:0,finish:'enamel',stock:true},/* 340 — жёлто-зелёный, 1974–2000 */
 {id:'sero-bely',name:'Серо-белый',color:'#c5c6c0',rarity:0,finish:'enamel',stock:true},/* 233 — самый долгоживущий светлый, 1972–1998 */
 {id:'snezhno-bely',name:'Снежно-белый',color:'#eceee9',rarity:0,finish:'enamel',stock:true},/* 202 — базовый белый поздних моделей */
 {id:'tornado',name:'Торнадо',color:'#a71122',rarity:0,finish:'enamel',stock:true},/* 170 — красный «девятки» */
 {id:'monte-carlo',name:'Монте-Карло',color:'#2e3470',rarity:0,finish:'enamel',stock:true},/* 403 — тёмно-синий 2108/2109/21099 */
 {id:'fregat',name:'Фрегат',color:'#2b6f6b',rarity:0,finish:'enamel',stock:true},/* 430 — бирюзовый «Спутника» */
 {id:'iceberg',name:'Айсберг',color:'#e2e4e1',rarity:0,finish:'enamel',stock:true},/* 204 — белая двухслойная */
 {id:'niagara',name:'Ниагара',color:'#a4b6b9',rarity:0,finish:'metallic',stock:true},/* 383 — массовый металлик конца 1990-х */
 {id:'amulet',name:'Амулет',color:'#1e3324',rarity:0,finish:'metallic',stock:true},/* 371 — тёмно-зелёный металлик */
 {id:'frankonia',name:'Франкония',color:'#7c1f2e',rarity:0,finish:'metallic',stock:true},/* 105 — тёмно-вишнёвый металлик */
 {id:'papirus',name:'Папирус',color:'#54573c',rarity:0,finish:'metallic',stock:true},/* 387 — оливковый металлик 21099 */
 {id:'sapfir',name:'Сапфир',color:'#40467c',rarity:0,finish:'metallic',stock:true},/* 446 — сине-фиолетовый металлик */
 {id:'rapsodia',name:'Рапсодия',color:'#1f5289',rarity:0,finish:'metallic',stock:true},/* 448 — синий металлик «десятки» */
 {id:'neptun',name:'Нептун',color:'#658b89',rarity:0,finish:'metallic',stock:true},/* 628 — серо-бирюзовый металлик */
 {id:'milky-way',name:'Млечный путь',color:'#3d4146',rarity:0,finish:'metallic',stock:true},/* 606 — графитовый металлик */
 {id:'triumf',name:'Триумф',color:'#8e2230',rarity:0,finish:'metallic',stock:true},/* 100 — красный металлик */
 {id:'zeleny-sad',name:'Зелёный сад',color:'#2a5a2a',rarity:0,finish:'enamel',stock:true},/* 307 — тёмно-зелёный «Оки» */
 {id:'zhemchug',name:'Жемчуг',color:'#dcdcd4',rarity:0,finish:'metallic',stock:true},/* 230 — молочно-белый металлик */
 {id:'feya',name:'Фея',color:'#a4b5ca',rarity:0,finish:'metallic',stock:true},/* 416 — серебристо-сиреневый, закреплён за «Окой» */
 {id:'taxi-299',name:'Такси',color:'#e0a81c',rarity:0,finish:'enamel',stock:true},/* 299 — лимонный таксопарковый */

 // Москвич (АЗЛК), Волга (ГАЗ) и утилитарная техника. У заводов были свои названия, поэтичные у легковых
 // и совсем простые у армейских: там палитра и правда сводилась к защитному, песочному и белому.
 {id:'arahis',name:'Арахис',color:'#d8c79a',rarity:0,finish:'enamel',stock:true},/* АЗЛК-2141, светло-жёлтый бежевый */
 {id:'golfstrim',name:'Гольфстрим',color:'#2f6b6f',rarity:0,finish:'enamel',stock:true},/* АЗЛК-2141, сине-зелёный */
 {id:'sadko',name:'Садко',color:'#2b4a7a',rarity:0,finish:'enamel',stock:true},/* АЗЛК-2140, синий рефлексный */
 {id:'forel',name:'Форель',color:'#6f9ec4',rarity:0,finish:'enamel',stock:true},/* АЗЛК-2140, голубой */
 {id:'alligator',name:'Аллигатор',color:'#3f5c3a',rarity:0,finish:'enamel',stock:true},/* АЗЛК-2140, зелёный */
 {id:'bosfor',name:'Босфор',color:'#1f5a8c',rarity:0,finish:'metallic',stock:true},/* АЗЛК М40, синий металлик */
 {id:'buran',name:'Буран',color:'#b9bcbd',rarity:0,finish:'metallic',stock:true},/* ГАЗ-3110, светлый алюминий */
 {id:'antracit',name:'Антрацит',color:'#2e3236',rarity:0,finish:'metallic',stock:true},/* ГАЗ-3110, тёмно-серый металлик */
 {id:'malahit',name:'Малахит',color:'#2a6448',rarity:0,finish:'metallic',stock:true},/* ГАЗ-3110, зелёный металлик */
 {id:'angara',name:'Ангара',color:'#45688c',rarity:0,finish:'metallic',stock:true},/* ГАЗ-3110, синий металлик */
 {id:'peschany',name:'Песочный',color:'#c7ab7b',rarity:0,finish:'matte',stock:true},/* УАЗ, южное исполнение */
 {id:'goluboy',name:'Голубой',color:'#8fb3c9',rarity:0,finish:'enamel',stock:true},/* СМЗ С-3Д, самый частый цвет мотоколяски */
 {id:'svetlo-sery',name:'Светло-серый',color:'#9aa0a2',rarity:0,finish:'enamel',stock:true},/* СМЗ С-3Д и фургоны */
 {id:'bezhevy',name:'Бежевый',color:'#cfbf9c',rarity:0,finish:'enamel',stock:true},/* УАЗ-469Б и мотоколяска */
 {id:'svetlo-zeleny',name:'Светло-зелёный',color:'#94a878',rarity:0,finish:'enamel',stock:true},/* СМЗ С-3Д */

 // Premium paints: bought for rubles late in the game or earned by records; never drop from crates.
 // Призовые цвета: только из ящиков, редкость задаёт шанс. Названия — с рынка и из гаража, а не из каталога.
 {id:'wet-asphalt',name:'Мокрый асфальт',color:'#4a4f55',rarity:1,finish:'metallic'},{id:'ripe-plum',name:'Спелая слива',color:'#5b2a4d',rarity:1,finish:'gloss'},{id:'market-teal',name:'Бирюза с рынка',color:'#2f8f8a',rarity:1,finish:'enamel'},{id:'apricot',name:'Абрикос',color:'#e9a35a',rarity:1,finish:'enamel'},{id:'electric',name:'Электрик',color:'#1f5fd0',rarity:1,finish:'metallic'},{id:'swamp',name:'Болотный',color:'#4f5a35',rarity:1,finish:'matte'},{id:'ash',name:'Пепел',color:'#8d8f8a',rarity:1,finish:'matte'},{id:'latte',name:'Кофе с молоком',color:'#a4826a',rarity:1,finish:'enamel'},{id:'raspberry',name:'Малина',color:'#a8234f',rarity:1,finish:'gloss'},{id:'garage-sky',name:'Небо над гаражами',color:'#7fa9d6',rarity:1,finish:'enamel'},{id:'lemon',name:'Лимонка',color:'#e6d34a',rarity:1,finish:'enamel'},{id:'dark-chocolate',name:'Тёмный шоколад',color:'#3c2a22',rarity:1,finish:'gloss'},
 {id:'night-club',name:'Ночной клуб',color:'#2a1e4f',rarity:2,finish:'metallic'},{id:'petrol-film',name:'Бензиновая плёнка',color:'#3a6f6a',rarity:2,finish:'metallic'},{id:'brick',name:'Кирпич',color:'#8a3b2b',rarity:2,finish:'matte'},{id:'polished-kettle',name:'Полированный чайник',color:'#c8ccd0',rarity:2,finish:'metallic'},{id:'bordeaux',name:'Бордо',color:'#5e1420',rarity:2,finish:'gloss'},{id:'emerald',name:'Изумруд',color:'#1d6b4a',rarity:2,finish:'metallic'},{id:'tangerine',name:'Мандарин',color:'#f08a2c',rarity:2,finish:'gloss'},{id:'pink-panther',name:'Розовая пантера',color:'#d86b9a',rarity:2,finish:'gloss'},{id:'copper',name:'Медь',color:'#a86a3a',rarity:2,finish:'metallic'},{id:'ocean',name:'Океан',color:'#1b4a7a',rarity:2,finish:'gloss'},{id:'olive',name:'Оливка',color:'#7a7a3a',rarity:2,finish:'enamel'},{id:'lead',name:'Свинец',color:'#5a5d66',rarity:2,finish:'metallic'},
 {id:'chameleon',name:'Хамелеон',color:'#2f7f6a',rarity:3,finish:'chameleon'},{id:'salad',name:'Ярко-салатовый',color:'#9dff2e',rarity:3,finish:'gloss'},{id:'fuchsia',name:'Фуксия',color:'#ff2fa6',rarity:3,finish:'gloss'},{id:'chili',name:'Красный перец',color:'#c8202a',rarity:3,finish:'gloss'},{id:'taxi-yellow',name:'Жёлтый такси',color:'#f2c31e',rarity:3,finish:'enamel'},{id:'pearl-white',name:'Белый перламутр',color:'#eef0ea',rarity:3,finish:'metallic'},{id:'matte-black',name:'Чёрный мат',color:'#1d1f22',rarity:3,finish:'matte'},{id:'ultraviolet',name:'Ультрафиолет',color:'#3a1ea8',rarity:3,finish:'gloss'},
 // Premium paints: bought for rubles late in the game or earned by records; never drop from crates.
 {id:'graphite',name:'Графит',color:'#3b3f45',rarity:2,finish:'metallic',price:18000},{id:'plum',name:'Баклажан',color:'#4a1d3f',rarity:2,finish:'gloss',price:22000},{id:'mint',name:'Мятный',color:'#6fb7a0',rarity:2,finish:'enamel',price:22000},{id:'lime',name:'Кислотный',color:'#a8d13a',rarity:3,finish:'matte',price:36000},{id:'gold',name:'Золото',color:'#c9a227',rarity:3,finish:'metallic',price:45000}];
export const PAINT_OFFERS=PAINTS.filter(p=>p.price);
import {CARS} from './fleet.js';
const STOCK_COLOR=CARS.map(c=>c.color);
export const STARTER_PAINTS=['cherry','ivory','black'];
export const PAINT_CHANCE=.25;
export const paintById=id=>PAINTS.find(p=>p.id===id);
// Заводская гамма по моделям: что реально красили на конвейере в годы выпуска этой машины.
// Первым идёт цвет, в котором машина стоит в гараже с самого начала. Источники — заводские таблицы
// эмалей и разбивки гаммы по моделям за 2001–2004 годы; коды указаны рядом с самими красками выше.
export const STOCK_PAINTS={
 kopeyka:['ivory','rubin','ohra','adriatika','olivkovy','sero-bely'],
 pyaterka:['safari','snezhno-bely','rubin','murena','baltika','garnet','taxi-299'],
 samara:['cherry','rubin','baltika','monte-carlo','fregat','iceberg'],
 nine:['champagne','tornado','baltika','snow-queen','niagara','amulet','frankonia'],
 'ninety-nine':['murena','snezhno-bely','monte-carlo','papirus','niagara','sapfir'],
 ten:['snow-queen','snezhno-bely','amulet','niagara','rapsodia','neptun','triumf'],
 niva:['cypress','snezhno-bely','rubin','murena','baltika','safari','ohra'],
 oka:['riesling','rubin','zeleny-sad','baltika','niagara','zhemchug','feya'],
 // Москвич: «Арахис» и «Гольфстрим» с переднеприводного 2141, «Садко», «Форель» и «Аллигатор» — рефлексные эмали 2140.
 moskvich:['garnet','arahis','golfstrim','sadko','forel','alligator','bosfor'],
 // Волга: парадный чёрный и заводские металлики 3110.
 volga:['black','buran','antracit','malahit','angara','murena','ivory'],
 // УАЗ: гамма военного вездехода, защитный матовый и южное песочное исполнение.
 uaz:['khaki','peschany','bezhevy','snezhno-bely','sero-bely'],
 // Буханка: белый санитарный, защитный и служебные светлые.
 bukhanka:['bright-white','khaki','peschany','svetlo-sery','sero-bely'],
 // Мотоколяска: четыре простых цвета, поэтичных названий у неё не было.
 smz:['baltika','goluboy','svetlo-sery','bezhevy','svetlo-zeleny']
};
// Заводская гамма модели: цвета, в которые её реально красили на заводе, с каталожными названиями.
// Они не продаются и не выпадают из ящиков — их носит только своя машина, зато любой из них можно
// вернуть в мастерской бесплатно. Первым в списке стоит цвет, в котором машина приезжает в гараж.
export const stockPaintsFor=car=>{
 const id=typeof car==='number'?CARS[car]?.id:car;
 return (id&&STOCK_PAINTS[id])||[];
};
// Краска доступна, если она куплена или выпала, либо это заводской цвет той самой машины.
export const ownsPaint=(s,id,car=null)=>!!paintById(id)&&(!!s.ownedPaints?.includes(id)||(car!==null&&car!==undefined&&stockPaintsFor(car).includes(id)));
// Цвет машины читаем из исходных данных сейва, а не из уже разобранного поля: hydrate пропускает через
// себя только семь давних id и остальное сбрасывает на заводской, из-за чего купленная краска слетала при
// каждом перезаходе. Право на краску всё равно проверяется здесь — куплена она или входит в гамму модели.
export function restorePaints(s,d){
 s.paintUnlockVersion=1;
 s.ownedPaints=[...new Set([...STARTER_PAINTS,...(Array.isArray(d.ownedPaints)?d.ownedPaints.filter(id=>paintById(id)):[])])];
 const saved=Array.isArray(d.paint)?d.paint:[];
 s.paint=s.paint.map((id,i)=>{const want=typeof saved[i]==='string'?saved[i]:id;return ownsPaint(s,want,i)?want:(STOCK_COLOR[i]??'cherry');});
}
// Paint is a bonus: never replaces the guaranteed part or changes its pity counter.
// Сначала редкость по весам ящика (редкая 28 · эпическая 13 · легендарная 4) среди ещё не собранных, потом цвет внутри неё.
const PAINT_WEIGHTS=[0,28,13,4];
export function rollPaintBonus(s,rawRng=Math.random){const rng=()=>{const v=rawRng();return Number.isFinite(v)?Math.max(0,Math.min(.999999,v)):0;};if(rng()>=PAINT_CHANCE)return null;const pool=PAINTS.filter(p=>p.rarity>0&&!p.price&&!p.stock&&!ownsPaint(s,p.id));if(!pool.length){s.scrap+=10;return {duplicate:true,scrap:10};}
 const tiers=[1,2,3].filter(r=>pool.some(p=>p.rarity===r)),total=tiers.reduce((a,r)=>a+PAINT_WEIGHTS[r],0);let roll=Math.max(0,Math.min(.999999,rng()))*total,tier=tiers[tiers.length-1];for(const r of tiers){roll-=PAINT_WEIGHTS[r];if(roll<0){tier=r;break;}}
 const inTier=pool.filter(p=>p.rarity===tier),p=inTier[Math.min(inTier.length-1,Math.max(0,Math.floor(rng()*inTier.length)))];s.ownedPaints.push(p.id);return {id:p.id,duplicate:false,scrap:0};}
