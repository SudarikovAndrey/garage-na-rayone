// Пиктограммы слотов. Рисуем контуром, но плотно: на телефоне иконка живёт в плашке 48 px, и
// тонкая линия с мелкими деталями там мылится — протектор шины и зубцы КПП сливались в кашу.
// Силуэты остались прежними (их узнают), убрана мелочь и поднят штрих; размер и цвет задаёт CSS.
const shapes={
 engine:'<path d="M12 12h7V8h13v4h7v6h5v12h-7l-4 5H17l-5-5H7V18h5z"/><path d="M23 4h6M26 4v4"/><path d="m27 17-5 8h7l-4 6"/>',
 tires:'<ellipse cx="24" cy="21" rx="12" ry="16"/><ellipse cx="24" cy="21" rx="5" ry="8"/><path d="M21 5h-5C4 5 4 37 16 37h5"/>',
 gearbox:'<path d="M9 13h19l7 6v11l-7 6H9z"/><path d="M35 22h8v5h-8"/><path d="M22 13v23M25 13V5h8"/>',
 spoiler:'<path d="m5 11 38-3 1 8-38 3z"/><path d="M14 19v11M34 17v11M9 33l26-3"/>',
 bumpers:'<path d="m6 11 5-5h26l5 5v9l-7 4H13l-7-4z"/><path d="M14 14h20"/><path d="M6 33l5-4h26l5 4v4H6z"/>',
 skirts:'<path d="m4 13 35-6 4 7-35 7z"/><path d="M8 21v-4l30-5"/><path d="m8 32 30-5"/>',
 fenders:'<path d="M5 34v-9C5 3 43 3 43 25v9h-8v-9c0-15-22-15-22 0v9z"/><circle cx="24" cy="30" r="5"/>',
 // Вкладка уникальных апгрейдов: турбина как самый узнаваемый из них.
 upgrades:'<circle cx="22" cy="23" r="11"/><circle cx="22" cy="23" r="4"/><path d="M22 12v7M31 19l-6 3M29 31l-5-4M15 31l5-4M13 19l6 3"/><path d="M33 23h8"/>',
 rims:'<circle cx="24" cy="21" r="17"/><circle cx="24" cy="21" r="4"/><path d="M24 4v13M39 15l-11 4M35 35l-8-10M13 35l8-10M9 15l11 4"/>',
};
// Размер 30 px и штрих 3.2 выбраны по странице подбора dist/dev/icon-probe.html: тоньше —
// иконка бледнеет на тёмном, толще — шина заплывает и теряет обод.
export function partIcon(slot){return `<svg class="part-icon" viewBox="0 0 48 44" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[slot]||shapes.engine}</svg>`;}
