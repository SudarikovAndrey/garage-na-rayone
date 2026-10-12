// Баннер приглашения на стрелку — квадратный плакат для чата. Это первое, что кореш видит про игру,
// поэтому карточка говорит всё сама: кто зовёт, на чём, сколько метров и какая мощь. Текста в самом
// сообщении остаётся одна строка: простыню из четырёх строк никто не читает.
//
// Картинка — снимок своего гаража со своей машиной (dist/garage-shot.js), а не витринный рендер.
// Поверх — плакатная вёрстка: заголовок, плашка, числа с иконками, подколка и печать.
//
// Рисуем на обычном 2D-холсте, поэтому модуль проверяется без браузера: сюда можно подсунуть
// подставной контекст и посмотреть, что и где он рисует.
export const CARD={width:1080,height:1080,quality:.82};
// Надпись нарисована кистью и лежит картинкой: шрифтом такую не набрать.
export const HEADLINE='assets/invite/headline.png';
// Сверху в ней прозрачное поле: кончики мазков дорисованы скриптом fix-invite-headline.mjs,
// потому что в исходнике верх букв был срезан по кромке файла. Без этой поправки надпись
// уезжает вниз ровно на высоту поля и упирается в блок под ней.
export const HEADLINE_PAD=44/472;
const WHITE='#f7f3e9',RED='#e0262b',YELLOW='#efc247',MUTED='#ded6c2',SHADE='#0c0e0b';
const HEAD='"Russo One", Oswald, Arial, sans-serif',FACE='Oswald, "Arial Narrow", Arial, sans-serif';

const upper=s=>String(s??'').toLocaleUpperCase('ru-RU');
// Длинные имена режем по буквам, а не по пикселям: шрифт на холсте может не совпасть со шрифтом игры.
export const fitName=(name,max=22)=>{const s=upper(name).trim();return s.length<=max?s:s.slice(0,max-1).trimEnd()+'…';};

// Крючок карточки — время, которое надо побить. Раньше здесь стояли три равновесных числа —
// мощь, дистанция, тачка, — и ни одно из них не было поводом ответить: «думаешь, быстрее?»
// спрашивало, не назвав, быстрее чего. Теперь одно большое число и подпись под ним, как на
// табло в конце полосы; всё остальное уходит в одну тихую строку.
// Новому человеку вызов «побей 11.73» ничего не говорит: он не знает ни игру, ни соперника, и
// соревноваться ему не с чем. Ему показываем подарок, а время и тачка уходят тихой строкой.
export const GIFT_CASH=3000;
export const GIFT_TEXT='Падают, как доедешь первый заезд';
export const cardHeadline=kind=>kind==='gift'?'ЗАБЕРИ СТАРТОВЫЙ НАБОР':kind==='loaner'?LOANER_POSTER.hook.join(' '):null;
// Плакат подмены (Андрей, 12 октября). Первая версия просила «подмени меня на гонке» и обещала
// «3 заезда» и «Копейку потом» — просьба об услуге, внутренние цифры и награда мелким шрифтом в углу.
// Так не зовут: человеку, который игры не видел, продают не условия, а выгоду. Здесь один герой
// (тачка), одно обещание (своя тачка и ящик в подарок), один глагол (за руль) и имя кореша как
// причина доверять. Разбор — docs/loaner-invite.md, раздел 0а.
export const LOANER_POSTER={
 hook:['КАТАНИ НА МОЕЙ','ЗАРЯЖЕННОЙ ТАЧКЕ'],
 from:name=>upper(fitName(name,16))+' ЗОВЁТ',
 sub:'ПРОКАТИСЬ НА МОЕЙ — ПОЛУЧИ И ПРОКАЧАЙ СВОЮ',
 noteCar:'ТВОЯ ТАЧКА ЖДЁТ',
 noteCrate:['ЯЩИК ЗАПЧАСТЕЙ','В ПОДАРОК'],
 cta:'ЖМИ — ЗА РУЛЬ  »',
 nav:['ГОНКИ','ТЮНИНГ','ПРОГРЕСС','РЕЙТИНГ'],
};
// Нарисованные элементы плаката (заказ через codex-assets 12 октября, docs/loaner-invite.md §0в):
// двор, заголовок и подзаголовок кистью, кнопка, Копейка, ящик и детали. Машина кореша — 3D-рендер.
export const POSTER_ART={
 yard:'assets/invite/yard-square.webp',headline:'assets/invite/headline-art.webp',subline:'assets/invite/subline-art.webp',
 button:'assets/invite/button.webp',logo:'assets/invite/logo.webp',rules:'assets/invite/rules.webp',more:'assets/invite/more.webp',reflection:'assets/invite/reflection.webp',nav:'assets/invite/nav-icons.webp',noteCar:'assets/invite/note-car.webp',noteCrate:'assets/invite/note-crate.webp',kopeyka:'assets/invite/kopeyka.webp',crate:'assets/invite/crate.webp',parts:'assets/invite/parts.webp',
};
export const cardHero=({time,distance,kind='call'})=>kind==='gift'
 ?{value:GIFT_CASH.toLocaleString('ru-RU').replace(/ /g,'\u00a0')+' ₽',label:'НА СТАРТ'}
 :time>0
 ?{value:time.toFixed(2),label:'СЕКУНД НА '+(distance??0)+' М'}
 :{value:(distance??0)+' М',label:'ДИСТАНЦИЯ'};
export const cardLine=({car,power})=>upper(car||'')+' · '+(power??0)+' СИЛ';

// Разрядка: у холста её или нет вовсе, или она только в свежих браузерах. Рисуем по букве.
function spaced(ctx,text,x,y,gap=3){
 let cursor=x;
 for(const ch of String(text)){ctx.fillText(ch,cursor,y);cursor+=ctx.measureText(ch).width+gap;}
 return cursor-x-gap;
}
// Подгонка кегля под колонку: имена и названия машин бывают длинными, а ломать вёрстку им нельзя.
function fitSize(ctx,text,max,from,to,weight=600,family=FACE){
 for(let size=from;size>to;size-=2){ctx.font=`${weight} ${size}px ${family}`;if(ctx.measureText(text).width<=max)return size;}
 ctx.font=`${weight} ${to}px ${family}`;return to;
}
// Имя в две строки: по словам, если одной строкой выходит мелко.
export function nameLines(text,max=13){
 const words=upper(text).trim().split(/\s+/).filter(Boolean);
 if(!words.length)return ['ГОНЩИК'];
 if(words.length===1||words.join(' ').length<=max)return [words.join(' ')];
 const first=[words[0]];
 while(first.length<words.length-1&&first.join(' ').length+words[first.length].length<=max)first.push(words[first.length]);
 return [first.join(' '),words.slice(first.length).join(' ')];
}

// Снимок кладём «по обложке»: кадр баннера и кадр гаража почти всегда сходятся, но подстраховаться
// дешевле, чем однажды показать полосы по краям.
// shift — сдвиг кадра в долях карточки: у подмены машина целиком и прозрачная по краям, её ставим
// правее колонки текста, носом к ней.
function cover(ctx,image,w,h,shift=null){
 const scale=Math.max(w/image.width,h/image.height);
 const iw=image.width*scale,ih=image.height*scale;
 ctx.drawImage(image,(w-iw)/2+(shift?.x||0)*w,(h-ih)/2+(shift?.y||0)*h,iw,ih);
}
// Камера под макет: дальше и на уровне капота, как снят двор, — машина целиком, без широкоугольных
// искажений. На плакате кадр зеркалится: по макету нос смотрит вправо.
export const LOANER_CAR_RIG={side:1.55,ahead:.95,lead:.08,height:.6,aim:.42,tilt:0};
// Сетка макета 1024×1024 Андрея в долях карточки: центр и ширина каждого элемента.
export const LOANER_LAYOUT={
 logo:{x:.06,y:.035,w:.3},rules:{x:.85,y:.035,w:.12},more:{x:.025,y:.2,w:.1},
 plate:{y:.1},headline:{x:.14,y:.125,w:.74},subline:{x:.17,y:.335,w:.52},
 hero:{cx:.37,cy:.53,w:.88},reflection:{cx:.37,cy:.69,w:.62},
 gift:{cx:.84,cy:.55,w:.3},noteCar:{x:.89,y:.4,w:.1},
 parts:{cx:.6,cy:.82,w:.5},crate:{cx:.6,cy:.78,w:.32},noteCrate:{x:.87,y:.63,w:.12},
 button:{x:.05,y:.875,w:.38},nav:{x:.6,y:.91,w:.33},
};
// Наклон букв: курсива у плакатных шрифтов нет, скашиваем холст.
const SLANT=-.16;
// Мазок под заголовком: сужается к концу, как след кисти.
function stroke(ctx,x,y,w,h,color){
 ctx.fillStyle=color;ctx.beginPath();
 ctx.moveTo(x,y);ctx.lineTo(x+w,y-h*.35);ctx.lineTo(x+w,y+h*.5);ctx.lineTo(x,y+h);
 ctx.closePath();ctx.fill();
}
// Корона — знак «Рынка пацана». Рисуем путём, чтобы не тащить картинку ради тридцати пикселей.
function crown(ctx,x,y,s,color){
 ctx.fillStyle=color;ctx.beginPath();
 ctx.moveTo(x,y+s);ctx.lineTo(x+s*.14,y+s*.12);ctx.lineTo(x+s*.42,y+s*.62);ctx.lineTo(x+s*.7,y);
 ctx.lineTo(x+s*.98,y+s*.62);ctx.lineTo(x+s*1.26,y+s*.12);ctx.lineTo(x+s*1.4,y+s);
 ctx.closePath();ctx.fill();
}
export function drawInviteCard(ctx,{name,car,power,distance,time=0,kind='call',carImage=null,art={},headline=null,width:W=CARD.width,height:H=CARD.height}={}){
 if(kind==='loaner')return drawLoanerPoster(ctx,{name,carImage,art,W,H});
 const k=W/1080,pad=64*k,column=W*.52;
 ctx.fillStyle=SHADE;ctx.fillRect(0,0,W,H);
 if(carImage)cover(ctx,carImage,W,H,kind==='loaner'?LOANER_CAR_SHIFT:null);
 ctx.textBaseline='alphabetic';

 // Тени под текст: без них машина съедает буквы. Слева плотнее, чем раньше: тачка в кадре
 // крупнее и заходит под колонку глубже.
 const top=ctx.createLinearGradient(0,0,0,H*.42);
 top.addColorStop(0,'rgba(9,11,8,.92)');top.addColorStop(1,'rgba(9,11,8,0)');
 ctx.fillStyle=top;ctx.fillRect(0,0,W,H*.42);
 const left=ctx.createLinearGradient(0,0,W*.72,0);
 left.addColorStop(0,'rgba(9,11,8,.95)');left.addColorStop(.45,'rgba(9,11,8,.8)');left.addColorStop(1,'rgba(9,11,8,0)');
 ctx.fillStyle=left;ctx.fillRect(0,0,W,H);
 const bottom=ctx.createLinearGradient(0,H,0,H*.68);
 bottom.addColorStop(0,'rgba(9,11,8,.88)');bottom.addColorStop(1,'rgba(9,11,8,0)');
 ctx.fillStyle=bottom;ctx.fillRect(0,H*.68,W,H*.32);

 // Верхняя строка: корона и марка игры.
 crown(ctx,pad,pad*.62,26*k,RED);
 ctx.fillStyle=MUTED;ctx.font=`700 ${Math.round(21*k)}px Arial, sans-serif`;
 spaced(ctx,'ТАЧКА ПАЦАНА',pad+52*k,pad+.72*26*k,4*k);

 // Заголовок — готовая кисть. Если картинка не подгрузилась, рисуем её словами: показать вызов
 // важнее красоты.
 ctx.save();ctx.translate(pad,pad+34*k);
 if(kind==='gift'||kind==='loaner'){
  // Подарку и подмене кисть не нужна: слова говорят прямее, и их не надо рисовать заранее.
  const [first,second]=kind==='gift'?['ЗАБЕРИ','СТАРТОВЫЙ НАБОР']:['ПОДМЕНИ МЕНЯ','НА ГОНКЕ'];
  ctx.rotate(-.035);
  ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=26*k;ctx.shadowOffsetY=6*k;
  const one=kind==='gift'?fitSize(ctx,first,column,140*k,70*k,400,HEAD):fitSize(ctx,first,column+40*k,140*k,60*k,400,HEAD);
  ctx.fillStyle=WHITE;ctx.fillText(first,0,one);
  const two=fitSize(ctx,second,column+40*k,kind==='gift'?104*k:126*k,44*k,400,HEAD);
  ctx.fillStyle=YELLOW;ctx.fillText(second,18*k,one+two*1.02);
  stroke(ctx,18*k,one+two*1.16,ctx.measureText(second).width*.86,14*k,RED);
 }else if(headline){
  const w=W*.68,h=w*(headline.height/headline.width);
  ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=30*k;ctx.shadowOffsetY=8*k;
  // Поднимаем на высоту прозрачного поля: видимая надпись должна встать туда же, где стояла
  // до починки кончиков, иначе она сползает на блок под собой.
  ctx.drawImage(headline,0,-h*HEADLINE_PAD,w,h);
 }else{
  ctx.rotate(-.035);
  ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=26*k;ctx.shadowOffsetY=6*k;
  const one=fitSize(ctx,'ВЫЗОВ',column,140*k,70*k,400,HEAD);
  ctx.fillStyle=WHITE;ctx.fillText('ВЫЗОВ',0,one);
  const two=fitSize(ctx,'НА ЗАЕЗД',column+40*k,126*k,60*k,400,HEAD);
  ctx.fillStyle=RED;ctx.fillText('НА ЗАЕЗД',18*k,one+two*1.02);
  stroke(ctx,18*k,one+two*1.16,ctx.measureText('НА ЗАЕЗД').width*.86,14*k,RED);
 }
 ctx.restore();

 const shadow=on=>{ctx.shadowColor=on?'rgba(0,0,0,.8)':'transparent';ctx.shadowBlur=on?22*k:0;ctx.shadowOffsetY=on?5*k:0;};

 // Кто зовёт. Вёрстка держится за низ кадра: так блок не наползает на подколку, какой бы длины
 // ни было имя.
 const tagY=H-540*k;
 ctx.font=`700 ${Math.round(23*k)}px Arial, sans-serif`;
 const tag=kind==='gift'?'ПОДАРОК':kind==='loaner'?'ПОДМЕНА':'СТРЕЛКА';
 let tagWidth=30*k;for(const ch of tag)tagWidth+=ctx.measureText(ch).width+5*k;
 ctx.fillStyle=YELLOW;ctx.fillRect(pad,tagY-30*k,tagWidth,44*k);
 ctx.fillStyle='#14170f';spaced(ctx,tag,pad+15*k,tagY,5*k);
 // Имя растёт вниз от плашки, а не вверх от опоры. Вверх оно налезало на плашку, как только
 // ломалось на две строки, — а двусоставные имена из Telegram приходят сплошь и рядом.
 const lines=nameLines(fitName(name||'ГОНЩИК'));
 const nameSize=Math.min(...lines.map(line=>fitSize(ctx,line,column,64*k,32*k,600,FACE)));
 ctx.font=`600 ${nameSize}px ${FACE}`;ctx.fillStyle=WHITE;shadow(true);
 let y=H-500*k+nameSize*.78;
 for(const line of lines){ctx.fillText(line,pad,y);y+=nameSize*.95;}
 shadow(false);

 // Табло: одно большое число и подпись под ним. Это и есть вызов — цифра, которую надо побить.
 const hero=cardHero({time,distance,kind});
 const big=fitSize(ctx,hero.value,column*.9,168*k,90*k,600,FACE);
 ctx.fillStyle=WHITE;ctx.font=`600 ${big}px ${FACE}`;shadow(true);
 ctx.fillText(hero.value,pad,H-228*k);shadow(false);
 ctx.fillStyle=YELLOW;ctx.font=`700 ${Math.round(24*k)}px Arial, sans-serif`;shadow(true);
 spaced(ctx,hero.label,pad+3*k,H-185*k,3.5*k);shadow(false);
 // Тачка и мощь — одной тихой строкой: спорить с табло им незачем.
 ctx.fillStyle=MUTED;ctx.font=`500 ${Math.round(29*k)}px ${FACE}`;shadow(true);
 ctx.fillText(cardLine({car,power}),pad,H-136*k);shadow(false);

 // Подколка внизу слева и печать справа — чтобы захотелось ответить, а не просто посмотреть.
 ctx.save();ctx.translate(pad,H-62*k);ctx.rotate(-.045);
 // Своего подкалываем, новичка — нет: ему объясняем, когда придут деньги.
 const footer=kind==='gift'?GIFT_TEXT.toLocaleUpperCase('ru-RU'):kind==='loaner'?LOANER_FOOTER:'ДУМАЕШЬ, БЫСТРЕЕ?';
 const taunt=fitSize(ctx,footer,W*.5,46*k,26*k,400,HEAD);
 ctx.fillStyle='#b5b1a4';ctx.fillText(footer,0,0);
 stroke(ctx,0,taunt*.34,ctx.measureText(footer).width*.7,9*k,RED);
 ctx.restore();
 ctx.save();ctx.translate(W-pad,H-pad);ctx.rotate(-.05);ctx.textAlign='right';
 ctx.font=`400 ${Math.round(34*k)}px ${HEAD}`;ctx.fillStyle=RED;
 ctx.fillText('СВОИ',0,-40*k);ctx.fillText('ПРАВИЛА',0,-4*k);
 crown(ctx,-92*k,-96*k,24*k,RED);
 ctx.restore();
 ctx.textAlign='left';
 return ctx;
}

// Плакат подмены: герой — машина, над ней крючок, под ней подарок и кнопка. Вёрстка держится за
// верх и низ кадра, середина — машине. Всё крупное: в чате картинка размером с ладонь, и строка
// тоньше 9 % высоты там не читается.
const roundBox=(ctx,x,y,w,h,r)=>{ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);ctx.fill();};
export function drawLoanerPoster(ctx,{name,carImage=null,art={},W=CARD.width,H=CARD.height}={}){
 const k=W/1080,pad=64*k,L=LOANER_LAYOUT;
 ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.lineJoin='round';
 // Картинка по ширине с сохранением пропорций: по левому верху или по центру. Без неё — ничего.
 const fit=(img,x,y,w)=>{if(!img)return 0;const h=w*(img.height/img.width||.3);ctx.drawImage(img,x,y,w,h);return h;};
 const fitC=(img,cx,cy,w,{flip=false,alpha=1}={})=>{if(!img)return;const h=w*(img.height/img.width||.5);ctx.save();ctx.globalAlpha=alpha;ctx.translate(cx,cy);if(flip)ctx.scale(-1,1);ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore();};
 const note=(lines,x,y,size=26*k,angle=-.07)=>{
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.font=`600 ${size}px ${FACE}`;ctx.fillStyle=WHITE;
  ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=10*k;ctx.shadowOffsetY=3*k;
  let yy=0;for(const line of lines){ctx.fillText(line,0,yy);yy+=size*1.08;}ctx.restore();
 };

 // Двор во весь кадр. Затемнение лёгкое и только там, где лежит текст: сам двор уже вечерний.
 if(art.yard)cover(ctx,art.yard,W,H);
 else{const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#101620');sky.addColorStop(1,'#05060a');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);}
 const top=ctx.createLinearGradient(0,0,0,H*.4);
 top.addColorStop(0,'rgba(5,7,11,.6)');top.addColorStop(1,'rgba(5,7,11,0)');
 ctx.fillStyle=top;ctx.fillRect(0,0,W,H*.4);
 const bottom=ctx.createLinearGradient(0,H,0,H*.72);
 bottom.addColorStop(0,'rgba(4,5,8,.6)');bottom.addColorStop(1,'rgba(4,5,8,0)');
 ctx.fillStyle=bottom;ctx.fillRect(0,H*.72,W,H*.28);

 // Копейка позади и правее, затем отражение на асфальте и тачка кореша целиком, носом вправо.
 fitC(art.kopeyka,W*L.gift.cx,H*L.gift.cy,W*L.gift.w,{flip:true});
 fitC(art.reflection,W*L.reflection.cx,H*L.reflection.cy,W*L.reflection.w,{alpha:.85});
 if(carImage)fitC(carImage,W*L.hero.cx,H*L.hero.cy,W*L.hero.w,{flip:true});
 // Награда: детали, поверх них ящик.
 fitC(art.parts,W*L.parts.cx,H*L.parts.cy,W*L.parts.w);
 fitC(art.crate,W*L.crate.cx,H*L.crate.cy,W*L.crate.w);

 // Шапка: марка, печать, «больше чем игра» на стене.
 if(art.logo)fit(art.logo,W*L.logo.x,H*L.logo.y,W*L.logo.w);
 else{crown(ctx,pad,pad*.62,26*k,RED);ctx.fillStyle=WHITE;ctx.font=`700 ${Math.round(22*k)}px Arial, sans-serif`;spaced(ctx,'ТАЧКА ПАЦАНА',pad+52*k,pad+.72*26*k,4*k);}
 if(art.rules)fit(art.rules,W*L.rules.x,H*L.rules.y,W*L.rules.w);
 else{ctx.save();ctx.translate(W-pad,pad+22*k);ctx.rotate(-.06);ctx.textAlign='right';ctx.font=`400 ${Math.round(26*k)}px ${HEAD}`;ctx.fillStyle=RED;ctx.fillText('СВОИ ПРАВИЛА',0,0);ctx.restore();ctx.textAlign='left';}
 if(art.more)fit(art.more,W*L.more.x,H*L.more.y,W*L.more.w);

 // Кто зовёт — плашка под маркой. Скос считается от начала координат, поэтому переносим его к строке.
 const from=LOANER_POSTER.from(name||'ГОНЩИК');
 ctx.font=`700 ${Math.round(20*k)}px Arial, sans-serif`;
 let plate=30*k;for(const ch of from)plate+=ctx.measureText(ch).width+4*k;
 ctx.save();ctx.translate(0,H*L.plate.y);ctx.transform(1,0,SLANT,1,0,0);
 ctx.fillStyle=YELLOW;ctx.fillRect(W*L.logo.x+8*k,-27*k,plate,38*k);
 ctx.fillStyle='#14170f';spaced(ctx,from,W*L.logo.x+23*k,0,4*k);
 ctx.restore();

 // Крючок и подзаголовок — кистью, по центру. Без картинок — шрифтом.
 if(art.headline)fit(art.headline,W*L.headline.x,H*L.headline.y,W*L.headline.w);
 else{
  const [one,two]=LOANER_POSTER.hook;
  ctx.save();ctx.translate(W*L.headline.x,H*L.headline.y);ctx.transform(1,0,SLANT,1,0,0);
  const s1=fitSize(ctx,one,W*L.headline.w,110*k,56*k,400,HEAD);ctx.fillStyle=WHITE;ctx.fillText(one,0,s1);
  const s2=fitSize(ctx,two,W*L.headline.w,100*k,50*k,400,HEAD);ctx.font=`400 ${s2}px ${HEAD}`;ctx.fillStyle=RED;ctx.fillText(two,12*k,s1+s2*1.06);
  ctx.restore();
 }
 if(art.subline)fit(art.subline,W*L.subline.x,H*L.subline.y,W*L.subline.w);
 else{ctx.fillStyle=WHITE;ctx.font=`700 ${Math.round(20*k)}px Arial, sans-serif`;spaced(ctx,LOANER_POSTER.sub,W*L.subline.x,H*L.subline.y+22*k,3*k);}

 // Подписи мелом у наград.
 if(art.noteCar)fit(art.noteCar,W*L.noteCar.x,H*L.noteCar.y,W*L.noteCar.w);else note([LOANER_POSTER.noteCar+' ↓'],W*L.noteCar.x-W*.06,H*L.noteCar.y+30*k);
 if(art.noteCrate)fit(art.noteCrate,W*L.noteCrate.x,H*L.noteCrate.y,W*L.noteCrate.w);else note([LOANER_POSTER.noteCrate[0],LOANER_POSTER.noteCrate[1]+' ↓'],W*L.noteCrate.x,H*L.noteCrate.y+30*k);

 // Кнопка слева внизу, иконки разделов справа — как на макете.
 if(art.button)fit(art.button,W*L.button.x,H*L.button.y,W*L.button.w);
 else{ctx.font=`400 ${Math.round(34*k)}px ${HEAD}`;const ctaW=ctx.measureText(LOANER_POSTER.cta).width+70*k,ctaH=80*k;ctx.fillStyle=RED;roundBox(ctx,W*L.button.x,H*L.button.y,ctaW,ctaH,16*k);ctx.fillStyle=WHITE;ctx.fillText(LOANER_POSTER.cta,W*L.button.x+35*k,H*L.button.y+ctaH*.66);}
 if(art.nav){
  const h=fit(art.nav,W*L.nav.x,H*L.nav.y,W*L.nav.w);
  ctx.fillStyle=WHITE;ctx.font=`700 ${Math.round(15*k)}px Arial, sans-serif`;ctx.textAlign='center';
  ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=6*k;
  LOANER_POSTER.nav.forEach((t,i)=>ctx.fillText(t,W*L.nav.x+W*L.nav.w*(i+.5)/4,H*L.nav.y+h+20*k));
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.textAlign='left';
 }
 return ctx;
}

// Собрать баннер целиком. carImage — снимок гаража (data URL).
const picture=(src,scope)=>new Promise(resolve=>{if(!src)return resolve(null);const img=new scope.Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});
// Для плаката подмены подгружаются нарисованные элементы POSTER_ART; остальным видам они не нужны.
export async function buildInviteCard({name,car,power,distance,time=0,kind='call',carImage=null,scope=globalThis}={}){
 const canvas=scope.document.createElement('canvas');
 canvas.width=CARD.width;canvas.height=CARD.height;
 const ctx=canvas.getContext('2d');
 const [shot,headline]=await Promise.all([picture(carImage,scope),picture(HEADLINE,scope)]);
 const art={};
 if(kind==='loaner'){const keys=Object.keys(POSTER_ART);const imgs=await Promise.all(keys.map(k=>picture(POSTER_ART[k],scope)));keys.forEach((k,i)=>{if(imgs[i])art[k]=imgs[i];});}
 // Шрифты игры могут быть ещё не готовы: без них надписи уедут в системные, но карточка соберётся.
 try{await Promise.all([scope.document.fonts?.load('400 140px "Russo One"'),scope.document.fonts?.load('600 64px Oswald')]);}catch{}
 // kind раньше сюда не доходил, и подарок рисовался вызовом: у карточки один вид на всех.
 drawInviteCard(ctx,{name,car,power,distance,time,kind,carImage:shot,art,headline});
 return canvas.toDataURL('image/jpeg',CARD.quality);
}
