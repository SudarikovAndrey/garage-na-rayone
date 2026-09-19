import {isOverpassStage,overpassStage} from './overpass-flow.js';
import {CAMPAIGN_LENGTH,CAMPAIGN_REVISION,campaignPosition,campaignDistance,BEATS,driftTarget,CHASE,benchmarkLevels} from './campaign-config.js';
import {CAMPAIGN_TUNING} from './campaign-tuning.js';
export {CAMPAIGN_LENGTH} from './campaign-config.js';
import {vehicleStats} from './vehicle-dynamics.js';
import {restorePaints,rollPaintBonus} from './paints.js';
import {restoreGoals,noteGoal,noteTrackRecord} from './goals.js';
import {restorePlayed,recordRace} from './played-stats.js';
import {CAPTAINS,DISTRICT_BOSSES} from './characters.js';
import {upgradeLevels,restoreUpgrades,grantUpgrade,missingUpgrades,upgradeNeedsLevel,upgradeAllowed} from './upgrades.js';
import {track} from './analytics.js';
import {restoreDecals,rollDecalBonus,addDecal,bossDecal,PERSONAL_DECALS} from './decals.js';
import {restoreNeons,bossNeon,rollNeonBonus,ownsNeon,addNeon} from './neons.js';
import {restoreForm,updateForm,applyForm} from './form.js';
import {restoreLines} from './rival-line.js';
import {CRATE_FINISHES,crateStepFor,crateById,crateCount,adjustCrate,grantCrate,restoreEconomy} from './crates.js';
import {garageLevel,restoreGarageLevel,garageRankCap,requiredGarageFor,carSlotsFor,GARAGE_LEVELS as GARAGE_LEVELS_SLOTS} from './garage-levels.js';
import {carLevel as carLevelOf,carRankCap as carRankCapOf,restoreCarLevels,levelForRank} from './car-levels.js';
import {bodyRankCap,benchCarFor,CAR_SHARD_ORDER} from './car-classes.js';
import {CARS,CAR_COUNT} from './fleet.js';
import {validAvatar} from './avatar.js';
import {TRACKS,trackIndex,lookForRank} from './tracks.js';
import {rivalFor} from './rivals.js';
// Лестница машин (Андрей, 18 сентября): восьмёрка — стартовая, дальше копейка, 99-я, волга, десятка.
// Каждая следующая держит детали рангом выше (BODY_RANK в car-classes) и стоит заметно дороже:
// открытие должно быть событием на несколько десятков заездов, а не мелочью против 212 чертежей прокачки.
// Москвич, ока, инвалидка и внедорожники в лестницу пока не входят — их чертежи не копятся вовсе.
// Цены открытия подогнаны под поток шардов (этап даёт 1, главарь 3+район): копейка приходит к 33 рангу,
// 99-я к 88, волга к 133, десятка к 178 — каждая чуть раньше своего района, чтобы игрок въезжал в район
// на его машине, а не догонял чужой темп на прошлой.
export const CAR_SHARD_COSTS=[0,50,8,10,14,75,100,16,16,10,90,18,26];
// Порядок лестницы живёт в car-classes.js — там же, где потолки кузовов.
// Машины, которые не вывозят темп поздних районов: фургоны и внедорожники. Список нужен там,
// где этап обязан сопротивляться, — на «Вызове», у главарей и боссов.
export const SLOW_CARS=new Set(['niva','uaz','bukhanka','smz']);
export const BOSS_CARS=[6,10,1,10,10]; // Десятка, Волга, Копейка, Волга, Волга — Кабан на копейке хаки; Нива боссовый темп не держит ни на одной дистанции
// Ordinary opponents drive cars of their district: an Инвалидка cannot be tuned to a district-5 pace over 804 m, so late
// districts field the faster classics and the off-roaders where the dirt is.
export const STAGE_CARS=[[2,1,9,3,8],[1,3,8,0,4],[0,4,8,10,7,5],[4,5,6,7,11,10],[5,6,10,0,4]];
// Пятая редкость — «Уникальная» (Андрей, 17 сентября): красная окантовка, очень редкая и очень желанная.
// Вес в общем броске нулевой: из рыночных ящиков она не падает вовсе. Достать её можно только там, где это
// событие: красный ящик за босса четвёртого и пятого районов, за двадцать друзей и за неприличные деньги.
// Потолок ранга тот же, что у легендарной (выше не пускают гараж и уровень машины), сила — в базе и шаге
// прокачки: это и есть запас мощи на последние сто рангов, где иначе покупать уже нечего.
export const RARITIES=[{name:'Обычная',color:'#a9ab9a',weight:55,maxRank:5},{name:'Редкая',color:'#73b9ef',weight:28,maxRank:7},{name:'Эпическая',color:'#c08aec',weight:13,maxRank:10},{name:'Легендарная',color:'#eeb857',weight:4,maxRank:15},{name:'Уникальная',color:'#e4463a',weight:0,maxRank:15}];
export const SLOTS=[{id:'engine',name:'Мотор',icon:'⚙',stats:[1,0,0]},{id:'tires',name:'Шины',icon:'◉',stats:[0,1,0]},{id:'gearbox',name:'КПП',icon:'⤴',stats:[0,0,1]},{id:'spoiler',name:'Спойлер',icon:'━',stats:[.22,0,.05]},{id:'skirts',name:'Юбки',icon:'▰',stats:[.16,0,0]},{id:'fenders',name:'Крылья',icon:'◠',stats:[0,.24,0]},{id:'rims',name:'Диски',icon:'✺',stats:[.08,.25,0]},{id:'bumpers',name:'Бамперы',icon:'▱',stats:[.12,.08,0]}];
const nicknames={
 engine:['Капиталочка','Батин секрет','Злой карб','Ракета района','Сердце Кабана'],
 tires:['Ещё походят','Свежий навар','Жвачка','Клей для трассы','Тапки Тихого'],
 gearbox:['Хрустит, едет','Короткоходка','Щёлк — ушёл','Без базара','Щелчок Михалыча'],
 spoiler:['Скамейка','Антикрылышко','Аэродром','На взлёт','Крыло Ржавого'],
 skirts:['Кооператив','Порог понтов','Ниже плинтуса','Асфальторез','Пороги Мадам'],
 fenders:['Рихтовочка','На вырост','Плечи шире','Шкаф на колёсах','Плечи Буйвола'],
 rims:['Литьё с рынка','Понты на литье','Малиновый шик','Золото района','Диски Кисули'],
 bumpers:['Кооперативный спорт','Губа не дура','Обвес авторитета','Асфальт пополам','Клык Профессора'],
};
// Стили обвеса: одна и та же деталь по слоту и редкости, но другой школы формообразования. Базовый стиль (дрифт)
// без суффикса в id — старые сейвы не меняются. Остальные стили только выпадают из ящиков, магазин их не продаёт.
// «Союз» (soyuz) выключен решением Андрея от 16 сентября: бампер из модели пока слаб. Код стиля в билдерах остаётся, в наборе его нет.
export const KIT_STYLES=[{id:null,name:'Дрифт'},{id:'ring',name:'Кольцо'},{id:'rally',name:'Ралли'},{id:'bunny',name:'Заклёпки'}];
export const BODY_SLOTS=['spoiler','skirts','fenders','bumpers'];
const styleNicknames={
 ring:{spoiler:['Губа багажника','Планка кольцевика','Крыло паддока','Туринг-класс','Титул кольца'],skirts:['Клин из стеклопластика','Порог кольцевика','Пластик боевой','Стеклоткань чемпиона','Карбон паддока'],fenders:['Квадратная арка','Накладка с болтами','Коробчатые плечи','Кольцевой шкаф','Арки титула'],bumpers:['Фартук кольцевика','Три щели','Морда паддока','Гульф на районе','Клык паддока']},
 rally:{spoiler:['Полка ралли','Рамка с плавниками','Раллийный ящик','Двухэтажка','Крыло спецучастка'],skirts:['Пороги с трубой','Слайдеры','Защита бортов','Броня раллиста','Броня спецучастка'],fenders:['Расширители с брызговиками','Квадраты с грязью','Раллийные лопухи','Дакар на районе','Арки для грязи'],bumpers:['Морда с противотуманками','Защита картера','Четыре фары','Штурм трассы','Кенгурятник чемпиона']},
 soyuz:{spoiler:['Планка Союза','Крыло на стойках','Аэро СССР','Красный флаг','Знамя Союза'],skirts:['Порог Волги','Плита Союза','Борт заводской команды','Красная плита','Плита с завода'],fenders:['Чёрные накладки','Пластик на болтах','Расширители Союза','Чёрный шкаф','Крылья парада'],bumpers:['Фартук Волги','Интеркулер напоказ','Клинья и решётка','Союз нерушимый','Таран Союза']},
 bunny:{spoiler:['Хвост на заклёпках','Планка с рёбрами','Крыло от бампера','Заклёпочный монстр','Хвост зверя'],skirts:['Доска на заклёпках','Лезвие уличное','Лезвие с крылышком','Полный обклёп','Борта зверя'],fenders:['Фланец на болтах','Овер-крылья','Заклёпочная ширь','Кролик с района','Арки зверя'],bumpers:['Губа на заклёпках','Канарды уличные','Морда с плавниками','Заклёпочный передел','Пасть зверя']},
};
export const partId=(slot,rarity,style=null,variant=0)=>slot+'-'+rarity+(style?'-'+style:'')+(variant?'~'+variant:'');
// Варианты внутри редкости (Андрей, 17 сентября): одна и та же деталь по слоту и редкости, но с другим уклоном —
// «с рынка» тянет мощь, «от бати» держит дорогу, «от Толяна» щёлкает передачи, «с гарантией» качается на ранг дальше,
// «за пиво» — на ранг меньше. Базовый вариант без суффикса — та же деталь, что была (сейвы и калибровка кампании
// не сдвигаются). Обычных вариантов много, легендарных — один-два: обычное должно быть россыпью, редкое — штучным.
// bias — куда перетекает 15 % силы детали (0 мощь, 1 держак, 2 переключения); rank — сдвиг потолка прокачки.
export const VARIANT_TAGS=[
 [['с разбора',null,0],['с рынка',0,0],['б/у',2,0],['от бати',1,0],['по объявлению',null,1],['из-под полы',0,0],['с барахолки',1,-1],['от Толяна',2,1],['за пиво',null,-1],['с пробегом',0,-1],['без документов',2,0],['после шаманства',1,0]],
 [['из Тольятти',0,0],['по блату',1,1],['из Польши',2,0],['с гарантией',null,1],['для драга',0,0],['для кольца',1,0]],
 [['на заказ',0,1],['от Деда Турбо',2,1],['из Германии',1,0]],
 [['от чемпиона',0,0]],/* легендарный потолок 15 — предел гаража, выше не прокачать */
 [],/* уникальная — без вариантов, она одна такая */
];
// Сколько вариантов сверх базового: у базового стиля больше, у стилевых обвесов меньше (стиль — сам уже вариант).
// У уникальной вариантов нет вовсе: «Сердце Кабана» одно, торговаться с ним не о чем.
export const VARIANT_COUNTS={base:[12,6,3,1,0],styled:[6,3,2,1,0]};
// Уклон нейтрален по «мощи»: сколько рейтинга ушло с одних осей (веса 14/5/3 из vehicle-dynamics), столько пришло на
// ось уклона. Мощь варианта равна базовой, а поведение на трассе — своё: держак или переключения вместо чистой тяги.
const VARIANT_TILT=.12,RATING_WEIGHTS=[14,5,3];
export const variantStats=(stats,bias)=>{if(bias===null||bias===undefined)return stats;const moved=stats.reduce((a,v,i)=>a+v*RATING_WEIGHTS[i],0)*VARIANT_TILT;return stats.map((v,i)=>+(v*(1-VARIANT_TILT)+(i===bias?moved/RATING_WEIGHTS[i]:0)).toFixed(4));};
export const PARTS=SLOTS.flatMap(s=>RARITIES.flatMap((r,i)=>(BODY_SLOTS.includes(s.id)?KIT_STYLES:[KIT_STYLES[0]]).flatMap(st=>{
 const nick=st.id?styleNicknames[st.id][s.id][i]:nicknames[s.id][i],count=VARIANT_COUNTS[st.id?'styled':'base'][i];
 return Array.from({length:count+1},(_,k)=>{
  const tag=k?VARIANT_TAGS[i][k-1]:null,nickname=tag?nick+' '+tag[0]:nick;
  return {id:partId(s.id,i,st.id,k),slot:s.id,style:st.id,styleName:st.name,variant:k,tag:tag?.[0]||null,bias:tag?tag[1]:null,name:s.name+' «'+nickname+'»',nickname,rarity:i,maxRank:Math.min(RARITIES[RARITIES.length-1].maxRank,Math.max(3,r.maxRank+(tag?tag[2]:0))),icon:s.icon,stats:tag?variantStats(s.stats,tag[1]):s.stats};
 });})));
export const variantsOf=(slot,rarity,style=null)=>PARTS.filter(p=>p.slot===slot&&p.rarity===rarity&&p.style===(style||null));
export const partById=id=>PARTS.find(p=>p.id===id);
// Стиль разыгрывается последним, чтобы не сдвигать прежние броски редкости и слота.
export const rollStyle=(slot,rng=Math.random)=>BODY_SLOTS.includes(slot)?KIT_STYLES[Math.min(KIT_STYLES.length-1,Math.floor(Math.max(0,rng())*KIT_STYLES.length))].id:null;
// Картинка детали для плиток тюнинга, лута и наград.
// Картинок нарисовано на четыре редкости (0..3). Уникальные ждут свой арт и пока показываются
// легендарной картинкой — редкость всё равно читается красной окантовкой.
const ART_RARITY=r=>Math.min(3,r);
export const partPicture=p=>'assets/parts/'+(['engine','gearbox'].includes(p.slot)?p.slot:p.slot==='tires'?'tires-stock':p.slot+'-'+ART_RARITY(p.rarity)+(p.style?'-'+p.style:''))+'.webp';
export const AREAS=TRACKS.map(t=>t.name);

// Имена рядовых соперников этапов 1–4 — пацаны с улицы без портретов. Главарям серий лица даёт
// FEATURED_CAPTAINS ниже: с составом в 22 персонажа хватает на все 40 слотов.
const NAMES=['Пыж','Толян','Гарик','Лысый','Борода','Сивый','Жора','Батон','Штырь','Кувалда','Чиж','Пельмень'];
// Главари серий с лицами: 11 персонажей без своего района на 40 слотов, по районам (серии 1–8).
// Новые лица входят постепенно — в первом районе четверо, дальше по одному-два, Форинт только с
// четвёртого; между новыми возвращаются уже знакомые, как кореши. У каждого 3–4 выхода за кампанию,
// в одном районе лицо не повторяется чаще двух раз. Боссы районов сюда не входят.
export const FEATURED_CAPTAINS={
 4:'Кино',9:'Косой',14:'Пловец',19:'Хук',24:'Кино',29:'Косой',34:'Пловец',39:'Хук',
 49:'Искра',54:'Кино',59:'Профессор',64:'Кисуля',69:'Косой',74:'Искра',79:'Мастер',84:'Хук',
 94:'Пловец',99:'Кисуля',104:'Профессор',109:'Мадам',114:'Мастер',119:'Искра',124:'Железный',129:'Кино',
 139:'Мадам',144:'Косой',149:'Профессор',154:'Форинт',159:'Железный',164:'Кисуля',169:'Хук',174:'Мастер',
 184:'Форинт',189:'Пловец',194:'Искра',199:'Мадам',204:'Кисуля',209:'Профессор',214:'Форинт',219:'Железный'
};
// Боссы с характером: Кабан — охотник-рыбак, ездит на прокачанной Ниве цвета хаки (Андрей, 16 сентября).
// Внешний вид босса: краска и обвес. Машину здесь не назначаем — её выбирает BOSS_CARS по темпу.
// Пересадка Кабана на Ниву (car:7) тихо отменяла этот выбор: на 804 метрах Нива не держит боссовый
// темп даже прокачанная в потолок, и калибровка честно писала «недостижимая цель» — босс второго
// района был формальностью. Хочешь вернуть Ниву — верни и дистанцию, на которой она живая.
// Внешность именных гонщиков: краска, стиль обвеса и цвет неона — то, по чему их узнают с дороги.
// Боссы и главари на стоковых тачках выглядели стыдно (Андрей, 17 сентября): тот, кто держит район,
// обязан приехать на прокачанной. Стиль идёт от характера — рокеру ночной клуб и ультрафиолет,
// охотнику камуфляж и хаки, меняле золото, киллеру матовый чёрный и холодная трубка.
// Ливреи здесь не назначаем: именной винил живёт в PERSONAL_DECALS и падает игроку как трофей.
// Кисуля ездит на фуксии — «Догонишь тётю — может, телефончик дам» (Андрей, 17 сентября).
// Кабану Ниву не возвращать: на 804 м она не держит боссовый темп даже прокачанная в потолок
// (16.9 с против 12–13 у Волги), поэтому у него копейка в камуфляже, а не внедорожник.
export const CHARACTER_LOOKS={
 // боссы районов
 'Михалыч':{paint:'wet-asphalt',kit:'rally',neon:'amber'},
 'Дед Турбо':{paint:'polished-kettle',kit:'rally',neon:'amber'},
 'Кабан':{paint:'khaki',kit:'rally',neon:'acid'},
 'Ржавый':{paint:'copper',kit:'ring',neon:'stop'},
 'Тихий':{paint:'matte-black',kit:'ring',neon:'ice'},
 // главари серий
 'Кино':{paint:'night-club',kit:'bunny',neon:'violet'},
 'Косой':{paint:'swamp',kit:'bunny',neon:'acid'},
 'Пловец':{paint:'ocean',kit:'rally',neon:'lagoon'},
 'Хук':{paint:'chili',kit:'ring',neon:'stop'},
 'Искра':{paint:'electric',kit:'bunny',neon:'ice'},
 'Профессор':{paint:'graphite',kit:'ring',neon:'xenon'},
 'Кисуля':{paint:'fuchsia',decal:'belt-number',kit:'bunny',neon:'raspberry'},
 'Мастер':{paint:'bordeaux',kit:'ring',neon:'amber'},
 'Железный':{paint:'lead',kit:'rally',neon:'xenon'},
 'Мадам':{paint:'pearl-white',kit:'ring',neon:'raspberry'},
 'Форинт':{paint:'gold',kit:'ring',neon:'amber'}
};
// Ступень тюнинга соперника. 0 — сток (рядовые), 1 — пара деталей, 5 — полный легендарный комплект.
// Сначала растёт количество деталей, потом их класс: так прокачка видна с дороги, а не только в цифрах.
// Глубина меряется в сериях (0..44 на всю кампанию), босс своего района всегда на ступень выше главарей
// этого района, и эта же ступень достаётся главарям следующего — поэтому назад шкала не откатывается.
export const RIVAL_KIT_TIERS=[
 null,
 {rarity:0,slots:['spoiler','rims']},
 {rarity:1,slots:['spoiler','rims','skirts']},
 {rarity:2,slots:['spoiler','rims','skirts','bumpers']},
 {rarity:2,slots:['spoiler','rims','skirts','bumpers','fenders']},
 {rarity:3,slots:['spoiler','rims','skirts','bumpers','fenders']}
];
export const NEON_FROM_TIER=3;
// Безымянные главари серий: имя у них случайное, но приезжать на стоке они тоже не должны.
// Набор ровный, без легендарных красок — на их фоне именной босс района остаётся заметнее.
export const CROWD_LOOKS=[
 {paint:'baltika',kit:'rally',neon:'ice'},
 {paint:'garnet',kit:'ring',neon:'stop'},
 {paint:'cypress',kit:'rally',neon:'acid'},
 {paint:'apricot',kit:'bunny',neon:'amber'},
 {paint:'garage-sky',kit:'ring',neon:'lagoon'},
 {paint:'ash',kit:null,neon:'xenon'},
 {paint:'murena',kit:'bunny',neon:'violet'},
 {paint:'latte',kit:null,neon:'raspberry'}
];
export const rivalTier=pos=>!pos||(!pos.boss&&!pos.captain)?0:Math.min(RIVAL_KIT_TIERS.length-1,1+Math.floor((pos.map*9+pos.series)/9)+(pos.boss?1:0));
// Диски стилевых версий не имеют — им всегда базовый id, остальные слоты берут стиль характера.
export function rivalKit(tier,style=null){
 const spec=RIVAL_KIT_TIERS[tier];if(!spec)return null;
 const kit={};for(const slot of spec.slots)kit[slot]=slot+'-'+spec.rarity+(style&&slot!=='rims'?'-'+style:'');
 return kit;
}
export const BOSS_LOOKS={}; // машина босса, если её нужно задать вручную; внешность живёт в CHARACTER_LOOKS
const STYLES=[{name:'С места',shift:6100,power:-.12,grip:.7},{name:'На верхах',shift:6600,power:.25,grip:-.25},{name:'Ровный',shift:6250,power:0,grip:.1}];
const integer=(x,a,b)=>Math.max(a,Math.min(b,Math.floor(Number(x)||0)));
// Сколько id применённых квитанций помнит сейв. Применённую квитанцию сервер больше не присылает,
// так что за это окно ничего не вернётся: двести штук — около 7 КБ при лимите сейва в 96 КБ.
export const RECEIPTS_KEPT=200;
export function hydrate(d={}){const oldRank=integer(d.rank??Math.min(d.wins||0,24),0,d.campaignRevision===CAMPAIGN_REVISION?CAMPAIGN_LENGTH:25);const selected=integer(d.selected,0,CAR_COUNT-1),hasCollection=Number(d.collectionRevision)>=1;const s={tutorials:Object.fromEntries(['drag-auto','drag-manual','drift'].filter(id=>d.tutorials?.[id]===true).map(id=>[id,true])),hints:Array.isArray(d.hints)?d.hints.filter(x=>typeof x==='string'):[],campaignRevision:CAMPAIGN_REVISION,collectionRevision:1,updatedAt:integer(d.updatedAt,0,4e12),campaignChampionships:integer(d.campaignChampionships,0,10000),campaignLosses:integer(d.campaignLosses,0,999),campaignSeconds:integer(d.campaignSeconds,0,1e8),campaignAttempts:integer(d.campaignAttempts,0,1e6),paint:CARS.map((car,i)=>typeof d.paint?.[i]==='string'?d.paint[i]:car.color)/* право на краску сверяет restorePaints: жёсткий список id сбрасывал купленные цвета при каждом перезаходе */,version:3,cash:integer(d.cash??1200,0,1e8),selected,garage:restoreGarageLevel(d),garageRevision:2,records:CARS.map((car,i)=>Number(d.records?.[i])>0?Number(d.records[i]):null),wins:integer(d.wins,0,1e6),rank:d.campaignRevision===CAMPAIGN_REVISION?oldRank:oldRank*9,races:integer(d.races,0,1e6),streak:integer(d.streak,0,1e6),scrap:integer(d.scrap,0,1e7),boxes:integer(d.boxes??1,0,10000),bossBoxes:integer(d.bossBoxes,0,10000),pity:integer(d.pity,0,7),inventory:{},equipped:CARS.map(()=>({})),carShards:CARS.map((_,i)=>integer(d.carShards?.[i],0,1e6)),unlockedCars:CARS.map((_,i)=>hasCollection?!!d.unlockedCars?.[i]:i===0||i===selected)};
 s.overpassChecks=Array.from({length:5},(_,i)=>d.overpassChecks?.[i]===true);
 s.driftBonusClaims=Array.isArray(d.driftBonusClaims)?[...new Set(d.driftBonusClaims.filter(x=>typeof x==='string'&&/^\d+:(90|135|180|225)$/.test(x)))].slice(-1000):[];
 for(const p of PARTS)if(d.inventory?.[p.id])s.inventory[p.id]={rank:integer(d.inventory[p.id].rank||1,1,p.maxRank)};
 if(!d.version){for(const id of ['engine-0','tires-0','gearbox-0'])s.inventory[id]={rank:1};}
 for(let c=0;c<CAR_COUNT;c++)for(const slot of SLOTS){const id=d.equipped?.[c]?.[slot.id];if(s.inventory[id]&&partById(id)?.slot===slot.id)s.equipped[c][slot.id]=id;else if(!d.version&&c<2&&s.unlockedCars[c]&&s.inventory[slot.id+'-0'])s.equipped[c][slot.id]=slot.id+'-0';}
 if(Number(d.version||0)<3){let cash=0,materials=0;for(let car=0;car<2;car++)for(let slot=0;slot<3;slot++){const n=integer(d.levels?.[car]?.[slot],0,8);cash+=[250,200,220][slot]*n*(n+1)/2;materials+=n*20;}if(cash){s.cash=integer(s.cash+cash,0,1e8);s.scrap=integer(s.scrap+materials,0,1e7);s.migrationNotice={cash,materials};}}
 else if(d.migrationNotice?.cash>0)s.migrationNotice={cash:integer(d.migrationNotice.cash,0,1e8),materials:integer(d.migrationNotice.materials,0,1e7)};
 // Своё фото игрока. Лежит в сейве, а значит переезжает с прогрессом; без него берётся аватар Telegram.
 s.avatar=validAvatar(d.avatar)?d.avatar:null;
 s.eventReceipts=Array.isArray(d.eventReceipts)?d.eventReceipts.filter(x=>typeof x==='string').slice(-1000):[];
 // Применённые квитанции: id того, что сервер уже начислил, а игра применила. Живёт в сейве
 // намеренно — по этим id сервер и понимает, что выдача дошла (dist/receipts.js). Без строчки
 // здесь поле терялось бы на каждом сохранении, и одна и та же награда приезжала бы вечно.
 s.receipts=Array.isArray(d.receipts)?d.receipts.filter(x=>typeof x==='string').slice(-RECEIPTS_KEPT):[];
 s.eventPending=d.eventPending&&typeof d.eventPending.ticket==='string'?d.eventPending:null;
 restoreEconomy(s,d,integer);
 restorePaints(s,d);
 restoreGoals(s,d);
 restoreUpgrades(s,d,CAR_COUNT);
 restorePlayed(s,d);
 restoreDecals(s,d,CAR_COUNT);
 restoreNeons(s,d,CAR_COUNT);
 // «Форма»: серия побед с запасом поднимает темп рядовых соперников. Живёт в сейве, как и всё остальное.
 s.form=restoreForm(d);
 restoreLines(s,d);
 s.unlockedCars[0]=true;s.unlockedCars[s.selected]=true;refreshUnlocks(s);
 // Какие машины игрок уже видел на весь экран. Старым сейвам ничего не показываем задним числом:
 // всё, что уже стоит в гараже на момент первой загрузки с этим полем, считается показанным.
 s.revealedCars=CARS.map((_,i)=>Array.isArray(d.revealedCars)?!!d.revealedCars[i]:!!s.unlockedCars[i]);
 // Уровень машины: у старых сейвов он подбирается так, чтобы уже установленные детали остались легальными.
 restoreCarLevels(s,d,i=>{let need=1;for(const id of Object.values(s.equipped[i]||{})){const owned=s.inventory[id];if(owned)need=Math.max(need,levelForRank(owned.rank));}
  for(const id of (Array.isArray(d?.upgrades?.[i])?d.upgrades[i]:[]))need=Math.max(need,upgradeNeedsLevel(id));return need;});
 return s;
}
export const isCarUnlocked=(s,i)=>!!CARS[i]&&!!s.unlockedCars?.[i];
export {carLevel,carRankCap,carUpgradeRarity,carLevelProgress,levelUpCar,MAX_CAR_LEVEL} from './car-levels.js';
// Очередь показа: машина открыта, но её ещё не видели во весь экран.
export const pendingReveals=s=>CARS.map((_,i)=>i).filter(i=>!!s.unlockedCars?.[i]&&!s.revealedCars?.[i]);
export function markCarRevealed(s,i){if(!CARS[i])return false;(s.revealedCars??=[])[i]=true;return true;}
// A car with all shards moves into the garage only while there is a free spot (carSlots); otherwise it waits, and the
// next garage level lets it in. Order is the shard order, so the queue is predictable.
export const carSlots=s=>carSlotsFor(s.garage);
export const carShardsComplete=(s,i)=>i>0&&integer(s.carShards?.[i],0,1e9)>=CAR_SHARD_COSTS[i];
export const pendingCars=s=>CAR_SHARD_ORDER.filter(i=>carShardsComplete(s,i)&&!isCarUnlocked(s,i));
export function refreshUnlocks(s){let parked=s.unlockedCars.filter(Boolean).length;const gained=[];for(const i of CAR_SHARD_ORDER){if(isCarUnlocked(s,i)||!carShardsComplete(s,i))continue;if(parked>=carSlots(s))break;s.unlockedCars[i]=true;parked++;gained.push(i);}return gained;}
export const carShardProgress=(s,i)=>({current:integer(s.carShards?.[i],0,CAR_SHARD_COSTS[i]||0),needed:CAR_SHARD_COSTS[i]||0});
function grantCampaignShards(s,opp){return grantCarShards(s,3+Math.floor(opp.id/45));}
export function grantCarShards(s,count,{car=null}={}){
 // Машина уже своя — чертежи идут ей в уровень и копятся сверх стоимости открытия.
 if(car!==null&&CARS[car]&&isCarUnlocked(s,car)){
  const amount=Math.max(0,Math.floor(count));if(!amount)return null;
  s.carShards[car]=integer(s.carShards[car],0,1e6)+amount;
  return {index:car,amount,current:s.carShards[car],needed:CAR_SHARD_COSTS[car]||0,unlocked:false,pending:false,garageForSpot:null,level:true};
 }
 const index=CAR_SHARD_ORDER.find(i=>!carShardsComplete(s,i));if(index===undefined)return null;const needed=CAR_SHARD_COSTS[index],before=integer(s.carShards[index],0,needed),amount=Math.min(needed-before,Math.max(0,Math.floor(count)));s.carShards[index]=before+amount;const complete=s.carShards[index]>=needed,unlocked=complete&&refreshUnlocks(s).includes(index);const spot=complete&&!unlocked?GARAGE_LEVELS_SLOTS.find(g=>g.carSlots>s.unlockedCars.filter(Boolean).length):null;return {index,amount,current:s.carShards[index],needed,unlocked,pending:complete&&!unlocked,garageForSpot:spot?.level??null};}
// Босса берут только безупречным вождением (Андрей, 17 сентября): ни одного запоротого переключения
// и точный старт. «Хорошие» переключения допустимы — они и так стоят времени, а промах закрывает заезд.
// Правило одно на всех: игра (settle), модель игрока и калибровка лестницы считают победу одинаково.
// Ранний доход урезан (Андрей, 17 сентября): в первых районах игрок набирал мощь так быстро, что к
// середине кампании упирался в потолок и дальше покупать было нечего. Множитель по районам сдвигает
// накопление к поздним рангам, где теперь есть куда расти — уникальные детали.
export const EARLY_INCOME=[.55,.7,.85,1,1];
export const DROP_CHANCE=[.5,.65,.8,1,1];
export const cleanRun=(opp,run)=>opp?.flawless?(run?.missed||0)===0&&!!(run?.launchLog?.perfect):(run?.perfect||0)>=(opp?.requiredPerfect||0);
export function partStrength(p,rank){const base=[.45,.85,1.35,2,2.3][p.rarity],level=integer(rank,1,p.maxRank),steps=Math.min(level-1,4)+Math.max(0,level-5)*.35;return ['engine','tires','gearbox'].includes(p.slot)?base+steps*[1.2,1.45,1.6,1.75,2][p.rarity]:base*(1+steps*.22);}
export function effectiveLevels(s,car=s.selected){const out=[0,0,0],cap=bodyRankCap(car);
 for(const id of Object.values(s.equipped[car])){const p=partById(id),owned=s.inventory[id];if(!p||!owned)continue;
  // Кузов держит свой ранг: деталь 12-го ранга на восьмёрке работает как деталь 9-го. Ранга сама деталь
  // не теряет — на машине классом выше она раскроется целиком. Это и есть смысл новой машины.
  const amount=partStrength(p,Math.min(owned.rank,cap));p.stats.forEach((v,i)=>out[i]+=v*amount);}
 // Уникальные апгрейды складываются поверх деталей: слотов у них нет, работают все разом.
 upgradeLevels(s,car).forEach((v,i)=>out[i]+=v);
 return out;}
export const rating=(levels,carId='samara')=>vehicleStats(carId,levels).rating;
// Догон: во сколько раз игрок выше эталона своего ранга, во столько же поднимается стена.
// Уровни растут одной долей, чтобы характер соперника (мотор против шин) не менялся.
// Сколько мощи добавить сопернику: ровно тот излишек, который игрок набрал сверх эталона своего
// ранга. Небольшой запас (slack) прощаем — обычный разброс прокачки стеной быть не должен.
export function chaseGain(mine,bench,{slack=CHASE.slack,follow=CHASE.follow.plain,limit=CHASE.limit}={}){
 if(!(mine>0)||!(bench>0))return 0;
 const over=mine-bench*(1+slack);
 return over>0?Math.min(over*follow,bench*(limit-1)):0;
}
// Поднять уровни до нужной мощи: доли всех трёх растут одинаково, характер соперника не меняется.
// Мощь — это база машины плюс уровни с весами, поэтому множитель считаем по уровням, а не по мощи.
export function chaseLevels(levels,carId,gain){
 const span=levels[0]*14+levels[1]*5+levels[2]*3;
 if(!(gain>0)||!(span>0))return levels;
 return levels.map(v=>+(v*(1+gain/span)).toFixed(3));
}
// Мощь игрока как её видит гараж. Калибровка зовёт opponent({rank}) без сейва — там догонять некого,
// и это не ошибка: соперники авторские и считаются против эталона, а не против чьей-то машины.
// Мощь игрока считается на его машине, а эталон — на машине района: уровни эталона авторены под неё,
// и мерить их на чужом кузове значит сравнивать разные вещи (планка тогда молчала у перекачанных).
const playerPower=s=>{try{return rating(effectiveLevels(s),CARS[s.selected]?.id);}catch{return 0;}};
// Соперник приходит с поправкой на «Форму»: тот, кто не проигрывает, встречает соперников злее.
// Стены (боссы), тренировки и дрифт форма не трогает — там своя логика.
export function opponent(s,practice=false){
 return applyForm(baseOpponent(s,practice),practice?null:s?.form);
}
function baseOpponent(s,practice=false){
 if(!practice&&isOverpassStage(s.rank))return overpassStage(s.rank);
 let n=practice?Math.max(0,Math.min(CAMPAIGN_LENGTH-1,s.rank)-8):Math.min(CAMPAIGN_LENGTH-1,s.rank);
 if(practice&&campaignPosition(n).drift)n=Math.max(0,n-1); // training is always a drag race
 const pos=campaignPosition(n),crew=Math.floor(n/5)%25,style=STYLES[crew%3],tuning=CAMPAIGN_TUNING[n];
 // Recurring rivals take the «Вызов» beat of series 1–6 in every district: same face, a new car each district.
 // Машина берётся из этапа всегда: уровни деталей откалиброваны под неё. В тренировке молчит только сам знакомый
 // (имя, реплики, окрас), иначе его уровни поехали бы на чужой машине и «передышка» выходила тяжелее кампании.
 const stageRival=rivalFor(pos),rival=practice?null:stageRival,rivalStyle=rival?STYLES[rival.style]:style;
 // District bosses drive cars that can actually be tuned to a boss pace over 804 m (an Инвалидка cannot).
 const pool=STAGE_CARS[pos.map],strong=[...pool].sort((a,b)=>rating([0,0,0],CARS[b].id)-rating([0,0,0],CARS[a].id)),
 /* Фургоны и внедорожники не держат темп на длинной прямой: у них не уровни кончаются, а аэродинамика.
    «Мощь» этого не показывает — у Нивы она выше, чем у Уазика, а едет она как утюг. Поэтому на тесный
    бит «Вызов» их не ставим: иначе этап, который должен кусаться, оказывается бесплатным. */
 pacey=pool.filter(i=>!SLOW_CARS.has(CARS[i].id)).length?pool.filter(i=>!SLOW_CARS.has(CARS[i].id)):pool,car=stageRival?stageRival.car:pos.boss?(BOSS_LOOKS[pos.map]?.car??BOSS_CARS[pos.map]):pos.captain?strong[crew%2]:pos.beat===1?pacey[(n*7+2)%pacey.length]:pool[(n*7+2)%pool.length],look=lookForRank(n,practice);/* captains take the two strongest cars of the district pool: they must reach an 804 m pace */
 /* «Вызов» — единственный тесный из рядовых битов, и он ездит только на машинах из быстрой половины
    района: фургон или Нива на поздних рангах не держат нужный темп даже прокачанные в потолок,
    и этап, который должен кусаться, оказывался бесплатным (ранги 66, 146, 176, 191). */
 if(pos.drift)return driftStage(s,n,pos,tuning);
 const name=rival?rival.name:pos.boss?DISTRICT_BOSSES[pos.map]:pos.captain?(FEATURED_CAPTAINS[n]||NAMES[crew%NAMES.length]):['Пацан','Кореш','Сосед','Напарник'][pos.beat]+' '+NAMES[crew%NAMES.length];
 const tier=rivalTier(pos),faceLook=CHARACTER_LOOKS[name]??(tier?CROWD_LOOKS[n%CROWD_LOOKS.length]:null),kit=tier?rivalKit(tier,faceLook?.kit):null;/* обвес, краска и неон растут со ступенью: рядовые остаются на стоке, главари и боссы — нет */
 return {id:n,name,rival:rival&&{id:rival.id,name:rival.name,taunt:rival.taunt,win:rival.win,lose:rival.lose,visit:rival.visit,returns:rival.returns},paint:faceLook?.paint??rival?.paint??undefined,equipment:kit??undefined,neon:tier>=NEON_FROM_TIER?(faceLook?.neon??null):null,tier,area:AREAS[pos.map],map:pos.map,car,boss:pos.boss,captain:pos.captain,decal:pos.captain?(faceLook?.decal??PERSONAL_DECALS[name]??bossDecal(n)):rival?PERSONAL_DECALS[rival.name]||null:null,/* именная ливрея — трофей за её хозяина */beat:BEATS[pos.beat],series:pos.series,distance:campaignDistance(n),requiredPerfect:practice||n<4?0:pos.boss?(pos.map===0?3:4):pos.beat===3||pos.captain?(campaignDistance(n)===201||pos.map===0?1:2):0,flawless:!practice&&pos.boss&&n>=4,/* bosses: overtaking is the win (Andrey, 13 Sep) — their wall is pace and power; precision stages and captains still ask for clean shifts (1 in district 1, 2 later) */style:rivalStyle.name,shift:pos.beat===2?6500:6168,levels:chaseLevels(tuning?.levels||[0,0,0],CARS[car].id,n<CHASE.from?0:chaseGain(playerPower(s),rating(benchmarkLevels(n),benchCarFor(n)),{follow:pos.boss?CHASE.follow.boss:pos.captain?CHASE.follow.captain:CHASE.follow.plain})),targetTime:tuning?.time,reaction:tuning?.reaction??.3,window:n<3?2.1:n<10?1.7:n<25?1.35:n<50?1.2:pos.beat===2?1.2:pos.beat===3||pos.captain?.65:1,startAssist:n<3,launchPerfect:n<10?.7:n<25?.42:.24,launchAuto:n<10?1.25:n<25?1:.8,launchRpm:6168,surface:look.wet?.91:1,rough:look.rough,look,practice,champion:s.rank>=CAMPAIGN_LENGTH};
}
// A campaign drift stage: solo run on the Ridge, scored by drift points against the district's target.
function driftStage(s,n,pos,tuning){
 const ridge=TRACKS.findIndex(t=>t.id==='ridge'),look={...TRACKS[ridge]};
 return {id:n,name:'ГРЕБЕНЬ',drift:true,driftTarget:driftTarget(n),area:AREAS[pos.map],map:ridge,car:0,boss:false,captain:false,decal:null,beat:'Дрифт',series:pos.series,distance:804,requiredPerfect:0,style:'Дрифт',shift:6250,levels:[2,2,1],targetTime:null,reaction:.3,window:1,startAssist:false,launchPerfect:.24,launchAuto:.8,launchRpm:6100,surface:1,rough:look.rough,look,practice:false,champion:s.rank>=CAMPAIGN_LENGTH};
}
export function restartCampaign(s){
 if(s.rank<CAMPAIGN_LENGTH)return false;
 s.campaignChampionships=(s.campaignChampionships||0)+1;s.rank=0;s.campaignLosses=0;s.overpassChecks=Array(5).fill(false);return true;
}
export function campaignAdvice(s,opp){
 if(s.campaignLosses>=2)return 'Два реванша подряд? Заезд на детали даст передышку и материалы.';
 if(opp.rough)return 'Разбитая грунтовка: Нива и УАЗ идут ровно, низкий обвес теряет ход на каждой яме.';
 if(opp.distance===201)return 'Короткий спринт: решают старт и первые передачи.';
 if(opp.distance===804)return 'Длинная прямая: раскрой высшие передачи.';
 return opp.surface<1?'Мокро: цепкие шины помогут на старте.':'Лови зелёную зону: цепочка точных переключений ускоряет машину.';
}
const guaranteedParts={4:'engine-1',9:'tires-1',14:'gearbox-1',39:'engine-2',44:'tires-2',49:'gearbox-2',89:'engine-3',99:'tires-3',109:'gearbox-3'};
export const GUARANTEED_PARTS=guaranteedParts;
// Пустой слот — деталь встаёт на машину сама. По телеметрии плейтеста те, кто не нашёл мастерскую,
// возили выигранные детали в багажнике и упирались в стену на третьем этапе. Занятый слот не трогаем:
// там уже есть выбор игрока.
export function addPart(s,id){const p=partById(id);if(!p)throw Error('Неизвестная деталь');
 const duplicate=!!s.inventory[id];let scrap=0;
 if(duplicate){scrap=[8,18,40,90,200][p.rarity];s.scrap+=scrap;}else s.inventory[id]={rank:1};
 const mounted=!duplicate&&!s.equipped[s.selected][p.slot]&&equip(s,id);
 return {id,duplicate,scrap,mounted:!!mounted};}
// Early on a duplicate drop reads as «nothing»: while the player owns fewer than eight parts, reroll up to five times.
export function rollFreshPart(s,min=0,rng=Math.random){const level=garageLevel(s.garage).level,far=id=>{const p=partById(id);return p&&requiredGarageFor(p.slot,p.rarity)>level+1;};let id=rollPart(min,rng);for(let i=0;i<5&&far(id);i++)id=rollPart(min,rng);/* a drop should mount in this garage or the next one, not three levels later */if(Object.keys(s.inventory).length>=8)return id;for(let i=0;i<5&&(s.inventory[id]||far(id));i++)id=rollPart(min,rng);return id;}
export function rollPart(min=0,rng=Math.random){let roll=Math.min(.999999,Math.max(0,rng()))*RARITIES.slice(min).reduce((a,r)=>a+r.weight,0),rarity=min;for(;rarity<RARITIES.length-1;rarity++){roll-=RARITIES[rarity].weight;if(roll<0)break;}const slot=SLOTS[Math.min(SLOTS.length-1,Math.floor(Math.max(0,rng())*SLOTS.length))];const style=rollStyle(slot.id,rng);
 // Вариант разыгрывается последним, чтобы прежние броски редкости, слота и стиля не сдвинулись.
 const options=variantsOf(slot.id,rarity,style),pick=options[Math.min(options.length-1,Math.floor(Math.max(0,Number(rng())||0)*options.length))];return pick?pick.id:partId(slot.id,rarity,style);}
export function openBox(s,box=false,rng=Math.random){
 const key=box===true?'boss':box===false?'street':box,c=crateById(key);if(!c||crateCount(s,key)<1)return null;
 adjustCrate(s,key,-1);const weights=c.weights.map((w,i)=>s.pity>=7&&i<2?0:w),sum=weights.reduce((a,w)=>a+w,0);let roll=Math.min(.999999,Math.max(0,rng()))*sum,rarity=0;
 for(;rarity<RARITIES.length-1;rarity++){roll-=weights[rarity];if(roll<0)break;}
 const slots=c.slots||SLOTS.map(x=>x.id),slot=slots[Math.min(slots.length-1,Math.floor(Math.max(0,rng())*slots.length))],id=partId(slot,rarity,rollStyle(slot,rng));
 s.pity=rarity>=2?0:Math.min(7,s.pity+1);
 const opened={...addPart(s,id),crate:key,bonusPaint:rollPaintBonus(s,rng),bonusDecal:rollDecalBonus(s,rng)};
 // Неон за рубли не продаётся: два простых набора стоят баксов в витрине, три достаются за главарей
 // районов, а самые яркие — только отсюда. Только большие ящики и редко: это подарок, а не товар.
 opened.bonusNeon=key==='legend'||key==='unique'||key==='boss'?rollNeonBonus(s,rng):null;
 // Уникальный апгрейд — редкая находка и только из серьёзных ящиков; легендарный за район даёт его наверняка,
 // чтобы категорию увидел каждый, кто дошёл до конца. Разыгрываем последним, чтобы не сдвигать
 // последовательность случайных чисел у детали, краски и декали.
 // Красный ящик — верхний, и апгрейд в нём такой же обязательный, как в чёрном чемодане. Без этой строки
 // перевод боссов четвёртого и пятого районов на красные ящики молча отрезал единственный источник
 // апгрейдов в кампании: модель доходила до 134 ранга с нулём апгрейдов при их цене в 250 мощи.
 // Апгрейд даёт каждый большой ящик, а не один из пяти. Прежние 22% превращали треть потолка мощи
 // (апгрейды — это около 250 из 800) в лотерею: модель доходила до 134 ранга с нулём апгрейдов.
 // Теперь это правило района: победил хозяина — получил уникальный апгрейд, шесть районов — шесть штук.
 const chance=key==='legend'||key==='unique'||key==='boss'?1:0;
 const left=chance>0?missingUpgrades(s):[];
 opened.bonusUpgrade=left.length&&rng()<chance?left[Math.min(left.length-1,Math.floor(Math.max(0,rng())*left.length))].id:null;
 if(opened.bonusUpgrade)grantUpgrade(s,opened.bonusUpgrade);track('crate',{crate:key,part:id,rarity,duplicate:!!opened.duplicate,paint:opened.bonusPaint?.id||null,decal:opened.bonusDecal?.id||null,neon:opened.bonusNeon?.id||null,upgrade:opened.bonusUpgrade});return opened;
}
// A dropped part is kept, but it mounts only once the garage level allows its slot and rarity.
export function canInstall(s,id){const p=partById(id);if(!p||!s.inventory?.[id])return {ok:false,garage:null};const need=requiredGarageFor(p.slot,p.rarity);return {ok:need<=garageLevel(s.garage).level,garage:need};}
// Потолок ранга держат двое: мастерская и сама машина. Что ниже, то и считается.
export const rankCapFor=(s,id,car=s.selected)=>Math.min(partById(id)?.maxRank||0,garageRankCap(s),carRankCapOf(carLevelOf(s,car)));
export function equip(s,id){const p=partById(id);if(!p||!s.inventory[id]||!canInstall(s,id).ok)return false;s.equipped[s.selected][p.slot]=id;track('equip',{part:id,slot:p.slot,rarity:p.rarity});return true;}
export function unequip(s,slot){delete s.equipped[s.selected][slot];}
export const tuneCost=(s,id)=>{const p=partById(id),r=s.inventory[id]?.rank||1;return {cash:Math.round((p?.rarity+1)*TUNE_CASH_BASE*r*(1+Math.max(0,r-4)*.06)),scrap:Math.round(TUNE_SCRAP_BASE[p?.rarity||0]*r)};};
// Скидок гаража нет ни в рублях, ни в материалах (Андрей, 16 сентября): цена растёт только с рангом и редкостью. База снижена
// относительно прежней (120 и 12/16/22/30), потому что прежняя калибровка кампании держалась на скидках IV–V гаража;
// автотест кампании (scripts/campaign-autotest.mjs) — критерий.
export const TUNE_CASH_BASE=82,TUNE_SCRAP_BASE=[10,14,19,26,44];/* materials: an epic part to rank 7 costs 462 ⚒, not 672 — a district's wins (~600 ⚒) must cover the guaranteed engine AND tyres before the boss (docs/campaign-design-review.md) */
export function tunePart(s,id){const o=s.inventory[id],p=partById(id);if(!o||!p||o.rank>=rankCapFor(s,id))return false;const c=tuneCost(s,id);if(s.cash<c.cash||s.scrap<c.scrap)return false;s.cash-=c.cash;s.scrap-=c.scrap;o.rank++;noteGoal(s,'tune');track('tune',{part:id,level:o.rank,cash:c.cash,scrap:c.scrap,rarity:p.rarity,slot:p.slot});return true;}
export const salvageValue=(s,id)=>s.inventory[id]?[8,18,40,90,200][partById(id).rarity]*s.inventory[id].rank:0;
export function salvage(s,id){if(!s.inventory[id]||s.equipped.some((e,i)=>s.unlockedCars[i]&&Object.values(e).includes(id)))return false;const n=salvageValue(s,id);delete s.inventory[id];s.scrap+=n;track('salvage',{part:id,scrap:n});return n;}
export function rewardRace(s,{won,perfect=0,opp,time,rivalTime=null},rng=Math.random){
 s.races++;s.streak=won?s.streak+1:0;
 // Форма считается по отрыву: победа «в притирку» серию не двигает, а поражение её обнуляет.
 s.form=updateForm(s.form,{won,margin:rivalTime&&time?Math.max(0,(rivalTime-time)/rivalTime):0,practice:!!opp.practice,boss:!!opp.boss,drift:!!opp.drift});// id этапа бывает не числом (эстакада — 'overpass-2', дуэли и вызовы вовсе без него): без Number здесь
 // выходил NaN и обнулял всю награду.
 const district=Math.min(EARLY_INCOME.length-1,Math.max(0,Math.floor((Number(opp.id)||0)/45))),lean=EARLY_INCOME[district];
 const cash=Math.round(((won?330+opp.id*9:100+opp.id*3)+(opp.practice?0:perfect*30))*lean);s.cash+=cash;s.scrap+=won?12:8;
 if(!opp.practice){s.campaignAttempts++;s.campaignSeconds+=Math.round(time||0);s.campaignLosses=won?0:s.campaignLosses+1;}
 const fresh=won&&!opp.practice&&opp.id===s.rank&&s.rank<CAMPAIGN_LENGTH;let drop=null,bossDecalDrop=null,bossNeonDrop=null,box=false,bossBox=false;const crates=[],hard=fresh?5+(opp.boss?40:0):0;s.hard+=hard;
 // Деталь с победы в первых районах падает не всегда: именно дропы, а не деньги, разгоняли мощь так,
 // что к середине кампании покупать было уже нечего. Обещанные детали за этап (guaranteedParts) остаются.
 const owed=fresh&&guaranteedParts[opp.id];
 // Первые десять этапов — школа: там деталь падает всегда, иначе новичок не понимает, ради чего гоняет.
 if(won){s.wins++;if(owed||(Number(opp.id)||0)<10||rng()<DROP_CHANCE[district])drop=addPart(s,owed||rollFreshPart(s,fresh&&opp.boss?1:0,rng));if(fresh&&opp.decal)bossDecalDrop=addDecal(s,opp.decal,s.selected);if(fresh)s.rank++;}
 const milestone=fresh&&opp.captain?{scrap:60+Math.floor(opp.id/45)*25,cash:600+Math.floor(opp.id/45)*250}:null,carShard=milestone?grantCampaignShards(s,opp):null;
 // Каждая победа капает чертежом в ту машину, на которой ехали: уровень растёт от езды, а не только от главарей.
 // Победа даёт чертёж машине за рулём и столько же в общий гаражный фонд: одна тачка растёт от езды,
 // остальные — от того, что игрок вообще играет. Иначе брошенная машина стоит мёртвым грузом.
 const levelShards=won?grantCarShards(s,opp.boss?3:opp.captain?2:1,{car:s.selected}):null;
 if(won)s.blueprintPool=(s.blueprintPool||0)+(opp.boss?3:opp.captain?2:1);
 // Каждый впервые пройденный этап приближает следующую машину лестницы. Раньше шарды капали только
 // с главарей, и копейка открывалась к сотому рангу, а 99-я к концу кампании — лестница не работала.
 // Чертежи лестницы капают с четвёртого этапа: до него игрок учится ящикам, мастерской и старту,
 // и экран машин, всплывающий на первой же победе, перебивал эти уроки.
 const ladderShard=fresh&&(Number(opp.id)||0)>=4?grantCarShards(s,1):null;
 if(milestone){s.scrap+=milestone.scrap;s.cash+=milestone.cash;}
 // One finish has one crate source. A district milestone replaces the routine crate.
 s.crateProgress=(s.crateProgress||0)+1;
 if(fresh&&opp.boss){
  const final=s.rank===CAMPAIGN_LENGTH,district=Math.floor(opp.id/45);
  // Первые три района закрываются складским ящиком, последние два — красным: там уже нечего покупать,
  // и единственный оставшийся запас мощи — уникальная деталь имени побеждённого хозяина района.
  // Правило «одна победа — один ящик» держим и здесь: финал даёт красный, а не два сразу.
  crates.push(grantCrate(s,district>=3?'unique':'boss',final?'Вся карьера · 225 заездов':opp.area+' · побеждён '+opp.name));
  // Хозяин района отдаёт свой неон — по набору за первые три района. В четвёртом и пятом неона
  // за голову нет: там красный ящик, и неон может выпасть из него бонусом.
  const neonPrize=bossNeon(district);if(neonPrize&&!ownsNeon(s,neonPrize)){addNeon(s,neonPrize);bossNeonDrop=neonPrize;}
  bossBox=true;s.crateProgress=0;
 }else if(s.crateProgress>=crateStepFor(opp.id)){
  crates.push(grantCrate(s,'street','За 5 завершённых заездов'));box=true;s.crateProgress=0;
 }
 const record=(opp.distance??402)===402&&(!s.records[s.selected]||time<s.records[s.selected]);if(record)s.records[s.selected]=time;
 // Weekly goals count what the finish was, never how it was rewarded. Bonus-track counters (ridge/overpass/overtake) are noted by the mode itself.
 if(opp.practice)noteGoal(s,'practice');
 if(won){noteGoal(s,'win');if(opp.captain&&!opp.practice)noteGoal(s,'captain');if(opp.rough)noteGoal(s,'dirtWin');if(opp.look?.wet)noteGoal(s,'wetWin');if(opp.rival)noteGoal(s,'rivalWin');if(s.streak===3)noteGoal(s,'streak3');}
 if(perfect>0)noteGoal(s,'perfect',perfect);
 const trackRecord=opp.trackId?noteTrackRecord(s,opp.trackId,won||opp.practice?time:0):null;
 recordRace(s,{opp,won,perfect,time,fresh,drop,rivalTime});
 track('reward',{stage:opp.id,won,fresh,cashGain:cash+(milestone?.cash||0),scrapGain:(won?12:8)+(milestone?.scrap||0),hardGain:hard,drop:drop?.id||null,duplicate:!!drop?.duplicate,crates:crates.map(c=>c.id),carShard:carShard?{car:carShard.index,amount:carShard.amount,unlocked:carShard.unlocked}:null,record});
 return {scrap:Math.round((won?12:8)*lean)+(milestone?.scrap||0),trackRecord,cash:cash+(milestone?.cash||0),milestone,carShard:carShard||ladderShard,bossDecal:bossDecalDrop,bossNeon:bossNeonDrop,guaranteed:fresh&&!!guaranteedParts[opp.id],hard,crates,drop,box,bossBox,record,fresh,unlockedMap:fresh&&opp.boss&&s.rank<CAMPAIGN_LENGTH?trackIndex(s.rank):null,perfectBonus:opp.practice?0:perfect*30};
}
