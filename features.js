// Переключатели контента. Ивент выключен до отладки кора (решение Андрея, 13 сентября); дуэли — после первых серий.
export const FEATURES={event:false,duelsFromRank:10};
// Приёмник телеметрии и профилей по умолчанию (Apps Script Андрея, решение 14 сентября: работает по простой ссылке).
// 14 сентября развёрнута версия 2 скрипта (лист saves для профилей) — у неё свой адрес, старый остался на версии 1.
// ?tm=<url> переопределяет, ?tm= (пусто) выключает на этом устройстве. На localhost/127.0.0.1 не шлём, чтобы тесты не попадали в данные.
export const TELEMETRY_RECEIVER='https://script.google.com/macros/s/AKfycbyqMSOGSAn3c9OJXaaSC8QmLMlfBg-6ZCPemS4Gzoi_LJAKpRFLhjR-jqdo0sU6kaFO3w/exec';
// Хосты, где страницу отдаёт наш же Worker: Sites и боевой Cloudflare. Там телеметрия идёт
// на свой /api/telemetry в D1, а не наружу в Apps Script.
export const TELEMETRY_SAME_ORIGIN=/\.(chatgpt\.site|workers\.dev)$/;
// Прошлые адреса того же приёмника: если устройство запомнило такой через ?tm=, молча переводим его на текущий.
export const TELEMETRY_LEGACY=['https://script.google.com/macros/s/AKfycbwxCnH3MWndBmgJ58QtTbLGNdBGV_ZF5VOv3asVbltZmKaknre_WlTHlrk464MkS9U7vQ/exec'];
