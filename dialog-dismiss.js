// Тап мимо любого всплывающего окна закрывает его — как и кнопка «×» этого окна. Окна результата и
// мастерской закрываются своими кнопками, чтобы отработала их логика (в гараж, возврат к результату).
// Окно с data-required (позывной на первом запуске) тапом мимо не закрывается.
import {closeDialog} from './motion.js';
const outside=(dialog,e)=>{const r=dialog.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
export function installDialogDismiss(root=document){
 for(const dialog of root.querySelectorAll('dialog')){
  dialog.addEventListener('pointerdown',e=>{if(e.target!==dialog||!dialog.open||dialog.dataset.required||!outside(dialog,e))return;dialog.dataset.dismissArmed='1';});
  dialog.addEventListener('click',e=>{
   if(e.target!==dialog||!dialog.open||dialog.dataset.required||!outside(dialog,e)||dialog.dataset.dismissArmed!=='1')return;delete dialog.dataset.dismissArmed;
   const own=dialog.querySelector('#result-garage,#meta-close,#event-close,[data-dialog-close],.dialog-close');
   if(own&&!own.disabled&&!own.hidden)own.click();else closeDialog(dialog);
  });
 }
}
installDialogDismiss();
