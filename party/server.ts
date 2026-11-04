import type * as Party from "partykit/server";
import type { ClientMessage, EnemyState, PlayerState, RoundState, ServerMessage } from "../lib/protocol";
import { collidesWorld, enemyPosition, ENEMY_COUNT, INTERACTION_RANGE, MAX_PLAYERS,
  PLAYER_SPEED, RESCUE_DURATION_MS, ROUND_RESET_MS, spawnPosition, WORLD_HALF } from "../lib/world";

type PlayerInternal = PlayerState & {
  lastMove: number; lastThrow: number; holdSince: number | null; invulnerableUntil: number;
};
type EnemyInternal = EnemyState & { nextAttack: number; lastThink: number };
const COLORS = ["#58eed0", "#fb7394", "#fbe08d", "#a695ff", "#61bdfc", "#ffc080", "#a4e981", "#f7a4e7", "#ffffff", "#81eaff", "#ff90bc", "#b9f6a4"];
const safeName = (name: string) => name.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 18) || "Christmas Elf";
const finite = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
const asPublic = (p: PlayerInternal): PlayerState => ({
  id:p.id,name:p.name,color:p.color,x:p.x,y:p.y,z:p.z,yaw:p.yaw,score:p.score,
  stunnedUntil:p.stunnedUntil,interacting:p.interacting,health:p.health,deadUntil:p.deadUntil,
  kills:p.kills,lastHit:p.lastHit
});

/** Authoritative rooms. Enemy HP, melee attacks, player lives and Santa rescue are server-owned. */
export default class RescueSantaRoom implements Party.Server {
  constructor(readonly room: Party.Room) {}
  private players = new Map<string, PlayerInternal>();
  private enemiesMap = new Map<number, EnemyInternal>();
  private ticker: ReturnType<typeof setInterval> | undefined;
  private round: RoundState = {round:1,status:"playing",winner:null,winnerName:null,resetAt:0,progress:0,holderId:null};
  onStart(){ this.startTicking(); }
  private startTicking(){ if (!this.ticker) this.ticker=setInterval(()=>this.tick(),100); }
  private broadcast(message:ServerMessage, excluding?:string[]){this.room.broadcast(JSON.stringify(message),excluding);}
  private send(connection:Party.Connection,message:ServerMessage){connection.send(JSON.stringify(message));}
  private initEnemies(now:number) {
    this.enemiesMap.clear();
    for(let id=0; id<ENEMY_COUNT; id++) {
      const pos=enemyPosition(id,now);
      this.enemiesMap.set(id,{id,...pos,health:3,stunnedUntil:0,downUntil:0,attackUntil:0,nextAttack:now+700,lastThink:now});
    }
  }
  private enemies(now:number):EnemyState[] {
    if(!this.enemiesMap.size) this.initEnemies(now);
    return [...this.enemiesMap.values()].map(e=>({id:e.id,x:e.x,z:e.z,yaw:e.yaw,health:e.health,
      stunnedUntil:e.stunnedUntil,downUntil:e.downUntil,attackUntil:e.attackUntil}));
  }
  onConnect(connection: Party.Connection){
    if(this.players.size>=MAX_PLAYERS){this.send(connection,{type:"notice",message:"This room is full."});connection.close(4001,"Room full");return;}
    this.startTicking();
    const now=Date.now();const index=this.players.size;
    const player:PlayerInternal={id:connection.id,name:`Elf ${String(index+1).padStart(2,"0")}`,color:COLORS[index%COLORS.length],
      ...spawnPosition(index),yaw:0,score:0,health:100,deadUntil:0,kills:0,lastHit:0,stunnedUntil:0,
      interacting:false,lastMove:now,lastThrow:0,holdSince:null,invulnerableUntil:now+2000};
    this.players.set(connection.id,player);
    this.send(connection,{type:"welcome",id:connection.id,players:[...this.players.values()].map(asPublic),
      enemies:this.enemies(now),round:{...this.round},serverTime:now});
    this.broadcast({type:"join",player:asPublic(player)},[connection.id]);
  }
  onMessage(payload:string | ArrayBuffer,sender:Party.Connection){
    const player=this.players.get(sender.id);
    if(!player||typeof payload!=="string"||payload.length>400)return;
    let msg:ClientMessage;try{msg=JSON.parse(payload) as ClientMessage;}catch{return;}
    if(!msg||typeof msg!=="object"||typeof msg.type!=="string")return;
    const now=Date.now();
    if(msg.type==="rename"){
      if(typeof msg.name!=="string")return;
      player.name=safeName(msg.name);
      this.broadcast({type:"rename",id:sender.id,name:player.name});return;
    }
    if(this.round.status!=="playing"||player.deadUntil>now)return;
    if(msg.type==="move"){
      if(![msg.x,msg.y,msg.z,msg.yaw].every(finite))return;
      if(now-player.lastMove<20)return;
      const dt=Math.max(.016,Math.min(.2,(now-player.lastMove)/1000));player.lastMove=now;
      const x=Math.max(-WORLD_HALF+2,Math.min(WORLD_HALF-2,msg.x));
      const z=Math.max(-WORLD_HALF+2,Math.min(WORLD_HALF-2,msg.z));
      const y=Math.max(.55,Math.min(4,msg.y));
      if(player.stunnedUntil>now||Math.hypot(x-player.x,z-player.z)>PLAYER_SPEED*dt+.42||collidesWorld(x,z,.25)){
        this.send(sender,{type:"move",player:asPublic(player),serverTime:now});return;
      }
      player.x=x;player.y=y;player.z=z;
      player.yaw=((msg.yaw+Math.PI)%(Math.PI*2)+(Math.PI*2))%(Math.PI*2)-Math.PI;
      if(player.holdSince!==null && Math.hypot(x,z)>INTERACTION_RANGE){player.holdSince=null;player.interacting=false;}
      this.broadcast({type:"move",player:asPublic(player),serverTime:now},[sender.id]);return;
    }
    if(msg.type==="interact"){
      if(typeof msg.held!=="boolean")return;
      const canHold=msg.held && Math.hypot(player.x,player.z)<=INTERACTION_RANGE && player.stunnedUntil<now;
      player.interacting=canHold;
      player.holdSince=canHold?(player.holdSince??now):null;
      this.broadcast({type:"move",player:asPublic(player),serverTime:now});return;
    }
    if(msg.type==="throw"){
      if(now-player.lastThrow<520||player.stunnedUntil>now)return;
      player.lastThrow=now;
      // Hit-check a 3D ray on the server so every client agrees about snowball impact.
      const fx=Math.sin(player.yaw),fz=-Math.cos(player.yaw);
      let best:EnemyInternal|null=null,bestDistance=Infinity;
      for(const enemy of this.enemiesMap.values()){
        if(enemy.stunnedUntil>now||enemy.downUntil>now)continue;
        const dx=enemy.x-player.x,dz=enemy.z-player.z;
        const f=dx*fx+dz*fz;
        const sideways=Math.abs(dx*fz-dz*fx);
        if(f>.65&&f<19.5&&sideways<1.55&&f<bestDistance){best=enemy;bestDistance=f;}
      }
      if(best){
        best.health=Math.max(0,best.health-1);best.stunnedUntil=now+1300;
        if(best.health<=0){best.downUntil=now+7800;best.attackUntil=0;player.kills+=1;
          this.broadcast({type:"move",player:asPublic(player),serverTime:now});}
        this.broadcast({type:"enemyHit",id:best.id,health:best.health,downUntil:best.downUntil,playerId:player.id,serverTime:now});
      }
      this.broadcast({type:"snowball",id:player.id,x:player.x,y:player.y+.8,z:player.z,
        yaw:player.yaw,hitEnemy:best?.id??null,serverTime:now});return;
    }
  }
  private updateEnemies(now:number){
    if(!this.enemiesMap.size)this.initEnemies(now);
    const dt=.1;
    for(const e of this.enemiesMap.values()){
      if(e.downUntil>now)continue;
      if(e.downUntil>0){e.downUntil=0;e.health=3;e.stunnedUntil=0;e.nextAttack=now+700;}
      if(e.stunnedUntil>now)continue;
      const patrol=enemyPosition(e.id,now);
      const nearby=[...this.players.values()]
        .filter(p=>p.deadUntil<now&&Math.hypot(p.x-e.x,p.z-e.z)<14.5)
        .sort((a,b)=>Math.hypot(a.x-e.x,a.z-e.z)-Math.hypot(b.x-e.x,b.z-e.z))[0];
      // Patrol when alone; commit to a chase inside the combat arena.
      let tx=patrol.x,tz=patrol.z,speed=2.9;
      if(nearby){tx=nearby.x;tz=nearby.z;speed=3.45;}
      const dx=tx-e.x,dz=tz-e.z,length=Math.hypot(dx,dz);
      if(length>.05){
        const step=Math.min(speed*dt,length);
        const nx=e.x+dx/length*step,nz=e.z+dz/length*step;
        if(Math.hypot(nx,nz)>4.9&&!collidesWorld(nx,nz,.45)){e.x=nx;e.z=nz;}
        e.yaw=Math.atan2(dx,-dz);
      }
      if(!nearby||now<e.nextAttack)continue;
      if(Math.hypot(nearby.x-e.x,nearby.z-e.z)<2.0){
        e.nextAttack=now+1600;e.attackUntil=now+420;
        if(nearby.invulnerableUntil>now)continue;
        nearby.health=Math.max(0,nearby.health-24);nearby.lastHit=now;nearby.invulnerableUntil=now+1050;
        nearby.interacting=false;nearby.holdSince=null;
        nearby.stunnedUntil=now+380;
        if(nearby.health===0){nearby.deadUntil=now+5200;nearby.stunnedUntil=nearby.deadUntil;}
        this.broadcast({type:"playerHit",id:nearby.id,damage:24,health:nearby.health,
          deadUntil:nearby.deadUntil,enemyId:e.id,serverTime:now});
        this.broadcast({type:"move",player:asPublic(nearby),serverTime:now});
      }
    }
  }
  private tick(){
    const now=Date.now();
    if(!this.players.size)return;
    if(this.round.status==="rescued"){
      if(now>=this.round.resetAt)this.newRound(now);
      else this.broadcast({type:"round",round:{...this.round},serverTime:now});return;
    }
    for(const p of this.players.values()){
      if(p.deadUntil>0&&p.deadUntil<=now){
        const index=[...this.players.keys()].indexOf(p.id);
        Object.assign(p,spawnPosition(index));p.health=100;p.deadUntil=0;p.stunnedUntil=0;
        p.holdSince=null;p.interacting=false;p.invulnerableUntil=now+1900;p.lastMove=now;
        this.broadcast({type:"move",player:asPublic(p),serverTime:now});
      }
    }
    this.updateEnemies(now);
    let leader:PlayerInternal|null=null,progress=0;
    for(const p of this.players.values()){
      if(p.deadUntil>now||p.holdSince===null||!p.interacting||p.stunnedUntil>now)continue;
      if(Math.hypot(p.x,p.z)>INTERACTION_RANGE){p.holdSince=null;p.interacting=false;continue;}
      const duration=now-p.holdSince;
      if(duration>=progress){leader=p;progress=duration;}
    }
    this.round.progress=Math.min(1,progress/RESCUE_DURATION_MS);
    this.round.holderId=leader?.id??null;
    if(leader&&progress>=RESCUE_DURATION_MS){
      this.round.status="rescued";this.round.winner=leader.id;this.round.winnerName=leader.name;
      this.round.resetAt=now+ROUND_RESET_MS;leader.score++;
      this.broadcast({type:"move",player:asPublic(leader),serverTime:now});
    }
    this.broadcast({type:"enemies",enemies:this.enemies(now),serverTime:now});
    this.broadcast({type:"round",round:{...this.round},serverTime:now});
  }
  private newRound(now:number){
    this.round={round:this.round.round+1,status:"playing",winner:null,winnerName:null,resetAt:0,progress:0,holderId:null};
    let slot=0;
    for(const p of this.players.values()){
      Object.assign(p,spawnPosition(slot++));p.yaw=0;p.stunnedUntil=0;p.health=100;p.deadUntil=0;
      p.holdSince=null;p.interacting=false;p.lastMove=now;p.invulnerableUntil=now+2200;
      this.broadcast({type:"move",player:asPublic(p),serverTime:now});
    }
    this.initEnemies(now);
    this.broadcast({type:"round",round:{...this.round},serverTime:now});
  }
  onClose(connection:Party.Connection){this.removePlayer(connection.id);}
  onError(connection:Party.Connection){this.removePlayer(connection.id);}
  private removePlayer(id:string){
    if(!this.players.delete(id))return;
    this.broadcast({type:"leave",id});
    if(!this.players.size){clearInterval(this.ticker);this.ticker=undefined;
      this.round={round:1,status:"playing",winner:null,winnerName:null,resetAt:0,progress:0,holderId:null};this.enemiesMap.clear();}
  }
}
