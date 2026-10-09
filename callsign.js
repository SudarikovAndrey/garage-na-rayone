// Экран позывного: выдача номера. Поведение полей вынесено сюда, потому что разметку profiles.js
// отдаёт строкой, а поля должны жить: подбирать кегль под длину и пускать в регион только цифры.
//
// Кегль подбираем замером, а не таблицей «столько букв — такой размер»: шрифт на телефоне может
// подставиться другой, и тогда любая таблица соврёт. Десять знаков — предел позывного: дальше
// буквы становятся мельче подписи под номером, и знак перестаёт читаться.
export const NAME_LIMIT=10;
export const REGION_LIMIT=3;

export function fitPlateText(field,{max=50,min=24}={}){
 if(!field||!field.style)return;
 // Пока поле пустое, меряем подсказку: иначе «АНДРЕЙ» в placeholder набран полным кеглем и
 // обрезается краем пластины — именно это и было видно на первом запуске.
 const empty=!field.value,probe=field.placeholder||'';
 if(empty&&probe)field.value=probe;
 field.style.fontSize=max+'px';
 for(let size=max;size>=min;size-=1){
  field.style.fontSize=size+'px';
  if(field.scrollWidth<=field.clientWidth)break;
 }
 if(empty)field.value='';
}

// maxlength держит ручной ввод, но значение может прийти и мимо клавиатуры — подстановкой из
// Telegram или из старого профиля. Режем сами.
export const cleanName=value=>String(value??'').slice(0,NAME_LIMIT);

// Регион — только цифры и не длиннее трёх: «77», «163», «01».
export const cleanRegion=value=>String(value??'').replace(/\D/g,'').slice(0,REGION_LIMIT);

export function bindCallsign(root){
 const plate=root?.querySelector?.('.plate');
 if(!plate)return null;
 const name=plate.querySelector('.plate-name'),region=plate.querySelector('.plate-region');
 const refit=()=>{fitPlateText(name);fitPlateText(region,{max:44,min:24});};
 name?.addEventListener('input',()=>{
  const fixed=cleanName(name.value);
  if(fixed!==name.value)name.value=fixed;
  fitPlateText(name);
 });
 region?.addEventListener('input',()=>{
  const fixed=cleanRegion(region.value);
  if(fixed!==region.value)region.value=fixed;
  fitPlateText(region,{max:44,min:24});
 });
 refit();
 // Шрифт подгружается позже разметки: пересчитываем, когда он приедет, иначе кегль подобран по
 // запасному шрифту и длинное имя вылезает.
 document.fonts?.ready?.then(refit).catch(()=>{});
 return {refit};
}
