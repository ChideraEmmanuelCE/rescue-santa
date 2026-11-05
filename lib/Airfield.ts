/** Plane faces north (-Z) at heading zero. Distances are metres and speed is m/s. */
export const fields = [
  {name:"Noel Field",z:0,number:"36"},
  {name:"Starfall Post",z:-960,number:"36"}
] as const;
export const runwayHalfLength=132;
export const runwayHalfWidth=15;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const approach=(a:number,b:number,k:number,dt:number)=>a+(b-a)*(1-Math.exp(-k*dt));
export type FlightControls={turn:number;pitch:number};
export class Airfield {
  onboard=false;
  airborne=false;
  station=0;
  parcels=0;
  x=0; y=0; z=98; heading=0; bank=0; nose=0; speed=0; climb=0; power=0;
  walker={x:-3.2,z:100,yaw:0};
  notice="";
  noticeTime=0;
  get destination(){return fields[1-this.station];}
  get canBoard(){return Math.hypot(this.walker.x-this.x,this.walker.z-this.z)<5;}
  get groundField(){return fields.findIndex(f=>Math.abs(this.x)<runwayHalfWidth&&Math.abs(this.z-f.z)<runwayHalfLength);}
  get canExit(){return this.onboard&&!this.airborne&&this.speed<1&&this.power===0&&this.groundField>=0;}
  get distance(){return Math.hypot(this.x,this.z-this.destination.z);}
  get bearing(){const delta=Math.atan2(-this.x,this.z-this.destination.z)-this.heading;return Math.atan2(Math.sin(delta),Math.cos(delta));}
  say(message:string){this.notice=message;this.noticeTime=3;}
  interact(){
    if(!this.onboard&&this.canBoard){this.onboard=true;this.say("Aboard · add power to start your takeoff roll");return;}
    if(!this.canExit)return;
    this.walker={x:this.x-3*Math.cos(this.heading),z:this.z-3*Math.sin(this.heading),yaw:this.heading};
    this.onboard=false;
    if(this.groundField!==this.station){this.station=this.groundField;this.parcels++;this.say("Christmas mail delivered!");}
  }
  setPower(delta:number){if(this.onboard)this.power=clamp(this.power+delta,0,1);}
  recover(message="Back at the departure runway"){
    this.onboard=false;this.airborne=false;this.x=0;this.z=fields[this.station].z+(this.station===0?98:-98);this.y=0;
    this.heading=this.station===0?0:Math.PI;this.speed=this.power=this.bank=this.climb=this.nose=0;
    this.walker={x:-3.2,z:this.z+2,yaw:this.heading};this.say(message);
  }
  step(seconds:number,control:FlightControls){
    const elapsed=clamp(seconds,0,.1);
    // Keep touchdown and steering stable even if the display misses a frame.
    for(let remaining=elapsed;remaining>1e-6;remaining-=1/60)this.tick(Math.min(remaining,1/60),control);
  }
  private tick(dt:number,{turn,pitch}:FlightControls){
    this.noticeTime=Math.max(0,this.noticeTime-dt);
    if(!this.onboard){
      const f=fields[this.station];
      const x=clamp(this.walker.x+turn*dt*6,-22,22),z=clamp(this.walker.z-pitch*dt*6,f.z-133,f.z+133);
      if(Math.hypot(x-this.x,z-this.z)>1.5){this.walker.x=x;this.walker.z=z;}
      if(turn||pitch)this.walker.yaw=Math.atan2(turn,pitch);
      return;
    }
    this.speed=approach(this.speed,this.power*56,this.airborne?.48:this.power===0?1.5:.58,dt);
    this.heading+=turn*dt*(this.airborne?.58:Math.min(1,this.speed/3)*.7);
    this.bank=approach(this.bank,this.airborne?-turn*.55:0,3.5,dt);
    this.nose=approach(this.nose,pitch*(this.airborne?.31:.12),3,dt);
    if(!this.airborne&&this.speed>=21&&pitch>.2){this.airborne=true;this.climb=2.8;}
    this.x+=Math.sin(this.heading)*this.speed*dt;
    this.z-=Math.cos(this.heading)*this.speed*dt;
    if(this.airborne){
      const sink=Math.max(0,19-this.speed)*.37;
      this.climb=approach(this.climb,Math.sin(this.nose)*this.speed-sink,2.2,dt);
      this.y=clamp(this.y+this.climb*dt,0,145);
      if(this.y<=0){
        if(this.groundField<0||this.climb < -9){this.recover("Hard landing · your mail is safe. Try again.");return;}
        this.airborne=false;this.climb=0;this.nose=0;this.say("Touchdown · reduce power to idle and park");
      }
    }else if(this.groundField<0){this.recover("Runway excursion · try again from the apron");}
    if(Math.abs(this.x)>530||this.z>420||this.z< -1380)this.recover("Outside the mail route · returning to the airfield");
  }
}
