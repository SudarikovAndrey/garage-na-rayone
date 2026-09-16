// «Форма»: честная, видимая подстройка соперников под игрока, который не проигрывает. Точный водитель по
// симуляции выигрывает 98–99 % рядовых этапов (они откалиброваны под среднего) — ему нужен соперник злее.
// Серия побед с запасом поднимает темп следующих рядовых соперников до +4 % (это ~ разница «руки точного vs
// среднего»); одно поражение сбрасывает. Боссов форма не трогает: их стена — мощность. Всё показано в карточке.
export const FORM_MAX=.04,FORM_STEP=.01,FORM_FROM_STREAK=3,FORM_MARGIN=.02;
export const emptyForm=()=>({streak:0,boost:0,best:0});
export function restoreForm(d){const f=d?.form||{};const n=v=>Number.isFinite(v)?v:0;return {streak:Math.max(0,Math.floor(n(f.streak))),boost:Math.min(FORM_MAX,Math.max(0,n(f.boost))),best:Math.max(0,Math.floor(n(f.best)))};}
// After a campaign race: a win by a clear margin (≥2 % of the rival's time) extends the streak; a loss resets it.
export function updateForm(form,{won,margin=0,practice=false,boss=false,drift=false}){
 if(practice||drift)return form;
 if(!won){return {...form,streak:0,boost:0};}
 const clear=margin>=FORM_MARGIN,streak=clear?form.streak+1:form.streak;
 const boost=Math.min(FORM_MAX,Math.max(0,(streak-FORM_FROM_STREAK+1)*FORM_STEP));
 return {streak,boost:boss?form.boost:boost,best:Math.max(form.best,streak)};
}
// Rival pace: +1 % pace ≈ reaction −0.07 s and levels ×1.025 (measured with rivalRun on ranks 40–100).
export function applyForm(opp,form){const b=form?.boost||0;if(!b||opp.boss||opp.practice||opp.drift)return opp;return {...opp,levels:opp.levels.map(v=>v*(1+b*2.5)),reaction:Math.max(.12,(opp.reaction??.3)-b*7),formBoost:b};}
export const formLabel=form=>form?.boost>0?`Форма: ${form.streak} побед подряд · соперники злее на ${Math.round(form.boost*100)} %`:form?.streak>0?`Серия побед: ${form.streak}`:'';
