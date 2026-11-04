import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const url='wss://rescue-santa-realtime.onrender.com/parties/main/qa-'+randomUUID().slice(0,12);
const sockets=[];
function client(){
  const ws=new WebSocket(url);sockets.push(ws);const events=[];
  ws.addEventListener('message',e=>events.push(JSON.parse(e.data)));
  async function wait(match,timeout=65000){
    const end=Date.now()+timeout;
    while(Date.now()<end){
      const i=events.findIndex(match);
      if(i>=0)return events.splice(i,1)[0];
      if(ws.readyState===WebSocket.CLOSED)throw Error('Room closed');
      await new Promise(r=>setTimeout(r,40));
    }
    throw Error('Room event timed out');
  }
  return {ws,wait,send:data=>ws.send(JSON.stringify(data))};
}
try{
  const a=client(),first=await a.wait(e=>e.type==='welcome');
  const b=client(),second=await b.wait(e=>e.type==='welcome');
  assert.notEqual(first.id,second.id);assert(second.players.some(p=>p.id===first.id));
  await a.wait(e=>e.type==='join' && e.player.id===second.id);
  b.send({type:'rename',name:'Polar Scout'});await a.wait(e=>e.type==='rename'&&e.name==='Polar Scout');
  const p=second.players.find(p=>p.id===second.id);
  b.send({type:'move',x:p.x+.12,y:p.y,z:p.z,yaw:1.2});
  const moved=await a.wait(e=>e.type==='move'&&e.player.id===second.id);assert(Math.abs(moved.player.yaw-1.2)<.01);
  a.send({type:'throw'});await b.wait(e=>e.type==='snowball'&&e.id===first.id);
  b.ws.close();await a.wait(e=>e.type==='leave'&&e.id===second.id);
  console.log('LIVE ROOM PASS: two independent clients exchanged joins, names, movement, facing, firing and disconnect.');
}finally{for(const ws of sockets)ws.close();}
