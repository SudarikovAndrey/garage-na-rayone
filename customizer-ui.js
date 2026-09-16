import {tunePreview,partGain} from './tune-preview.js';
import {CARS} from './fleet.js';
import {rubleTuneQuote,tuneWithRubles} from './soft-economy.js';
import {animateContent} from './motion.js';
import {SLOTS,PARTS,RARITIES,partById,equip,unequip,tunePart,tuneCost,salvage,salvageValue,effectiveLevels,rating,canInstall,rankCapFor} from './progression.js';
import {GARAGE_LEVELS,garageForRank} from './garage-levels.js';
import {PAINTS,ownsPaint} from './paints.js';
import {DECALS,ownsDecal} from './decals.js';
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
const partImage=(slot,rarity='stock')=>'assets/parts/'+(['engine','gearbox'].includes(slot)?slot:slot==='tires'?'tires-stock':slot+'-'+rarity)+'.webp';
const money=n=>n.toLocaleString('ru-RU');
import {UPGRADES,ownsUpgrade,isUpgradeOn,toggleUpgrade,upgradeById} from './upgrades.js';
import {upgradeArt} from './upgrade-art.js';
export function bindCustomizer({save,changed,previewCar,resized,toast,sfx}){
 let group='body',slot='spoiler',selected='stock',isOpen=false,confirmSalvage=false;
 const root=$('#garage-screen'),sheet=$('#custom-sheet'),home=$('#home-sheet');
 const carPartImage=(slot,rarity='stock')=>CARS[save.selected].id==='bukhanka'&&['spoiler','bumpers'].includes(slot)&&rarity!=='stock'?'assets/parts/bukhanka-'+slot+'-'+rarity+'.webp':partImage(slot,rarity);
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
 function render(){
  root.dataset.customSlot=slot;$('#custom-status').textContent=money(save.scrap)+' ⚒';
  $('#custom-groups').innerHTML=GROUPS.map(g=>`<button role="tab" aria-selected="${g.id===group}" data-custom-group="${g.id}" class="${g.id===group?'active':''}">${g.name}</button>`).join('');
  const slotless=group==='paint',cosmetic=slotless,categories=$('#custom-categories');categories.hidden=slotless;categories.innerHTML=GROUPS.find(g=>g.id===group).slots.map(id=>`<button role="tab" aria-label="${slotName(id)}" title="${slotName(id)}" aria-selected="${id===slot}" data-custom-slot="${id}" class="${id===slot?'active':''}">${partIcon(id)}</button>`).join('');
  $('.custom-header h2').textContent=slot==='upgrades'?'Уникальные апгрейды':group==='paint'?'Цвет и декали':slotName(slot)+(slot==='bumpers'?' · пара':slot==='gearbox'?' · сцепление':'');
  const options=$('#custom-options');options.dataset.kind=slot==='upgrades'?'upgrades':group;animateContent(options);
  $('#custom-footer').hidden=cosmetic;
  if(slot==='upgrades'){
   // Найденное ставится и снимается независимо: слотов нет, ограничений на количество нет.
   const owned=UPGRADES.filter(u=>ownsUpgrade(save,u.id));
   options.innerHTML=owned.map(u=>{
    const on=isUpgradeOn(save,u.id);
    return `<article class="part-tile owned upgrade-card ${selected===u.id?'selected':''} ${on?'mounted':''}" style="--rarity:${RARITIES[u.rarity].color}">`+
     `<button class="part-select" data-upgrade-select="${u.id}" aria-pressed="${selected===u.id}" aria-label="${u.name}, ${RARITIES[u.rarity].name}, ${on?'стоит на машине':'в запасе'}">`+
      (on?'<b class="part-check" aria-hidden="true">✓</b>':'')+
      upgradeArt(u.id)+`<strong>${u.name}</strong><span class="upgrade-stats">${statChips(u)}</span></button></article>`;
   }).join('')||'<p class="unlock-hint">Уникальных апгрейдов пока нет. Они падают из боссовых ящиков и гарантированно — из легендарного за пройденный район.</p>';
   renderActions();return;
  }
  if(group==='paint'){
   options.innerHTML=PAINTS.filter(p=>ownsPaint(save,p.id)).map(p=>{const on=save.paint[save.selected]===p.id;
    return `<button class="paint-tile ${on?'selected mounted':''}" data-paint="${p.id}" aria-pressed="${on}" aria-label="${p.name}, ${p.rarity?RARITIES[p.rarity].name:'стартовый цвет'}${on?', нанесён':''}" style="--paint:${p.color};--rarity:${RARITIES[p.rarity].color}"><i></i>${on?'<b class="part-check" aria-hidden="true">✓</b>':''}<strong>${p.name}</strong></button>`;}).join('');
   const active=save.decal[save.selected],owned=DECALS.filter(d=>ownsDecal(save,d.id));
   options.innerHTML+=`<h3 class="custom-subhead">Декали на весь кузов</h3><button class="decal-tile ${!active?'selected mounted':''}" data-decal="none" aria-pressed="${!active}" aria-label="Чистый кузов, без декали"><i class="decal-none"></i>${!active?'<b class="part-check" aria-hidden="true">✓</b>':''}<strong>Чистый кузов</strong></button>`+owned.map(d=>`<button class="decal-tile ${active===d.id?'selected mounted':''}" data-decal="${d.id}" aria-pressed="${active===d.id}" aria-label="${d.name}, ${RARITIES[d.rarity].name}${active===d.id?', нанесена':''}" style="--decal:${d.preview};--rarity:${RARITIES[d.rarity].color}"><i></i>${active===d.id?'<b class="part-check" aria-hidden="true">✓</b>':''}<strong>${d.name}</strong></button>`).join('')+(owned.length?'':'<p class="unlock-hint">Побеждай боссов и открывай ящики. Декаль, выигранная любой машиной, подходит всем.</p>');return;
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
   return `<article class="part-tile owned ${selected===p.id?'selected':''} ${gate.ok?'':'locked'} ${mounted?'mounted':''}" style="--rarity:${RARITIES[p.rarity].color}"><button class="part-select" data-custom-part="${p.id}" aria-pressed="${selected===p.id}" aria-label="${p.name}, ${RARITIES[p.rarity].name}, уровень ${owned.rank} из ${p.maxRank}, ${mounted?'установлено':gate.ok?'в запасе':needs}"><b class="part-rank"><i>${owned.rank}</i>/${p.maxRank}</b>${mounted?'<b class="part-check" aria-hidden="true">✓</b>':''}<img src="${carPartImage(slot,p.rarity)}" alt="" draggable="false"><strong>${p.nickname}</strong>${!gate.ok?`<b class="part-lock" aria-hidden="true">🔒 ГАРАЖ ${GARAGE_LEVELS[gate.garage-1].roman}</b>`:elsewhere?'<b class="part-elsewhere" aria-hidden="true">НА ДРУГОЙ</b>':''}</button></article>`;
  }).join('')+(parts.length?'':'<p class="unlock-hint">Пока нет деталей. Выигрывай их в заездах и ящиках.</p>');
  renderActions();
 }
 // Цифры выезжают прямо из выбранной плитки: отдельной строки в подвале для них больше нет.
 function showPreviewCard(lines){
  const options=$('#custom-options');
  // На лёгком стенде без настоящего DOM выезжать нечему: цифры и так проверяются отдельно.
  if(typeof options.querySelector!=='function')return;
  options.querySelector('.tune-card')?.remove();
  if(options.style)options.style.paddingBottom='';
  if(!lines?.length||selected==='stock')return;
  const tile=options.querySelector('[data-custom-part="'+selected+'"],[data-upgrade-select="'+selected+'"]')?.closest('.part-tile');
  if(!tile)return;
  // Карточка висит под своей плиткой, а не встаёт в сетку: иначе соседняя деталь уезжает на новую строку.
  const card=document.createElement('div');
  card.className='tune-card';
  if(tile.style?.getPropertyValue)card.style.setProperty('--rarity',tile.style.getPropertyValue('--rarity')||'#8f9788');
  // Строка вида «Сцепление на старте 4.69 → 6.14»: подпись — всё до первого числа, дальше сами цифры.
  card.innerHTML=lines.map(line=>{
   const m=/^(.+?)\s([\d±].*)$/.exec(String(line));
   return m?`<span><i>${m[1]}</i><b>${m[2]}</b></span>`:`<span><b>${line}</b></span>`;
  }).join('');
  // Плашка во всю ширину списка, но с уголком под своей плиткой: видно, к чему относятся цифры.
  if(typeof tile.offsetTop==='number'){
   card.style.top=(tile.offsetTop+tile.offsetHeight)+'px';
   card.style.setProperty('--notch',(tile.offsetLeft+tile.offsetWidth/2)+'px');
   options.append(card);
  }else tile.append(card);
  // Плашка висит абсолютом и не увеличивает высоту списка, поэтому под неё добавляем место
  // и только потом подматываем: иначе прокручивать просто некуда и она остаётся за краем.
  if(typeof card.getBoundingClientRect==='function'&&typeof options.scrollTop==='number'){
   const height=card.offsetHeight||card.getBoundingClientRect().height;
   options.style.paddingBottom=(height+10)+'px';
   const under=tile.getBoundingClientRect().bottom+height-options.getBoundingClientRect().bottom;
   if(under>0)options.scrollTop=options.scrollTop+under+8;
  }
 }
 function renderActions(){
  const action=$('#custom-action'),secondary=$('#custom-secondary'),salvage=$('#custom-salvage'),info=$('#custom-info');
  action.disabled=false;secondary.disabled=false;secondary.hidden=true;salvage.hidden=true;salvage.disabled=false;action.dataset.action='';secondary.dataset.action='';salvage.dataset.action='';
  if(slot==='upgrades'){
   const u=upgradeById(selected);
   if(!u){info.textContent='';action.hidden=true;showPreviewCard([]);return;}
   const on=isUpgradeOn(save,u.id);
   action.hidden=false;action.dataset.action='upgrade';action.textContent=on?'Снять':'Поставить';
   info.innerHTML=`${u.name} · ${RARITIES[u.rarity].name.toLowerCase()}`;
   showPreviewCard([`Мощь ${rating(effectiveLevels(save),CARS[save.selected].id)} → ${rating(effectiveLevels(save),CARS[save.selected].id)+(on?-upgradeGain(u):upgradeGain(u))}`,...u.stats.map((v,i)=>v?`${STAT_NAMES[i]} +${v}`:'').filter(Boolean)]);
   return;
  }
  action.hidden=false;
  if(selected==='stock'){
   info.textContent=equipped()==='stock'?'':'Заводская комплектация';action.dataset.action='install';action.disabled=equipped()==='stock';action.textContent=action.disabled?'Установлено':'Установить';return;
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
  const tuneButton=button=>{if(!topup||owned.rank>=cap)return;button.dataset.action='tune-cash';button.disabled=save.cash<quote.total;button.innerHTML=`Улучшить · ${money(quote.total)} ₽<small>Включая ${quote.missing} ⚒ · докупка по 90 ₽</small>`;};
  if(mounted){
   const preview=tunePreview(save,selected);info.innerHTML=`${p.name} · уровень ${owned.rank} из ${p.maxRank}`;showPreviewCard(partGain(save,selected));action.dataset.action='tune';action.disabled=owned.rank>=cap||save.cash<cost.cash||save.scrap<cost.scrap;action.innerHTML=capped?capText:owned.rank>=p.maxRank?'Максимум':`Улучшить <small>${money(cost.cash)} ₽ + ${cost.scrap} ⚒${action.disabled?' · не хватает':''}</small>`;
   tuneButton(action);secondary.hidden=false;secondary.dataset.action='remove';secondary.textContent='Снять';
  }else{
   const eq={...save.equipped[save.selected],[slot]:selected},next={...save,equipped:save.equipped.map((e,i)=>i===save.selected?eq:e)};
   const fit=tunePreview(next,selected);
   info.innerHTML=`${p.name} · ${RARITIES[p.rarity].name.toLowerCase()}`;
   const now=rating(effectiveLevels(save),CARS[save.selected].id),soon=rating(effectiveLevels(next),CARS[next.selected].id);
   showPreviewCard([`Мощь ${soon>=now?'+':'−'}${Math.abs(soon-now)}`,...(fit?fit.lines.slice(1):[])]);action.dataset.action='install';if(gate.ok){action.textContent='Установить';}else{action.disabled=true;action.textContent=needs;}
   secondary.hidden=false;secondary.dataset.action='tune';secondary.disabled=owned.rank>=cap||save.cash<cost.cash||save.scrap<cost.scrap;secondary.innerHTML=capped?capText:owned.rank>=p.maxRank?'Максимум':`Улучшить <small>${money(cost.cash)} ₽ + ${cost.scrap} ⚒</small>`;tuneButton(secondary);
  }
 }
 function open(id){if(typeof id==='string'&&id.startsWith('paint:')){const paintId=id.slice(6);if(!ownsPaint(save,paintId))return;group='paint';slot='paint';save.paint[save.selected]=paintId;changed();}if(typeof id==='string'&&id.startsWith('decal:')){const decalId=id.slice(6);if(!ownsDecal(save,decalId))return;group='paint';slot='paint';save.decal[save.selected]=decalId;changed();}if(partById(id)&&save.inventory[id]){slot=partById(id).slot;group=baseIndex()>=0?'power':'body';}resetSelection();if(partById(id)&&save.inventory[id]){selected=id;previewSelection();}switchPanels(true);render();$('#custom-done').focus({preventScroll:true});}
 function close(){if(!isOpen)return;resetSelection();switchPanels(false);$('#configure-button').focus({preventScroll:true});}
 $('#configure-button').onclick=open;$('#custom-done').onclick=close;
 sheet.onclick=e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
  if(d.upgradeSelect){selected=d.upgradeSelect;confirmSalvage=false;render();return;}
  if(d.action==='upgrade'){if(toggleUpgrade(save,selected)){changed();previewCar();sfx?.('upgrade');render();}return;}
  if(d.customGroup){group=d.customGroup;slot=GROUPS.find(g=>g.id===group).slots[0]||group;resetSelection();render();$('#custom-options').scrollTop=0;}
  else if(d.customSlot){slot=d.customSlot;resetSelection();render();$('#custom-options').scrollTop=0;}
  else if(d.customPart){if(!save.inventory[d.customPart]||partById(d.customPart)?.slot!==slot)return;selected=d.customPart;confirmSalvage=false;previewSelection();render();}
  else if(d.stock){selected='stock';confirmSalvage=false;previewSelection();render();}
  else if(d.paint){if(!ownsPaint(save,d.paint))return;save.paint[save.selected]=d.paint;changed();previewCar();render();}
  else if(d.decal){const id=d.decal==='none'?null:d.decal;if(id&&!ownsDecal(save,id))return;save.decal[save.selected]=id;changed();previewCar();render();sfx('upgrade');}
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
