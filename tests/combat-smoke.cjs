const fs = require('fs'); const path = require('path');const os = require('os');const assert = require('assert').strict;
const ts = require('typescript');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'santa-combat-'));
for(const filename of ['lib/world.ts','lib/protocol.ts','party/server.ts']){
 const output=path.join(dir,filename.replace('.ts','.js'));fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',filename),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText);
}
const Server=require(path.join(dir,'party/server.js')).default;
const connections=[];const messages=[];
const room={broadcast(raw,except=[]){const msg=JSON.parse(raw);messages.push(msg);for(const c of connections)if(!except.includes(c.id))c.send(raw)}};
const sv=new Server(room);const me={id:'player1',messages:[],send(raw){this.messages.push(JSON.parse(raw))},close(){}};connections.push(me);
let now=1791000000000;const originalDateNow=Date.now;Date.now=()=>now;
try{
 sv.onConnect(me);const p=sv.players.get('player1');assert.equal(p.health,100);assert.equal(p.kills,0);
 // Move the avatar into an enemy attack radius and trigger one hit.
 const enemy=sv.enemiesMap.get(0);p.x=enemy.x;p.z=enemy.z;p.invulnerableUntil=0;enemy.nextAttack=now;sv.tick();
 assert.ok(p.health<100,'snowman attack damages player');
 assert.ok(messages.find(m=>m.type==='playerHit'),'combat event is broadcast');
 // Snowballs damage enemies in front of avatar.
 p.x=enemy.x;p.z=enemy.z+4;p.yaw=0;p.stunnedUntil=0;enemy.stunnedUntil=0;enemy.nextAttack=now+10000;enemy.x=p.x;enemy.z=p.z-4;
 const startHp=enemy.health;now+=1000;sv.onMessage(JSON.stringify({type:'throw'}),me);
 assert.equal(enemy.health,startHp-1,'projectile damage applies');
 for(let i=0;i<2;i++){now+=1500;enemy.stunnedUntil=0;sv.onMessage(JSON.stringify({type:'throw'}),me)}
 assert.equal(enemy.health,0);assert.equal(p.kills,1);assert.ok(enemy.downUntil>now);
 // Death and recovery are validated server-side.
 p.health=24;p.invulnerableUntil=0;p.deadUntil=0;p.x=enemy.x+12;p.z=enemy.z;p.stunnedUntil=0;
 const attacking=sv.enemiesMap.get(1);attacking.x=p.x;attacking.z=p.z;attacking.stunnedUntil=0;attacking.downUntil=0;attacking.nextAttack=now;
 now+=1000;sv.tick();assert.equal(p.health,0);assert.ok(p.deadUntil>now);
 now+=5300;sv.tick();assert.equal(p.health,100);assert.equal(p.deadUntil,0);
 console.log('PASS combat: join, enemy damage, snowball hits, enemy defeat, health depletion, respawn');
} finally {Date.now=originalDateNow;clearInterval(sv.ticker);fs.rmSync(dir,{recursive:true,force:true})}
