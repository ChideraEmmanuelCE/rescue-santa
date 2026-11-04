import type { EnemyState, GameEvent, PlayerState, RoundState } from "./protocol";
import { collidesWorld, enemyPosition, ENEMY_COUNT, INTERACTION_RANGE, RESCUE_DURATION_MS, ROUND_RESET_MS, spawnPosition } from "./world";

type Enemy = EnemyState & {nextAttack:number};
const freshRound = (round:number): RoundState => ({round,status:"playing",progress:0,resetAt:0});

/** One expedition per tab. Only active scene frames advance game time. */
export default class SoloGame {
  myPlayer:PlayerState|null=null;
  round=freshRound(1);
  enemies=new Map<number,Enemy>();
  spawnVersion=0;
  private time=0;
  private remainder=0;
  private heldSince:number|null=null;
  private protectedUntil=0;
  private lastThrow=-Infinity;
  private listeners=new Set<()=>void>();
  private effects=new Set<(e:GameEvent)=>void>();
  private hud:{me:PlayerState|null;round:RoundState}={me:null,round:this.round};
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return ()=>{this.listeners.delete(fn);};};
  onEvent=(fn:(e:GameEvent)=>void)=>{this.effects.add(fn);return ()=>{this.effects.delete(fn);};};
  getSnapshot=()=>this.hud;
  now(){return this.time;}
  private publish(){
    this.hud={me:this.myPlayer && {...this.myPlayer},round:{...this.round}};
    for(const fn of this.listeners)fn();
  }
  private emit(event:GameEvent){for(const fn of this.effects)fn(event);}
  start(){
    this.time=Date.now(); this.remainder=0; this.round=freshRound(1);
    this.myPlayer={...spawnPosition(0),yaw:0,health:100,deadUntil:0,stunnedUntil:0,score:0,kills:0};
    this.respawn(); this.seedEnemies(); this.publish();
  }
  stop(){this.myPlayer=null;this.enemies.clear();this.heldSince=null;this.round=freshRound(1);this.publish();}
  private respawn(){
    if(!this.myPlayer)return;
    Object.assign(this.myPlayer,spawnPosition(0),{yaw:0,health:100,deadUntil:0,stunnedUntil:0});
    this.heldSince=null;this.protectedUntil=this.time+2000;this.lastThrow=-Infinity;this.spawnVersion++;
  }
  private seedEnemies(){
    this.enemies.clear();
    for(let id=0;id<ENEMY_COUNT;id++)this.enemies.set(id,{
      id,...enemyPosition(id,this.time),health:3,downUntil:0,stunnedUntil:0,attackUntil:0,nextAttack:this.time+700
    });
  }
  setLocalPose(x:number,y:number,z:number,yaw:number){
    if(this.myPlayer)Object.assign(this.myPlayer,{x,y,z,yaw});
  }
  hold(held:boolean){
    const p=this.myPlayer;
    const allowed=p && this.round.status==="playing" && p.stunnedUntil<=this.time && !p.deadUntil && Math.hypot(p.x,p.z)<=INTERACTION_RANGE;
    this.heldSince=held && allowed ? this.heldSince??this.time : null;
  }
  fire(){
    const p=this.myPlayer;
    if(!p||p.deadUntil||p.stunnedUntil>this.time||this.round.status!=="playing"||this.time-this.lastThrow<520)return;
    this.lastThrow=this.time;
    const fx=Math.sin(p.yaw),fz=-Math.cos(p.yaw);
    let hit:Enemy|undefined,nearest=19.5;
    for(const e of this.enemies.values()){
      if(e.stunnedUntil>this.time||e.downUntil>this.time)continue;
      const dx=e.x-p.x,dz=e.z-p.z,forward=dx*fx+dz*fz;
      if(forward>.65 && forward<nearest && Math.abs(dx*fz-dz*fx)<1.55){hit=e;nearest=forward;}
    }
    if(hit){
      hit.health--;hit.stunnedUntil=this.time+1300;
      if(!hit.health){hit.downUntil=this.time+7800;hit.attackUntil=0;p.kills++;}
      this.emit({type:"enemyHit",id:hit.id,health:hit.health});
    }
    this.emit({type:"snowball",x:p.x,y:p.y+.8,z:p.z,yaw:p.yaw,hitEnemy:hit?.id??null});
  }
  advance(seconds:number){
    if(!this.myPlayer)return;
    this.remainder+=Math.min(seconds,.2)*1000;
    while(this.remainder>=100){this.remainder-=100;this.time+=100;this.tick();}
  }
  private tick(){
    const p=this.myPlayer!;
    if(this.round.status==="rescued"){
      if(this.time>=this.round.resetAt){this.round=freshRound(this.round.round+1);this.respawn();this.seedEnemies();}
      this.publish();return;
    }
    if(p.deadUntil && p.deadUntil<=this.time)this.respawn();
    for(const e of this.enemies.values()){
      if(e.downUntil>this.time||e.stunnedUntil>this.time)continue;
      if(e.downUntil){e.downUntil=0;e.health=3;e.nextAttack=this.time+700;}
      const chasing=!p.deadUntil && Math.hypot(p.x-e.x,p.z-e.z)<14.5;
      const target=chasing?p:enemyPosition(e.id,this.time);
      const dx=target.x-e.x,dz=target.z-e.z,len=Math.hypot(dx,dz);
      if(len>.05){
        const step=Math.min(chasing ? .345 : .29,len);
        const x=e.x+dx/len*step,z=e.z+dz/len*step;
        if(Math.hypot(x,z)>4.9&&!collidesWorld(x,z,.45)){e.x=x;e.z=z;}
        e.yaw=Math.atan2(dx,-dz);
      }
      if(!chasing || this.time<e.nextAttack || Math.hypot(p.x-e.x,p.z-e.z)>=2)continue;
      e.nextAttack=this.time+1600;e.attackUntil=this.time+420;
      if(this.protectedUntil>this.time)continue;
      p.health=Math.max(0,p.health-24);this.protectedUntil=this.time+1050;
      this.heldSince=null;p.stunnedUntil=this.time+380;
      if(!p.health){p.deadUntil=this.time+5200;p.stunnedUntil=p.deadUntil;}
      this.emit({type:"playerHit",damage:24,health:p.health});
    }
    if(Math.hypot(p.x,p.z)>INTERACTION_RANGE)this.heldSince=null;
    this.round.progress=this.heldSince===null?0:Math.min(1,(this.time-this.heldSince)/RESCUE_DURATION_MS);
    if(this.round.progress===1){this.round.status="rescued";this.round.resetAt=this.time+ROUND_RESET_MS;p.score++;}
    this.publish();
  }
}
