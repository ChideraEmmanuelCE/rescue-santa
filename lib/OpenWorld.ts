/** Region one of the open-world map. Content is deterministic and cheap to stream. */
import {random01,WORLD_HALF} from "./world";

export type Landmark={id:string;name:string;x:number;z:number;kind:"depot"|"workshop"|"ranch"|"gateway"|"lake"|"cave"|"airfield"|"forest"|"market"|"square";description:string};
export const LANDMARKS:readonly Landmark[]=[
 {id:"depot",name:"North Pole Motor Depot",x:19,z:58,kind:"depot",description:"Board a snowmobile and explore the tundra"},
 {id:"workshop",name:"Evergreen Toy Works",x:-137,z:-69,kind:"workshop",description:"Mechanical elves are rebuilding the toy assembly line"},
 {id:"ranch",name:"Reindeer Ranch",x:107,z:116,kind:"ranch",description:"The winter racing circuit starts here"},
 {id:"aurora",name:"Aurora Gate",x:137,z:-106,kind:"gateway",description:"A magical shortcut toward the northern skies"},
 {id:"lake",name:"Mirror Ice Lake",x:-128,z:113,kind:"lake",description:"Slick ice and scattered skating lights"},
 {id:"cavern",name:"Frost Cavern",x:-51,z:-158,kind:"cave",description:"An icy opening into the buried present vaults"},
 {id:"airfield",name:"Noel Airfield Shuttle",x:166,z:55,kind:"airfield",description:"Travel directly to the flying school"},
 {id:"forest",name:"Candy-Cane Forest",x:115,z:-167,kind:"forest",description:"An old forest dotted with peppermint lanterns"},
 {id:"market",name:"Little Elf Market",x:-116,z:22,kind:"market",description:"Browse the winter stalls and find lost parcels"},
 {id:"square",name:"Santa's Great Plaza",x:0,z:151,kind:"square",description:"The outer settlement's illuminated gathering place"}
] as const;

export type WorldProp={x:number;z:number;size:number;variant:number};
const outerRadius=65;
const reserved=(x:number,z:number)=>LANDMARKS.some(p=>Math.hypot(p.x-x,p.z-z)<22)||
  // Main snow paths and escape lanes stay clear.
  Math.abs(x)<9||Math.abs(z)<9||Math.hypot(x-6,z-39)<15;
export const OUTER_PINES:readonly WorldProp[]=(()=>{
 const out:WorldProp[]=[];
 for(let i=0;i<2500&&out.length<480;i++){
   const x=(random01(i*37+23)-.5)*2*(WORLD_HALF-12);
   const z=(random01(i*41+19)-.5)*2*(WORLD_HALF-12);
   if(Math.hypot(x,z)<outerRadius||reserved(x,z))continue;
   const size=.68+random01(i*5+93)*1.38;
   out.push({x,z,size,variant:i%5});
 }
 return out;
})();
export const OUTER_CABINS:readonly WorldProp[]=(()=>{
 const out:WorldProp[]=[];
 for(let i=0;i<240&&out.length<56;i++){
   const x=(random01(i*57+144)-.5)*2*(WORLD_HALF-30);
   const z=(random01(i*63+143)-.5)*2*(WORLD_HALF-30);
   if(Math.hypot(x,z)<72||reserved(x,z)||out.some(p=>Math.hypot(p.x-x,p.z-z)<17))continue;
   out.push({x,z,size:.8+random01(i*17+7)*.45,variant:i%4});
 }
 return out;
})();
export const LOST_PRESENTS:readonly {id:number;x:number;z:number;type:"ordinary"|"golden"|"letter"}[]=(()=>{
 const items:{id:number;x:number;z:number;type:"ordinary"|"golden"|"letter"}[]=[];
 for(let i=0;i<90;i++){
   const landmark=LANDMARKS[i%LANDMARKS.length];
   const theta=random01(i*71+8)*Math.PI*2;
   const radius=10+random01(i*13+11)*26;
   const x=Math.max(-WORLD_HALF+14,Math.min(WORLD_HALF-14,landmark.x+Math.cos(theta)*radius));
   const z=Math.max(-WORLD_HALF+14,Math.min(WORLD_HALF-14,landmark.z+Math.sin(theta)*radius));
   items.push({id:i,x,z,type:i%19===0?"golden":i%7===0?"letter":"ordinary"});
 }
 return items;
})();
export const PORTALS=[
 {id:"airport",name:"Noel Field",x:166,z:55,radius:8,destination:"airport"},
 {id:"express",name:"Christmas Eve Express",x:137,z:-106,radius:8,destination:"express"}
] as const;
export const REGION_ROADMAP=[
 "North Pole & Santa's Village","Aurora Village","Midnight Metropolis",
 "Christmas Airfield & Skies","Frozen Mountains & Candy Forests",
 "Underground Vaults & Ice Caves","Naughty List Prison Island",
 "Floating Aurora Islands","Reindeer Ranch & Tracks","Elven Workshop District"
] as const;
