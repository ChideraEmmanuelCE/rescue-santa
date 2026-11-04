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
game.myPlayer.health=24;foe.x=0;foe.z=16;foe.downUntil=0;foe.nextAttack=0;advance(100);
assert.equal(game.myPlayer.health,0);
advance(5200);
assert.equal(game.myPlayer.health,100);assert.equal(game.myPlayer.x,spawn.x);
for(const e of game.enemies.values())e.downUntil=game.now()+30000;
game.setLocalPose(4.3,1,0,0);game.hold(true);advance(2000);game.hold(false);advance(100);
assert.equal(game.round.progress,0);
game.hold(true);advance(5000);assert.equal(game.round.status,"rescued");assert.equal(game.myPlayer.score,1);
advance(12000);assert.equal(game.round.round,2);
game.stop();assert.equal(game.myPlayer,null);game.start();assert.equal(game.myPlayer.score,0);
console.log("PASS: separate solo sessions, movement, shooting, enemy damage, respawn, rescue, round reset and restart");
