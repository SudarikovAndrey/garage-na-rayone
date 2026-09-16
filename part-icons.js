// Shared pictograms for part categories; labels remain available to touch hints and screen readers.
const shapes={
 engine:'<path d="M12 12h7V8h13v4h7v6h5v12h-7l-4 5H17l-5-5H7V18h5zM23 4h6M26 4v4M3 19v10"/><path d="m27 16-6 9h7l-5 7"/>',
 tires:'<ellipse cx="25" cy="21" rx="12" ry="16"/><ellipse cx="25" cy="21" rx="6" ry="10"/><path d="M22 5h-6C3 5 3 37 16 37h6M9 12l6 2M7 21h6M9 30l6-2M34 12l-4 3M37 21h-6M34 30l-4-3"/>',
 gearbox:'<path d="M9 13h19l7 6v11l-7 6H9zM35 21h9v7h-9M14 13v23M22 13v23M25 13V5h8M33 2v6M4 19h5v11H4"/>',
 spoiler:'<path d="m5 10 37-3 2 8-37 3zM15 18v11M33 16v11M10 31l29-3M5 9v12M43 5v13"/>',
 bumpers:'<path d="m6 9 5-4h26l5 4v8l-7 3H13l-7-3zM13 12h22M17 16h14M6 29l5-4h26l5 4v8l-7 3H13l-7-3zM13 32h9m5 0h8"/>',
 skirts:'<path d="m5 12 34-6 4 7-34 7zM5 29l34-6 4 7-34 7zM9 20v-5l30-5M9 37v-5l30-5"/>',
 fenders:'<path d="M5 34v-9C5 1 43 1 43 25v9h-7v-9c0-16-24-16-24 0v9z"/><path d="M9 22h3M15 11l2 4M32 11l-2 4M38 22h-3"/>',
 // Вкладка уникальных апгрейдов: турбина как самый узнаваемый из них.
 upgrades:'<circle cx="22" cy="23" r="11"/><circle cx="22" cy="23" r="4"/><path d="M22 12v7M31 19l-6 3.2M29 31.5l-5-5M15 31.5l5-5M13 19l6 3.2"/><path d="M33 23h6l4-4v9l-4-4h-6M22 12V5h8"/>',
 rims:'<circle cx="24" cy="21" r="17"/><circle cx="24" cy="21" r="13"/><circle cx="24" cy="21" r="3"/><path d="M24 8v10M36 17l-9 3M32 32l-6-8M16 32l6-8M12 17l9 3"/>',
};
export function partIcon(slot){return `<svg class="part-icon" viewBox="0 0 48 44" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[slot]||shapes.engine}</svg>`;}
