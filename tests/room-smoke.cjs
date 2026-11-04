/* Zero-dependency server logic smoke test. Uses globally installed TypeScript or local TypeScript. */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
let ts;
try { ts = require("typescript"); } catch { console.error("Install devDependencies first: npm install"); process.exit(1); }
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "santa-test-"));
for (const name of ["lib/world.ts", "lib/protocol.ts", "party/server.ts"]) {
  const from = path.join(__dirname, "..", name);
  const out = path.join(tempDir, name.replace(/\.ts$/, ".js"));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, ts.transpileModule(fs.readFileSync(from, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText);
}
const Server = require(path.join(tempDir, "party/server.js")).default;
const connections = [];
const records = [];
const room = {
  getConnections() { return connections; },
  broadcast(message, exclude = []) {
    const item = JSON.parse(message); records.push(item);
    for (const conn of connections) if (!exclude.includes(conn.id)) conn.send(message);
  }
};
const server = new Server(room);
const conn = (id) => ({ id, received: [], send(raw) { this.received.push(JSON.parse(raw)); }, close() {} });
const a = conn("alice"), b = conn("bob");

const realNow = Date.now;
let now = 1_780_000_000_000;
Date.now = () => now;
try {
  connections.push(a);
  server.onConnect(a);
  connections.push(b);
  server.onConnect(b);
  assert.equal(a.received[0].type, "welcome");
  assert.equal(a.received[0].players.length, 1);
  assert.equal(b.received[0].players.length, 2);
  assert.equal(records.find((m) => m.type === "join" && m.player.id === "bob").player.id, "bob");
  // Teleport is denied; the server owns authoritative coordinates.
  now += 40;
  const before = server.players.get("alice");
  server.onMessage(JSON.stringify({type:"move",x:0,y:1,z:0,yaw:0}),a);
  assert.ok(Math.hypot(before.x,before.z) > 30);
  assert.equal(a.received.at(-1).type, "move");
  // Simulate a valid arrival near the cage and a continuous hold.
  Object.assign(before, {x:4.2,z:0,stunnedUntil:0,invulnerableUntil:now+6000});
  server.onMessage(JSON.stringify({type:"interact",held:true}),a);
  for(let n=0;n<51;n++){ now += 100; server.tick(); }
  assert.equal(server.round.status, "rescued");
  assert.equal(server.round.winner, "alice");
  assert.equal(before.score, 1);
  assert.equal(records.some((m)=>m.type==="round" && m.round.status==="rescued"),true);
  now += 12100;
  server.tick();
  assert.equal(server.round.status,"playing");
  assert.equal(server.round.round,2);
  assert.equal(before.score,1);
  console.log("PASS: connect, sync, movement validation, rescue, scoring, round reset");
} finally {
  Date.now = realNow;
  clearInterval(server.ticker);
  fs.rmSync(tempDir, { recursive: true, force: true });
}
