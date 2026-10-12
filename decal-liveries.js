// Атлас ливреи: раскладка из liveries.js рисуется на canvas, один атлас на пару «ливрея × кузов × краска».
// Пять рядов по 384 px (снизу вверх в текстурных координатах): козырёк стекла, торцы (нос слева, корма
// справа), верх (капот и крыша), левый борт (зеркально, надписи читаемы), правый борт. Шейдер
// decal-projection.js выбирает ряд по нормали грани. Реальных логотипов нет — только районные спонсоры.
import * as T from 'three';
import {liveryById,layoutLivery,DEFAULT_FIT} from './liveries.js';

export const ATLAS_W=1024,ROW_H=384,ROWS=5,ATLAS_H=ROW_H*ROWS;
export const ROW={glass:0,ends:1,top:2,sideL:3,sideR:4};
// Russo One — тяжёлый гоночный гротеск с кириллицей; наклон даём трансформацией, как на плёнке под углом.
const FONT='"Russo One", Oswald, Impact, sans-serif';const SKEW=-.22;
const rowTop=k=>(ROWS-1-k)*ROW_H;

function hexShade(hex,k){const n=parseInt(hex.slice(1),16);const c=[n>>16&255,n>>8&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*k))));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');}
const hash=(x,y)=>{const s=Math.sin(x*127.1+y*311.7)*43758.5453;return s-Math.floor(s);};
// Значимый шум с плавной интерполяцией: на нём вырастают пятна камуфляжа, а сетка уже режет их на пиксели.
const noise=(x,y,seed)=>{
 const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
 const a=hash(xi+seed*37,yi),b=hash(xi+1+seed*37,yi),c=hash(xi+seed*37,yi+1),d=hash(xi+1+seed*37,yi+1);
 return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
};
// Гамма из краски: тёмный подбой, сама краска, высветление и сдвинутый по тону оттенок — как у настоящей «цифры».
const toHsl=hex=>{const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255;
 const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2,d=mx-mn;
 if(!d)return [0,0,l];
 const s=l>.5?d/(2-mx-mn):d/(mx+mn);
 const h=mx===r?((g-b)/d+(g<b?6:0)):mx===g?(b-r)/d+2:(r-g)/d+4;
 return [h/6,s,l];};
const toHex=(h,s,l)=>{h=(h%1+1)%1;s=Math.max(0,Math.min(1,s));l=Math.max(0,Math.min(1,l));
 const f=n=>{const k=(n+h*12)%12,a=s*Math.min(l,1-l);return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,Math.min(9-k,1)))));};
 return '#'+[f(0),f(8),f(4)].map(v=>v.toString(16).padStart(2,'0')).join('');};
export function camoPalette(paint='#6f6b41'){
 const [h,s,l]=toHsl(paint),light=l>.58,cl=(v,a,b)=>Math.max(a,Math.min(b,v));
 // У светлой краски высветлять некуда — второй тон уводим вниз, иначе камуфляж сливается в одно пятно.
 const dark=toHex(h,s*.95,cl(l*.42,.05,.42));
 const step=light?toHex(h,s*.65,cl(l*.86,.3,.92)):toHex(h,s*.75,cl(l*1.55+.1,0,.86));
 const off=toHex(h+(light?-.05:.07),cl(s*(light?.75:.95)+.03,0,1),cl(l*(light?.7:.8),.07,.8));
 return [dark,paint,step,off];
}


// Фон-узор низким контрастом: под ним краска, поверх — слои ливреи.
function pattern(ctx,type,fill,contrast,x0,y0,w,h,seed,colors,paintColor){
 ctx.save();ctx.beginPath();ctx.rect(x0,y0,w,h);ctx.clip();ctx.globalAlpha=contrast;
 if(type==='pixel'){
  // «Цифра»: крупные пятна из шума, разрезанные на квадраты сетки; высокая частота рассыпает края в отдельные
  // пиксели, как на ММ-14. Четыре тона — тёмный подбой, сама краска, высветление и сдвинутый оттенок.
  const tones=colors?.length?colors:camoPalette(paintColor||fill);
  const cell=Math.max(4,Math.round(h/34)),cols=Math.ceil(w/cell),rows=Math.ceil(h/cell);
  for(let cy=0;cy<rows;cy++)for(let cx=0;cx<cols;cx++){
   const gx=(x0/cell+cx),gy=(y0/cell+cy);
   const n=noise(gx/9,gy/9,seed)*.62+noise(gx/3.2,gy/3.2,seed+5)*.26+noise(gx,gy,seed+11)*.12;
   const tone=tones[Math.min(tones.length-1,Math.floor(n*tones.length*.999))];
   ctx.fillStyle=tone;ctx.fillRect(x0+cx*cell,y0+cy*cell,cell,cell);
  }
  // Редкие одиночные пиксели поверх — мелкий «шум» настоящей цифры.
  for(let i=0;i<240;i++){const cx=Math.floor(hash(i,seed)*cols),cy=Math.floor(hash(seed+3,i)*rows);
   ctx.fillStyle=tones[Math.floor(hash(i*3,seed)*tones.length)%tones.length];ctx.fillRect(x0+cx*cell,y0+cy*cell,cell,cell);}
  ctx.restore();return;
 }
 if(type==='camo'){
  // Woodland: три яруса пятен от крупных к мелким, у каждой кляксы рваный край — радиус скачет на каждой вершине.
  // Краска машины остаётся четвёртым тоном и просвечивает между пятнами, поэтому камуфляж живёт на любом цвете.
  const tones=colors?.length?colors:[hexShade(fill,.75),fill,hexShade(fill,1.25)];
  let n=0;
  for(const [count,scale,tone] of [[16,.34,0],[22,.20,1],[30,.11,2],[16,.07,3]]){
   ctx.fillStyle=tones[tone%tones.length];
   for(let i=0;i<count;i++,n++){
    const cx=x0+hash(n,seed)*w,cy=y0+hash(seed*3+1,n)*h,rad=h*scale*(.6+hash(n,n+seed)*.8),steps=11;
    ctx.beginPath();
    for(let k=0;k<=steps;k++){const a=k/steps*Math.PI*2,rr=rad*(.5+.85*hash(n*7+k,seed)),x=cx+Math.cos(a)*rr*1.7,y=cy+Math.sin(a)*rr;k?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.closePath();ctx.fill();
   }
  }
 }
 else if(type==='speckle'){ctx.fillStyle=fill;/* крапинка кучками, как брызги, а не конфетти по всему борту */for(let c=0;c<9;c++){const cx=x0+hash(c,seed)*w,cy=y0+hash(seed,c*7)*h,rad=h*(.12+hash(c,c)*.18);for(let i=0;i<70;i++){const a=hash(i,c+seed)*Math.PI*2,rr=Math.sqrt(hash(c,i))*rad;const d=1+hash(i,a)*2.2;ctx.fillRect(cx+Math.cos(a)*rr*1.8,cy+Math.sin(a)*rr,d,d);}}}
 else if(type==='pixels'){for(let i=0;i<160;i++){const r=hash(i,seed),q=hash(seed+7,i);ctx.fillStyle=hash(i,i)>.5?fill:hexShade(fill,.5);const bw=w*.02*(1+Math.floor(hash(i,3)*4)),bh=h*.06;ctx.fillRect(x0+Math.floor(r*w/bw)*bw,y0+Math.floor(q*h/bh)*bh,bw-2,bh-2);}}
 else if(type==='circuit'){ctx.strokeStyle=fill;ctx.fillStyle=fill;ctx.lineWidth=Math.max(1.5,h*.008);for(let i=0;i<26;i++){let x=x0+hash(i,seed)*w,y=y0+hash(seed,i)*h;ctx.beginPath();ctx.moveTo(x,y);for(let k=0;k<4;k++){const dir=Math.floor(hash(i+k,seed*2)*4);const len=h*(.08+hash(k,i)*.22);if(dir===0)x+=len;else if(dir===1)x-=len;else if(dir===2)y+=len*.6;else{x+=len*.7;y-=len*.7;}ctx.lineTo(x,y);}ctx.stroke();ctx.beginPath();ctx.arc(x,y,h*.012,0,Math.PI*2);ctx.fill();}}
 ctx.restore();
}

// Рисуем один ряд. map: (u,v) → пиксели ряда; для левого борта u зеркалится, текст остаётся читаемым.
function paintRegion(ctx,ops,region,x0,y0,w,h,flip=false,seed=1){
 const X=u=>x0+(flip?1-u:u)*w,Y=v=>y0+(1-v)*h;
 // Заливка — цвет или градиент {grad:[c0,c1],axis:'u'|'v',dir} по габариту фигуры.
 const paintOf=(fill,pts)=>{if(typeof fill==='string')return fill;const us=pts.map(p=>p[0]),vs=pts.map(p=>p[1]);let a,b;if(fill.axis==='v'){a=[X((Math.min(...us)+Math.max(...us))/2),Y(Math.min(...vs))];b=[a[0],Y(Math.max(...vs))];}else{a=[X(Math.min(...us)),Y((Math.min(...vs)+Math.max(...vs))/2)];b=[X(Math.max(...us)),a[1]];}if((fill.dir??1)<0)[a,b]=[b,a];const gr=ctx.createLinearGradient(a[0],a[1],b[0],b[1]);gr.addColorStop(0,fill.grad[0]);gr.addColorStop(1,fill.grad[1]);return gr;};
 for(const op of ops){
  if(op.region!==region)continue;
  if(op.kind==='pattern'){pattern(ctx,op.type,op.fill,op.contrast,x0,y0,w,h,seed,op.colors,op.paint);continue;}
  if(op.kind==='rect'){const a=X(op.u0),b=X(op.u1),t=Y(op.v1),bt=Y(op.v0);ctx.fillStyle=paintOf(op.fill,[[op.u0,op.v0],[op.u1,op.v1]]);if(op.round){const r=Math.min(Math.abs(b-a),bt-t)*.18;ctx.beginPath();ctx.roundRect(Math.min(a,b),t,Math.abs(b-a),bt-t,r);ctx.fill();}else ctx.fillRect(Math.min(a,b),t,Math.abs(b-a),bt-t);continue;}
  if(op.kind==='poly'){ctx.fillStyle=paintOf(op.fill,op.points);ctx.beginPath();op.points.forEach(([u,v],i)=>i?ctx.lineTo(X(u),Y(v)):ctx.moveTo(X(u),Y(v)));ctx.closePath();ctx.fill();continue;}
  if(op.kind==='path'){ctx.strokeStyle=op.fill;ctx.fillStyle=op.fill;ctx.lineWidth=op.w*h;ctx.lineJoin='miter';ctx.lineCap='butt';ctx.beginPath();op.points.forEach(([u,v],i)=>i?ctx.lineTo(X(u),Y(v)):ctx.moveTo(X(u),Y(v)));ctx.stroke();if(op.dots){const r=op.w*h*1.6;for(const [u,v] of [op.points[0],op.points.at(-1)]){ctx.beginPath();ctx.arc(X(u),Y(v),r,0,Math.PI*2);ctx.fill();}}continue;}
  if(op.kind==='hatch'){const a=Math.min(X(op.u0),X(op.u1)),b=Math.max(X(op.u0),X(op.u1)),t=Y(op.v1),bt=Y(op.v0);ctx.save();ctx.beginPath();ctx.rect(a,t,b-a,bt-t);ctx.clip();ctx.strokeStyle=op.fill;ctx.lineWidth=Math.max(1.5,h*.006);const st=op.step*h;ctx.beginPath();for(let x=a-(bt-t);x<b+(bt-t);x+=st){ctx.moveTo(x,bt);ctx.lineTo(x+(bt-t),t);}ctx.stroke();ctx.restore();continue;}
  if(op.kind==='mark'){const s=op.size*h,cx=X(op.u),cy=Y(op.v);ctx.fillStyle=op.fill;/* метка 2×2 клетками, как на плате */ctx.fillRect(cx-s/2,cy-s/2,s/2,s/2);ctx.fillRect(cx,cy,s/2,s/2);ctx.strokeStyle=op.fill;ctx.lineWidth=Math.max(1,h*.004);ctx.strokeRect(cx-s/2,cy-s/2,s,s);continue;}
  if(op.kind==='emblem'){
   // Герб команды: щит с монограммой, три пера-крыла по бокам, корона сверху. Всё из простых многоугольников.
   const S=op.size*h,cx=X(op.u),cy=Y(op.v);ctx.save();ctx.translate(cx,cy);if(op.rotate)ctx.rotate(op.rotate*Math.PI/180);ctx.fillStyle=op.fill;
   const P=pts=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x*S,y*S):ctx.moveTo(x*S,y*S));ctx.closePath();ctx.fill();};
   P([[-.28,-.30],[.28,-.30],[.28,.10],[0,.42],[-.28,.10]]);
   for(const sgn of [-1,1])for(let i=0;i<3;i++){const x0=sgn*(.34+i*.16),y0=-.26+i*.12;P([[x0,y0],[x0+sgn*.13,y0-.12],[x0+sgn*.13,y0+.16],[x0,y0+.34]]);}
   P([[-.24,-.36],[-.14,-.56],[-.06,-.40],[0,-.62],[.06,-.40],[.14,-.56],[.24,-.36]]);
   ctx.fillStyle=op.ink;P([[-.22,-.25],[.22,-.25],[.22,.08],[0,.34],[-.22,.08]]);
   ctx.fillStyle=op.fill;ctx.font=`700 ${S*.34}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('ЧС',0,S*.02);
   ctx.restore();continue;}
  if(op.kind==='flag'){const sz=op.size*h,cx=X(op.u),cy=Y(op.v),cell=sz/3;/* клетчатый флажок 3×6 */for(let r=0;r<3;r++)for(let c=0;c<6;c++){ctx.fillStyle=(r+c)%2?op.fill:op.light;ctx.fillRect(cx-cell*3+c*cell,cy-cell*1.5+r*cell,cell,cell);}continue;}
  if(op.kind==='circle'){ctx.fillStyle=op.fill;ctx.beginPath();ctx.ellipse(X(op.u),Y(op.v),op.r*h*(w/h)*(h/w)*(op.rx||1)*(h/w)*(w/h)||op.r*h,op.r*h,0,0,Math.PI*2);ctx.fill();if(op.stroke){ctx.lineWidth=Math.max(2,h*.012);ctx.strokeStyle=op.stroke;ctx.stroke();}continue;}
  if(op.kind==='clear'){const a=X(op.u0),b=X(op.u1);ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';ctx.fillRect(Math.min(a,b),Y(op.v1),Math.abs(b-a),Y(op.v0)-Y(op.v1));ctx.restore();continue;}
  if(op.kind==='text'){
   const px=op.size*h,maxPx=(op.maxU??1)*w*.96;
   ctx.save();ctx.translate(X(op.u),Y(op.v));if(op.rotate)ctx.rotate(op.rotate*Math.PI/180);
   ctx.font=`${op.weight||700} ${px}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
   const measured=ctx.measureText(op.text).width*(op.stretch||1),k=Math.min(1,maxPx/Math.max(1,measured));
   ctx.transform(1,0,op.upright?0:SKEW,1,0,0);ctx.scale((op.stretch||1)*k,k);ctx.fillStyle=op.fill;ctx.fillText(op.text,0,0);
   if(op.outline){ctx.lineWidth=px*.06;ctx.strokeStyle=op.outline;ctx.lineJoin='round';ctx.strokeText(op.text,0,0);}
   ctx.restore();continue;}
 }
}

// Атласы считаны по хозяевам. Один атлас — 1024×1920×4: это 7.5 МБ в памяти и столько же на видеокарте.
// Раньше они копились без счёта — по одному на каждую пару «винил × краска», которую игрок хотя бы посмотрел,
// и перебор цветов в мастерской уводил телефон в перезагрузку. Ключ теперь не сам цвет кузова, а подпись
// раскладки: краска обычно меняет только выбор контрастных цветов, и десяток красок даёт одну картинку.
const atlases=new Map(),idle=[],IDLE_KEEP=2,previews=new Map(),PREVIEW_KEEP=64;
const fitKey=fit=>fit?.id||String(fit?.length||'');
const signature=value=>{const s=JSON.stringify(value);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
// Правый борт и левый: при sides:'invert' основной и акцентный цвета меняются местами.
const layoutSides=(spec,fit,paint)=>{const right=layoutLivery(spec,fit,paint);
 return {right,left:spec.sides==='invert'?layoutLivery({...spec,palette:{...spec.palette,main:spec.palette.accent,accent:spec.palette.main}},fit,paint):right};};
// Нулевой размер холста отдаёт память под картинку сразу; dispose() снимает копию с видеокарты.
function disposeAtlas(key){const e=atlases.get(key);if(!e)return;atlases.delete(key);e.texture?.dispose();e.texture=null;e.canvas.width=e.canvas.height=0;}
const trimIdle=()=>{while(idle.length>IDLE_KEEP)disposeAtlas(idle.shift());};
const unidle=key=>{const i=idle.indexOf(key);if(i>=0)idle.splice(i,1);};
// Шрифт приезжает позже первых плиток: когда приедет, перерисовываем всё, что нарисовано без него.
let fontWatched=false;
function watchFont(){
 if(fontWatched||typeof document==='undefined'||!document.fonts)return;
 try{if(document.fonts.check(`400 40px "Russo One"`))return;}catch{return;}
 fontWatched=true;
 const again=()=>{previews.clear();for(const e of atlases.values())e.redraw();};
 document.fonts.load('400 40px "Russo One"').then(again).catch(()=>{});
 document.fonts.ready.then(again).catch(()=>{});
}
function atlasFor(id,fit=DEFAULT_FIT,paint='#9d2730'){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;/* проверки в Node подменяют document без canvas */
 const spec=liveryById(id);if(!spec)return null;
 const sides=layoutSides(spec,fit,paint);
 const key=`${id}|${fitKey(fit)}|${signature([sides.right.ops,sides.left===sides.right?0:sides.left.ops])}`;
 const known=atlases.get(key);if(known)return known;
 const canvas=document.createElement('canvas');canvas.width=ATLAS_W;canvas.height=ATLAS_H;
 const draw=()=>{
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,ATLAS_W,ATLAS_H);
  paintRegion(ctx,sides.right.ops,'side',0,rowTop(ROW.sideR),ATLAS_W,ROW_H,false,1);
  paintRegion(ctx,sides.left.ops,'side',0,rowTop(ROW.sideL),ATLAS_W,ROW_H,true,1);
  paintRegion(ctx,sides.right.ops,'top',0,rowTop(ROW.top),ATLAS_W,ROW_H,false,2);
  paintRegion(ctx,sides.right.ops,'front',0,rowTop(ROW.ends),ATLAS_W/2,ROW_H,false,3);
  paintRegion(ctx,sides.right.ops,'rear',ATLAS_W/2,rowTop(ROW.ends),ATLAS_W/2,ROW_H,false,4);
  // Козырёк: полоса цвета ливреи с надписью, ряд целиком — это и есть козырёк.
  const banner=sides.right.ops.find(o=>o.kind==='banner');
  if(banner){const y0=rowTop(ROW.glass);ctx.fillStyle=banner.fill;ctx.fillRect(0,y0,ATLAS_W,ROW_H);ctx.fillStyle=banner.ink;ctx.font=`700 ${ROW_H*.58}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';const m=ctx.measureText(banner.text).width,k=Math.min(1,ATLAS_W*.74/m);ctx.save();ctx.translate(ATLAS_W/2,y0+ROW_H/2);ctx.scale(k,1);ctx.fillText(banner.text,0,0);ctx.restore();}
 };
 draw();watchFont();
 const entry={key,canvas,texture:null,uses:0,redraw(){draw();if(entry.texture)entry.texture.needsUpdate=true;}};
 atlases.set(key,entry);idle.push(key);trimIdle();return entry;
}
export const isLivery=id=>!!liveryById(id);
export const hasGlassBanner=id=>!!liveryById(id)?.glass?.banner;
// Хозяева атласа — машина в гараже, соперник в заезде, студия снимка. Пока хозяин есть, атлас не трогаем;
// когда последний отпустил, он ещё полежит про запас (быстрый возврат к прежнему цвету) и будет выброшен.
export function retainLivery(id,fit=DEFAULT_FIT,paint='#9d2730'){const e=atlasFor(id,fit,paint);if(!e)return null;e.uses++;unidle(e.key);return e.key;}
export function releaseLivery(key){const e=key?atlases.get(key):null;if(!e)return;if(--e.uses>0)return;e.uses=0;unidle(key);idle.push(key);trimIdle();}
export function liveryTexture(id,fit=DEFAULT_FIT,paint='#9d2730'){
 const entry=atlasFor(id,fit,paint);if(!entry)return null;
 if(!entry.texture){const t=new T.CanvasTexture(entry.canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.generateMipmaps=true;entry.texture=t;}
 return entry.texture;
}
// Сколько всего живёт в кеше — для проверок: атласов, из них без хозяев, готовых плиток и пикселей в холстах.
export const liveryCacheState=()=>({atlases:atlases.size,idle:idle.length,previews:previews.size,
 pixels:[...atlases.values()].reduce((n,e)=>n+e.canvas.width*e.canvas.height,0)+(sideCanvas?sideCanvas.width*sideCanvas.height:0)+(tileCanvas?tileCanvas.width*tileCanvas.height:0)});

// Плитка в тюнинге и магазине: правый борт на цвете краски, срезанный по силуэту кузова.
// Борт рисуется сразу в размер плитки на общем холсте — ради картинки 242×66 полный атлас не собираем.
const TILE_W=256,TILE_H=96,BOX=[8,22,242,66];
let tileCanvas=null,sideCanvas=null;
export function liveryPreview(id,paint='#7d1a26',fit=DEFAULT_FIT){
 if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
 const spec=liveryById(id);if(!spec)return null;
 const key=`${id}|${fitKey(fit)}|${paint}`;
 if(previews.has(key)){const hit=previews.get(key);previews.delete(key);previews.set(key,hit);return hit;/* свежие впереди */}
 watchFont();
 const [bx,by,bw,bh]=BOX;
 // Борт рисуем в том же разрешении, что раньше занимал ряд атласа (1024×384): крапинка и «цифра» на
 // фактурах заданы в пикселях, и в меньшем кадре они выходят крупнее, чем на кузове. Холст один на все плитки.
 if(!sideCanvas){sideCanvas=document.createElement('canvas');sideCanvas.width=ATLAS_W;sideCanvas.height=ROW_H;}
 const sctx=sideCanvas.getContext('2d');sctx.clearRect(0,0,sideCanvas.width,sideCanvas.height);
 paintRegion(sctx,layoutLivery(spec,fit,paint).ops,'side',0,0,sideCanvas.width,sideCanvas.height,false,1);
 if(!tileCanvas){tileCanvas=document.createElement('canvas');tileCanvas.width=TILE_W;tileCanvas.height=TILE_H;}
 const ctx=tileCanvas.getContext('2d');ctx.clearRect(0,0,TILE_W,TILE_H);
 ctx.fillStyle='#1b1d20';ctx.fillRect(0,0,TILE_W,TILE_H);
 // Силуэт хэтчбека: нос слева. Борт ложится от порога (y 84) до крыши (y 22).
 ctx.save();ctx.beginPath();ctx.moveTo(8,84);ctx.lineTo(8,60);ctx.lineTo(14,52);ctx.lineTo(80,48);ctx.lineTo(112,24);ctx.lineTo(196,22);ctx.lineTo(236,46);ctx.lineTo(250,56);ctx.lineTo(250,84);ctx.closePath();ctx.clip();
 ctx.fillStyle=paint;ctx.fillRect(0,0,TILE_W,TILE_H);
 ctx.drawImage(sideCanvas,0,0,sideCanvas.width,sideCanvas.height,bx,by,bw,bh);
 ctx.restore();
 ctx.fillStyle='#15171a';for(const x of [60,200]){ctx.beginPath();ctx.arc(x,80,15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#6a6e73';ctx.beginPath();ctx.arc(x,80,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#15171a';}
 ctx.fillStyle='#0d1a2a';ctx.beginPath();ctx.moveTo(90,48);ctx.lineTo(114,28);ctx.lineTo(150,28);ctx.lineTo(150,48);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(156,48);ctx.lineTo(156,28);ctx.lineTo(192,28);ctx.lineTo(226,48);ctx.closePath();ctx.fill();
 const url=`url(${tileCanvas.toDataURL('image/png')})`;
 previews.set(key,url);while(previews.size>PREVIEW_KEEP)previews.delete(previews.keys().next().value);
 return url;
}
