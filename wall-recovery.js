export const needsRecovery=s=>Number(s?.campaignLosses)>=2;
export function wallRecoveryMarkup(save,{force=false}={}){
 if(!force&&!needsRecovery(save))return '';
 return `<section class="wall-recovery"><h3>ПОДГОТОВЬ МАШИНУ К РЕВАНШУ</h3><p>Усиль мотор, шины и КПП или отработай переключения.</p><button class="primary" data-recovery="stars">ЯЩИКИ ЗА STARS <span>ОТ 149 ★</span></button><div class="recovery-alternatives"><button data-recovery="training"><b>ТРЕНИРОВКА</b><small>Деньги, материалы, детали</small></button><button data-recovery="drift"><b>ДРИФТ</b><small>Другой режим · награды</small></button><button data-recovery="friends"><b>ПОЗВАТЬ ДРУЗЕЙ</b><small>Ящики за играющих корешей</small></button><button data-recovery="tune"><b>МАСТЕРСКАЯ</b><small>Поставить и улучшить детали</small></button></div></section>`;
}
export function mountRecoveryStyles(){
 if(document.querySelector('[data-recovery-css]'))return;
 const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./wall-recovery.css',import.meta.url).href;link.dataset.recoveryCss='1';document.head.append(link);
}
