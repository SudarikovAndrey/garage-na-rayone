// Правила стрелки: состояния, ссылки и тексты. Один модуль на клиент и сервер, чтобы формулировки
// и разбор ссылок не разъезжались. Тексты специально собраны в конфиг — их будут переписывать.
//
// Главное правило этого файла: состояние стрелки НЕ ХРАНИТСЯ, а считается. Раньше в базе жила
// колонка status с пятью значениями, из которых одно («expired») не записывалось никогда, другое
// («sent») означало не отправку, а финиш вызвавшего, а третье («accepted») ставили два разных
// шага. Сервер при этом считал ещё и поле turn, а клиент его игнорировал и выводил состояние
// заново по своим правилам. Две параллельные истины — отсюда и «непонятно, что значат статусы».
// Теперь истина одна: challengeState() ниже, и зовут её обе стороны.
export const CHALLENGE={version:'strelka-v2',track:0,ttl:7*24*60*60*1000,maxInvites:20};

// Ссылка-приглашение. startapp доезжает до игры как start_param.
export const challengeParam=id=>'c_'+id;
// Ссылка ведёт в именованный мини-апп: `t.me/<бот>/<приложение>?startapp=…`. Короткая форма без
// имени, `t.me/<бот>?startapp=…`, открывает не его, а «главный мини-апп» — это отдельная настройка
// BotFather со своим адресом, и она легко остаётся забытой. Ровно это и случилось при переезде на
// свой домен: у именованного приложения адрес поменяли, а кнопка на карточке вела в главный,
// который остался на старом и уже недоступном workers.dev.
export const buildLink=(bot,id,app=null)=>'https://t.me/'+String(bot||'').replace(/^@/,'')
 +(app?'/'+String(app).replace(/^\//,''):'')+'?startapp='+challengeParam(id);
export function parseStartParam(param){
 const value=String(param||'');
 if(/^c_[A-Za-z0-9_-]{6,64}$/.test(value))return {kind:'challenge',id:value.slice(2)};
 if(/^r_[A-Za-z0-9_-]{6,64}$/.test(value))return {kind:'referral',id:value.slice(2)};
 return null;
}

const secs=t=>typeof t==='number'&&t>0?t.toFixed(2)+' с':'—';

// Фазы. Своих четыре и чужих четыре — ровно столько, сколько человек способен различить в списке.
// У каждой фазы одна строка и одна кнопка: если для фазы не придумывается кнопка, фаза лишняя.
export const PHASE={
 // моя стрелка
 draft:'draft',     // выбрал кому, но не проехал — бывает только если бросил заезд
 live:'live',       // время стоит, никто не ответил
 holding:'holding', // ответили, но никто не побил
 beaten:'beaten',   // время побили — это и есть крючок, который тянет обратно
 closed:'closed',   // перезабил сам или неделя вышла
 // чужая стрелка
 waiting:'waiting', // он ещё ставит время
 open:'open',       // можно ехать
 done:'done',       // я ответил
 gone:'gone',       // у него теперь другое время
};

// Состояние одной строки списка. На входе — то, что отдаёт сервер, на выходе — что показать и что
// предложить нажать. Никаких «статусов» наружу: человек читает фразу, а не слово из базы.
export function challengeState(c={}){
 const name=c.rival?.name||c.best?.name||'кореш';
 if(c.mine){
  if(c.closed)return {phase:PHASE.closed,note:c.closed==='expired'?'Неделя вышла':'Перезабита',action:'ЗАБИТЬ СТРЕЛКУ',act:'new'};
  if(!(c.time>0))return {phase:PHASE.draft,note:'Ты ещё не проехал',action:'ПРОЕХАТЬ',act:'drive',urgent:true};
  if(c.beaten)return {phase:PHASE.beaten,tone:'lose',urgent:true,
   note:`${c.best?.name||'Кореш'} побил: ${secs(c.best?.time)} против твоих ${secs(c.time)}`,
   action:'РЕВАНШ',act:'rematch'};
  if(c.answers>0)return {phase:PHASE.holding,tone:'win',
   note:`Ответили: ${c.answers} · ты держишь ${secs(c.time)}`,action:'ПОЗВАТЬ ЕЩЁ',act:'share'};
  return {phase:PHASE.live,note:`Время стоит: ${secs(c.time)} · никто не рискнул`,action:'ПОЗВАТЬ',act:'share'};
 }
 // Свой ответ важнее всего остального: даже если человек успел перезабить стрелку, я хочу
 // видеть, чем кончился мой заезд, а не «её больше нет».
 if(c.my?.time>0){
  const won=c.my.winner==='b',draw=c.my.winner==='draw';
  return {phase:PHASE.done,tone:draw?null:won?'win':'lose',
   note:draw?`Ничья · ${secs(c.my.time)}`:won?`Вывез: ${secs(c.my.time)} против ${secs(c.rivalTime)}`:`Не вывез: ${secs(c.my.time)} против ${secs(c.rivalTime)}`,
   action:'ЗАБИТЬ СВОЮ',act:'new'};
 }
 // Имя подставляем только именительным падежом: «у Саня» и «стрелка Саня» вылезают сами собой,
 // а склонять русские имена мы не умеем и не будем.
 if(c.closed)return {phase:PHASE.gone,note:c.closed==='expired'?'Эта стрелка протухла':`${name} перезабил стрелку`,action:c.nextId?'ОТВЕТИТЬ НА НОВУЮ':'ЗАБИТЬ СВОЮ',act:c.nextId?'fresh':'new'};
 if(!(c.rivalTime>0))return {phase:PHASE.waiting,note:`${name} ещё ставит время`,action:'ОБНОВИТЬ',act:'refresh'};
 return {phase:PHASE.open,urgent:true,note:`Забил тебе стрелку · ${secs(c.rivalTime)}`,action:'В ЗАЕЗД',act:'start'};
}

// Строка человека в списке стрелок. Слово на кнопке решает последний исход между нами, а не то,
// чей сейчас ход: «реванш» после поражения и «снова» после победы — это то, как о заездах говорят
// вслух. «Ждём» — не кнопка, а объяснение: человек ещё не ответил на мой вызов.
//
// Четвёртый случай спецификацией не назван, но без него не обойтись: когда истории встреч ещё нет,
// а время у человека уже висит. Там кнопка говорит прямо — «побить».
export function mateState(mate={}){
 if(mate.waiting)return {phase:'waiting',action:'ЖДЁМ',act:null};
 if(mate.last==='lose')return {phase:'rematch',action:'РЕВАНШ',act:'go',tone:'lose'};
 if(mate.last==='win')return {phase:'again',action:'СНОВА',act:'go',tone:'win'};
 if(mate.last==='draw')return {phase:'again',action:'СНОВА',act:'go'};
 // Без подсветки: когда незнакомых много, подсвеченной оказывается вся простыня, и выделять
 // перестаёт что-либо значить. Кнопки достаточно.
 return {phase:'fresh',action:'ПОБИТЬ',act:'go'};
}
// Счёт личных встреч короткой строкой. Пока не гоняли — счёта нет, и рисовать нули незачем.
export const scoreLine=mate=>mate?.score?.races?`${mate.score.wins} : ${mate.score.losses}`:'';

// Подпись на кнопке «позвать»: сколько корешей доехало из нужных до следующей награды и что
// на ней лежит. Точка вместо предлога намеренно — «до краски», «до неона», «до ящика» требуют
// склонения, а склонять слова из конфига мы не умеем и не будем.
export const matesProgress=mates=>mates&&mates.goal
 ?`${mates.activated} ИЗ ${mates.goal}`+(mates.prize?' · '+String(mates.prize).toLocaleUpperCase('ru-RU'):'')
 :'';

// Тексты вызова. Короткие и задиристые; выбираются детерминированно, чтобы одна ссылка не меняла текст.
export const TAUNTS=[
 ({name,car,power})=>`${name} забил тебе стрелку.\nЕго ${car}: ${power} сил.\nВывезешь?`,
 ({name,car,power})=>`${name} выкатил ${car} на ${power} сил.\nГоворит, ты не вывезешь.`,
 ({name,car,power})=>`Стрелка от ${name}.\n${car}, ${power} сил.\nИли зассал?`,
 ({name,car,power})=>`${name} ждёт на районе.\n${car} · ${power} сил.\nПокажешь, кто тут ездит?`,
];
const pick=(list,seed)=>list[[...String(seed||'')].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7)%list.length];
export const challengeText=({name='Пацан',car='ВАЗ-2108',power=0,id=''}={})=>pick(TAUNTS,id)({name,car,power});
// Кому ушёл вызов — лицами, а не текстом. Telegram не сообщает Mini App, кого выбрали в шторке
// шаринга, поэтому лица показываем только при адресном вызове из списка корешей; для открытой
// ссылки честно пишем, что она ушла в чат, и не выдумываем получателей.
const escInvite=s=>String(s??'').replace(/[&<>"\']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function invitedMarkup(names=[],photos=[]){
 const list=names.filter(Boolean).slice(0,4);
 if(!list.length)return '<p class="invited-note">Ссылка ушла в чат. Кто откроет — тот и едет.</p>';
 const face=(name,i)=>{
  const photo=typeof photos?.[i]==='string'&&/^https:\/\//.test(photos[i])?photos[i]:null;
  return `<span class="invited-face">${photo?`<img src="${escInvite(photo)}" alt="" width="44" height="44">`:`<i>${escInvite(name.trim().slice(0,1).toUpperCase())}</i>`}<em>${escInvite(name)}</em></span>`;
 };
 return `<div class="invited-row">${list.map(face).join('')}</div>`;
}
export const ACCEPT_LABEL='ПРИНЯТЬ СТРЕЛКУ';
// Приглашение корешей. Когда игра знает, кого зовут, имена идут прямо в текст; когда вызов
// уходит открытой ссылкой через шторку Telegram, имён нет — их выбирает сам Telegram и нам не сообщает.
export const inviteText=(names=[])=>{
 const list=names.filter(Boolean).slice(0,3).join(', ');
 return list?`Покажи, ${list}, на что ты способен!`:'Покажи, на что ты способен!';
};
// Экран результата новичка: проигрыш обязан вести к прокачке, а не в тупик.
export const RESULT_TEXTS={
 lose:{title:'НЕ ВЫВЕЗ',line:'Но держи стартовый пак.',action:'РАЗОБРАТЬ ПАК'},
 win:{title:'ВЫВЕЗ',line:'Забирай своё.',action:'РАЗОБРАТЬ ПАК'},
 rematch:'РЕВАНШ',
 invite:'ЗАБЕЙ СТРЕЛКУ КОРЕШАМ',
};

// Счёт личного противостояния: «АНДРЕЙ VS САНЯ 7:4».
export const headToHead=(edge,me='ТЫ',rival='СОПЕРНИК')=>({
 me,rival,
 races:edge?.races||0,wins:edge?.wins||0,losses:edge?.losses||0,
 lastWinner:edge?.last_winner||null,
 line:`${edge?.wins||0} : ${edge?.losses||0}`,
});

// Кто выиграл: сравниваем время, у каждого своя дистанция — фора уже внутри этих чисел.
export const decideWinner=(timeA,timeB,step=1/120)=>{
 if(!(timeA>0)||!(timeB>0))return null;
 if(Math.abs(timeA-timeB)<step)return 'draw';
 return timeA<timeB?'a':'b';
};
