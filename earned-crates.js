import {openDialog,closeDialog} from './motion.js';
import {raceLootMarkup} from './loot-ui.js';

// Share the same direct-open flow between the finish screen and its UI fixture.
export function bindEarnedCrates({element,resultDialog,getResult,openCrate,backFocus}){
 let busy=false;
 element.onclick=async e=>{
  const button=e.target.closest('[data-earned-crate]'),result=getResult();
  if(!button||button.disabled||busy||!result)return;
  const earned=result.crates[Number(button.dataset.earnedCrate)];
  if(!earned||earned.opened)return;
  busy=true;button.disabled=true;let opened=false;
  const back=()=>{openDialog(resultDialog);backFocus?.focus({preventScroll:true});};
  try{
   await closeDialog(resultDialog);
   opened=await openCrate(earned.id,{
    onOpened:drop=>{earned.opened=drop;element.innerHTML=raceLootMarkup(result)+(result.details||'');},
    onClose:back,
   });
  }finally{busy=false;if(!opened){button.disabled=false;back();}}
 };
}
