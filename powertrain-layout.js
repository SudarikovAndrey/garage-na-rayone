// Inspection landmarks follow the layout: transverse, longitudinal, cab-over or rear engine.
export function powertrainLayout(car){
 const transverse=['samara','nine','ninety-nine','ten','oka'].includes(car.id),rear=car.id==='smz';
 const x=rear?car.wheelbase*.5-.16:car.id==='bukhanka'?-.70:-car.wheelbase*.5+(car.axleOffset||0)+.23;
 const y=car.radius+(['uaz','bukhanka','niva'].includes(car.id)?.38:.32);
 return {transverse,rear,engine:{x,y,z:0},clutch:{x:x+(transverse?.03:rear?-.42:.43),y:y-.09,z:transverse?-car.width*.23:0},scale:car.id==='oka'||rear?.78:car.id==='volga'||car.id==='uaz'||car.id==='bukhanka'?1.12:1};
}
