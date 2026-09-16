// Правила стрелки: статусы, ссылки и тексты. Один модуль на клиент и сервер, чтобы формулировки
// и разбор ссылок не разъезжались. Тексты специально собраны в конфиг — их будут переписывать.
export const CHALLENGE={version:'strelka-v1',track:0,ttl:7*24*60*60*1000,maxOpen:20};
export const STATUS={open:'open',sent:'sent',accepted:'accepted',done:'done',expired:'expired'};

// Ссылка-приглашение. startapp доезжает до игры как start_param.
export const challengeParam=id=>'c_'+id;
export const buildLink=(bot,id)=>'https://t.me/'+String(bot||'').replace(/^@/,'')+'?startapp='+challengeParam(id);
export function parseStartParam(param){
 const value=String(param||'');
 if(/^c_[A-Za-z0-9_-]{6,64}$/.test(value))return {kind:'challenge',id:value.slice(2)};
 if(/^r_[A-Za-z0-9_-]{6,64}$/.test(value))return {kind:'referral',id:value.slice(2)};
 return null;
}

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
 if(!list.length)return '<p class="invited-note">Ссылка ушла в чат. Кто первым откроет — тот и едет.</p>';
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
