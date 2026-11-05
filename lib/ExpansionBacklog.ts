/**
 * FUTURE CONTENT BACKLOG, NOT PLAYABLE CONTENT.
 * 1,675 distinct implementation tickets generated from authored objectives,
 * world regions, encounter conditions, reward tiers, bosses, and vehicles.
 * Do not import into the game client; it is a documentation and planning tool.
 */
import {REGION_ROADMAP} from "./OpenWorld";

export type ExpansionTicket={id:string;title:string;region:string;category:"side-mission"|"collectible"|"world-event"|"vehicle"|"boss"|"achievement";phase:number;status:"planned";description:string};
const missionTypes=[
 ["Snow Courier","deliver a fragile present before the route closes"],
 ["Frozen Rescue","find a stranded traveler and guide them through a snowstorm"],
 ["Lost Elf","track a missing workshop worker and reunite their team"],
 ["Gift Heist","intercept a bandit convoy carrying stolen toys"],
 ["Sleigh Time Trial","follow the glowing gates without missing a checkpoint"],
 ["Rooftop Dash","reach the highest rooftop using parkour shortcuts"],
 ["Candy Chase","catch a runaway candy cart without collisions"],
 ["Snowman Patrol","clear a winter patrol while keeping civilians safe"],
 ["Icebreaker","crack a frozen seal and open a secret chamber"],
 ["Reindeer Roundup","bring scattered reindeer back to their stable"],
 ["Workshop Crisis","restore the holiday production machines"],
 ["Holiday Concert","collect instruments and deliver them before the festival"],
 ["Chimney Route","link chimneys in a perfect precision-delivery streak"],
 ["Aurora Expedition","follow celestial navigation clues through the region"],
 ["Secret Santa","complete a hidden gift exchange without being spotted"]
] as const;
const missionMutators=[
 ["Standard","complete the mission on the recommended route"],
 ["Blizzard","complete it during severe visibility and crosswind"],
 ["Speedrun","finish within a tighter time limit"],
 ["Fragile Cargo","keep the objective undamaged"],
 ["Low Magic","finish using limited magical power"],
 ["Elite","overcome a harder enemy or vehicle configuration"]
] as const;
const treasures=[
 "Golden Candy Cane","Lost Letter","Star Ornament","Silver Bell","Glowing Snow Globe",
 "Reindeer Badge","Prototype Toy","Peppermint Coin","Magic Ribbon","Arctic Postcard",
 "Stolen Gear","Elven Blueprint","Frost Crystal","Clockwork Nutcracker"
] as const;
const encounters=[
 ["Toy Convoy","a toy convoy is ambushed and needs an escort"],
 ["Aurora Storm","an aurora storm changes terrain visibility and controls"],
 ["Snowman Uprising","snowman squads occupy a landmark"],
 ["Reindeer Stampede","a reindeer stampede cuts through the roads"],
 ["Winter Festival","travelers gather for timed games and giveaways"],
 ["Runaway Sleigh","an unmanned sleigh must be safely stopped"],
 ["Snow Fort Siege","naughty elves attack a snow fort"],
 ["Lost Children","a search party needs assistance"],
 ["Supply Drop","rare crafting parts arrive by air"],
 ["Iceberg Crack","new terrain hazards appear on a frozen lake"],
 ["Emergency Delivery","an urgent parcel request reaches the radio"],
 ["Holiday Parade","the Christmas parade changes traffic and crowds"]
] as const;
const eventVariants=["daytime","night-time"] as const;
const vehicleBases=[
 "North Star Snowmobile","Candy Sprinter","Evergreen Van","Snowplough Truck",
 "Winter Taxi","Reindeer Sleigh","Aurora Glider","Elven Copter"
] as const;
const vehicleClasses=["Classic","Racing","Heavy Duty","Magic-Tuned","Collector's Edition"] as const;
const bosses=[
 "Ice Cage Warden","Avalanche Giant","Clockwork Nutcracker","Frostbite General",
 "Naughty Drone Commander","Candy Queen's Shadow","Coal Collector","The Blizzard Engine",
 "Frost Kraken","Underground Toykeeper","Clocktower Harbinger","Aurora Sentinel",
 "Naughty List Jailor","Parade Saboteur","Midnight Metropolis Showdown"
] as const;
const achievements=[
 "Distance Walked","Distance Driven","Airborne Miles","Perfect Gifts","City Combo",
 "Snowmen Defeated","Ice Shields Used","Frost Waves Cast","Regions Discovered",
 "Presents Found","Letters Returned","Reindeer Rescued","Speedrun Records",
 "Vehicle Upgrades","Race Victories","No-Hit Missions","Secret Rooms",
 "Bosses Defeated","Workshop Repairs","Citizen Happiness"
] as const;
const countThresholds=["First","Apprentice","Bronze","Silver","Gold","Expert","Master","Champion","Legend","Mythic"] as const;
export function generateExpansionBacklog():ExpansionTicket[]{
 const entries:ExpansionTicket[]=[];
 const push=(id:string,title:string,region:string,category:ExpansionTicket["category"],phase:number,description:string)=>{
  entries.push({id,title,region,category,phase,status:"planned",description});
 };
 REGION_ROADMAP.forEach((region,r)=>{
  const phase=r===0?1:r<=2?2:r===3?3:r<=5?4:5;
  missionTypes.forEach(([name,objective],m)=>missionMutators.forEach(([variation,rule],v)=>
   push("quest-"+r+"-"+m+"-"+v,region+": "+name+" — "+variation,region,"side-mission",phase,objective+"; "+rule)));
  treasures.forEach((name,t)=>["Ordinary","Legendary"].forEach((rarity,k)=>
   push("treasure-"+r+"-"+t+"-"+k,region+": "+rarity+" "+name,region,"collectible",phase,"Hidden scavenger object, lore, rarity and a unique reward hook")));
  encounters.forEach(([name,description],e)=>eventVariants.forEach((variation,v)=>
   push("event-"+r+"-"+e+"-"+v,region+": "+name+" ("+variation+")",region,"world-event",phase,description+"; scenario occurs in "+variation+" weather conditions")));
 });
 vehicleBases.forEach((base,b)=>vehicleClasses.forEach((vehicleClass,k)=>
  push("vehicle-"+b+"-"+k,base+" — "+vehicleClass,"World garage","vehicle",3,"Distinct driving class, handling stats, customization and acquisition path")));
 bosses.forEach((name,b)=>push("boss-"+b,name,REGION_ROADMAP[b%REGION_ROADMAP.length],"boss",b<3?2:4,"Distinct arena, telegraphed attack patterns, counters, phase transitions and victory rewards"));
 achievements.forEach((name,a)=>countThresholds.forEach((tier,k)=>
  push("achievement-"+a+"-"+k,name+" — "+tier,"All regions","achievement",5,"Track a persistent milestone with an unlock condition and title reward")));
 return entries;
}
export const expansionTicketCounts={
 sideMissions:REGION_ROADMAP.length*missionTypes.length*missionMutators.length,
 collectibles:REGION_ROADMAP.length*treasures.length*2,
 events:REGION_ROADMAP.length*encounters.length*eventVariants.length,
 vehicles:vehicleBases.length*vehicleClasses.length,
 bosses:bosses.length,
 achievements:achievements.length*countThresholds.length
} as const;
