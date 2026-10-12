// Inspection landmarks follow the layout: transverse (Восьмёрка, Двенашка) or longitudinal (Копейка, Волга, Нива).
// rear остаётся в ответе ради совместимости: машин с мотором сзади в парке нет.
export function powertrainLayout(car){
 const transverse=car.id==='samara'||car.id==='twelve',rear=false;
 const x=-car.wheelbase*.5+(car.axleOffset||0)+.23;
 const y=car.radius+(car.id==='niva'?.38:.32);
 return {transverse,rear,engine:{x,y,z:0},clutch:{x:x+(transverse?.03:.43),y:y-.09,z:transverse?-car.width*.23:0},scale:car.id==='volga'?1.12:1};
}
