// Ливреи как данные: слои (блокинг, графика, номер, спонсоры, стекло, фон) раскладываются по опорным
// линиям конкретного кузова — поясу, порогу, линии капота и аркам из fleet.js. Раскладка чистая (без canvas),
// поэтому проверяется в Node: текст не должен лезть на арки и выше капота, краски должно оставаться больше
// половины. Правила — docs/vinyl-design-rules.md. Рисует атлас decal-liveries.js, шейдер — decal-projection.js.
//
// Пространства: борт — u вдоль длины (0 нос → 1 корма), v по высоте (0 пол → 1 крыша); верх — u вдоль длины,
// v поперёк (0 левый борт → 1 правый); торцы — u поперёк, v по высоте; стекло — u поперёк, v внутри козырька.

export const DEFAULT_FIT={id:'samara',length:4.006,height:1.402,width:1.65,wheelbase:2.46,axleOffset:.012,radius:.292,body:{belt:.9,floor:.245,hoodStart:-.8,hoodDrop:.115}};

// Чёрный молдинг по борту (метры от пола): отдельный меш поверх краски, винил под ним не виден — текст его обходит.
export const MOLDING={samara:[.55,.60],nine:[.55,.60],'ninety-nine':[.55,.60],pyaterka:[.47,.53],ten:[.47,.53],moskvich:[.47,.53],volga:[.47,.53],uaz:[.47,.65],bukhanka:[.47,.65]};
export function anchors(fit=DEFAULT_FIT){
 const L=fit.length||4,H=fit.height||1.4,W=fit.width||1.65,b=fit.body||{};
 const beltM=b.belt??H*.63,floorM=b.floor??.25,belt=beltM/H,floor=floorM/H;
 // Выше этой линии борт переднего крыла переходит в капот — текст там срезается проекцией.
 const hoodCut=Math.max(floor+.22,(beltM-(b.hoodDrop??.1))/H-.06);
 const wb=fit.wheelbase||L*.6,ax=fit.axleOffset||0,r=fit.radius||.3;
 const uF=(ax-wb/2+L/2)/L,uR=(ax+wb/2+L/2)/L,ru=(r+.15)/L,archTop=(r*2+.05)/H;
 const door={u0:Math.max(.06,uF+ru+.02),u1:Math.min(.94,uR-ru-.02)};door.c=(door.u0+door.u1)/2;door.w=door.u1-door.u0;
 // Ручка двери: у задней кромки двери, чуть ниже пояса. Текст туда не ставим.
 const handle={u0:door.u1-.11,u1:door.u1-.005,v0:belt-.23,v1:belt-.10};
 const mold=MOLDING[fit.id]?{v0:MOLDING[fit.id][0]/H-.01,v1:MOLDING[fit.id][1]/H+.01}:null;
 const hoodEnd=Math.max(.2,Math.min(.5,((b.hoodStart??-L*.2)+L/2)/L));
 return {L,H,W,belt,beltM,floor,hoodCut,uF,uR,ru,archTop,door,handle,mold,hoodEnd,wing:{u0:.05,u1:uF+ru},quarter:{u0:uR-ru,u1:Math.min(.96,uR+ru+.04)},roof:{u0:hoodEnd+.08,u1:.9}};
}

// Палитры и спонсоры района. Реальных брендов нет: спонсоры выдуманные, шрифт один.
const S={sport:'РАЙОН СПОРТ',oil:'БАТЯ-ОЙЛ',tyres:'ШИНЫ У САНИ',plugs:'СВЕЧИ ТОЛЯНА',garage:'ГАРАЖ 63',sto:'СТО У МОСТА',sound:'АВТОЗВУК БУБЛЬ',forward:'ФОРВАРД-АВТО',autobahn:'АВТОБАН 88',kvas:'КВАС РАЙОННЫЙ',house:'ДОМ НА ТРАССЕ',baikal:'БАЙКАЛ-ТУР',moto:'ПАЦАН МОТОСПОРТ',night:'НОЧНАЯ СМЕНА',dalnoboy:'ДАЛЬНОБОЙ',polyot:'ПОЛЁТ-АВТО',turbo:'МАСЛО ДЕД ТУРБО',wheels:'КОЛЁСА ДЁШЕВО',fish:'РЫБАЛКА — ДЕЛО СЕРЬЁЗНОЕ',lakost:'LAKOST CLUB',madam:'MAISON MADAME',blacklist:'ЧЁРНЫЙ СПИСОК',blsub:'МОТОСПОРТ · ПОДВЕСКА · КУЗОВ · ТУРБО',fwd:'ФОРВАРД-АВТО →',classic:'РАЙОННЫЙ КЛАССИК · ГРАН-ПРИ',stack:'ШИНЫ У САНИ · МАСЛО ДЕД ТУРБО · СВЕЧИ ТОЛЯНА'};
// Цвета из референсов: тёплый белый, гоночный красный, глубокий синий, горчица, бирюза, маджента, графит, золото.
const C={white:'#f3efe4',red:'#e0322b',navy:'#1f2a55',mustard:'#f2b134',teal:'#33c7c0',magenta:'#ff3d81',black:'#14161a',gold:'#d3a84c',purple:'#4a2a7a',lime:'#b7e33a',orange:'#ff7a1a',ice:'#b9dff7',graphite:'#3a3f46',mint:'#8fd7c4',blue:'#1656a4',olive:'#6b6a42',sand:'#c9a961',
 // Гамма камуфляжа: хаки, мох, песок и почти чёрный подлесок.
 khaki:'#6f6b41',moss:'#3f4a2d',dune:'#8c7c4d',bark:'#2a2e21'};

const L=(id,name,rarity,description,palette,layers)=>({id,name,rarity,description,palette:{ink:C.black,light:C.white,...palette},sides:'mirror',finish:'matte',...layers});

export const LIVERIES=[
 // ---- Обычные: одна графика, без текста ----
 L('sill-line','Полоса по порогу',0,'Тонкая чёрная полоса вдоль порога — самая честная оклейка района',{main:C.black,accent:C.white},{graphics:[{kind:'sill-band',h:.10}]}),
 L('dark-bottom','Тёмный низ',0,'Нижняя треть кузова в графитовый мат: грязь не видна, машина ниже',{main:C.graphite,accent:C.white},{graphics:[{kind:'sill-band',h:.22}]}),
 L('twin-belt','Двойная лента',0,'Синяя и горчичная ленты по линии молдинга — заводской «спорт», которого не было',{main:C.navy,accent:C.mustard},{graphics:[{kind:'belt',h:.06,offset:.03},{kind:'belt',h:.025,offset:.105,color:'accent'}]}),
 L('three-lines','Три черты',0,'Тройка белых косых на двери — хозяин смотрел японские журналы',{main:C.white,accent:C.white},{graphics:[{kind:'diagonal',count:3,w:.035,gap:.02,angle:64}]}),
 L('pinstripe','Кант',0,'Золотая линия по поясу — почти невидимая, но заметная',{main:C.gold,accent:C.gold},{graphics:[{kind:'pinstripe',offset:.02},{kind:'pinstripe',offset:.06,h:.008}]}),
 L('hood-arrow','Стрелка',0,'Чёрная стрела на капоте с оранжевым остриём к решётке',{main:C.black,accent:C.orange},{graphics:[{kind:'hood',w:.40},{kind:'hood-tip'}]}),
 L('roof-cap','Кепка',0,'Крыша чёрным матом — двухцветка с завода, которого не было',{main:C.black,accent:C.black},{graphics:[{kind:'roof-full'}]}),
 L('one-slash','Косая',0,'Одна широкая белая косая от переднего порога к задней стойке',{main:C.white,accent:C.white},{graphics:[{kind:'diagonal',count:1,w:.11,angle:60}]}),
 // ---- Редкие: блокинг + графика + номер, без спонсоров ----
 L('polyot-21','Полёт 21',1,'Чёрная и горчичная косые от порога к стеклу и стартовый номер 21',{main:C.black,accent:C.mustard},{graphics:[{kind:'sill-band',h:.12},{kind:'tri',w:.09,gap:.02,angle:62,colors:['main','accent'],at:'rear',over:true}],number:{value:21,plate:'tab',at:'door'}}),
 L('ring-77','Кольцевые',1,'Синий пояс с горчичной линией и круг с номером — кольцевые гонки 80-х',{main:C.navy,accent:C.mustard},{graphics:[{kind:'belt',h:.08,offset:.03},{kind:'belt',h:.022,offset:.12,color:'accent'}],number:{value:77,plate:'circle',at:'door'}}),
 L('dalnoboy','Дальнобой',1,'Нос — цвет кузова, корма уходит в синий косой границей, через неё жёлто-белые косые; на левом борту корма горчичная',{main:C.navy,accent:C.mustard,second:C.white},{sides:'invert',graphics:[{kind:'split',at:.52,angle:60,side:'rear',over:true},{kind:'tri',w:.05,gap:.02,angle:60,colors:['second','accent','second'],at:'door',over:true}],number:{value:12,plate:'none',at:'door'}}),
 L('retro-rally','Ретро-ралли',1,'Красный, белый, чёрный — заводская спортивная оклейка Жигулей',{main:C.white,accent:C.red},{graphics:[{kind:'swoosh'},{kind:'tri',w:.04,gap:.025,angle:62,at:'rear',colors:['ink','ink','ink']}],number:{value:77,plate:'none',at:'door',ink:'light'}}),
 L('north-wind','Северный ветер',1,'Ледяной низ и белые ломаные линии — зима, гаражи, снег по пояс',{main:C.white,accent:C.blue},{graphics:[{kind:'sill-band',h:.18,color:'accent'},{kind:'tri',w:.03,gap:.03,angle:70,at:'door',colors:['main','main','main']}],number:{value:8,plate:'tab',at:'quarter'}}),
 L('street','Уличный',1,'Чёрный низ и оранжевая тройка косых — гараж, а не автосалон',{main:C.black,accent:C.orange},{graphics:[{kind:'sill-band',h:.20},{kind:'tri',w:.04,gap:.025,angle:64,colors:['accent','accent','main'],over:true}],number:{value:44,plate:'tab',at:'door'}}),
 L('camo','Камуфляж',1,'Рваные разводы хаки, мха и песка по всему кузову, матовая плёнка — машина как с полигона',{main:C.khaki,accent:C.dune,ink:C.white},{finish:'matte',texture:{type:'camo',contrast:.95,colors:[C.khaki,C.moss,C.dune,C.bark]}}),
 L('digital','Цифра',1,'Пиксельный камуфляж: тона выводятся из цвета кузова — перекрасил машину, сменилась вся гамма',{main:C.khaki,accent:C.dune,ink:C.white},{finish:'matte',texture:{type:'pixel',fromPaint:true,contrast:1}}),
 L('taxi','Такси',1,'Шашечки по поясу — самая узнаваемая оклейка на постсоветском пространстве',{main:C.black,accent:C.mustard},{graphics:[{kind:'checkers',size:.055,offset:.03},{kind:'sill-band',h:.09}],number:null}),
 L('runners','Бегущие',1,'Бирюза, красный и белый тройкой через дверь и крышу; слева порядок цветов обратный',{main:C.teal,accent:C.red,second:C.white},{sides:'invert',graphics:[{kind:'tri',w:.05,gap:.02,angle:58,colors:['main','accent','second'],over:true},{kind:'sill-band',h:.06,color:'ink'}],number:{value:3,plate:'circle',at:'quarter'}}),
 L('step','Ступенька',1,'Графитовый низ поднимается ступенькой на заднее крыло, золотой кант по поясу',{main:C.graphite,accent:C.gold},{graphics:[{kind:'sill-band',h:.16},{kind:'step',at:.62,h:.26},{kind:'pinstripe',offset:.02,color:'accent'}],number:{value:5,plate:'none',at:'door',ink:'light'}}),
 L('belt-number','Пояс с номером',1,'Широкий пояс мадженты с чёрной линией и номер на нём',{main:C.magenta,accent:C.black},{graphics:[{kind:'belt',h:.14,offset:.04},{kind:'belt',h:.02,offset:.20,color:'accent'}],number:{value:66,plate:'none',at:'door',ink:'ink'},personal:'Кисуля'/* пояс Кисули: пока он не именной, тот же розовый номер доставался случайным главарям */}),
 // ---- Эпические: полная ливрея — блокинг, графика, номер, спонсоры, козырёк ----
 L('sport77','Спорт 77',2,'Белая гоночная полоса, красная и синяя линии, районные спонсоры и номер 77 на дверях',{main:C.white,accent:C.red,second:C.navy},{graphics:[{kind:'sill-band',h:.16,color:'ink'},{kind:'belt',h:.20,offset:.14},{kind:'belt',h:.03,offset:.12,color:'accent'},{kind:'belt',h:.02,offset:.35,color:'second'},{kind:'hood',w:.36},{kind:'hood',w:.06,color:'accent'}],number:{value:77,plate:'circle',at:'door'},sponsors:{title:S.sport,mid:[S.oil,S.tyres],small:[S.plugs,S.garage,S.sto,S.sound,S.kvas],hood:S.sport,rear:S.oil},glass:{banner:S.sport}}),
 L('forward-88','Форвард-авто 88',2,'Чёрная корма с градиентом в графит, рубленые косые, белый клин под номером 88, плотные блоки спонсоров и шевроны на крыше',{main:C.black,accent:C.mustard,second:C.white,titleInk:C.mustard},{finish:'satin',graphics:[
   {kind:'split',at:.52,angle:60,side:'rear',over:true,gradient:['main','#4a4f57']},
   // Белые косые с штриховкой на переднем крыле и «ступени» на пороге.
   {kind:'bars',at:'front',v0:.26,v1:.46,count:3,w:.02,gap:.014,angle:60,color:'second'},
   {kind:'hatch',u0:.06,v0:.26,u1:.24,v1:.46,step:.025,color:'#8a8e95'},
   {kind:'bars',u:.36,v0:.20,v1:.30,count:4,w:.03,gap:.012,angle:60,color:'main'},
   {kind:'sill-band',h:.05,color:'main'},
   // Крыша и капот: чёрный клин с белой косой на капоте, чёрная полоса по крыше, шевроны.
   {kind:'tech-top',u0:0,v0:.30,u1:.30,v1:.70,cuts:['tr','br'],color:'main'},
   {kind:'tri-top',u:.10,w:.05,colors:['second'],angle:62},
   {kind:'tech-top',u0:.36,v0:.34,u1:.96,v1:.66,cuts:['tl','bl'],color:'main'},
   {kind:'chevrons-top',u:.33,count:2,w:.02,color:'accent'},{kind:'chevrons-top',u:.90,count:3,w:.018,color:'second'},
   {kind:'number-top',value:88,u:.15,size:.34,color:'second'},
   {kind:'flag',u:.30,v:.56},
 ],number:{value:88,plate:'slash',at:'door',ink:'ink'},sponsors:{title:S.autobahn,sub:S.stack,mid:[S.classic,S.fwd],midSize:.07,small:[S.oil,S.tyres,S.plugs,S.sto,S.garage],hood:S.fwd,rear:S.forward},glass:{banner:S.forward,color:'main'}}),
 L('autobahn','Автобан',2,'Красная корма, через границу — синяя и горчичная тройка косых, уходящая на крышу; спонсоры на чёрном пороге',{main:C.red,accent:C.navy,second:C.mustard},{graphics:[{kind:'sill-band',h:.15,color:'ink'},{kind:'split',at:.52,angle:60,side:'rear',over:true},{kind:'tri',w:.05,gap:.02,angle:60,colors:['accent','second','accent'],at:'door',over:true}],number:{value:30,plate:'tab',at:'door'},sponsors:{title:S.autobahn,mid:[S.wheels,S.turbo],small:[S.oil,S.tyres,S.plugs,S.kvas,S.sto],hood:S.autobahn,rear:S.autobahn},glass:{banner:S.autobahn}}),
 L('kaido','Дом на трассе',2,'Мятные линии скорости и дружелюбные спонсоры — стиль тюнинг-ателье, а не гонки',{main:C.white,accent:C.mint},{graphics:[{kind:'tri',w:.02,gap:.02,angle:62,at:'rear',colors:['accent','accent','accent','accent','accent'],count:5},{kind:'belt',h:.025,offset:.03,color:'accent'},{kind:'sill-band',h:.05,color:'accent'}],number:null,sponsors:{title:S.house,mid:[S.sound,S.kvas],small:[S.tyres,S.garage,S.plugs,S.sto],rear:S.house},glass:{banner:S.house}}),
 L('champion','Гаражный чемпион',2,'Золотой пояс на чёрном низу — чемпион двора, а не только района',{main:C.gold,accent:C.black},{graphics:[{kind:'sill-band',h:.24,color:'accent'},{kind:'belt',h:.05,offset:.04},{kind:'hood',w:.10}],number:{value:1,plate:'circle',at:'door'},sponsors:{title:S.garage,mid:[S.sport,S.oil],small:[S.tyres,S.plugs,S.sto,S.sound],hood:S.garage,rear:S.garage},glass:{banner:S.garage}}),
 L('baikal','Байкал-тур',2,'Синяя волна по низу, белый пояс и полоса на крыше — экспедиционная раскраска',{main:C.blue,accent:C.white},{graphics:[{kind:'sill-band',h:.18},{kind:'wave'},{kind:'belt',h:.06,offset:.04,color:'accent'},{kind:'roof',w:.34}],number:{value:27,plate:'tab',at:'door'},sponsors:{title:S.baikal,mid:[S.dalnoboy,S.turbo],small:[S.wheels,S.tyres,S.sto],hood:S.baikal,rear:S.baikal},glass:{banner:S.baikal}}),
 L('motosport','Пацан мотоспорт',2,'Красный нос косой границей, белая полоса через борт и капот — швейцарские часы отдыхают',{main:C.red,accent:C.white},{graphics:[{kind:'split',at:.30,slant:.10,over:true},{kind:'belt',h:.14,offset:.16,color:'accent'},{kind:'hood',w:.44,color:'accent'},{kind:'sill-band',h:.06}],number:{value:71,plate:'tab',at:'door'},sponsors:{title:S.moto,mid:[S.oil,S.plugs],small:[S.tyres,S.garage,S.sto,S.sound],hood:S.moto,rear:S.moto},glass:{banner:S.moto}}),
 L('night-shift','Ночная смена',2,'Чёрные блоки под углом на корме и капоте, горчичная крапинка — оклейка тех, кто выезжает после смены',{main:C.black,accent:C.mustard},{texture:{type:'speckle',color:'accent',contrast:.7},graphics:[{kind:'block',points:[[.62,.02],[.80,.02],[.98,.66],[.86,.66]]},{kind:'block',points:[[.84,.02],[.90,.02],[1,.40],[1,.62]]},{kind:'tri',w:.025,gap:.02,angle:66,at:'front',colors:['accent','accent']},{kind:'roof',w:.10},{kind:'hood-blocks'}],number:{value:23,plate:'none',at:'door',ink:'ink'},sponsors:{title:S.night,mid:[S.sound,S.turbo],small:[S.oil,S.tyres,S.plugs,S.garage],hood:S.night,rear:S.night},glass:{banner:S.night}}),
 // ---- Легендарные: эпическая + особый финиш или фон; именные — трофеи боссов ----
 L('gold-7','Золото 7',3,'Золотые косые с хромовым блеском и золотой номер — семёрка для тех, кто уже всё доказал',{main:C.gold,accent:C.gold,ink:C.white},{finish:'chrome',graphics:[{kind:'tri',w:.05,gap:.02,angle:58,at:'rear',colors:['main','main'],over:true},{kind:'tri',w:.03,gap:.02,angle:58,at:'front',colors:['main','main']},{kind:'hood',w:.06},{kind:'roof',w:.05}],number:{value:7,plate:'none',at:'door',ink:'main'},sponsors:{title:S.turbo,mid:[S.oil],small:[S.tyres,S.plugs,S.garage],hood:S.turbo,rear:S.turbo},glass:{banner:S.turbo}}),
 L('circuit','Схема',3,'Графитовые блоки со срезами под 45°, тонкие дорожки с точками и малиновые метки — плата на белом кузове',{main:'#3c4048',accent:'#ff2d6f',ink:'#3c4048',light:C.white},{finish:'satin',graphics:[
   // Крупные блоки: задняя четверть, передняя дверь, крыло. Срезы под 45°, вырезы — как дорожки платы.
   {kind:'tech',u0:.60,v0:.30,u1:.94,v1:.62,cuts:['tl','br'],notch:'top'},
   {kind:'tech',u0:.31,v0:.40,u1:.50,v1:.60,cuts:['tr','bl']},
   {kind:'tech',u0:.08,v0:.30,u1:.21,v1:.44,cuts:['br']},
   {kind:'tech',u0:.52,v0:.20,u1:.62,v1:.27,cuts:['tl'],color:'accent'},
   // Дорожки: от блока к блоку с поворотами под 45°, на концах точки.
   {kind:'trace',points:[[.21,.37],[.27,.37],[.31,.45]],w:.012},
   {kind:'trace',points:[[.50,.50],[.56,.50],[.60,.44]],w:.012},
   {kind:'trace',points:[[.14,.30],[.14,.22],[.26,.22],[.30,.16]],w:.010},
   {kind:'trace',points:[[.94,.45],[.98,.45]],w:.010,color:'accent'},
   {kind:'trace',points:[[.66,.30],[.66,.24],[.74,.24]],w:.010,color:'accent'},
   // Внутри большого блока — светлые дорожки, как вырезы платы.
   {kind:'trace',points:[[.66,.56],[.78,.56],[.84,.48],[.90,.48]],w:.010,color:'light'},
   {kind:'trace',points:[[.63,.36],[.72,.36]],w:.010,color:'light'},
   // Штриховка и мелкие метки.
   {kind:'hatch',u0:.40,v0:.18,u1:.52,v1:.26},
   {kind:'hatch',u0:.70,v0:.64,u1:.82,v1:.68,color:'accent'},
   {kind:'marks',at:[[.26,.56],[.56,.62],[.96,.30],[.05,.52]]},
   {kind:'marks',at:[[.36,.33],[.86,.26]],color:'accent'},
   {kind:'trace',points:[[.02,.66],[.24,.66]],w:.006},{kind:'trace',points:[[.72,.68],[.98,.68]],w:.006},
   {kind:'trace',points:[[.30,.24],[.30,.14],[.38,.14]],w:.008,color:'accent'},
   {kind:'hatch',u0:.06,v0:.47,u1:.12,v1:.52,step:.02},
   {kind:'sill-band',h:.03},
   // Крыша и капот: те же блоки и дорожки.
   {kind:'tech-top',u0:.04,v0:.10,u1:.22,v1:.48,cuts:['br','tl']},
   {kind:'tech-top',u0:.60,v0:.50,u1:.90,v1:.92,cuts:['tl','br'],notch:'top'},
   {kind:'tech-top',u0:.40,v0:.62,u1:.52,v1:.70,cuts:['tr'],color:'accent'},
   {kind:'trace-top',points:[[.22,.30],[.34,.30],[.40,.44]],w:.010},
   {kind:'trace-top',points:[[.60,.70],[.52,.70],[.46,.82]],w:.010},
   {kind:'tech-top',u0:.62,v0:.08,u1:.80,v1:.34,cuts:['tr','bl']},
   {kind:'trace-top',points:[[.80,.20],[.92,.20],[.96,.28]],w:.010},{kind:'trace-top',points:[[.10,.60],[.10,.78],[.20,.88]],w:.008,color:'accent'},
 ],number:null,sponsors:{title:null,small:[S.sound,S.tyres,S.night,S.garage],rear:S.sound},glass:{banner:S.sound,color:'main'}}),
 L('pixel','Битый пиксель',3,'Глитч кобальта и мадженты фоном, поверх — белое поле и номер 404',{main:'#2054ff',accent:C.magenta},{texture:{type:'pixels',contrast:.5},graphics:[{kind:'belt',h:.12,offset:.16,color:'light'},{kind:'sill-band',h:.10,color:'ink'}],number:{value:404,plate:'none',at:'door',ink:'ink'},sponsors:{title:S.sound,small:[S.tyres,S.plugs,S.garage],rear:S.sound},glass:{banner:S.sound}}),
 L('marble','Мрамор',3,'Крапчатый фон и золотой пояс с хромом — ливрея с претензией',{main:C.gold,accent:C.gold,ink:C.white},{finish:'chrome',texture:{type:'speckle',contrast:.35},graphics:[{kind:'belt',h:.10,offset:.05},{kind:'belt',h:.02,offset:.17},{kind:'hood',w:.30}],number:{value:9,plate:'none',at:'door',ink:'main'},sponsors:{title:S.sport,mid:[S.oil],small:[S.tyres,S.plugs,S.sto],hood:S.sport,rear:S.sport},glass:{banner:S.sport}}),
 L('night-pride','Чёрный список',3,'Графит и салатовый: тройные штрихи на крыльях, герб с крыльями на двери и капоте, салатовые пороги и козырёк — команда, которой не рады на легальных гонках',{main:C.lime,accent:'#2a2e34',ink:C.lime,light:C.lime,titleInk:C.lime},{finish:'satin',graphics:[
   // Тёмные панели чуть темнее графита: капот, центр крыши, низ дверей — двухцветка в тон.
   {kind:'tech-top',u0:.06,v0:.20,u1:.30,v1:.80,cuts:['tr','br'],color:'accent'},
   {kind:'tech-top',u0:.50,v0:.22,u1:.86,v1:.78,cuts:['tl','bl'],color:'accent'},
   // Тройные штрихи: переднее крыло над аркой и заднее крыло, наклон один.
   {kind:'bars',at:'front',v0:.40,v1:.62,count:3,w:.022,gap:.016,angle:62},
   {kind:'bars',at:'rear',v0:.44,v1:.66,count:3,w:.022,gap:.016,angle:62},
   {kind:'bars-top',u:.22,count:3,w:.02,gap:.014},{kind:'bars-top',u:.86,count:3,w:.02,gap:.014},
   // Салатовая линия по порогу и по нижней кромке бампера.
   {kind:'sill-band',h:.035},
   {kind:'trace',points:[[.02,.235],[.30,.235]],w:.008},{kind:'trace',points:[[.70,.235],[.98,.235]],w:.008},
   // Герб: дверь под титулом мелкий, капот и крыша — крупные.
   // Гербы: большой на капоте, средний на крыше — как у команды, а не у спонсора.
   {kind:'emblem-top',u:.16,v:.5,size:.30},
   {kind:'emblem-top',u:.62,v:.5,size:.26},
 ],number:null,sponsors:{title:S.blacklist,sub:S.blsub,mid:[S.tyres],small:[S.sound,S.plugs,S.garage,S.sto,S.turbo],rear:S.blacklist},glass:{banner:S.tyres,color:'main'}}),
 L('kaban','Кабан',3,'Охотничий камуфляж, «рыбалка — дело серьёзное» на двери и номер 134. Трофей за босса «Стройки»',{main:C.olive,accent:C.sand,ink:C.white},{personal:'Кабан',texture:{type:'camo',contrast:.92,colors:[C.khaki,C.moss,C.dune,C.bark]},graphics:[{kind:'sill-band',h:.14,color:'#2c2a1f'},{kind:'belt',h:.03,offset:.03,color:'accent'}],number:{value:134,plate:'tab',at:'quarter'},sponsors:{title:S.fish,mid:[S.turbo],small:[S.wheels,S.tyres,S.kvas],rear:S.fish},glass:{banner:'ЩУКА БЫЛА — ВО!'}}),
 L('lakost','Лакост',3,'Чёрный глянец, золотой кант и клубные надписи хилого мажора. Трофей',{main:C.gold,accent:C.gold,ink:C.white},{personal:'Лакост',finish:'chrome',graphics:[{kind:'sill-band',h:.10,color:'#0d0e10'},{kind:'pinstripe',offset:.02},{kind:'pinstripe',offset:.05,h:.006},{kind:'roof',w:.04}],number:null,sponsors:{title:S.lakost,small:[S.sound,S.kvas],hood:S.lakost,rear:S.lakost},glass:{banner:S.lakost}}),
 L('madam','Мадам',3,'Триколор по поясу и кутюрные надписи — мажорка из Франции. Трофей',{main:C.white,accent:C.red,second:C.navy},{personal:'Мадам',finish:'gloss',graphics:[{kind:'belt',h:.05,offset:.02,color:'second'},{kind:'belt',h:.05,offset:.07},{kind:'belt',h:.05,offset:.12,color:'accent'},{kind:'hood',w:.12,color:'second'},{kind:'hood',w:.04}],number:{value:1,plate:'circle',at:'quarter'},sponsors:{title:S.madam,small:[S.kvas,S.sound],hood:S.madam,rear:S.madam},glass:{banner:S.madam}}),
];
export const liveryById=id=>LIVERIES.find(l=>l.id===id);

// Старые маски (v5) переезжают в новые ливреи того же духа, чтобы выигранное не пропало.
export const LEGACY_DECALS={volt:'night-pride',finish:'ring-77',tiger:'street',hazard:'polyot-21',glitch:'pixel',arctic:'north-wind',pulse:'runners',tag:'three-lines',sunset:'belt-number',phantom:'circuit',rallye:'polyot-21'};

// ---------------------------------------------------------------------------------------------
// Раскладка: спека + кузов → список фигур и текстов в нормированных координатах.
// Цвета — имена палитры или hex. Текстовые слоты жёстко привязаны к плоским зонам кузова.
const col=(pal,c,fallback='main')=>{const v=c??fallback;return pal[v]||(typeof v==='string'&&v.startsWith('#')?v:pal.main);};
const luminance=hex=>{const n=parseInt(hex.slice(1),16);const f=x=>{x/=255;return x<=.03928?x/12.92:((x+.055)/1.055)**2.4;};return .2126*f(n>>16&255)+.7152*f(n>>8&255)+.0722*f(n&255);};
const inkOn=(pal,bg)=>luminance(bg)>.35?'#15181c':(pal.light||'#f4f2ea');

export function layoutLivery(spec,fit=DEFAULT_FIT,paint='#9d2730'){
 const A=anchors(fit),pal=spec.palette,ops=[],texts=[];
 const cap=A.belt-.015;const side=(op)=>{if(op.kind==='rect'||op.kind==='hatch')op={...op,v1:Math.min(op.v1,cap),v0:Math.min(op.v0,cap)};else if(op.kind==='poly'||op.kind==='path')op={...op,points:op.points.map(([u,v])=>[u,Math.min(v,cap)])};ops.push({region:'side',...op});};
 const top=(op)=>{ops.push({region:'top',...op});};
 const ends=(op)=>{ops.push({region:'front',...op});ops.push({region:'rear',...op});};
 const rect=(region,u0,v0,u1,v1,fill,extra={})=>ops.push({region,kind:'rect',u0,v0,u1,v1,fill,...extra});
 // Что лежит под точкой борта — чтобы выбрать цвет текста по контрасту.
 const under=[];const remember=(u0,v0,u1,v1,fill)=>under.push({u0,v0,u1,v1,fill});
 const bgAt=(u,v)=>{let f=paint;for(const r of under)if(u>=r.u0&&u<=r.u1&&v>=r.v0&&v<=r.v1)f=r.fill;return f;};
 // Полоса цвета краски невидима (белый винил на белом кузове): такой цвет подменяем ближайшим контрастным из палитры,
 // иначе рисунок читается с обрывами — соседняя полоса будто начинается из ниоткуда.
 const Lp=luminance(paint);
 const vis=c=>{if(typeof c!=='string'||Math.abs(luminance(c)-Lp)>=.16)return c;for(const alt of [pal.accent,pal.main,pal.second,pal.ink,pal.light])if(alt&&alt!==c&&Math.abs(luminance(alt)-Lp)>=.16)return alt;return Lp>.35?'#15181c':'#f3efe4';};
 // Фон-текстура низким контрастом: под ней краска, поверх — обычные слои.
 if(spec.texture){const fill=col(pal,spec.texture.color,'main'),tones=(spec.texture.colors||[]).map(c=>col(pal,c,'main'));
  // fromPaint — гамма узора выводится из краски кузова, а не из палитры ливреи: перекрасил машину, сменился весь колорит.
  for(const region of ['side','top','front','rear'])ops.push({region,kind:'pattern',type:spec.texture.type,fill,colors:tones,paint:spec.texture.fromPaint?paint:null,contrast:spec.texture.contrast??.3});}
 let band=null;
 for(const g of spec.graphics||[]){
  const fill=vis(col(pal,g.color));
  switch(g.kind){
   case 'sill-band':{const v1=A.floor+g.h;side({kind:'rect',u0:0,v0:0,u1:1,v1,fill});ends({kind:'rect',u0:0,v0:0,u1:1,v1,fill});remember(0,0,1,v1,fill);band={v0:A.floor-.02,v1,fill};break;}
   case 'belt':{const v1=A.belt-(g.offset??0),v0=v1-g.h;side({kind:'rect',u0:0,v0,u1:1,v1,fill});ends({kind:'rect',u0:0,v0,u1:1,v1,fill});remember(0,v0,1,v1,fill);break;}
   case 'pinstripe':{const h=g.h??.012,v1=A.belt-(g.offset??.02);side({kind:'rect',u0:.02,v0:v1-h,u1:.98,v1,fill});break;}
   case 'diagonal':{
    // Косые — параллелограммы от порога к поясу под одним углом; центр — дверь, переднее или заднее крыло.
    const v0=Math.max(A.floor+.02,(band?band.v1:A.floor+.02)),v1=A.belt-.02;
    const du=(v1-v0)*A.H/Math.tan((g.angle??62)*Math.PI/180)/A.L;
    const centre=g.at==='rear'?Math.min(.93-du,A.quarter.u0+.05):g.at==='front'?Math.max(.08,A.wing.u1-.06):A.door.c;
    const total=g.count*g.w+(g.count-1)*(g.gap??.02);let u=centre-total/2-du/2;
    for(let i=0;i<g.count;i++){const f=vis(col(pal,g.colors?.[i],g.color??'main'));side({kind:'poly',points:[[u,v0],[u+g.w,v0],[u+g.w+du,v1],[u+du,v1]],fill:f});u+=g.w+(g.gap??.02);}
    break;}
   case 'tri':{
    // Набор параллельных косых разных цветов — через дверь от порога к поясу и, при over, дальше через крышу.
    const colors=g.colors||['main'],count=g.count??colors.length;
    const v0=Math.max(A.floor+.02,(band?band.v1:A.floor+.02)),v1=A.belt-.02;
    const du=(v1-v0)*A.H/Math.tan((g.angle??62)*Math.PI/180)/A.L;
    const centre=g.at==='rear'?Math.min(.93-du,A.quarter.u0+.05):g.at==='front'?Math.max(.08,A.wing.u1-.06):A.door.c;
    const total=count*g.w+(count-1)*(g.gap??.02);let u=centre-total/2-du/2;
    for(let i=0;i<count;i++){const f=vis(col(pal,colors[i%colors.length]));side({kind:'poly',points:[[u,v0],[u+g.w,v0],[u+g.w+du,v1],[u+du,v1]],fill:f});
     if(g.over){const ut=u+du+.01,dz=du*.9;top({kind:'poly',points:[[ut,0],[ut+g.w,0],[ut+g.w+dz,1],[ut+dz,1]],fill:f});}
     u+=g.w+(g.gap??.02);}
    break;}
   case 'block':{side({kind:'poly',points:g.points,fill});break;}
   case 'tech':case 'tech-top':{
    // Прямоугольник со срезами под 45° и вырезом-«ступенькой»: язык печатной платы.
    const region=g.kind==='tech'?'side':'top',k=region==='side'?A.H/A.L:A.W/A.L,c=g.cut??.05,cu=c*k,cuts=g.cuts||[];
    const {u0,v0,u1,v1}=g,pts=[];
    if(cuts.includes('tl')){pts.push([u0,v1-c],[u0+cu,v1]);}else pts.push([u0,v1]);
    if(g.notch==='top'){const m=(u0+u1)/2;pts.push([m-.04,v1],[m-.04+.03*k,v1-.03],[m+.04-.03*k,v1-.03],[m+.04,v1]);}
    if(cuts.includes('tr')){pts.push([u1-cu,v1],[u1,v1-c]);}else pts.push([u1,v1]);
    if(cuts.includes('br')){pts.push([u1,v0+c],[u1-cu,v0]);}else pts.push([u1,v0]);
    if(cuts.includes('bl')){pts.push([u0+cu,v0],[u0,v0+c]);}else pts.push([u0,v0]);
    if(region==='side'){side({kind:'poly',points:pts,fill});remember(u0,v0,u1,v1,fill);}else top({kind:'poly',points:pts,fill});
    break;}
   case 'trace':case 'trace-top':{ops.push({region:g.kind==='trace'?'side':'top',kind:'path',points:g.points,w:g.w??.01,fill,dots:true});break;}
   case 'bars':{
    // Короткие параллельные штрихи — «линии скорости» на крыле, не от порога до пояса, а куском.
    const k=A.H/A.L,v0=g.v0,v1=Math.min(A.belt-.02,g.v1),du=(v1-v0)/Math.tan((g.angle??62)*Math.PI/180)*k;
    const centre=g.at==='rear'?Math.min(.95-du,A.quarter.u0+.04):g.at==='front'?Math.max(.05,A.wing.u0+.05):(g.u??A.door.c);
    let u=centre;for(let i=0;i<(g.count??3);i++){side({kind:'poly',points:[[u,v0],[u+g.w,v0],[u+g.w+du,v1],[u+du,v1]],fill});u+=g.w+(g.gap??.015);}
    break;}
   case 'tri-top':{const k=A.W/A.L,du=.6/Math.tan((g.angle??62)*Math.PI/180)*k;let u=g.u;for(const c of g.colors||['main']){top({kind:'poly',points:[[u,.2],[u+g.w,.2],[u+g.w+du,.8],[u+du,.8]],fill:vis(col(pal,c))});u+=g.w+.012;}break;}
   case 'chevrons-top':{const k=A.W/A.L,d=.28*k;let u=g.u;for(let i=0;i<(g.count??2);i++){top({kind:'poly',points:[[u,.08],[u+g.w,.08],[u+g.w+d,.5],[u+g.w,.92],[u,.92],[u+d,.5]],fill});u+=g.w+.014;}break;}
   case 'number-top':{ops.push({region:'top',kind:'text',slot:'hood-number',text:String(g.value),u:g.u,v:.5,size:g.size??.3,maxU:.28,fill,weight:700,rotate:-90});break;}
   case 'flag':{side({kind:'flag',u:g.u,v:g.v,size:g.size??.05,fill:col(pal,'ink'),light:col(pal,'light')});break;}
   case 'bars-top':{const k=A.W/A.L,du=.5*k*.7;let u=g.u;for(let i=0;i<(g.count??3);i++){top({kind:'poly',points:[[u,.10],[u+g.w,.10],[u+g.w+du,.90],[u+du,.90]],fill});u+=g.w+(g.gap??.014);}break;}
   case 'emblem':case 'emblem-top':{ops.push({region:g.kind==='emblem'?'side':'top',kind:'emblem',u:g.u,v:g.v,size:g.size,fill,ink:col(pal,g.ink,'accent'),rotate:g.kind==='emblem-top'?-90:0});break;}
   case 'hatch':{side({kind:'hatch',u0:g.u0,v0:g.v0,u1:g.u1,v1:g.v1,fill,step:g.step??.03});break;}
   case 'marks':{for(const [u,v] of g.at)side({kind:'mark',u,v,size:g.size??.03,fill});break;}
   case 'hood-blocks':{for(const [u0,w] of [[.04,.07],[.14,.05],[.22,.09]])top({kind:'poly',points:[[u0,.18],[u0+w,.18],[u0+w+.06,.82],[u0+.06,.82]],fill});break;}
   case 'split':{
    // Две зоны цвета с косой границей; закрашенный торец — тот, что окрашен; при over — и часть крыши.
    // angle — граница идёт под тем же углом, что косые `tri`, и на крыше продолжается параллельно им.
    // gradient:[c0,c1] — заливка переходит от границы к торцу.
    const at=g.at??.45;const fill=g.gradient?{grad:[vis(col(pal,g.gradient[0])),col(pal,g.gradient[1])],axis:'u',dir:g.side==='rear'?1:-1}:vis(col(pal,g.color));const flat=typeof fill==='string'?fill:fill.grad[0];/* для контраста текста поле считаем по цвету у границы */
    const s=g.angle?(A.H/Math.tan(g.angle*Math.PI/180)/A.L)/2:(g.slant??.08);
    const dz=g.angle?(A.belt-A.floor-.04)*A.H/Math.tan(g.angle*Math.PI/180)/A.L*.9:s*.6;
    if(g.side==='rear'){side({kind:'poly',points:[[at-s,0],[1,0],[1,1],[at+s,1]],fill});ops.push({region:'rear',kind:'rect',u0:0,v0:0,u1:1,v1:1,fill:flat});remember(at+s,0,1,1,flat);if(g.over)top({kind:'poly',points:[[at+s,0],[1,0],[1,1],[at+s+dz,1]],fill});}
    else{side({kind:'poly',points:[[0,0],[at+s,0],[at-s,1],[0,1]],fill});ops.push({region:'front',kind:'rect',u0:0,v0:0,u1:1,v1:1,fill:flat});remember(0,0,at-s,1,flat);if(g.over)top({kind:'poly',points:[[0,0],[at-s,0],[at-s+dz,1],[0,1]],fill});}
    break;}
   case 'step':{const v1=Math.min(A.belt-.03,A.floor+g.h);side({kind:'poly',points:[[g.at,band?band.v1:A.floor],[g.at+.05,v1],[1,v1],[1,0],[g.at,0]],fill});remember(g.at+.05,0,1,v1,fill);break;}
   case 'swoosh':{
    // Дуга от переднего порога к задней стойке: полоса, которая утончается к носу.
    const pts=[],n=14;for(let i=0;i<=n;i++){const t=i/n;pts.push([.06+t*.82,A.floor+.06+(A.belt-A.floor-.10)*t*t]);}
    const back=[];for(let i=n;i>=0;i--){const t=i/n;back.push([.06+t*.82,A.floor+.06+(A.belt-A.floor-.10)*t*t+.05+.10*t]);}
    side({kind:'poly',points:[...pts,...back],fill});
    const accent=col(pal,'accent');const p2=pts.map(([u,v])=>[u,v-.035]),b2=back.map(([u,v])=>[u,v-.05-.10*((u-.06)/.82)+.005]);side({kind:'poly',points:[...p2,...b2.slice(0,0)].concat(p2.slice().reverse().map(([u,v])=>[u,v-.025])),fill:accent});
    break;}
   case 'wave':{const base=band?band.v1:A.floor+.04,pts=[],n=16;for(let i=0;i<=n;i++){const t=i/n;pts.push([t,base+.05+.05*Math.sin(t*Math.PI*3)]);}side({kind:'poly',points:[[0,base-.01],...pts,[1,base-.01]],fill});break;}
   case 'checkers':{const v1=A.belt-(g.offset??.03),s=g.size??.05,n=Math.floor(1/(s*A.H/A.L));const su=1/n;for(let i=0;i<n;i++){for(let r=0;r<2;r++)if((i+r)%2===0)side({kind:'rect',u0:i*su,v0:v1-s*(r+1),u1:(i+1)*su,v1:v1-s*r,fill});}break;}
   case 'hood':{const w=g.w??.3;top({kind:'rect',u0:0,v0:.5-w/2,u1:A.hoodEnd,v1:.5+w/2,fill});if(!g.color||g.color==='main')ops.push({region:'front',kind:'rect',u0:.5-w/2,v0:A.belt-.12,u1:.5+w/2,v1:1,fill});break;}
   case 'hood-tip':{top({kind:'poly',points:[[0,.5-.34],[.10,.5-.20],[.10,.5+.20],[0,.5+.34]],fill:col(pal,'accent')});break;}
   case 'roof':{const w=g.w??.3;top({kind:'rect',u0:A.roof.u0,v0:.5-w/2,u1:A.roof.u1,v1:.5+w/2,fill});break;}
   case 'roof-full':{top({kind:'rect',u0:A.roof.u0-.04,v0:0,u1:1,v1:1,fill});break;}
  }
 }
 // ---- Текст: номер и спонсоры по плоским зонам ----
 // Текст на краске стоит на вычищенном поле: под ним стираются полосы, иначе надпись перечёркнута.
 // На своей табличке или полосе ничего не стираем.
 // Если строка ложится на молдинг — сдвигаем её вверх или вниз, к ближней стороне.
 const avoidMolding=(v,half)=>{const m=A.mold;if(!m||v+half<m.v0||v-half>m.v1)return v;return v>=(m.v0+m.v1)/2?m.v1+half+.005:m.v0-half-.005;};
 const text=(region,slot,str,u,v,size,maxU,fill,extra={})=>{
  if(region==='side'&&slot!=='number')v=avoidMolding(v,size*.5);
  if(region==='side'&&extra.clear){const hw=maxU/2+.012,hh=size*.62;ops.push({region:'side',kind:'clear',u0:u-hw,v0:v-hh,u1:u+hw,v1:v+hh});}
  const op={region,kind:'text',slot,text:str,u,v,size,maxU,fill,...extra};delete op.clear;ops.push(op);texts.push(op);};
 const onBand=v=>band&&v>band.v0&&v<band.v1;
 // Ручка двери: если надпись на её высоте, укорачиваем зону до ручки.
 const avoidHandle=(u0,u1,v)=>(v>A.handle.v0-.04&&v<A.handle.v1+.04&&u1>A.handle.u0)?[u0,Math.max(u0+.08,A.handle.u0-.01)]:[u0,u1];
 const D=A.door;const bandTop=band?band.v1:A.floor+.02;const mid=Math.min(A.belt-.14,(bandTop+A.belt)/2);
 let numberU=null;
 if(spec.number){
  const n=spec.number,plate=n.plate??'tab',value=String(n.value);
  // На заднем крыле места меньше: номер стоит над аркой и не выше пояса, радиус ужимается под зазор.
  const R=n.at==='quarter'?Math.max(.05,Math.min(.11,(A.belt-.05-A.archTop-.03)/2*.9)):Math.min(.13,(A.belt-bandTop)*.36);
  const uAt=n.at==='quarter'?Math.min(A.quarter.u1-.02-R*A.H/A.L,Math.max(A.quarter.u0+R*A.H/A.L*.5,A.uR)):(spec.sponsors?.title?D.u0+D.w*.30:D.c);
  const vAt=avoidMolding(n.at==='quarter'?Math.min(A.belt-.05-R*.55,A.archTop+.03+R*.6):mid,R*.85);
  const ru=R*A.H/A.L;
  let plateFill=null;
  if(plate==='circle'){plateFill=col(pal,'light');side({kind:'circle',u:uAt,v:vAt,r:R,fill:plateFill,stroke:pal.ink});}
  else if(plate==='tab'){plateFill=col(pal,'light');side({kind:'rect',u0:uAt-ru*1.15,v0:vAt-R*.82,u1:uAt+ru*1.15,v1:vAt+R*.82,fill:plateFill,round:true});}
  else if(plate==='slash'){plateFill=col(pal,'light');const sl=R*.9*A.H/A.L;side({kind:'poly',points:[[uAt-ru*1.05,vAt-R*.95],[uAt+ru*1.35,vAt-R*.95],[uAt+ru*1.05+sl,vAt+R*.95],[uAt-ru*1.35+sl,vAt+R*.95]],fill:plateFill});}
  const ink=n.ink?col(pal,n.ink):inkOn(pal,plateFill||bgAt(uAt,vAt));
  text('side','number',value,uAt,vAt,R*1.45,ru*2.2,plate==='none'&&!onBand(vAt)?inkOn(pal,paint):ink,{weight:700,stretch:.92,clear:plate==='none'&&!onBand(vAt)});
  numberU={u0:uAt-ru*1.2,u1:uAt+ru*1.2,v0:vAt-R,v1:vAt+R};
  ops.push({region:'rear',kind:'text',slot:'rear-number',text:value,u:.5,v:Math.min(.95,A.belt+.04),size:.10,maxU:.3,fill:inkOn(pal,paint),weight:700});
 }
 const sp=spec.sponsors;
 if(sp){
  // Титульный — на двери рядом с номером или во всю дверь.
  // Титульный спонсор: если на двери есть широкое поле (пояс, полоса, тёмная зона) — надпись ложится в его
  // середину цветом по контрасту; иначе под ней вычищается краска и она стоит на кузове.
  const fieldAt=(u,v)=>under.find(r=>u>r.u0&&u<r.u1&&v>r.v0&&v<r.v1&&r.v1-r.v0>=.10);
  if(sp.title){let u0=numberU&&spec.number.at!=='quarter'?numberU.u1+.02:D.u0+.01,u1=D.u1-.01;let v=numberU&&spec.number.at!=='quarter'?(numberU.v0+numberU.v1)/2:mid;
   const field=fieldAt((u0+u1)/2,v)||fieldAt((u0+u1)/2,mid)||fieldAt((u0+u1)/2,mid-.08);
   if(field)v=Math.max(field.v0+.05,Math.min(field.v1-.05,v));
   [u0,u1]=avoidHandle(u0,u1,v);const c=(u0+u1)/2;
   const size=Math.min(.11,field?(field.v1-field.v0)*.55:(A.belt-bandTop)*.30);
   const titleInk=pal.titleInk||(field?inkOn(pal,field.fill):inkOn(pal,paint));text('side','title',sp.title,c,v,size,u1-u0,titleInk,{weight:700,clear:!field});
   if(sp.sub)text('side','sub',sp.sub,c,v-size*.72,size*.36,u1-u0,titleInk,{weight:600,clear:!field});}
  // Средние — переднее крыло над аркой (ниже линии капота) и заднее крыло над аркой.
  const midV=Math.min(A.hoodCut-.03,Math.max(A.archTop+.06,A.belt-.16));
  // На переднем крыле между аркой и капотом бывает всего 5 см (низкие хэтчбеки): тогда надпись туда не лезет —
  // уходит на заднее крыло, а заднее — на капот. На плоских крыльях Волги и буханки места хватает.
  const wingRoom=A.hoodCut-A.archTop-.04,mids=[...(sp.mid||[])];
  if(mids[0]&&wingRoom>=.065){const c=(A.wing.u0+A.wing.u1)/2;const f=fieldAt(c,midV);const vv=f?Math.max(f.v0+.04,Math.min(f.v1-.04,midV)):midV;text('side','mid',mids.shift(),c,vv,Math.min(.055,wingRoom*.7),A.wing.u1-A.wing.u0-.02,f?inkOn(pal,f.fill):inkOn(pal,paint),{weight:700,clear:!f});}
  if(mids[0]&&!(spec.number?.at==='quarter')){const c=(A.quarter.u0+A.quarter.u1)/2,v=Math.min(A.belt-.06,Math.max(A.archTop+.06,midV));let f=fieldAt(c,v)||fieldAt(c,v-.06);if(f&&f.v1-.04<A.archTop+.03)f=null;/* поле ниже арки не годится: текст должен стоять над колесом */let vv=f?Math.max(A.archTop+.03,Math.max(f.v0+.04,Math.min(f.v1-.04,v))):v;if(!f)vv=Math.max(vv,A.belt-.11);/* над расширенной аркой обвеса, ближе к поясу */text('side','mid',mids.shift(),c,vv,sp.midSize??.05,A.quarter.u1-A.quarter.u0-.02,f?inkOn(pal,f.fill):inkOn(pal,paint),{weight:700,clear:!f});}
  if(mids[0]&&!sp.hood)ops.push({region:'top',kind:'text',slot:'hood',text:mids[0],u:A.hoodEnd*.55,v:.5,size:.14,maxU:A.hoodEnd*.8,fill:inkOn(pal,paint),weight:700,rotate:-90});
  // Мелкие — рядом по порогу между арками, на тёмной полосе или на краске.
  if(sp.small?.length){const wide=band&&band.v1-A.floor>=.08;/* узкая линия по порогу — не поле, мелочь встаёт над ней на краску */const v=wide?(band.v0+band.v1)/2+.01:(band?band.v1:A.floor)+.05;const list=sp.small.slice(0,6),step=D.w/list.length;list.forEach((s,i)=>{const c=D.u0+step*(i+.5);text('side','small',s,c,v,Math.min(.036,wide?(band.v1-A.floor)*.42:.036),step-.012,wide?inkOn(pal,bgAt(c,v)):inkOn(pal,paint),{weight:600,clear:!wide});});}
  if(sp.hood)ops.push({region:'top',kind:'text',slot:'hood',text:sp.hood,u:A.hoodEnd*.55,v:.5,size:.16,maxU:A.hoodEnd*.8,fill:inkOn(pal,(spec.graphics||[]).some(g=>g.kind==='hood'&&(!g.color||g.color==='main'))?col(pal,'main'):paint),weight:700,rotate:-90});
  if(sp.rear)ops.push({region:'rear',kind:'text',slot:'rear',text:sp.rear,u:.5,v:Math.max(A.floor+.08,A.belt-.28),size:.06,maxU:.6,fill:inkOn(pal,band?band.fill:paint),weight:700});
 }
 if(spec.glass?.banner)ops.push({region:'glass',kind:'banner',text:spec.glass.banner,fill:col(pal,spec.glass.color,'main'),ink:inkOn(pal,col(pal,spec.glass.color,'main'))});
 // Оценка покрытия борта: сумма площадей фигур (пересечения считаются дважды — оценка сверху).
 let cover=0;for(const o of ops){if(o.region!=='side')continue;if(o.kind==='rect')cover+=(o.u1-o.u0)*(o.v1-o.v0);else if(o.kind==='poly')cover+=Math.abs(o.points.reduce((s,[x,y],i,a)=>{const [x2,y2]=a[(i+1)%a.length];return s+x*y2-x2*y;},0))/2;else if(o.kind==='circle')cover+=Math.PI*o.r*o.r*A.H/A.L;}
 return {ops,texts,anchors:A,cover:Math.min(1,cover),sides:spec.sides||'mirror'};
}
