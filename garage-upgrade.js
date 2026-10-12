// Апгрейд гаража — событие, а не тихая подмена декораций. От машины наружу идёт волна энергии,
// на её гребне гараж перестраивается, свет бьёт ярче и камера коротко подаётся вперёд.
//
// Материалы и камеру сцены модуль не трогает: волна — два собственных аддитивных объекта,
// которые живут только на время кадра и снимаются в конце. Сцену гаража игра пересобирает
// целиком, поэтому объекты каждый кадр переподключаются к текущей сцене.
import {RARITIES} from './progression.js';

export const WAVE = {duration: 1300, swapAt: .42, radius: 19, reduced: 420};

// Что открыл новый уровень — строками, понятными без таблиц. Показываем только то, что изменилось.
export function garageUpgradeLines(prev, next) {
 if (!next) return [];
 const lines = [];
 if (next.rankCap > (prev?.rankCap ?? 0)) lines.push(`Ранг деталей до ${next.rankCap}`);
 const kit = RARITIES[Math.max(0, Math.min(3, next.level - 1))];
 const kitBefore = prev ? RARITIES[Math.max(0, Math.min(3, prev.level - 1))] : null;
 if (kit && kit !== kitBefore) lines.push(`Обвес до ${kit.name.toLowerCase()}`);
 if (next.carSlots > (prev?.carSlots ?? 0)) lines.push(`Мест для машин: ${next.carSlots}`);
 return lines;
}

export function bindGarageUpgrade({THREE, getScene, markDirty, punch, sfx, haptics, reducedMotion = false} = {}) {
 if (!THREE || typeof getScene !== 'function') return {run: async ({swap} = {}) => (await swap?.(), false)};

 let ring = null, dome = null, ringMat = null, domeMat = null, host = null;

 function build() {
  // Кольцо по полу — сама волна. Купол — её объём, чтобы свет читался и на стенах.
  ringMat = new THREE.MeshBasicMaterial({color: 0xffd58a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false});
  domeMat = new THREE.MeshBasicMaterial({color: 0x8fd7ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false});
  ring = new THREE.Mesh(new THREE.RingGeometry(.82, 1, 96), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = .06;
  ring.renderOrder = 900;
  dome = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.renderOrder = 899;
  for (const mesh of [ring, dome]) mesh.frustumCulled = false;
 }

 // Сцену игра пересобирает на месте, поэтому каждый кадр проверяем, туда ли мы всё ещё подключены.
 function attach() {
  const scene = getScene();
  if (!scene || host === scene) return;
  host?.remove?.(ring, dome);
  scene.add(ring, dome);
  host = scene;
 }

 function detach() {
  host?.remove?.(ring, dome);
  host = null;
  ring?.geometry.dispose(); dome?.geometry.dispose();
  ringMat?.dispose(); domeMat?.dispose();
  ring = dome = ringMat = domeMat = null;
 }

 // Волна: радиус растёт с замедлением, яркость вспыхивает и гаснет к краю.
 function setPhase(t) {
  const eased = 1 - Math.pow(1 - t, 2.2);
  const radius = Math.max(.35, eased * WAVE.radius);
  const fade = Math.sin(Math.min(1, t) * Math.PI);
  ring.scale.setScalar(radius);
  dome.scale.set(radius, radius * .62, radius);
  ringMat.opacity = fade * 1;
  domeMat.opacity = fade * .34;
 }

 async function run({swap} = {}) {
  if (reducedMotion) {
   // Без движения: перестраиваем сразу, но событие всё равно отмечаем светом и звуком.
   sfx?.('upgrade'); haptics?.('win');
   await swap?.();
   markDirty?.();
   return true;
  }
  build();
  attach();
  setPhase(0);
  sfx?.('upgrade');
  haptics?.('win');
  let swapped = false;
  const started = performance.now();
  await new Promise(resolve => {
   const step = async () => {
    const t = Math.min(1, (performance.now() - started) / WAVE.duration);
    attach();
    setPhase(t);
    markDirty?.();
    if (!swapped && t >= WAVE.swapAt) {
     swapped = true;
     // Гребень волны: гараж меняется именно здесь, поэтому кажется, что его перестроила она.
     punch?.();
     await swap?.();
     attach();
     markDirty?.();
    }
    if (t >= 1) return resolve();
    requestAnimationFrame(step);
   };
   requestAnimationFrame(step);
  });
  if (!swapped) await swap?.();
  detach();
  markDirty?.();
  return true;
 }

 return {run, lines: garageUpgradeLines};
}
