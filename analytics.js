// Шина событий аналитики. Любой модуль зовёт track(kind,row); game.js один раз привязывает отправителя
// (telemetry.send) и контекст (ранг, кошелёк, машина, экран, сборка), который дописывается к каждому событию.
// До привязки события копятся в памяти (до 200), чтобы не потерять старт сессии. Схема — docs/telemetry-schema.md.
let sender=null,context=()=>({}),buffer=[];const listeners=new Set();
export function bindAnalytics(send,ctx){sender=send;if(ctx)context=ctx;for(const [kind,row] of buffer.splice(0))emit(kind,row);}
function emit(kind,row){const full={...context(),...row};for(const l of listeners)l(kind,full);sender?.(kind,full);}
export function track(kind,row={}){if(!sender){buffer.push([kind,row]);if(buffer.length>200)buffer.shift();return;}emit(kind,row);}
export function onTrack(fn){listeners.add(fn);return ()=>listeners.delete(fn);}
export const _reset=()=>{sender=null;context=()=>({});buffer=[];listeners.clear();};
