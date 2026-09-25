export class GarageIdle{
 constructor(){this.quiet=0;this.speed=0;}
 interact(){this.quiet=0;this.speed=0;}
 update(dt,paused=false,reduced=false){
  if(paused||reduced){this.interact();return 0;}
  this.quiet+=dt;const target=this.quiet>9?.035:0;
  this.speed+=(target-this.speed)*(1-Math.exp(-dt*1.2));return this.speed*dt;
 }
}
