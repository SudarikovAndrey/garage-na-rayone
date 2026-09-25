// Подмена: экран «кореш просит подменить» и сцена победы (docs/loaner-invite.md). Это первое, что
// видит новичок по ссылке, и за пять секунд экран обязан ответить на три вопроса: кто зовёт, что
// делать и что за это будет. Числа и правила — в loaner-rules.js, здесь только вид и слова.
import {CARS} from './fleet.js';
import {crateById} from './crates.js';
import {crateArt} from './loot-ui.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const upper=s=>String(s??'').toLocaleUpperCase('ru-RU');
const plural=(n,[one,few,many])=>{const d=n%10,h=n%100;return d===1&&h!==11?one:d>=2&&d<=4&&(h<12||h>14)?few:many;};

// Слова подмены. Голос — кореш из девяностых: без драмы, с подколкой. Имя соперника везде в
// именительном падеже нарочно: ботов три десятка, склонять каждого — значит однажды ошибиться.
export const LOANER_TEXT={
 ask:'Братан, меня надо подменить на заезде. Доверяю тебе свою тачку — покажи, на что способен',
 back:rival=>`Ну ты где? ${rival} ещё на старте, тачка прогрета`,
 won:'Красава! Тачку я забираю — а это тебе, заработал',
 rule:'Старт сам · ты ловишь передачи',
 // Итог прогрева: сколько поймал в зелёную и что это значит на заезде.
 warmup({perfect,shifts,rival}){
  const all=`${shifts} ${plural(shifts,['переключение','переключения','переключений'])}`;
  if(perfect>=shifts)return {title:'РУКИ ПОМНЯТ',line:`Все ${all} в зелёную. Так же на заезде — и ${rival} курит в сторонке.`};
  if(perfect>=shifts-2)return {title:'ТАЧКА СЛУШАЕТСЯ',line:`В зелёную — ${perfect} из ${shifts}. На заезде можно ошибиться дважды, третья ошибка отдаёт победу.`};
  return {title:'РАЗОГРЕЛСЯ',line:`Жми, когда стрелка в зелёной зоне. На заезде можно ошибиться дважды — не больше.`};
 },
 // Итог проигрыша: на сколько не хватило и почему. Совет один — самый дорогой промах.
 lost({gap,perfect,missed,shifts,rival}){
  const errors=Math.max(0,shifts-perfect),short=gap<=.1;
  const title=short?'ЧУТЬ-ЧУТЬ НЕ ХВАТИЛО':`${upper(rival)} ВПЕРЕДИ`;
  const why=missed>0?'Переключение «мимо» — самое дорогое: тачка проваливается. Лови зелёную зону.'
   :errors>2?`Мимо зелёной: ${errors}. Прощаются две ошибки — третья уже лишняя.`
   :'Совсем рядом. Ещё раз — и он твой.';
  return {title,line:`Отстал на ${gap.toFixed(2)} с. ${why}`};
 },
};

function avatar(who){
 return who?.photo
  ?`<img class="loaner-avatar" src="${esc(who.photo)}" alt="">`
  :`<span class="loaner-avatar is-empty" aria-hidden="true">${esc(upper(who?.name||'?').slice(0,1))}</span>`;
}
// Что на кону: своя тачка и ящики. Одна разметка на обоих экранах — на старте это обещание,
// на финише то же самое, но уже твоё.
function prizeMarkup(prize,own=false){
 const car=CARS[prize?.car??0]||CARS[0];
 const crates=(prize?.crates||[]).map(crateById).filter(Boolean);
 return `<ul class="loaner-prize">
<li style="--i:0"><span class="loaner-prize-art is-car"><img src="assets/cars/${esc(car.id)}.webp" alt=""></span><b>${own?'ТВОЯ ТАЧКА':'СВОЯ ТАЧКА'}</b><small>${esc(car.name)} · сток</small></li>
${crates.map((c,i)=>`<li style="--i:${i+1}"><span class="loaner-prize-art">${crateArt(c.id)}</span><b>${esc(c.name)}</b><small>${esc(c.type)}</small></li>`).join('')}
</ul>`;
}

export function bindLoanerUI(){
 const el=document.createElement('div');
 el.id='loaner-screen';el.hidden=true;el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','loaner-title');
 (document.querySelector('#game')||document.body).append(el);
 let resolve=null;
 const finish=value=>{const done=resolve;resolve=null;el.hidden=true;el.innerHTML='';done?.(value);};
 const open=()=>{el.hidden=false;const go=el.querySelector('[data-go]');go.onclick=()=>finish(true);go.focus();return new Promise(done=>{resolve=done;});};

 // Кореш просит подменить. stage: 'offer' и 'warmup' — с начала, 'race' — вернулся после прогрева.
 function intro(deal){
  const back=deal.stage==='race',car=CARS[deal.build?.car]||CARS[0],rival=deal.rival?.name||'Чувак с района';
  el.dataset.mode='intro';
  el.innerHTML=`<div class="loaner-glow" aria-hidden="true"></div>
<div class="loaner-scroll">
 <header class="loaner-head">
  <span class="tiny-label">${back?'ПОДМЕНА НЕ ЗАКОНЧЕНА':'КОРЕШ ПРОСИТ ПОДМЕНИТЬ'}</span>
  <div class="loaner-who">${avatar(deal.lender)}<h2 id="loaner-title">${esc(deal.lender?.name||'Кореш')}</h2></div>
  <p class="loaner-bubble">«${esc(back?LOANER_TEXT.back(rival):LOANER_TEXT.ask)}»</p>
 </header>
 <figure class="loaner-car">
  <img data-car-image src="assets/cars/${esc(car.id)}.webp" alt="Тачка кореша">
  <figcaption><span class="tiny-label">ЕГО ТАЧКА</span><b>${esc(car.name)}</b><em>МОЩЬ ${esc(deal.build?.power??'')}</em></figcaption>
 </figure>
 <ol class="loaner-steps">
  <li ${back?'data-done':'data-now'}><b>ПРОГРЕВ</b><small>прочувствуй тачку</small></li>
  <li ${back?'data-now':''}><b>ЗАЕЗД</b><small>соперник — ${esc(rival)}</small></li>
  <li><b>ПРИЗ</b><small>своя тачка и ящики</small></li>
 </ol>
 <p class="loaner-lead">Сделаешь соперника — заберёшь</p>
 ${prizeMarkup(deal.prize)}
</div>
<div class="loaner-actions"><button class="primary" data-go>${back?'НА СТАРТ':'СЕСТЬ ЗА РУЛЬ'}</button><small>${LOANER_TEXT.rule}</small></div>`;
  return open();
 }

 // Живой рендер тачки кореша — в его краске и обвесе. Приезжает позже карточки: пока его нет,
 // стоит заводской снимок той же модели.
 function setCar(src){const img=el.querySelector('[data-car-image]');if(img&&src){img.src=src;img.dataset.live='true';}}

 // Победа: кореш забирает тачку и отдаёт приз. Кнопка одна — забрать.
 function win({lender,rival,time,rivalTime,prize}){
  el.dataset.mode='win';
  el.innerHTML=`<div class="loaner-glow" aria-hidden="true"></div>
<div class="loaner-scroll">
 <header class="loaner-head">
  <span class="tiny-label">ПОДМЕНА · ПОБЕДА</span>
  <h2 id="loaner-title" class="loaner-win-title">${esc(upper(rival||'Соперник'))} ПОЗАДИ!</h2>
  <p class="loaner-times"><b>${Number(time).toFixed(2)} с</b> против ${Number(rivalTime).toFixed(2)} с</p>
 </header>
 <div class="loaner-who is-row">${avatar(lender)}<p class="loaner-bubble">«${esc(LOANER_TEXT.won)}»</p></div>
 ${prizeMarkup(prize,true)}
 <p class="loaner-lead">Своя пока сток. Ящики — чтобы это исправить</p>
</div>
<div class="loaner-actions"><button class="primary" data-go>ЗАБРАТЬ</button></div>`;
  return open();
 }

 return {intro,win,setCar,el,get open(){return !el.hidden;}};
}
