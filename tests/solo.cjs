// Load the same local simulation used by the scene, without a browser or network.
const ts = require("typescript");
const fs = require("node:fs");
const assert = require("node:assert/strict");
require.extensions[".ts"] = (mod,file) => mod._compile(ts.transpileModule(fs.readFileSync(file,"utf8"), {
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,file);
const SoloGame=require("../lib/SoloGame.ts").default;
const game=new SoloGame(),other=new SoloGame();
const advance=ms=>{for(let t=0;t<ms;t+=100)game.advance(.1);};
game.start();other.start();
const spawn={...game.myPlayer};
assert.equal(game.enemies.size,7);
const events=[];game.onEvent(e=>events.push(e));
for(const e of game.enemies.values())e.downUntil=game.now()+60000;
const enemy=game.enemies.get(0);enemy.downUntil=0;
game.setLocalPose(0,1,16,0);
for(let i=0;i<3;i++){
  enemy.x=0;enemy.z=12;game.fire();advance(1400);
}
assert.equal(game.myPlayer.kills,1);
assert.equal(events.filter(e=>e.type==="snowball").length,3);
assert.equal(other.myPlayer.kills,0);
const foe=game.enemies.get(1);
game.myPlayer.health=24;foe.x=0;foe.z=16;foe.downUntil=0;foe.nextAttack=0;advance(100);assert(foe.windupUntil>game.now());assert.equal(game.myPlayer.health,24);advance(700);
assert.equal(game.myPlayer.health,0);
advance(5200);
assert.equal(game.myPlayer.health,100);assert.equal(game.myPlayer.x,spawn.x);
for(const e of game.enemies.values())e.downUntil=game.now()+30000;
game.setLocalPose(4.3,1,0,0);game.hold(true);advance(2000);game.hold(false);advance(100);
assert.equal(game.round.progress,0);
game.hold(true);advance(5000);assert.equal(game.round.status,"escort");assert.equal(game.myPlayer.score,0);
const guard=game.enemies.get(0);guard.x=1;guard.z=0;advance(100);
assert.equal(game.round.blocked,true);assert.equal(game.round.escort,0);
guard.downUntil=game.now()+60000;game.setLocalPose(30,1,0,0);advance(500);
assert.equal(game.round.escort,0);
for(let i=0;i<86;i++){game.setLocalPose(1,1,game.santaZ,0);advance(100);}
assert.equal(game.round.status,"launching");advance(5000);
assert.equal(game.round.status,"flight");assert.equal(game.myPlayer.score,0);
advance(12000);assert.equal(game.round.status,"flight");assert(game.round.progress>.45);
advance(12000);assert.equal(game.round.status,"village");assert.equal(game.round.giftCount,0);
for(const [index,gift] of require("../lib/world.ts").VILLAGE_GIFTS.entries()){
 game.setLocalPose(gift.x,1,gift.z,0);advance(100);
 assert.equal(game.round.giftCount,index+1);
}
assert.equal(game.round.status,"cityLaunch");advance(4500);
assert.equal(game.round.status,"city");assert.equal(game.round.cityDelivered,0);
const {CITY_TARGETS,CITY_SPEED,CITY_CRUISE_ALTITUDE,CITY_REQUIRED_DELIVERIES,CITY_LENGTH}=require("../lib/world.ts");
assert.equal(game.getCityAim().aligned,false);
assert.equal(game.dropPresent(),true);
assert.equal(game.dropPresent(),false); // drop cooldown
advance(4000);assert.equal(game.round.cityDelivered,0);
const dropEvents=events.filter(e=>e.type==="presentDrop");
assert(dropEvents.length===1&&dropEvents[0].hit===false);
for(const [i,target] of CITY_TARGETS.slice(0,CITY_REQUIRED_DELIVERIES).entries()){
 const flight=Math.sqrt(2*(CITY_CRUISE_ALTITUDE-target.y)/9.81);
 game.round.cityDistance=-target.z-CITY_SPEED*flight;
 game.round.cityX=target.x;
 const aim=game.getCityAim();
 assert(aim&&aim.aligned,`gift should align for target ${i}`);
 assert.equal(game.dropPresent(),true);
 advance(4000);
 assert.equal(game.round.cityDelivered,i+1,`present should land at target ${i}`);
}
assert.equal(game.round.status,"rescued");assert.equal(game.myPlayer.score,1);assert(game.finishTime>0);
assert.equal(events.filter(e=>e.type==="presentLanded"&&e.hit).length,CITY_REQUIRED_DELIVERIES);
advance(12000);assert.equal(game.round.round,1);assert.equal(game.round.status,"rescued");
game.stop();assert.equal(game.myPlayer,null);game.startCityPreview();
assert.equal(game.startedFromCity,true);assert.equal(game.round.status,"city");
assert.equal(game.round.cityDelivered,0);
game.start();assert.equal(game.startedFromCity,false);assert.equal(game.myPlayer.score,0);
// Fly the express manifest using only steering and drops, at real simulation speed.
game.startCityPreview(true);
assert.equal(game.deliveryGoal,3);
for(let tick=0;tick<800 && game.round.status==="city";tick++){
  const next=game.deliveryStops.find(stop=>!game.cityDeliveredTargets.has(stop.id));
  game.setCitySteering(Math.sign(next.x-game.round.cityX),0);
  if(game.getCityAim()?.aligned)game.dropPresent();
  advance(100);
}
assert.equal(game.round.status,"rescued");
assert.deepEqual([...game.cityDeliveredTargets],[0,4,8]);
game.startCityPreview(true);advance(80000);
assert.equal(game.round.status,"routeEnded");assert.equal(game.myPlayer.score,0);
game.startCityPreview();
assert.equal(game.deliveryGoal,CITY_REQUIRED_DELIVERIES);
assert.equal(game.cityDeliveredTargets.size,0);
game.start();
console.log("PASS: express steering, all three named stops, missed route, retry and campaign isolation");
// The first south barricade lies directly between the scout and the target.
for(const e of game.enemies.values())e.downUntil=game.now()+60000;
const target=game.enemies.get(4);target.downUntil=0;target.x=6;target.z=20;
game.setLocalPose(6,1,30,0);
game.fire(false);assert.equal(target.health,3);assert.equal(game.broken.size,0);
advance(400);game.fire(true);assert(game.broken.has(7));assert.equal(target.health,3);
advance(400);target.x=6;target.z=20;game.fire(true);assert.equal(target.health,1);
// A snowman commits to its original heading and stuns itself against an intact wall.
const charger=game.enemies.get(3);charger.downUntil=0;charger.x=17;charger.z=-15.8;
game.setLocalPose(17,1,-19,0);charger.nextAttack=0;advance(100);assert(charger.windupUntil>game.now());
game.setLocalPose(23,1,-20,0);advance(1000);assert(charger.stunnedUntil>game.now());
game.myPlayer.health=40;game.setLocalPose(2,1,31,0);advance(100);assert.equal(game.myPlayer.health,75);
advance(100);assert.equal(game.myPlayer.health,75);
game.start();assert.equal(game.broken.size,0);assert.equal(game.collected.size,0);
console.log("PASS: windup, dodge, ice collision, charged throws, healing, escort, sleigh flight, village gifts and city drop physics");
console.log("PASS: separate solo sessions, movement, combat, health, rescue, 3 chapters, city score and replay");
const {InputController}=require("../lib/InputController.ts");
const input=new InputController(),realClock=global.performance;
try{
  let t=0;Object.defineProperty(global,"performance",{configurable:true,value:{now:()=>t}});
  input.beginThrow();t+=90;input.endThrow();assert.equal(input.consumeThrow(),false);
  input.beginThrow();t+=820;input.endThrow();assert.equal(input.consumeThrow(),true);
  assert.equal(input.consumeThrow(),null);input.beginThrow();input.release();input.endThrow();assert.equal(input.consumeThrow(),null);
  console.log("PASS: tap, charged release and cancelled input");
}finally{Object.defineProperty(global,"performance",{configurable:true,value:realClock});}

const {Airfield}=require("../lib/Airfield.ts");
const mail=new Airfield();
const fly=(seconds,turn=0,pitch=0)=>{for(let i=0;i<Math.round(seconds*60);i++)mail.step(1/60,{turn,pitch});};
fly(1.5,-1,0);mail.interact();assert.equal(mail.onboard,false,"must reach the aircraft");
fly(1.5,1,0);mail.interact();assert(mail.onboard);
for(let i=0;i<4;i++)mail.setPower(.25);
fly(2.5,0,1);assert(mail.airborne);mail.interact();assert(mail.onboard,"cannot exit in flight");
fly(2.2,0,.85);fly(.3,.5);assert(mail.heading>.04);
fly(.3,-.5);assert(Math.abs(mail.heading)<.002);
for(let i=0;i<400 && mail.z> -745;i++)fly(.1);
assert(mail.z<=-745);
mail.setPower(-.75);
for(let i=0;i<400 && mail.y>1.2;i++){fly(.05,0,-.85);assert(mail.onboard);}
for(let i=0;i<400 && mail.airborne;i++)fly(.05,0,-.35);
assert.equal(mail.airborne,false);
assert.equal(mail.groundField,1);mail.setPower(-1);fly(4);
assert(mail.canExit);mail.interact();assert.equal(mail.parcels,1);assert.equal(mail.onboard,false);
mail.interact();assert(mail.onboard,"can reboard after unloading");
mail.recover();assert.equal(mail.parcels,1);assert.equal(mail.station,1);
assert.equal(mail.destination.name,"Noel Field");
console.log("PASS: walk, proximity boarding, power, bank, takeoff, controlled approach, touchdown, unloading and reboarding");
