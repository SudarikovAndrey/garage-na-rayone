// Параллакс заставки перед заездом: фон, частицы и портрет чуть смещаются за наклоном телефона.
//
// Источник — гироскоп (deviceorientation): gamma даёт наклон влево-вправо, beta — вперёд-назад.
// Нулевая точка калибруется по первому показанию, потому что телефон в руках почти никогда не
// стоит вертикально. На столе без гироскопа работает курсор, а если ни того ни другого нет —
// медленный самостоятельный дрейф, чтобы кадр не был мёртвым.
//
// Результат — две CSS-переменные на корне заставки, --par-x и --par-y в диапазоне −1…1.
// Сколько пикселей это даёт каждому слою, решает CSS: фон меньше всех, портрет больше всех,
// плашки с текстом не двигаются вовсе.
//
// iOS отдаёт ориентацию только после requestPermission из жеста пользователя, поэтому запрос
// висит на первом касании заставки; без разрешения остаётся дрейф.
export function attachParallax(root, {reach = 1} = {}){
 if (!root) return () => {};
 const reduced = matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 let tx = 0, ty = 0, x = 0, y = 0, base = null, gotSensor = false, gotPointer = false, raf = 0, alive = true, t0 = performance.now();
 const clamp = v => v < -1 ? -1 : v > 1 ? 1 : v;

 const onOrient = e => {
  if (e.gamma == null || e.beta == null) return;
  if (!base) base = { g: e.gamma, b: e.beta };
  gotSensor = true;
  tx = clamp((e.gamma - base.g) / 22) * reach;
  ty = clamp((e.beta - base.b) / 22) * reach;
 };
 const onPointer = e => {
  if (gotSensor) return;
  gotPointer = true;
  const r = root.getBoundingClientRect();
  tx = clamp(((e.clientX - r.left) / r.width - .5) * 2) * reach;
  ty = clamp(((e.clientY - r.top) / r.height - .5) * 2) * reach;
 };
 const askPermission = () => {
  const D = globalThis.DeviceOrientationEvent;
  if (D?.requestPermission) D.requestPermission().catch(() => {});
  root.removeEventListener('pointerdown', askPermission, true);
 };

 if (!reduced){
  addEventListener('deviceorientation', onOrient);
  root.addEventListener('pointermove', onPointer);
  root.addEventListener('pointerdown', askPermission, true);
 }

 const tick = now => {
  if (!alive) return;
  if (!gotSensor && !gotPointer && !reduced){
   // Дрейф: две несоизмеримые частоты, чтобы не читалось как маятник.
   const t = (now - t0) / 1000;
   tx = (Math.sin(t * .31) * .6 + Math.sin(t * .53 + 1.2) * .4) * .35 * reach;
   ty = (Math.sin(t * .23 + .7) * .6 + Math.sin(t * .41) * .4) * .25 * reach;
  }
  // Сглаживание: сенсор шумит, а резкий скачок фона читается как дёрганье.
  x += (tx - x) * .08; y += (ty - y) * .08;
  root.style.setProperty('--par-x', x.toFixed(3));
  root.style.setProperty('--par-y', y.toFixed(3));
  raf = requestAnimationFrame(tick);
 };
 raf = requestAnimationFrame(tick);

 return () => {
  alive = false; cancelAnimationFrame(raf);
  removeEventListener('deviceorientation', onOrient);
  root.removeEventListener('pointermove', onPointer);
  root.removeEventListener('pointerdown', askPermission, true);
  root.style.removeProperty('--par-x'); root.style.removeProperty('--par-y');
 };
}

// Лицо не должно оказаться под облаком с репликой. Кадры портретов разные: у одного голова у
// верхнего края картинки, у другого ниже, поэтому «опустить всех на столько-то» не работает.
// Здесь считаем, где лицо окажется на экране (движок знает точку глаз), и опускаем слой ровно
// настолько, чтобы лоб прошёл под облаком. Сдвиг ограничен: иначе на низком экране фигура уедет.
export function keepFaceClear(lp, box, ref, {gap = 10, limit = 0.22} = {}){
 if (!lp?.mapUV || !box || !ref) return;
 const r = lp.rig;
 if (!r?.eye1) return;
 const faceTop = r.eye1[1] - 1.5 * r.fu;              // лоб: выше глаз на полтора лицевых шага
 const [, v] = lp.mapUV(r.eye1[0], faceTop);          // доля высоты канваса
 const rect = box.getBoundingClientRect();
 if (!rect.height) return;
 const need = ref.getBoundingClientRect().bottom + gap - (rect.top + v * rect.height);
 const shift = Math.max(0, Math.min(need, rect.height * limit));
 box.style.setProperty('--face-shift', shift.toFixed(1) + 'px');
}
