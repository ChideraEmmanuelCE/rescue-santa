/** Reusable deterministic ground-vehicle physics. All values are metres / seconds. */
export type VehicleKind="snowmobile"|"gift-van"|"candy-kart"|"ranch-sled"|"polar-truck";
export type VehicleSpec={id:string;name:string;kind:VehicleKind;spawnX:number;spawnZ:number;maxSpeed:number;acceleration:number;turn:number;weight:number;color:string};
export const VEHICLE_CATALOG:readonly VehicleSpec[]=[
 {id:"polaris",name:"North Star Snowmobile",kind:"snowmobile",spawnX:7,spawnZ:39,maxSpeed:29,acceleration:20,turn:1.7,weight:.96,color:"#c72f42"},
 {id:"ginger",name:"Gingerbread Sprint",kind:"candy-kart",spawnX:-108,spawnZ:24,maxSpeed:35,acceleration:26,turn:2.15,weight:.86,color:"#c19154"},
 {id:"parcel",name:"North Pole Postal Van",kind:"gift-van",spawnX:-136,spawnZ:-75,maxSpeed:22,acceleration:12,turn:1.05,weight:1.22,color:"#26705d"},
 {id:"ranch",name:"Reindeer Trail Sled",kind:"ranch-sled",spawnX:105,spawnZ:124,maxSpeed:30,acceleration:17,turn:1.9,weight:.88,color:"#7f4e32"},
 {id:"heavy",name:"Aurora Ice Hauler",kind:"polar-truck",spawnX:156,spawnZ:56,maxSpeed:19,acceleration:10,turn:.9,weight:1.5,color:"#397a90"}
] as const;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const approach=(a:number,b:number,rate:number,dt:number)=>a+(b-a)*(1-Math.exp(-rate*dt));
export type VehicleState={id:string;kind:VehicleKind;name:string;x:number;z:number;heading:number;speed:number;boost:number;distance:number;color:string};
export class VehicleFleet {
 readonly list:VehicleState[]=VEHICLE_CATALOG.map(c=>({
  id:c.id,kind:c.kind,name:c.name,x:c.spawnX,z:c.spawnZ,heading:0,speed:0,boost:100,distance:0,color:c.color
 }));
 activeId:string|null=null;
 private controls={steer:0,throttle:0,brake:false,boost:false};
 get active(){return this.list.find(v=>v.id===this.activeId)??null;}
 closest(x:number,z:number,max=6):VehicleState|null{
  let best:VehicleState|null=null,bestD=max;
  for(const v of this.list){
   const d=Math.hypot(v.x-x,v.z-z);
   if(d<bestD){best=v;bestD=d;}
  }
  return best;
 }
 board(x:number,z:number){
  if(this.active)return false;
  const next=this.closest(x,z);
  if(!next)return false;
  this.activeId=next.id;this.controls={steer:0,throttle:0,brake:false,boost:false};
  return true;
 }
 dismount(){
  const v=this.active;if(!v)return null;
  if(Math.abs(v.speed)>4)return null;
  this.activeId=null;this.controls={steer:0,throttle:0,brake:false,boost:false};
  return {x:v.x+Math.cos(v.heading)*3,z:v.z+Math.sin(v.heading)*3,heading:v.heading};
 }
 setControls(steer:number,throttle:number,brake:boolean,boost:boolean){
  this.controls={steer:clamp(steer,-1,1),throttle:clamp(throttle,-1,1),brake,boost};
 }
 step(dt:number,collides:(x:number,z:number,padding:number)=>boolean){
  const v=this.active;if(!v)return;
  const spec=VEHICLE_CATALOG.find(p=>p.id===v.id)!;
  dt=clamp(dt,0,.12);
  const inp=this.controls;
  const boosted=inp.boost&&v.boost>=2&&inp.throttle>.2;
  v.boost=clamp(v.boost+(boosted?-21:9)*dt,0,100);
  const limit=spec.maxSpeed*(boosted?1.43:1);
  const target=inp.brake?0:inp.throttle>0?limit*inp.throttle:inp.throttle<0?limit*.28*inp.throttle:0;
  const response=inp.brake?8.8:inp.throttle?spec.acceleration/Math.max(7,Math.abs(target)):1.8;
  v.speed=approach(v.speed,target,response,dt);
  if(Math.abs(v.speed)<.025)v.speed=0;
  const grip=clamp(Math.abs(v.speed)/8,.12,1);
  v.heading+=inp.steer*spec.turn*grip*dt*(v.speed<0?-1:1);
  const nx=v.x+Math.sin(v.heading)*v.speed*dt,nz=v.z-Math.cos(v.heading)*v.speed*dt;
  if(collides(nx,nz,1.4*spec.weight)){v.speed*= -.18;return;}
  v.distance+=Math.hypot(nx-v.x,nz-v.z);v.x=nx;v.z=nz;
 }
 reset(){
  this.activeId=null;
  this.controls={steer:0,throttle:0,brake:false,boost:false};
  for(let i=0;i<this.list.length;i++){
   const v=this.list[i],spec=VEHICLE_CATALOG[i];
   Object.assign(v,{x:spec.spawnX,z:spec.spawnZ,speed:0,heading:0,boost:100,distance:0});
  }
 }
}
