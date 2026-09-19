import {upgradeButton} from './upgrade-button.js';
import {powerBadge} from './currency-icons.js';
import {tunePreview,partGain} from './tune-preview.js';
import {CARS} from './fleet.js';
import {rubleTuneQuote,tuneWithRubles} from './soft-economy.js';
import {animateContent} from './motion.js';
import {SLOTS,PARTS,RARITIES,partById,equip,unequip,tunePart,tuneCost,salvage,salvageValue,effectiveLevels,rating,canInstall,rankCapFor} from './progression.js';
import {GARAGE_LEVELS,garageForRank} from './garage-levels.js';
import {PAINTS,ownsPaint,stockPaintsFor,paintById} from './paints.js';
import {DECALS,ownsDecal} from './decals.js';
import {liveryPreview} from './decal-liveries.js';
import {NEONS,ownsNeon,PULSES,neonArt} from './neons.js';
import {partIcon} from './part-icons.js';
const $=s=>document.querySelector(s);
// Апгрейды — вкладка внутри «Техники»: слота у них нет и включить можно сколько угодно разом,
// но ищет их игрок там же, где мотор и КПП, а не в отдельной группе.
const GROUPS=[{id:'power',name:'Техника',slots:['engine','tires','gearbox','upgrades']},{id:'body',name:'Кузов',slots:['bumpers','spoiler','skirts','fenders','rims']},
 {id:'paint',name:'Цвет',slots:[]}];
const SLOT_NAMES={upgrades:'Апгрейды'};
const slotName=id=>SLOTS.find(s=>s.id===id)?.name||SLOT_NAMES[id]||id;
const STAT_NAMES=['Мощь','Сцепление','Отклик'];
const statChips=u=>u.stats.map((v,i)=>v?`<b>${STAT_NAMES[i]} +${v}</b>`:'').join('');
const partImage=(slot,rarity='stock',style=null)=>'assets/parts/'+(['engine','gearbox'].includes(slot)?slot:slot==='tires'?'tires-stock':slot+'-'+rarity+(style?'-'+style:''))+'.webp';
const money=n=>n.toLocaleString('ru-RU');
import {UPGRADES,ownsUpgrade,isUpgradeOn,toggleUpgrade,upgradeById,upgradeRank,upgradeRankCap,upgradeTuneCost,tuneUpgrade,upgradeStrength} from './upgrades.js';
import {upgradeArt} from './upgrade-art.js';
export function bindCustomizer({save,changed,previewCar,resized,toast,sfx}){
 let group='body',slot='spoiler',selected='stock',isOpen=false,confirmSalvage=false;
 const root=$('#garage-screen'),sheet=$('#custom-sheet'),home=$('#home-sheet');
 const carPartImage=(slot,rarity='stock',style=null)=>CARS[save.selected].id==='bukhanka'&&['spoiler','bumpers'].includes(slot)&&rarity!=='stock'?'assets/parts/bukhanka-'+slot+'-'+rarity+'.webp':partImage(slot,rarity);
 const equipped=()=>save.equipped[save.selected][slot]||'stock';
 const baseIndex=()=>['engine','tires','gearbox'].indexOf(slot);
 function resetSelection(){selected=slot==='upgrades'?(UPGRADES.find(u=>ownsUpgrade(save,u.id))?.id||'stock'):equipped();confirmSalvage=false;previewCar();}
 function switchPanels(open){isOpen=open;root.dataset.panel=open?'custom':'home';sheet.inert=!open;home.inert=open;sheet.setAttribute('aria-hidden',String(!open));home.setAttribute('aria-hidden',String(open));resized();}
 // Сколько мощи даёт апгрейд именно этой машине — считаем тем же рейтингом, что и у деталей.
 const upgradeGain=u=>{
  const cur=save.upgrades?.[save.selected]||[],next=cur.includes(u.id)?cur.filter(x=>x!==u.id):[...cur,u.id];
  const flip={...save,upgrades:{...save.upgrades,[save.selected]:next}},carId=CARS[save.selected].id;
  return Math.abs(rating(effectiveLevels(flip),carId)-rating(effectiveLevels(save),carId));
 };
 function previewSelection(){const eq={...save.equipped[save.selected]};if(selected==='stock')delete eq[slot];else eq[slot]=selected;previewCar(eq);}

 // Картинка винила на плитке — отдельный рисунок борта, и таких плиток под сорок. Рисуем только те, что
 // человек видит: остальные ждут за краем списка с дешёвым градиентом из decals.js. Иначе каждая смена
 // цвета перерисовывала весь список разом — секунды тишины на телефоне.
 let liveryWatch=null;
 function paintLiveryTiles(){
  const options=$('#custom-options'),paint=PAINTS.find(p=>p.id===save.paint[save.selected])?.color;
  if(typeof options?.querySelectorAll!=='function')return;/* проверки в Node подменяют document без разметки */
  liveryWatch?.disconnect();liveryWatch=null;
  const tiles=[...options.querySelectorAll('[data-livery]')];if(!tiles.length)return;
  const fill=el=>{const url=liveryPreview(el.dataset.livery,paint);if(url)el.style.setProperty('--decal',url);};
  if(typeof IntersectionObserver!=='function'){tiles.forEach(fill);return;}
  // Видимые сейчас — сразу, чтобы плитка не мигала градиентом; остальные — когда доскроллят.
  const box=options.getBoundingClientRect(),rest=[];
  for(const el of tiles){const r=el.getBoundingClientRect();if(r.bottom>box.top-40&&r.top<box.bottom+40)fill(el);else rest.push(el);}
  if(!rest.length)return;
  liveryWatch=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){fill(e.target);liveryWatch.unobserve(e.target);}},{root:options,rootMargin:'140px'});
  for(const el of rest)liveryWatch.observe(el);
 }
 function render(){
  root.dataset.customSlot=slot;
  // Ресурсы игрока живут в верхней панели игры — она видна и при открытой мастерской, поэтому
  // второй кошелёк в шапке был дублем. Здесь остаётся то, что относится к машине: уровень и мощь.
  const power=$('#custom-power');
  if(power)powerBadge(power,rating(effectiveLevels(save),CARS[save.selected].id));
  $('#custom-groups').innerHTML=GROUPS.map(g=>`<button role="tab" aria-selected="${g.id===group}" data-custom-group="${g.id}" class="${g.id===group?'active':''}">${g.name}</button>`).join('');
  const slotless=group==='paint',cosmetic=slotless,categories=$('#custom-categories');categories.hidden=slotless;categories.innerHTML=GROUPS.find(g=>g.id===group).slots.map(id=>`<button role="tab" aria-label="${slotName(id)}" title="${slotName(id)}" aria-selected="${id===slot}" data-custom-slot="${id}" class="${id===slot?'active':''}">${partIcon(id)}</button>`).join('');
  const options=$('#custom-options');options.dataset.kind=slot==='upgrades'?'upgrades':group;animateContent(options);
  $('#custom-footer').hidden=cosmetic;
  if(slot==='upgrades'){
   // Найденное ставится и снимается независимо: слотов нет, ограничений на количество нет.
   const owned=UPGRADES.filter(u=>ownsUpgrade(save,u.id));
   options.innerHTML=owned.map(u=>{
    const on=isUpgradeOn(save,u.id);
    // Та же плитка, что у детали: картинка в своём окне, имя, редкость. Прирост — в подсказке при выборе, не на плитке.
    return `<article class="part-tile owned upgrade-card ${selected===u.id?'selected':''} ${on?'mounted':''}" style="--rarity:${RARITIES[u.rarity].color}">`+
     `<button class="part-select" data-upgrade-select="${u.id}" aria-pressed="${selected===u.id}" aria-label="${u.name}, ${RARITIES[u.rarity].name}, ${on?'стоит на машине':'в запасе'}">`+
      `<b class="part-rank"><i>${upgradeRank(save,u.id)}</i>/${upgradeRankCap(u)}</b>`+(on?'<b class="part-check" aria-hidden="true">✓</b>':'')+
      `<span class="upgrade-frame">${upgradeArt(u.id)}</span><strong>${u.name}</strong><small class="rarity-label">${RARITIES[u.rarity].name}</small></button></article>`;
   }).join('')||'<p class="unlock-hint">Уникальных апгрейдов пока нет. Они падают из боссовых ящиков и гарантированно — из легендарного за пройденный район.</p>';
   renderActions();return;
  }
  if(group==='paint'){
   // Заводская гамма идёт первой: это родные цвета именно этой модели, из них красят бесплатно.
   const car=save.selected,gamma=stockPaintsFor(car).map(paintById).filter(Boolean);
   const tile=(p,kind)=>{const on=save.paint[car]===p.id;
    return `<button class="paint-tile ${on?'selected mounted':''}" data-paint="${p.id}" aria-pressed="${on}" aria-label="${p.name}, ${kind}${on?', нанесён':''}" style="--paint:${p.color};--rarity:${RARITIES[p.rarity].color}"><i></i>${on?'<b class="part-check" aria-hidden="true">✓</b>':''}<strong>${p.name}</strong></button>`;};
   const bought=PAINTS.filter(p=>ownsPaint(save,p.id)&&!gamma.includes(p));/* стартовые остаются в своём списке, даже если входят в гамму этой модели */
   options.innerHTML=(gamma.length?`<h3 class="custom-subhead">Заводские цвета · ${CARS[car].name}</h3>`+gamma.map(p=>tile(p,'заводской цвет')).join(''):'')
    +(bought.length?`<h3 class="custom-subhead">Твои краски</h3>`+bought.map(p=>tile(p,p.rarity?RARITIES[p.rarity].name:'стартовый цвет')).join(''):'');
   const active=save.decal[save.selected],owned=DECALS.filter(d=>ownsDecal(save,d.id));
   options.innerHTML+=`<h3 class="custom-subhead">Декали на весь кузов</h3><button class="decal-tile ${!active?'selected mounted':''}" data-decal="none" aria-pressed="${!active}" aria-label="Чистый кузов, без декали"><i class="decal-none"></i>${!active?'<b class="part-check" aria-hidden="true">✓</b>':''}<strong>Чистый кузов</strong></button>`+owned.map(d=>`<button class="decal-tile ${active===d.id?'selected mounted':''}" data-decal="${d.id}" aria-pressed="${active===d.id}" aria-label="${d.name}, ${RARITIES[d.rarity].name}${active===d.id?', нанесена':''}" data-livery="${d.id}" style="--decal:${d.preview};--rarity:${RARITIES[d.rarity].color}"><i></i>${active===d.id?'<b class="part-check" aria-hidden="true">✓</b>':''}<strong>${d.name}</strong></button>`).join('')+(owned.length?'':'<p class="unlock-hint">Побеждай боссов и открывай ящики. Декаль, выигранная любой машиной, подходит всем.</p>');
   // Неон под днищем: свой цвет и своя пульсация, плитка мигает так же, как трубки.
   const neonOn=save.neon?.[save.selected],neons=NEONS.filter(n=>ownsNeon(save,n.id));
   options.innerHTML+=`<h3 class="custom-subhead">Неон под днище</h3><button class="decal-tile neon-tile ${!neonOn?'selected mounted':''}" data-neon="none" aria-pressed="${!neonOn}" aria-label="Без неона"><i class="decal-none"></i>${!neonOn?'<b class="part-check" aria-hidden="true">✓</b>':''}<strong>Без неона</strong></button>`+neons.map(n=>`<button class="decal-tile neon-tile ${neonOn===n.id?'selected mounted':''}" data-neon="${n.id}" aria-pressed="${neonOn===n.id}" aria-label="${n.name}, ${PULSES[n.pulse].name}${neonOn===n.id?', установлен':''}" style="--neon:${n.color};--rarity:${RARITIES[n.rarity].color}">${neonArt(n.pulse)}${neonOn===n.id?'<b class="part-check" aria-hidden="true">✓</b>':''}<strong>${n.name}</strong><small>${PULSES[n.pulse].name}</small></button>`).join('')+(neons.length?'':'<p class="unlock-hint">Неон продаётся в магазине на полке «Краски». Один набор — на все машины.</p>');paintLiveryTiles();return;
  }
  const installed=equipped();
  const parts=PARTS.filter(p=>p.slot===slot&&save.inventory[p.id]).sort((a,b)=>a.rarity-b.rarity);
  const showStock=installed==='stock'||parts.length!==1||installed!==parts[0].id;
  const stock=showStock?`<button class="part-tile stock-tile ${selected==='stock'?'selected':''} ${installed==='stock'?'mounted':''}" data-stock="true" aria-pressed="${selected==='stock'}" aria-label="Заводская деталь${installed==='stock'?', установлена':''}">${installed==='stock'?'<b class="part-check" aria-hidden="true">✓</b>':''}<img src="${carPartImage(slot)}" alt="" draggable="false"><strong>Сток</strong></button>`:'';
  options.innerHTML=stock+parts.map(p=>{
   const owned=save.inventory[p.id],mounted=installed===p.id,elsewhere=save.equipped.some((e,i)=>i!==save.selected&&save.unlockedCars[i]&&Object.values(e).includes(p.id)),gate=canInstall(save,p.id),needs=gate.ok?'':'Нужен гараж '+GARAGE_LEVELS[gate.garage-1].roman;
   // Закрытая машина деталь не занимает: игрок её не видит и снять с неё ничего не может.
   const reusable=!save.equipped.some((e,i)=>save.unlockedCars[i]&&Object.values(e).includes(p.id));
   // Редкость читается фоном, установленное — рамкой и галочкой в углу, уровень — крупно во втором углу.
   return `<article class="part-tile owned ${selected===p.id?'selected':''} ${gate.ok?'':'locked'} ${mounted?'mounted':''} ${p.rarity===RARITIES.length-1?'rarity-unique':''}" style="--rarity:${RARITIES[p.rarity].color}"><button class="part-select" data-custom-part="${p.id}" aria-pressed="${selected===p.id}" aria-label="${p.name}, ${RARITIES[p.rarity].name}, уровень ${owned.rank} из ${p.maxRank}, ${mounted?'установлено':gate.ok?'в запасе':needs}"><b class="part-rank"><i>${owned.rank}</i>/${p.maxRank}</b>${mounted?'<b class="part-check" aria-hidden="true">✓</b>':''}<img src="${carPartImage(slot,p.rarity,p.style)}" alt="" draggable="false"><strong>${p.nickname}</strong>${!gate.ok?`<b class="part-lock" aria-hidden="true">🔒 ГАРАЖ ${GARAGE_LEVELS[gate.garage-1].roman}</b>`:elsewhere?'<b class="part-elsewhere" title="Стоит на другой машине"><svg viewBox="0 0 24 16" aria-hidden="true"><path d="M2 12h20l-3-6H8L5 9H2z"/><circle cx="7" cy="13" r="2"/><circle cx="17" cy="13" r="2"/></svg></b>':''}</button></article>`;
  // Пустая категория объясняется не фразой, а пустыми ячейками: место под будущие детали видно.
  }).join('')+(parts.length?'':'<i class="part-tile part-empty" aria-hidden="true"></i><i class="part-tile part-empty" aria-hidden="true"></i>');
  renderActions();
 }
 // Цифры выезжают прямо из выбранной плитки: отдельной строки в подвале для них больше нет.
 // Что даёт выбранная деталь — правой частью той же строки подвала. Раньше цифры выезжали
 // отдельной карточкой из-под плитки, и про одну деталь говорили сразу три места: пузырь,
 // подпись под сеткой и кнопки. Теперь одно.
 function showPreviewCard(lines){
  const info=$('#custom-info');if(!info)return;
  // Строка узкая: берём две цифры и только прибавку — «209.7 → 209.8 км/ч» в неё не влезает.
  const short=l=>String(l).replace(/\s*[\d.,]+\s*→\s*/,'').replace(/\s+/g,' ').trim();
  const text=(lines||[]).map(short).filter(Boolean).slice(0,2).map(l=>`<em>${l}</em>`).join('');
  const gain=typeof info.querySelector==='function'?info.querySelector('.info-gain'):null;
  if(gain)gain.innerHTML=selected==='stock'?'':text;
  else if(typeof info.innerHTML==='string')info.innerHTML=info.innerHTML.replace(/<span class="info-gain">[\s\S]*?<\/span>/,'')+(selected==='stock'?'':`<span class="info-gain">${text}</span>`);
 }
 function renderActions(){
  const action=$('#custom-action'),secondary=$('#custom-secondary'),salvage=$('#custom-salvage'),info=$('#custom-info');
  action.disabled=false;secondary.disabled=false;secondary.hidden=true;salvage.hidden=true;salvage.disabled=false;action.dataset.action='';secondary.dataset.action='';salvage.dataset.action='';
  // Внешность кнопок сбрасываем каждый раз: слоты постоянные, а содержимое меняется.
  action.className='';secondary.className='';action.dataset.tone='';secondary.dataset.state='';
  if(slot==='upgrades'){
   const u=upgradeById(selected);
   if(!u){info.textContent='';action.hidden=true;showPreviewCard([]);return;}
   const on=isUpgradeOn(save,u.id);
   action.hidden=false;action.dataset.action='upgrade';action.textContent=on?'Снять':'Поставить';
   if(!on)action.dataset.tone='go';
   const rank=upgradeRank(save,u.id),cap=upgradeRankCap(u),k=upgradeStrength(rank);
   info.innerHTML=`<b>${u.name}</b><span class="info-lv">РАНГ ${rank}/${cap}</span><span class="info-gain"></span>`;
   // Прокачка — второй кнопкой: дорого, рублями и материалами, каждый ранг дороже. Показываем, сколько мощи это даст.
   if(rank<cap){const c=upgradeTuneCost(u,rank),carId=CARS[save.selected].id,now=rating(effectiveLevels(save),carId),next=on?rating(effectiveLevels({...save,upgradeRanks:{...save.upgradeRanks,[u.id]:rank+1}}),carId)-now:Math.round(u.stats.reduce((a,v,i)=>a+v*[14,5,3][i],0)*(upgradeStrength(rank+1)-k));
    secondary.hidden=false;secondary.dataset.action='tune-upgrade';
    upgradeButton(secondary,{price:c.cash,scrap:c.scrap,gain:next,
     shortCash:c.cash-save.cash,shortScrap:c.scrap-save.scrap});}
   else{secondary.hidden=false;secondary.dataset.action='';upgradeButton(secondary,{max:true,note:'Ранг '+cap+' — предел'});}
   showPreviewCard([`Мощь ${rating(effectiveLevels(save),CARS[save.selected].id)} → ${rating(effectiveLevels(save),CARS[save.selected].id)+(on?-upgradeGain(u):upgradeGain(u))}`,...u.stats.map((v,i)=>v?`${STAT_NAMES[i]} +${(v*k).toFixed(1)}`:'').filter(Boolean),rank>1?`Ранг ${rank}: ×${k.toFixed(2)}`:'']);
   return;
  }
  action.hidden=false;
  if(selected==='stock'){
   info.innerHTML=equipped()==='stock'?'':'<b>Сток</b><span class="info-lv">ЗАВОДСКАЯ</span>';action.dataset.action='install';action.disabled=equipped()==='stock';action.textContent=action.disabled?'Установлено':'Установить';return;
  }
  const p=partById(selected),owned=save.inventory[selected];if(!p||!owned){resetSelection();render();return;}
  // Разобрать можно только то, что нигде не стоит: кнопка живёт внизу вместе с остальными действиями.
  if(!save.equipped.some(e=>Object.values(e).includes(selected))){
   salvage.hidden=false;salvage.dataset.action='';salvage.dataset.salvageId=selected;
   salvage.className=confirmSalvage===selected?'confirm':'';
   salvage.innerHTML=confirmSalvage===selected?'Подтвердить':`Разобрать<small>+${salvageValue(save,selected)} ⚒</small>`;
  }else delete salvage.dataset.salvageId;
  const mounted=equipped()===selected,cost=tuneCost(save,selected),quote=rubleTuneQuote(save,selected),topup=quote?.missing>0;
  // The garage caps how deep a part can be tuned and whether a body kit may be mounted at all.
  const gate=canInstall(save,selected),cap=rankCapFor(save,selected),capped=owned.rank>=cap&&cap<p.maxRank,capText='Ранг '+cap+' · нужен гараж '+(garageForRank(cap+1)?.roman||'Ⅴ'),needs='Нужен гараж '+GARAGE_LEVELS[(gate.garage||1)-1].roman;
  // Докупка материалов рублями — та же кнопка прокачки, в пояснении сколько материалов докупается.
  const tuneButton=button=>{if(!topup||owned.rank>=cap)return;button.dataset.action='tune-cash';
   upgradeButton(button,{price:quote.total,meta:`с докупкой ${quote.missing} ⚒`,shortCash:quote.total-save.cash});};
  if(mounted){
   const preview=tunePreview(save,selected);info.innerHTML=`<b>${p.nickname||p.name}</b><span class="info-lv">УР. ${owned.rank}/${p.maxRank}</span><span class="info-gain"></span>`;showPreviewCard(partGain(save,selected));
   // Прокачка всегда в правом слоте, снятие — в левом и тихое: кнопки не спорят за внимание.
   action.dataset.action='remove';action.textContent='Снять';
   secondary.hidden=false;secondary.dataset.action='tune';
   if(capped)upgradeButton(secondary,{max:true,note:capText});
   else if(owned.rank>=p.maxRank)upgradeButton(secondary,{max:true,note:'Максимум'});
   else upgradeButton(secondary,{price:cost.cash,scrap:cost.scrap,gain:preview?.next?Math.max(0,preview.next.rating-preview.now.rating):0,
    shortCash:cost.cash-save.cash,shortScrap:cost.scrap-save.scrap});
   tuneButton(secondary);
  }else{
   const eq={...save.equipped[save.selected],[slot]:selected},next={...save,equipped:save.equipped.map((e,i)=>i===save.selected?eq:e)};
   const fit=tunePreview(next,selected);
   info.innerHTML=`<b>${p.nickname||p.name}</b><span class="info-lv">${RARITIES[p.rarity].name.toUpperCase()}</span><span class="info-gain"></span>`;
   const now=rating(effectiveLevels(save),CARS[save.selected].id),soon=rating(effectiveLevels(next),CARS[next.selected].id);
   showPreviewCard([`Мощь ${soon>=now?'+':'−'}${Math.abs(soon-now)}`,...(fit?fit.lines.slice(1):[])]);action.dataset.action='install';if(gate.ok){action.textContent='Установить';action.dataset.tone='go';}else{action.disabled=true;action.textContent=needs;}
   secondary.hidden=false;secondary.dataset.action='tune';
   if(capped)upgradeButton(secondary,{max:true,note:capText});
   else if(owned.rank>=p.maxRank)upgradeButton(secondary,{max:true,note:'Максимум'});
   else upgradeButton(secondary,{price:cost.cash,scrap:cost.scrap,gain:fit?.next?Math.max(0,fit.next.rating-fit.now.rating):0,
    shortCash:cost.cash-save.cash,shortScrap:cost.scrap-save.scrap});
   tuneButton(secondary);
  }
 }
 function open(id){if(typeof id==='string'&&id.startsWith('paint:')){const paintId=id.slice(6);if(!ownsPaint(save,paintId,save.selected))return;group='paint';slot='paint';save.paint[save.selected]=paintId;changed();}if(typeof id==='string'&&id.startsWith('neon:')){const neonId=id.slice(5);if(!ownsNeon(save,neonId))return;group='paint';slot='paint';save.neon[save.selected]=neonId;changed();}if(typeof id==='string'&&id.startsWith('decal:')){const decalId=id.slice(6);if(!ownsDecal(save,decalId))return;group='paint';slot='paint';save.decal[save.selected]=decalId;changed();}if(partById(id)&&save.inventory[id]){slot=partById(id).slot;group=baseIndex()>=0?'power':'body';}resetSelection();if(partById(id)&&save.inventory[id]){selected=id;previewSelection();}switchPanels(true);render();$('#custom-done').focus({preventScroll:true});}
 function close(){if(!isOpen)return;resetSelection();switchPanels(false);$('#configure-button').focus({preventScroll:true});}
 $('#configure-button').onclick=open;$('#custom-done').onclick=close;
 sheet.onclick=e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
  if(d.upgradeSelect){selected=d.upgradeSelect;confirmSalvage=false;render();return;}
  if(d.action==='upgrade'){if(toggleUpgrade(save,selected)){changed();previewCar();sfx?.('upgrade');render();}return;}
  if(d.action==='tune-upgrade'){if(tuneUpgrade(save,selected)){changed();previewCar();sfx?.('upgrade');render();}else toast('Не хватает денег или материалов');return;}
  if(d.customGroup){group=d.customGroup;slot=GROUPS.find(g=>g.id===group).slots[0]||group;resetSelection();render();$('#custom-options').scrollTop=0;}
  else if(d.customSlot){slot=d.customSlot;resetSelection();render();$('#custom-options').scrollTop=0;}
  else if(d.customPart){if(!save.inventory[d.customPart]||partById(d.customPart)?.slot!==slot)return;selected=d.customPart;confirmSalvage=false;previewSelection();render();}
  else if(d.stock){selected='stock';confirmSalvage=false;previewSelection();render();}
  else if(d.paint){if(!ownsPaint(save,d.paint,save.selected))return;save.paint[save.selected]=d.paint;changed();previewCar();render();}
  else if(d.decal){const id=d.decal==='none'?null:d.decal;if(id&&!ownsDecal(save,id))return;save.decal[save.selected]=id;changed();previewCar();render();sfx('upgrade');}
  else if(d.neon){const id=d.neon==='none'?null:d.neon;if(id&&!ownsNeon(save,id))return;save.neon[save.selected]=id;changed();previewCar();render();sfx('upgrade');}
  else if(d.action==='install'){
   if(selected==='stock')unequip(save,slot);else if(!equip(save,selected))return;
   changed();previewCar();confirmSalvage=false;render();sfx('upgrade');
  }else if(d.action==='remove'){unequip(save,slot);changed();resetSelection();render();}
  else if(d.action==='tune-cash'){if(tuneWithRubles(save,selected)){changed();previewSelection();render();sfx('upgrade');}else toast('Не хватает рублей');}
  else if(d.action==='tune'){if(tunePart(save,selected)){changed();previewSelection();render();sfx('upgrade');}else toast('Не хватает денег или материалов');}
  else if(d.removeId){if(save.equipped[save.selected][slot]!==d.removeId)return;unequip(save,slot);changed();resetSelection();render();}
  else if(d.salvageId){
   const id=d.salvageId;if(!save.inventory[id]||save.equipped.some(e=>Object.values(e).includes(id)))return;
   if(confirmSalvage!==id){confirmSalvage=id;render();return;}
   const n=salvage(save,id);if(n){changed();confirmSalvage=false;if(selected===id)resetSelection();render();toast('+'+n+' материалов');}
  }
 };
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen&&!document.querySelector('dialog[open]')){e.preventDefault();close();}});
 switchPanels(false);return {open,close,refresh:()=>{if(isOpen){resetSelection();render();}},get focusSlot(){return isOpen?slot:null;},get isOpen(){return isOpen;}};
}