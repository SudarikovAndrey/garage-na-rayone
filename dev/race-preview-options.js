// Local visual presets only: no player inventory or save access.
export const PREVIEW_SPEEDS=[30,60,100,160,220];
export const PREVIEW_TUNING=[
 {id:'stock',name:'Заводская',equipment:{}},
 {id:'street',name:'Улица',equipment:{rims:'rims-1',bumpers:'bumpers-1',skirts:'skirts-1',spoiler:'spoiler-1'}},
 {id:'sport',name:'Спорт',equipment:{rims:'rims-3',bumpers:'bumpers-3',skirts:'skirts-3',fenders:'fenders-3',spoiler:'spoiler-3'}},
];
export const previewSpeed=value=>PREVIEW_SPEEDS.includes(Number(value))?Number(value):60;
export const previewTuning=id=>PREVIEW_TUNING.find(p=>p.id===id)||PREVIEW_TUNING[0];
