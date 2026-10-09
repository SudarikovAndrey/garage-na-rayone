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
export const cardHeadline=kind=>kind==='gift'?'ЗАБЕРИ СТАРТОВЫЙ НАБОР':null;

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
function cover(ctx,image,w,h){
 const scale=Math.max(w/image.width,h/image.height);
 const iw=image.width*scale,ih=image.height*scale;
 ctx.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);
}
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
export function drawInviteCard(ctx,{name,car,power,distance,time=0,kind='call',carImage=null,headline=null,width:W=CARD.width,height:H=CARD.height}={}){
 const k=W/1080,pad=64*k,column=W*.52;
 ctx.fillStyle=SHADE;ctx.fillRect(0,0,W,H);
 if(carImage)cover(ctx,carImage,W,H);
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
 if(kind==='gift'){
  // Подарку кисть не нужна: слова говорят прямее, и их не надо рисовать заранее.
  ctx.rotate(-.035);
  ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=26*k;ctx.shadowOffsetY=6*k;
  const one=fitSize(ctx,'ЗАБЕРИ',column,140*k,70*k,400,HEAD);
  ctx.fillStyle=WHITE;ctx.fillText('ЗАБЕРИ',0,one);
  const two=fitSize(ctx,'СТАРТОВЫЙ НАБОР',column+40*k,104*k,44*k,400,HEAD);
  ctx.fillStyle=YELLOW;ctx.fillText('СТАРТОВЫЙ НАБОР',18*k,one+two*1.02);
  stroke(ctx,18*k,one+two*1.16,ctx.measureText('СТАРТОВЫЙ НАБОР').width*.86,14*k,RED);
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
 const tag=kind==='gift'?'ПОДАРОК':'СТРЕЛКА';
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
 const footer=kind==='gift'?GIFT_TEXT.toLocaleUpperCase('ru-RU'):'ДУМАЕШЬ, БЫСТРЕЕ?';
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

// Собрать баннер целиком. carImage — снимок гаража (data URL).
const picture=(src,scope)=>new Promise(resolve=>{if(!src)return resolve(null);const img=new scope.Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});
export async function buildInviteCard({name,car,power,distance,time=0,kind='call',carImage=null,scope=globalThis}={}){
 const canvas=scope.document.createElement('canvas');
 canvas.width=CARD.width;canvas.height=CARD.height;
 const ctx=canvas.getContext('2d');
 const [shot,headline]=await Promise.all([picture(carImage,scope),picture(HEADLINE,scope)]);
 // Шрифты игры могут быть ещё не готовы: без них надписи уедут в системные, но карточка соберётся.
 try{await Promise.all([scope.document.fonts?.load('400 140px "Russo One"'),scope.document.fonts?.load('600 64px Oswald')]);}catch{}
 drawInviteCard(ctx,{name,car,power,distance,time,carImage:shot,headline});
 return canvas.toDataURL('image/jpeg',CARD.quality);
}
