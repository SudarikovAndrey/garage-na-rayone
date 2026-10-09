// Кнопка прокачки — одна на всю игру: деталь, уникальный апгрейд, уровень машины, гараж.
//
// Почему отдельным видом. Прокачка — единственное действие, которое делает машину сильнее, и
// игрок должен узнавать её мгновенно, где бы она ни стояла. Поэтому у неё всегда одна и та же
// внешность: стрелка вверх и одна строка — цена рублями и деталями (один шрифт, разные иконки)
// плюс прибавка мощи. Слово «прокачать» не нужно: стрелка и цена говорят сами.
//
// Три состояния (`data-state`):
//   ready — можно качнуть прямо сейчас, золото;
//   short — не хватает денег или материалов: красноватая рамка и строка «не хватает …»,
//           кнопка выключена, но объясняет, чего именно недостаёт;
//   max   — предел ранга или нужен гараж выше: тихая серая кнопка с пояснением.
//
// Раскладка кнопок действий одинакова везде: прокачка — главная кнопка (справа в кастомайзере,
// во всю ширину в диалогах), установка и снятие — тихие соседи слева.
import {coin,coinIcon,money} from './currency-icons.js';
export {money};

export function upgradeButton(btn,o={}){
 if(!btn)return btn;
 const shortCash=Math.max(0,Number(o.shortCash)||0),shortScrap=Math.max(0,Number(o.shortScrap)||0);
 const state=o.state||(o.max?'max':(shortCash||shortScrap?'short':'ready'));
 btn.className='upgrade-btn';
 btn.dataset.state=state;
 btn.disabled=state!=='ready';
 if(state==='max'){
  btn.innerHTML=`<span class="up-note">${o.note||'Максимум'}</span>`;
  btn.setAttribute('aria-label',o.note||'Максимум');
  return btn;
 }
 // Цена рублями и деталями и прибавка мощи — одной строкой, одним кеглем, разными иконками:
 // это три равноправных числа решения, а не главное и второстепенное. Прибавка раньше стояла
 // мелкой серой подписью во второй строке, и главное — насколько машина станет сильнее — читалось
 // хуже цены. Нехватка помечает ту валюту, которой мало.
 const price=[];
 if(o.price!=null)price.push(coin('soft',o.price,{tone:shortCash?'short':''}));
 else if(o.label)price.push(`<b class="up-label">${o.label}</b>`);
 if(o.scrap)price.push(coin('parts',o.scrap,{tone:shortScrap?'short':''}));
 if(state!=='short'&&o.gain)price.push(`<span class="coin-box coin-box--gain" role="img" aria-label="мощь плюс ${o.gain}">${coinIcon('power')}<b>+${o.gain}</b></span>`);
 const cells=[];
 const miss=[];
 if(shortCash)miss.push(`${money(shortCash)} ₽`);
 if(shortScrap)miss.push(`${money(shortScrap)} дет.`);
 if(state==='short'){if(miss.length)cells.push(`ещё ${miss.join(' и ')}`);else if(o.note)cells.push(o.note);}
 else{
  if(o.meta)cells.push(o.meta);
  if(!cells.length&&o.note)cells.push(o.note);
 }
 // Стрелка — знак, а не украшение: золотой квадрат со стрелкой вверх читается как «сделать
 // сильнее», тонкий треугольник сбоку читался как часть ценника.
 btn.innerHTML=`<i class="up-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 13h5v8h6v-8h5z"/></svg></i><span class="up-line">`+
  price.join('')+cells.map(c=>`<em>${c}</em>`).join('')+`</span>`;
 btn.setAttribute('aria-label',state==='short'
  ?`Не хватает ${miss.join(' и ')||o.note||''}`
  :`Прокачать за ${o.price!=null?money(o.price)+' рублей':(o.label||'')}${o.scrap?' и '+money(o.scrap)+' деталей':''}${o.gain?', мощь плюс '+o.gain:''}`);
 return btn;
}
