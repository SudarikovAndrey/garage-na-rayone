const KEY='rayon-drift-v1';
export function readDriftRecord(storage=globalThis.localStorage,track='ridge'){try{const n=JSON.parse(storage.getItem(track==='ridge'?KEY:KEY+':'+track)||'0');return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}catch{return 0;}}
export function writeDriftRecord(score,storage=globalThis.localStorage,track='ridge'){const old=readDriftRecord(storage,track),best=Math.max(old,Number.isFinite(score)?Math.floor(score):0);try{storage.setItem(track==='ridge'?KEY:KEY+':'+track,JSON.stringify(best));}catch{}return {old,best,fresh:best>old};}
