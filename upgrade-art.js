// Картинки уникальных апгрейдов: та же роль, что фото деталей на карточках,
// только рисованные — деталь можно сфотографировать, турбину в этом гараже пока нет.
// Линии тем же пером, что и пиктограммы категорий (part-icons.js), поэтому карточки не выбиваются.
const art={
 turbo:'<circle cx="18" cy="26" r="11"/><circle cx="18" cy="26" r="4"/>'+
  '<path d="M18 15v7M27 22l-6 3.2M25 34.5l-5-5M11 34.5l5-5M9 22l6 3.2"/>'+
  '<path d="M29 26h7l5-5v12l-5-5h-7M18 15V7h9"/>',
 exhaust:'<rect x="9" y="14" width="23" height="16" rx="6"/><path d="M15 14v16M26 14v16"/>'+
  '<path d="M2 22h7M32 22h6"/><ellipse cx="41" cy="22" rx="3" ry="5"/>'+
  '<path d="M45 12c3.4-1.2 3.4 3.6 0 2.4M45 32c3.4 1.2 3.4-3.6 0-2.4"/>',
 ecu:'<rect x="11" y="11" width="26" height="21" rx="3"/><path d="M11 17H4M11 22H4M11 27H4M37 17h7M37 22h7M37 27h7"/>'+
  '<path d="m15 27 4.5-9 4 7 4-11 5 13"/>',
 cams:'<path d="M3 22h42"/><ellipse cx="13" cy="22" rx="4.5" ry="9" transform="rotate(-18 13 22)"/>'+
  '<ellipse cx="25" cy="22" rx="4.5" ry="9"/><ellipse cx="37" cy="22" rx="4.5" ry="9" transform="rotate(18 37 22)"/>'+
  '<circle cx="25" cy="22" r="2"/>',
 air:'<path d="M12 5h24M12 39h24M24 1v4M24 39v4"/>'+
  '<path d="M17 5v4l-5 3.2 5 3.4-5 3.4 5 3.4-5 3.4 5 3.2v4"/>'+
  '<path d="M31 5v4l5 3.2-5 3.4 5 3.4-5 3.4 5 3.4-5 3.2v4"/>',
 nitro:'<rect x="14" y="10" width="20" height="30" rx="9"/><path d="M20 10.5V6h8v4.5M24 6V2M20 3h8"/>'+
  '<path d="M14 21h20M14 30h20"/><path d="M28 3c9 .6 10 6.4 15 8.4"/>',
};
export function upgradeArt(id){
 return `<svg class="part-art upgrade-art" viewBox="0 0 48 44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${art[id]||art.turbo}</svg>`;
}
