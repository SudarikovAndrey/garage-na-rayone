// Оживление портрета: дыхание, голова, плечи, руки, моргание, взгляд, губы, характер,
// плюс слой эффектов — дым сигареты, блики на металле, пузырь жвачки, пряди волос.
//
// Портрет НЕ режется на слои. Слои дают швы и дырки: стоит отвести голову — под ней пустота,
// потому что фон прозрачный и «за головой» ничего не нарисовано. Вместо этого картинка
// натягивается на сетку 64×64, и сетка гнётся в вершинном шейдере. Кожа тянется непрерывно,
// шея остаётся шеей.
//
// Части тела — это не слои, а области влияния (гауссовы пятна) на сетке: плечо, кисть,
// лицо. Каждое пятно двигается, вращается или раздувается по своему закону; там, где пятна
// перекрываются, движения складываются. Так рука может жить отдельно от груди без разреза.
//
// Моргание — тот же приём: кожа верхнего века съезжает вниз к линии ресниц и закрывает
// глазное яблоко. Физически так и работает живое веко.
//
// Текстура грузится с предумноженной альфой. Иначе при линейной фильтрации в край волос
// подмешивается цвет прозрачных пикселей (webp после сжатия хранит там мусор), и по контуру
// бежит мерцающая «волна», особенно заметная сверху, где волосы и кепки упираются в край.

const ND = 14; // слотов деформеров

const VS = `
precision highp float;
attribute vec2 aUV;

uniform vec2  uEye1, uEye2, uMouth, uPivot;
uniform float uEyeSpan, uHasEye2, uFu, uHeadY, uChestY;
uniform vec2  uEyeAxis;          // единичный вектор вдоль линии глаз (наклон головы)
uniform float uBlink1, uBlink2, uSway, uSwayX, uBob, uBreath, uTalk, uAmp;
uniform vec2  uGaze;
uniform mat3  uFit;
uniform vec4  uD[${ND}];   // центр (x,y) и радиусы (rx,ry); для пряди — корень и вектор к кончику
uniform vec4  uP[${ND}];   // тип, a, b, c

varying vec2 vUV;

float gauss(vec2 p, vec4 d){ vec2 q = (p - d.xy) / d.zw; return exp(-dot(q, q)); }

// Веко: всё, что выше линии ресниц и внутри глаза, съезжает к этой линии. У глаза вес 1
// (щель закрывается полностью), к брови вес падает до нуля — бровь стоит, кожа между ними
// сминается в складку.
vec2 lid(vec2 p, vec2 eye, float k, float d){
  if (k <= 0.0) return vec2(0.0);
  // В координатах глаза: u вдоль линии глаз, v — перпендикуляр вниз по лицу. У наклонённой
  // головы ресницы не горизонтальны, и горизонтальная зона у дальнего глаза задирается на бровь.
  vec2 r = p - eye; vec2 ax = uEyeAxis; vec2 dn = vec2(-ax.y, ax.x);
  float uu = dot(r, ax), vv = dot(r, dn);
  float wx = 1.0 - smoothstep(0.72, 1.06, abs(uu) / (0.30 * d));
  float dist = 0.085 * d - vv;             // выше линии ресниц — положительно
  if (dist <= 0.0 || wx <= 0.0) return vec2(0.0);
  // Зона сжатия кончается на 0.22 межглазья над ресницами: это верхнее веко и складка.
  // Бровь стоит на ~0.35 и выше — если зона до неё дотягивается, персонаж «моргает бровями».
  float wy = 1.0 - smoothstep(0.13 * d, 0.22 * d, dist);
  return dn * (k * wx * wy * dist);        // кожа съезжает вдоль лица, а не строго по экрану
}

// Зрачок: маленький диск в центре глаза едет в сторону взгляда.
vec2 iris(vec2 p, vec2 eye, float k, float d, vec2 gaze){
  float r = length(p - eye) / (0.145 * d);
  float w = (1.0 - smoothstep(0.5, 1.0, r)) * (1.0 - k);
  return gaze * 0.075 * d * w;
}

// Деформеры считаются от исходной точки и складываются: так их легко зеркалить в JS,
// чтобы эффекты (дым, блики) ехали вместе с сеткой.
vec2 deformers(vec2 p){
  vec2 acc = vec2(0.0);
  for (int i = 0; i < ${ND}; i++){
    vec4 d = uD[i], k = uP[i];
    if (k.x < 0.5) continue;
    if (k.x < 1.5){                       // 1 сдвиг
      acc += k.yz * gauss(p, d);
    } else if (k.x < 2.5){                // 2 поворот вокруг центра пятна
      float w = gauss(p, d) * k.y; vec2 r = p - d.xy;
      acc += vec2(r.x * cos(w) - r.y * sin(w), r.x * sin(w) + r.y * cos(w)) - r;
    } else if (k.x < 3.5){                // 3 раздувание
      acc += (p - d.xy) * k.y * gauss(p, d);
    } else {                              // 4 прядь: волна поперёк оси корень→кончик
      vec2 ax = d.zw; float L = max(1e-4, length(ax)); vec2 u = ax / L; vec2 r = p - d.xy;
      float s = dot(r, u) / L; float perp = dot(r, vec2(-u.y, u.x));
      float w = smoothstep(-0.1, 0.4, s) * (1.0 - smoothstep(1.0, 1.4, s)) * exp(-perp * perp / (k.w * k.w));
      acc += vec2(-u.y, u.x) * k.y * s * s * sin(k.z + s * 3.5) * w;
    }
  }
  return acc;
}

void main(){
  vUV = aUV;
  vec2 p = aUV;
  float fu = uFu, d = uEyeSpan, amp = uAmp;

  float head  = 1.0 - smoothstep(uHeadY, uHeadY + 1.7 * fu, p.y);
  float rise  = 1.0 - smoothstep(uPivot.y, 1.0, p.y);
  float cz = (p.y - uChestY) / (1.7 * fu);
  float chest = exp(-cz * cz);
  float floorFade = 1.0 - smoothstep(0.93, 1.0, p.y);

  vec2 acc = vec2(0.0);
  // Дыхание: всё выше низа шеи чуть поднимается, а грудина наполняется — пятно вокруг
  // центра груди идёт вверх. В стороны почти ничего: иначе вместо груди ходят воротник и плечи.
  vec2 sq = vec2((p.x - uPivot.x) / (1.7 * fu), (p.y - uChestY) / (1.3 * fu));
  float sternum = exp(-dot(sq, sq));
  acc.y -= uBreath * amp * floorFade * (0.006 * rise + 0.007 * sternum);
  acc.x += uBreath * 0.004 * amp * (p.x - uPivot.x) * chest * floorFade;

  acc += lid(p, uEye1, uBlink1, d) + iris(p, uEye1, uBlink1, d, uGaze);
  if (uHasEye2 > 0.5) acc += lid(p, uEye2, uBlink2, d) + iris(p, uEye2, uBlink2, d, uGaze);

  // Губы: вниз идёт только нижняя челюсть — от нижней губы до подбородка, с затуханием в шею.
  // Верхняя губа и нос стоят на месте, иначе кожа между носом и ртом тянется и лицо дёргается.
  // Затухание по горизонтали обязательно — иначе полоса сжимает плечи и волосы на всю ширину.
  float jaw = smoothstep(uMouth.y - 0.04 * fu, uMouth.y + 0.22 * fu, p.y)
            * (1.0 - smoothstep(uHeadY, uHeadY + 0.7 * fu, p.y));
  float jx = 1.0 - smoothstep(0.5 * d, 1.15 * d, abs(p.x - uMouth.x));
  acc.y += uTalk * 0.028 * fu * jaw * jx;

  acc += deformers(p) * amp;
  p += acc;

  // Покачивание: поворот вокруг низа шеи с весом головы — шея скручивается, а не ломается.
  float ang = uSway * head * amp;
  vec2 r = p - uPivot;
  p = uPivot + vec2(r.x * cos(ang) - r.y * sin(ang), r.x * sin(ang) + r.y * cos(ang));
  p.x += uSwayX * amp * head;
  p.y -= uBob * amp * head;

  vec3 q = uFit * vec3(p, 1.0);
  gl_Position = vec4(q.x * 2.0 - 1.0, 1.0 - q.y * 2.0, 0.0, 1.0);
}`;

const FS = `
precision highp float;
uniform sampler2D uTex;
varying vec2 vUV;
void main(){
  vec4 c = texture2D(uTex, vUV);   // уже предумноженная
  if (c.a < 0.003) discard;
  gl_FragColor = c;
}`;

const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
const smooth = v => (v = clamp01(v), v * v * (3 - 2 * v));
const lerp = (a, b, k) => a + (b - a) * k;

// Гладкий шум по каналам: у каждого движения свой канал и своя скорость, чтобы голова,
// плечи и руки никогда не качались в такт — синхронность выдаёт машину сильнее всего.
function makeNoise(seed = 1){
  const hash = (i, ch) => { const x = Math.sin(i * 127.1 + ch * 311.7 + seed * 74.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
  return (ch, t) => { const i = Math.floor(t), f = smooth(t - i); return lerp(hash(i, ch), hash(i + 1, ch), f); };
}

// Характеры. Множители к базовым амплитудам и скорости; спецповедение — флагами.
// breath: [период, глубина]; sway: [градусы, скорость]; blink: [мин, макс] секунд между морганиями.
export const PROFILES = {
  calm:     { breath: [4.4, 1.3], sway: [2.2, 1.0], nod: 1.6, turn: 1.6, shoulders: 1.5, arms: 1.2, blink: [2.6, 5.5], gaze: 1.1, speed: 1.0 },
  heavy:    { breath: [5.2, 2.0], sway: [1.8, 0.7], nod: 2.0, turn: 1.0, shoulders: 2.2, arms: 1.4, blink: [3.0, 6.5], gaze: 0.7, speed: 0.85, sigh: 0.14 },
  smug:     { breath: [4.8, 1.1], sway: [3.2, 0.8], nod: -2.0, turn: 2.0, shoulders: 1.4, arms: 1.0, blink: [3.0, 6.0], gaze: 0.9, speed: 0.8, slowBlink: true },
  fidgety:  { breath: [3.1, 0.9], sway: [1.8, 1.7], nod: 1.4, turn: 1.6, shoulders: 1.4, arms: 1.1, blink: [1.6, 4.0], gaze: 1.6, speed: 1.6, twitch: 0.35 },
  nervous:  { breath: [2.6, 1.1], sway: [1.3, 2.2], nod: 1.2, turn: 1.4, shoulders: 1.6, arms: 1.0, blink: [1.2, 3.2], gaze: 2.0, speed: 2.0, twitch: 0.7, hunch: 1 },
  old:      { breath: [5.6, 1.6], sway: [2.6, 0.6], nod: 2.8, turn: 1.0, shoulders: 1.6, arms: 1.2, blink: [2.6, 5.5], gaze: 0.8, speed: 0.7 },
  languid:  { breath: [5.0, 1.1], sway: [3.4, 0.6], nod: -1.6, turn: 2.2, shoulders: 1.5, arms: 1.3, blink: [3.0, 6.5], gaze: 1.0, speed: 0.75, slowBlink: true },
  menace:   { breath: [4.8, 2.1], sway: [1.6, 0.6], nod: 1.4, turn: 1.5, shoulders: 2.4, arms: 1.5, blink: [3.5, 7.5], gaze: 0.6, speed: 0.8 },
  coquette: { breath: [4.2, 1.2], sway: [3.0, 1.0], nod: 1.2, turn: 1.6, shoulders: 1.3, arms: 1.0, blink: [2.4, 5.5], gaze: 1.3, speed: 1.0, wink: 0.25, slowBlink: true },
  still:    { breath: [5.2, 0.7], sway: [0.5, 0.5], nod: 0.4, turn: 0.5, shoulders: 0.5, arms: 0.7, blink: [4.0, 9.0], gaze: 1.1, speed: 0.7 },
  bouncy:   { breath: [3.0, 1.2], sway: [2.4, 1.8], nod: 1.8, turn: 1.4, shoulders: 1.8, arms: 1.3, blink: [2.0, 4.5], gaze: 1.3, speed: 1.7, bob: 2.0 },
  laughing: { breath: [3.6, 1.3], sway: [2.0, 1.1], nod: -1.6, turn: 0.9, shoulders: 1.5, arms: 1.1, blink: [2.2, 5.0], gaze: 0.9, speed: 1.1, laugh: 0.5 },
};

// Рига хватает трёх точек; остальное — производные, чтобы не заполнять руками 14 раз.
export function resolveRig(r){
  const e1 = r.eye1, e2 = r.eye2 || null;
  const span = r.eyeSpan || (e2 ? Math.hypot(e2[0] - e1[0], e2[1] - e1[1]) : 0.10);
  const eyeY = e2 ? (e1[1] + e2[1]) / 2 : e1[1];
  const eyeX = e2 ? (e1[0] + e2[0]) / 2 : e1[0];
  const fu = Math.max(0.02, r.mouth[1] - eyeY);
  const headY = r.headY ?? r.mouth[1] + 1.15 * fu;
  const pivot = r.pivot || [r.neckX ?? eyeX, headY + 1.5 * fu];
  const shoulders = r.shoulders || [[pivot[0] - 2.6 * fu, headY + 1.5 * fu], [pivot[0] + 2.6 * fu, headY + 1.5 * fu]];
  // Наклон линии глаз: по двум глазам сам, по одному — из рига (eyeTilt, градусы, по часовой).
  const tilt = e2 ? Math.atan2(e2[1] - e1[1], e2[0] - e1[0]) : (r.eyeTilt || 0) * Math.PI / 180;
  return {
    eyeAxis: [Math.cos(tilt), Math.sin(tilt)],
    eye1: e1, eye2: e2, mouth: r.mouth, eyeSpan: span, fu, headY, pivot,
    // По горизонтали — между глазами и ртом: у повёрнутой головы нос и рот далеко от глаз,
    // и пятно, центрованное на глазах, тянет нос своим краем.
    face: r.face || [(eyeX + r.mouth[0]) / 2, eyeY + 0.55 * fu],
    chestY: r.chestY ?? headY + 3.2 * fu,
    shoulders, hands: r.hands || [], strands: r.strands || [], glints: r.glints || [],
    smoke: r.smoke || null, bubble: r.bubble || null, cut: r.cut || null,
    talk: r.talk !== false,
    profile: Object.assign({}, PROFILES[r.temper] || PROFILES.calm, r.profile || {}),
    temper: r.temper || 'calm',
  };
}

export function createLivePortrait(canvas, options = {}){
  const o = Object.assign({
    src: null, rig: null, grid: 64,
    amp: 1,                  // общий множитель: 0.6 — совсем тихо, 1.6 — мультяшно
    blink: true, gaze: true, effects: true,
    anchor: 'center',        // 'bottom' — фигура во всю ширину, прижата к нижнему краю (заставка в игре)
    respectReducedMotion: true, capture: false, seed: 1,
  }, options);
  // Без рига оживлять нечего — отдаём ту же картинку с одним тихим дыханием на CSS.
  if (!o.rig || !o.rig.eye1 || !o.rig.mouth) return cssFallback(canvas, o);

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true,
    preserveDrawingBuffer: !!o.capture });
  if (!gl) return cssFallback(canvas, o);

  const reduced = o.respectReducedMotion && matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const rig = resolveRig(o.rig);
  const P = rig.profile;
  const noise = makeNoise(o.seed + (o.rig.name || '').length);

  const prog = link(gl, VS, FS);
  gl.useProgram(prog);
  const u = {};
  for (const n of ['uEye1','uEye2','uMouth','uPivot','uEyeSpan','uHasEye2','uFu','uHeadY','uChestY','uEyeAxis',
    'uBlink1','uBlink2','uSway','uSwayX','uBob','uBreath','uTalk','uAmp','uGaze','uFit','uTex','uD','uP'])
    u[n] = gl.getUniformLocation(prog, n);

  const N = o.grid, verts = new Float32Array((N + 1) * (N + 1) * 2);
  for (let j = 0, k = 0; j <= N; j++) for (let i = 0; i <= N; i++){ verts[k++] = i / N; verts[k++] = j / N; }
  const idx = new Uint16Array(N * N * 6);
  for (let j = 0, k = 0; j < N; j++) for (let i = 0; i < N; i++){
    const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, e = c + 1;
    idx[k++] = a; idx[k++] = c; idx[k++] = b; idx[k++] = b; idx[k++] = c; idx[k++] = e;
  }
  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const ib = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
  const aUV = gl.getAttribLocation(prog, 'aUV');
  gl.enableVertexAttribArray(aUV);
  gl.vertexAttribPointer(aUV, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // предумноженная альфа
  gl.clearColor(0, 0, 0, 0);

  const makeTex = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  };
  const tex = makeTex();
  // Слой переднего плана: рука с предметом вырезана в отдельную текстуру (build-layers.py),
  // на теле под ней заплатка. Рука рисуется вторым проходом и ходит больше тела — так появляются планы.
  let cut = rig.cut, texHand = cut ? makeTex() : null;

  // Слой эффектов: дым и блики рисуются 2D-канвасом поверх, а их якоря едут вместе с сеткой.
  let fx = null, fg = null;
  if (o.effects && !o.capture){
    fx = document.createElement('canvas');
    fx.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
    fx.setAttribute('aria-hidden', 'true');
    canvas.after(fx); fg = fx.getContext('2d');
  }

  let imgAspect = 1, ready = false, fitM = { sx: 1, sy: 1, tx: 0, ty: 0 };
  const D = new Float32Array(ND * 4), PP = new Float32Array(ND * 4);
  const state = {
    t: 0, raf: 0, running: false, amp: reduced ? o.amp * 0.35 : o.amp,
    blink1: 0, blink2: 0, nextBlink: 0.45 + Math.random() * 0.5, blinkT: -1, blinkQueue: 0, blinkLen: 1, wink: false,
    gaze: [0, 0], gazeTo: [0, 0], gazeNext: 2, talk: 0, talkUntil: -1, pose: null,
    glance: 0, glanceTo: 0, glanceNext: 1.2 + Math.random() * 1.5,
    breathPhase: Math.random(), breathPeriod: P.breath[0], sigh: 0,
    twitch: [0, 0], twitchNext: 3, laugh: 0, laughNext: 2 + Math.random() * 4,
    bubble: 0, bubbleT: 0, crack: 0, crackNext: 4, smokeAcc: 0,
    smoke: [], glintT: rig.glints.map(() => 1 + Math.random() * 4), glints: [],
    cur: { breath: 0, sway: 0, swayX: 0, bob: 0 },
  };

  function fit(){
    const dpr = Math.min(devicePixelRatio || 1, 2.5);
    const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    if (fx){ fx.width = canvas.width; fx.height = canvas.height; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    // «contain» плюс воздух: на вдохе и при наклоне фигура выезжает за исходный кадр,
    // сверху запас больше — там кепки и волосы упираются в край картинки.
    const byHeight = (w / h) > imgAspect;
    const box = byHeight ? [imgAspect * h / w, 1] : [1, (w / h) / imgAspect];
    if (o.anchor === 'bottom'){
      // Низ кадра неподвижен (floorFade), поэтому фигуру можно поставить точно на край.
      // Если вписываем по высоте, оставляем сверху воздух под вдох и наклон.
      const s = byHeight ? 0.95 : 1, sx = box[0] * s, sy = box[1] * s;
      fitM = { sx, sy, tx: (1 - sx) / 2, ty: 1 - sy };
    } else {
      const s = 0.945, sx = box[0] * s, sy = box[1] * s;
      fitM = { sx, sy, tx: (1 - sx) / 2, ty: (1 - sy) / 2 + 0.022 };
    }
    gl.uniformMatrix3fv(u.uFit, false, new Float32Array([fitM.sx, 0, 0, 0, fitM.sy, 0, fitM.tx, fitM.ty, 1]));
  }

  function uploadRig(){
    gl.uniform2fv(u.uEye1, rig.eye1);
    gl.uniform2fv(u.uEye2, rig.eye2 || [0, 0]);
    gl.uniform1f(u.uHasEye2, rig.eye2 ? 1 : 0);
    gl.uniform2fv(u.uMouth, rig.mouth);
    gl.uniform2fv(u.uPivot, rig.pivot);
    gl.uniform1f(u.uEyeSpan, rig.eyeSpan);
    gl.uniform2fv(u.uEyeAxis, rig.eyeAxis);
    gl.uniform1f(u.uFu, rig.fu);
    gl.uniform1f(u.uHeadY, rig.headY);
    gl.uniform1f(u.uChestY, rig.chestY);
  }

  // ---- поведение -------------------------------------------------------------------
  function schedule(dt){
    const t = state.t, sp = P.speed;
    // Дыхание: своя фаза, вдох короче выдоха. Вздох — один цикл глубже и медленнее.
    const period = state.breathPeriod * (state.sigh > 0 ? 1.45 : 1);
    state.breathPhase += dt / period;
    if (state.breathPhase >= 1){
      state.breathPhase -= 1;
      state.sigh = (P.sigh && Math.random() < P.sigh) ? 1 : 0;
    }

    if (o.blink){
      state.nextBlink -= dt;
      if (state.blinkT < 0 && state.nextBlink <= 0){
        state.blinkT = 0;
        state.blinkQueue = Math.random() < 0.18 ? 1 : 0;
        state.blinkLen = P.slowBlink ? 1.55 : 1;
        state.wink = !!(P.wink && rig.eye2 && Math.random() < P.wink);
        if (state.wink) state.blinkLen = 3.2;
        state.nextBlink = P.blink[0] + Math.random() * (P.blink[1] - P.blink[0]);
      }
      if (state.blinkT >= 0){
        state.blinkT += dt;
        const L = state.blinkLen, close = 0.075 * L, hold = 0.045 * L, open = 0.145 * L, total = close + hold + open;
        const p = state.blinkT;
        const k = p < close ? smooth(p / close) : p < close + hold ? 1 : 1 - smooth((p - close - hold) / open);
        if (state.wink){ state.blink1 = 0; state.blink2 = clamp01(k); }
        else { state.blink1 = clamp01(k); state.blink2 = clamp01(p < close ? smooth((p - 0.012) / close) : k); }
        if (p > total){
          state.blinkT = -1; state.blink1 = state.blink2 = 0;
          if (state.blinkQueue){ state.blinkQueue = 0; state.nextBlink = 0.16; }
        }
      }
    }
    if (o.gaze){
      state.gazeNext -= dt * sp;
      if (state.gazeNext <= 0){
        state.gazeNext = 1.6 + Math.random() * 3.4;
        const far = Math.random() < 0.35 * P.gaze;
        state.gazeTo = far ? [(Math.random() * 2 - 1) * 0.9, (Math.random() * 2 - 1) * 0.5] : [0, 0];
      }
      // Во время взгляда в сторону зрачки уходят туда же, куда и голова.
      if (Math.abs(state.glanceTo) > 0) state.gazeTo = [state.glanceTo * 0.8, state.gazeTo[1] * 0.3];
      const k = 1 - Math.exp(-dt * 9 * sp);
      state.gaze[0] += (state.gazeTo[0] - state.gaze[0]) * k;
      state.gaze[1] += (state.gazeTo[1] - state.gaze[1]) * k;
    }
    // Речь: два несинхронных синуса дают неровное шевеление, похожее на слоги.
    // Сигнал без резких фронтов: два синуса складываются в «слоги» ~2,5 в секунду, а результат
    // ещё и сглаживается фильтром — челюсть не может дёрнуться быстрее, чем за ~60 мс.
    let target = 0;
    if (state.talkUntil > 0){
      const left = state.talkUntil - t;
      if (left <= 0) state.talkUntil = -1;
      const s = 0.5 + 0.5 * Math.sin(t * 15.5) * (0.6 + 0.4 * Math.sin(t * 6.1 + 1.7));
      target = s * clamp01(left * 3) * (left > 0 ? 1 : 0);
    }
    state.talk += (target - state.talk) * (1 - Math.exp(-dt * 16));

    // Взгляд в сторону: раз в несколько секунд голова, наклон и зрачки уходят вбок вместе,
    // задерживаются и возвращаются. Игра мобильная, курсора нет — живость должна быть своя.
    state.glanceNext -= dt * sp;
    if (state.glanceNext <= 0){
      if (state.glanceTo === 0){ state.glanceTo = (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5); state.glanceNext = 0.9 + Math.random() * 1.8; }
      else { state.glanceTo = 0; state.glanceNext = 3.5 + Math.random() * 5.5; }
    }
    state.glance += (state.glanceTo - state.glance) * (1 - Math.exp(-dt * 2.6));
    // Дёрганье: короткий импульс головы, быстро затухает. Шило и Ботан.
    if (P.twitch){
      state.twitchNext -= dt;
      if (state.twitchNext <= 0){
        state.twitchNext = 0.8 + Math.random() * 3.5 / P.twitch;
        state.twitch = [(Math.random() * 2 - 1) * P.twitch, (Math.random() - 0.3) * P.twitch];
      }
      const k = Math.exp(-dt * 7);
      state.twitch[0] *= k; state.twitch[1] *= k;
    }
    // Смех: приступами, плечи трясутся ~6 Гц под огибающей.
    if (P.laugh){
      state.laughNext -= dt;
      if (state.laughNext <= 0 && state.laugh <= 0){ state.laugh = 1.4 + Math.random() * 1.2; state.laughNext = 3 + Math.random() * 5; }
      if (state.laugh > 0) state.laugh -= dt;
    }
    // Пузырь жвачки: надувается медленно, сдувается быстрее, пауза — и снова.
    if (rig.bubble){
      state.bubbleT += dt;
      const cyc = 6.5, ph = state.bubbleT % cyc;
      state.bubble = ph < 3.2 ? smooth(ph / 3.2) : ph < 4.4 ? 1 - smooth((ph - 3.2) / 1.2) : 0;
    }
    // Хруст пальцами: редкое сжатие кистей.
    if (rig.hands.some(h => h.crack)){
      state.crackNext -= dt;
      if (state.crackNext <= 0){ state.crackNext = 5 + Math.random() * 6; state.crack = 1; }
      state.crack = Math.max(0, state.crack - dt * 1.6);
    }
  }

  // ---- вычисление позы -------------------------------------------------------------
  function slot(i, cx, cy, rx, ry, type, a = 0, b = 0, c = 0){
    D[i * 4] = cx; D[i * 4 + 1] = cy; D[i * 4 + 2] = rx; D[i * 4 + 3] = ry;
    PP[i * 4] = type; PP[i * 4 + 1] = a; PP[i * 4 + 2] = b; PP[i * 4 + 3] = c;
  }
  function pose(){
    const t = state.t, fu = rig.fu, sp = P.speed, Q = state.pose;
    const bp = state.breathPhase;
    let breath = bp < 0.38 ? smooth(bp / 0.38) : 1 - smooth((bp - 0.38) / 0.62);
    breath *= P.breath[1] * (state.sigh ? 1.35 : 1);
    const n = (ch, f) => noise(ch, t * f * sp);
    const swayDeg = P.sway[0] * (0.7 * n(1, 0.22 * P.sway[1]) + 0.3 * n(2, 0.41 * P.sway[1]))
                  + state.twitch[0] * 2.5 + state.glance * 1.6;
    const laugh = P.laugh && state.laugh > 0 ? Math.sin(t * 38) * smooth(state.laugh / 0.5) * P.laugh : 0;
    state.laughShake = laugh * 0.006;
    const cur = {
      breath: Q?.breath ?? breath,
      sway: Q ? (Q.sway ?? 0) * Math.PI / 180 : (reduced ? 0 : swayDeg * Math.PI / 180),
      swayX: reduced || Q ? 0 : 0.004 * n(3, 0.17),
      bob: reduced || Q ? 0 : (0.0022 * (P.bob || 1) * n(4, 0.5) + laugh * 0.004),
    };
    state.cur = cur;

    gl.uniform1f(u.uBlink1, Q?.blink ?? state.blink1);
    gl.uniform1f(u.uBlink2, Q?.blink ?? state.blink2);
    gl.uniform1f(u.uSway, cur.sway);
    gl.uniform1f(u.uSwayX, cur.swayX);
    gl.uniform1f(u.uBob, cur.bob);
    gl.uniform1f(u.uBreath, cur.breath);
    gl.uniform2fv(u.uGaze, Q?.gaze ?? state.gaze);
    gl.uniform1f(u.uTalk, (Q?.talk ?? state.talk) * (rig.talk ? 1 : 0));
    gl.uniform1f(u.uAmp, state.amp);

    // Деформеры частей тела. Всё в долях кадра, масштаб — лицевая единица fu.
    D.fill(0); PP.fill(0);
    if (Q){ gl.uniform4fv(u.uD, D); gl.uniform4fv(u.uP, PP); return; }   // замороженная поза — без частей тела
    let i = 0;
    const [fx0, fy0] = rig.face;
    // Голова: кивок (сдвиг лица по вертикали) и поворот (параллакс: лицо едет относительно контура).
    const nod = 0.0055 * P.nod * (0.7 * n(5, 0.3) + 0.3 * n(6, 0.9)) + state.twitch[1] * 0.006 + laugh * -0.004;
    const turn = 0.0055 * P.turn * (0.7 * n(7, 0.25) + 0.3 * n(8, 0.7)) + state.glance * 0.011;
    slot(i++, fx0, fy0, 2.4 * fu, 2.6 * fu, 1, turn, nod);
    // Плечи: каждое своим шумом, у нервных — вжаты и подёргиваются, у смеющегося — трясутся.
    const [sl, sr] = rig.shoulders;
    const shA = 0.007 * P.shoulders;
    const hunch = P.hunch ? -0.004 : 0;
    slot(i++, sl[0], sl[1], 2.2 * fu, 1.4 * fu, 1, 0.002 * n(11, 0.3), -shA * (0.5 + 0.5 * n(9, 0.35)) - cur.breath * 0.003 + hunch + laugh * 0.006);
    slot(i++, sr[0], sr[1], 2.2 * fu, 1.4 * fu, 1, -0.002 * n(12, 0.3), -shA * (0.5 + 0.5 * n(10, 0.33)) - cur.breath * 0.003 + hunch + laugh * 0.006);
    // Руки/низ торса: медленный перенос веса.
    slot(i++, rig.pivot[0], 0.80, 0.42, 0.14, 1, 0.004 * P.arms * n(13, 0.2), 0.003 * P.arms * n(14, 0.27) - cur.breath * 0.002);
    // Кисти. При срезе руки её пятна на теле не ставим: там заплатка, двигать нечего.
    for (const h of cut ? [] : rig.hands){
      if (i >= ND) break;
      const amp = h.amp ?? 1;
      if (h.wipe){         // трёт тряпкой: маленький круг
        slot(i++, h.at[0], h.at[1], h.r[0], h.r[1], 1, 0.004 * amp * Math.sin(t * 2.6), 0.003 * amp * Math.cos(t * 2.6));
      } else if (h.crack){ // сжимает кулак
        slot(i++, h.at[0], h.at[1], h.r[0], h.r[1], 3, -0.06 * amp * Math.sin(Math.PI * clamp01(state.crack)));
      } else if (h.rot){   // покачивает (бутылка, сигарета)
        slot(i++, h.at[0], h.at[1], h.r[0], h.r[1], 2, 0.04 * amp * n(20 + i, 0.4));
      } else {
        slot(i++, h.at[0], h.at[1], h.r[0], h.r[1], 1, 0.003 * amp * n(20 + i, 0.35), 0.004 * amp * n(30 + i, 0.3));
      }
    }
    // Пузырь жвачки.
    if (rig.bubble && i < ND){
      const b = rig.bubble;
      slot(i++, b[0], b[1], b[2] * 1.25, b[2] * 1.25, 3, 0.11 * state.bubble + 0.012 * Math.sin(t * 5) * state.bubble);
    }
    // Пряди.
    rig.strands.forEach((s, k) => {
      if (i >= ND) return;
      slot(i++, s.root[0], s.root[1], s.tip[0] - s.root[0], s.tip[1] - s.root[1], 4,
        (s.amp ?? 0.012), t * (s.speed ?? 1.3) + k * 1.7, s.width ?? 0.04);
    });
    gl.uniform4fv(u.uD, D); gl.uniform4fv(u.uP, PP);
    if (cut) handLayer(i, n, t);
  }

  // Слой руки: те же пятна тела (плечо, торс — рука к ним привязана) плюс своё движение
  // целиком: сдвиг, лёгкий поворот вокруг центра среза, дыхание масштабом «к камере».
  // Радиус пятен огромный, поэтому весь слой едет как одно целое.
  const HD = new Float32Array(ND * 4), HP = new Float32Array(ND * 4);
  const handX = { dx: 0, dy: 0, rot: 0, sc: 0 };
  function handLayer(i, n, t){
    HD.set(D); HP.set(PP);
    // Слоты 1 и 2 — плечи; из их вертикали убираем тряску смеха, иначе по руке идёт волна.
    if (state.laughShake){ HP[1 * 4 + 2] -= state.laughShake; HP[2 * 4 + 2] -= state.laughShake; }
    const c = cut, amp = c.amp ?? 1, wipe = rig.hands.some(h => h.wipe), crack = rig.hands.some(h => h.crack);
    handX.dx = 0.009 * amp * n(40, 0.3) + (wipe ? 0.005 * Math.sin(t * 2.6) : 0);
    handX.dy = 0.007 * amp * n(41, 0.27) - state.cur.breath * 0.0035 + (wipe ? 0.004 * Math.cos(t * 2.6) : 0);
    handX.rot = (0.035 * amp * n(42, 0.32)) * (rig.hands.some(h => h.rot) ? 1.6 : 1);
    handX.sc = 0.010 * amp * n(43, 0.22) + (crack ? -0.05 * Math.sin(Math.PI * clamp01(state.crack)) : 0);
    const put = (k, type, a2, b2) => { HD[k * 4] = c.c[0]; HD[k * 4 + 1] = c.c[1]; HD[k * 4 + 2] = 10; HD[k * 4 + 3] = 10; HP[k * 4] = type; HP[k * 4 + 1] = a2; HP[k * 4 + 2] = b2; };
    if (i <= ND - 3){ put(i++, 1, handX.dx, handX.dy); put(i++, 2, handX.rot, 0); put(i++, 3, handX.sc, 0); }
  }
  // Внутри среза? Нужно, чтобы дым и блики на руке ехали вместе с её слоем.
  function inCut(x, y){
    if (!cut) return false;
    const rot = (cut.rot || 0) * Math.PI / 180, dx = x - cut.c[0], dy = y - cut.c[1];
    const uu = (dx * Math.cos(rot) + dy * Math.sin(rot)) / cut.r[0], vv = (-dx * Math.sin(rot) + dy * Math.cos(rot)) / cut.r[1];
    return Math.hypot(uu, vv) < 1.1;
  }

  // Зеркало базовой деформации для якорей эффектов (пряди и веки не учитываем — они локальные).
  function warp(x, y){
    const fu = rig.fu, amp = state.amp, c = state.cur;
    const head = 1 - smooth((y - rig.headY) / (1.7 * fu));
    const rise = 1 - smooth((y - rig.pivot[1]) / (1 - rig.pivot[1]));
    const cz = (y - rig.chestY) / (1.7 * fu), chest = Math.exp(-cz * cz);
    const ff = 1 - smooth((y - 0.93) / 0.07);
    let ax = c.breath * 0.020 * amp * (x - rig.pivot[0]) * chest * ff;
    let ay = -c.breath * 0.0095 * amp * rise * ff;
    for (let i = 0; i < ND; i++){
      const ty = PP[i * 4]; if (ty < 0.5 || ty > 3.5) continue;
      const cx = D[i * 4], cy = D[i * 4 + 1], rx = D[i * 4 + 2], ry = D[i * 4 + 3];
      const qx = (x - cx) / rx, qy = (y - cy) / ry, w = Math.exp(-(qx * qx + qy * qy));
      if (ty < 1.5){ ax += PP[i * 4 + 1] * w * amp; ay += PP[i * 4 + 2] * w * amp; }
      else if (ty < 2.5){ const a = PP[i * 4 + 1] * w * amp, rx2 = x - cx, ry2 = y - cy;
        ax += rx2 * Math.cos(a) - ry2 * Math.sin(a) - rx2; ay += rx2 * Math.sin(a) + ry2 * Math.cos(a) - ry2; }
      else { ax += (x - cx) * PP[i * 4 + 1] * w * amp; ay += (y - cy) * PP[i * 4 + 1] * w * amp; }
    }
    if (inCut(x, y)){
      const a = handX.rot * amp, rx0 = x - cut.c[0], ry0 = y - cut.c[1];
      ax += handX.dx * amp + rx0 * Math.cos(a) - ry0 * Math.sin(a) - rx0 + rx0 * handX.sc * amp;
      ay += handX.dy * amp + rx0 * Math.sin(a) + ry0 * Math.cos(a) - ry0 + ry0 * handX.sc * amp;
    }
    let px = x + ax, py = y + ay;
    const ang = c.sway * head * amp, rx = px - rig.pivot[0], ry = py - rig.pivot[1];
    px = rig.pivot[0] + rx * Math.cos(ang) - ry * Math.sin(ang);
    py = rig.pivot[1] + rx * Math.sin(ang) + ry * Math.cos(ang);
    px += c.swayX * amp * head; py -= c.bob * amp * head;
    return [fitM.sx * px + fitM.tx, fitM.sy * py + fitM.ty];
  }

  // ---- эффекты ---------------------------------------------------------------------
  function effects(dt){
    if (!fg) return;
    const W = fx.width, H = fx.height;
    fg.clearRect(0, 0, W, H);
    // Дым: частицы рождаются на кончике сигареты, поднимаются, расплываются и тают.
    if (rig.smoke && !reduced){
      const [sx, sy] = warp(rig.smoke[0], rig.smoke[1]);
      state.smokeAcc += dt * 7;
      while (state.smokeAcc > 1 && state.smoke.length < 90){
        state.smokeAcc -= 1;
        state.smoke.push({ x: sx, y: sy, age: 0, life: 2.6 + Math.random() * 1.6, ph: Math.random() * 6.28,
          vx: (Math.random() - 0.5) * 0.01, r: 0.004 + Math.random() * 0.003 });
      }
      const wind = state.cur.sway * 0.4;
      fg.globalCompositeOperation = 'source-over';
      for (let k = state.smoke.length - 1; k >= 0; k--){
        const s = state.smoke[k]; s.age += dt;
        if (s.age > s.life){ state.smoke.splice(k, 1); continue; }
        const a = s.age / s.life;
        s.y -= dt * (0.055 + 0.03 * a); s.x += dt * (s.vx + wind * 0.03 + Math.sin(s.age * 2.1 + s.ph) * 0.012 * a);
        const rad = (s.r + a * 0.032) * W, alpha = 0.16 * Math.sin(Math.PI * Math.min(1, a * 1.15)) * (1 - a * 0.4);
        const g = fg.createRadialGradient(s.x * W, s.y * H, 0, s.x * W, s.y * H, rad);
        g.addColorStop(0, `rgba(215,215,225,${alpha})`); g.addColorStop(1, 'rgba(215,215,225,0)');
        fg.fillStyle = g; fg.beginPath(); fg.arc(s.x * W, s.y * H, rad, 0, 6.2832); fg.fill();
      }
    }
    // Блики: четырёхлучевая звёздочка вспыхивает на металле и гаснет.
    if (rig.glints.length){
      fg.globalCompositeOperation = 'lighter';
      rig.glints.forEach((gp, k) => {
        state.glintT[k] -= dt;
        if (state.glintT[k] <= 0){ state.glintT[k] = 2.5 + Math.random() * 5; state.glints.push({ k, age: 0 }); }
      });
      for (let k = state.glints.length - 1; k >= 0; k--){
        const gl2 = state.glints[k]; gl2.age += dt;
        const dur = 0.7; if (gl2.age > dur){ state.glints.splice(k, 1); continue; }
        const gp = rig.glints[gl2.k], [x, y] = warp(gp[0], gp[1]);
        const a = gl2.age / dur, e = Math.sin(Math.PI * a), size = (gp[2] ?? 1) * 0.028 * W * e;
        fg.save(); fg.translate(x * W, y * H); fg.rotate(0.35 + a * 0.6);
        const core = fg.createRadialGradient(0, 0, 0, 0, 0, size * 0.55);
        core.addColorStop(0, `rgba(255,250,235,${0.85 * e})`); core.addColorStop(1, 'rgba(255,250,235,0)');
        fg.fillStyle = core; fg.beginPath(); fg.arc(0, 0, size * 0.55, 0, 6.2832); fg.fill();
        fg.strokeStyle = `rgba(255,248,225,${0.75 * e})`; fg.lineCap = 'round';
        for (let r = 0; r < 2; r++){
          fg.lineWidth = Math.max(1, size * 0.07); fg.beginPath();
          fg.moveTo(-size, 0); fg.lineTo(size, 0); fg.moveTo(0, -size * 0.7); fg.lineTo(0, size * 0.7); fg.stroke();
          fg.rotate(Math.PI / 4); fg.lineWidth = Math.max(1, size * 0.045);
        }
        fg.restore();
      }
      fg.globalCompositeOperation = 'source-over';
    }
  }

  function draw(){
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (!ready) return;
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.uTex, 0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    if (cut && texHand && !state.pose){
      gl.uniform4fv(u.uD, HD); gl.uniform4fv(u.uP, HP);
      gl.bindTexture(gl.TEXTURE_2D, texHand);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      gl.uniform4fv(u.uD, D); gl.uniform4fv(u.uP, PP);
    } else if (cut && texHand){
      // Замороженная поза (контрольный лист): рука рисуется без собственного движения.
      gl.bindTexture(gl.TEXTURE_2D, texHand);
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
    }
  }

  let last = 0;
  function frame(now){
    if (!state.running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now; state.t += dt;
    schedule(dt); pose(); draw(); effects(dt);
    state.raf = requestAnimationFrame(frame);
  }

  const api = {
    get element(){ return canvas; },
    start(){ if (state.running || state.dead) return api; state.running = true; last = 0; state.raf = requestAnimationFrame(frame); return api; },
    stop(){ state.running = false; cancelAnimationFrame(state.raf); return api; },
    // Реплика: губы шевелятся, пока идёт строка.
    say(seconds = 1.4){ state.talkUntil = state.t + seconds; return api; },
    blink(){ if (state.blinkT < 0){ state.blinkT = 0; state.wink = false; state.blinkLen = P.slowBlink ? 1.55 : 1; } return api; },
    laugh(){ state.laugh = 1.8; return api; },
    setAmp(v){ state.amp = reduced ? v * 0.35 : v; return api; },
    // pose({blink,breath,sway,talk,gaze}) замораживает состояние; pose(null) отпускает.
    pose(p){ state.pose = p; return api; },
    mapUV(uu, vv){ return [fitM.sx * uu + fitM.tx, fitM.sy * vv + fitM.ty]; },
    unmapUV(x, y){ return [(x - fitM.tx) / fitM.sx, (y - fitM.ty) / fitM.sy]; },
    warp,
    render(){ pose(); draw(); return api; },
    resize: fit, rig, profile: P,
    destroy(){ state.dead = true; api.stop(); fx?.remove(); removeEventListener('resize', fit); document.removeEventListener('visibilitychange', onVis); },
    async load(src){
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      const upload = (t, img) => { gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); };
      let img;
      if (cut){
        // Слои лежат рядом с базовой картинкой: b14.webp → b14-body.webp + b14-hand.webp.
        // Нет слоёв — рисуем одной картинкой, без планов, но без дырок.
        try {
          const [body, hand] = await Promise.all([loadImage(src.replace(/(\.[a-z0-9]+)$/i, '-body$1')), loadImage(src.replace(/(\.[a-z0-9]+)$/i, '-hand$1'))]);
          img = body; upload(texHand, hand);
        } catch { cut = null; img = await loadImage(src); }
      } else img = await loadImage(src);
      imgAspect = img.naturalWidth / img.naturalHeight;
      upload(tex, img);
      ready = true; fit(); return api;
    },
  };

  const onVis = () => document.hidden ? api.stop() : api.start();
  uploadRig(); fit();
  addEventListener('resize', fit);
  document.addEventListener('visibilitychange', onVis);
  if (o.src) api.load(o.src);
  return api;
}

function link(gl, vs, fs){
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}

const loadImage = src => new Promise((res, rej) => {
  const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => res(im); im.onerror = rej; im.src = src;
});

// Без WebGL портрет не должен пропадать: та же картинка и одно тихое дыхание на CSS.
function cssFallback(canvas, o){
  const img = document.createElement('img');
  img.src = o.src; img.alt = ''; img.decoding = 'async';
  img.style.cssText = 'display:block;width:100%;height:100%;object-fit:contain;object-position:' +
    (o.anchor === 'bottom' ? 'bottom center' : 'center') + ';transform-origin:50% 92%;animation:lp-breath 4.2s ease-in-out infinite';
  if (!document.getElementById('lp-css')){
    const st = document.createElement('style'); st.id = 'lp-css';
    st.textContent = '@keyframes lp-breath{0%,100%{transform:scale(1)}50%{transform:scale(1.012)}}' +
      '@media(prefers-reduced-motion:reduce){@keyframes lp-breath{0%,100%{transform:none}}}';
    document.head.append(st);
  }
  canvas.replaceWith(img);
  const api = { element: img, start: () => api, stop: () => api, say: () => api, blink: () => api, laugh: () => api,
    setAmp: () => api, pose: () => api, resize: () => {}, load: async () => api,
    destroy(){ img.remove(); }, fallback: true };
  return api;
}
