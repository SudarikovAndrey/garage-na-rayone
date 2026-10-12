// Полоса загрузки. Считает реальные файлы: three грузит модели и текстуры через общий менеджер,
// и он сообщает, сколько уже пришло. Полоса не откатывается назад и подтягивается плавно,
// иначе счётчик прыгает каждый раз, когда в очередь добавляется новый файл.
let node=null,shown=0,target=0,raf=0,done=false;

const paint=()=>{if(node)node.style.setProperty('--progress',(shown*100).toFixed(1)+'%');};

function tick(){
 raf=0;
 const step=Math.max(.004,(target-shown)*.12);
 shown=Math.min(target,shown+step);
 paint();
 if(shown<target-.001)raf=requestAnimationFrame(tick);
}

export function bindLoadingBar(el){node=el;shown=target=0;done=false;paint();}

// Доля 0..1. Назад не идём: если в очередь добавились файлы, доля просто перестаёт расти.
export function loadingProgress(value){
 if(done)return;
 const v=Math.max(0,Math.min(1,Number(value)||0));
 if(v<=target)return;
 target=v;
 if(!raf)raf=requestAnimationFrame(tick);
}

// Игра готова: добиваем до конца независимо от того, что насчитал менеджер.
export function finishLoading(){done=true;target=1;if(!raf)raf=requestAnimationFrame(tick);}

// Пока файлы ещё не начали приходить, полоса всё равно ползёт: пустой бар выглядит как зависание.
export function crawlLoading(seconds=14){
 const started=performance.now();
 const crawl=()=>{
  if(done)return;
  const share=Math.min(.9,(performance.now()-started)/(seconds*1000)*.9);
  if(share>target){target=share;if(!raf)raf=requestAnimationFrame(tick);}
  requestAnimationFrame(crawl);
 };
 requestAnimationFrame(crawl);
}
