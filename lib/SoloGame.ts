import type { EnemyState, GameEvent, PlayerState, RoundState } from "./protocol";
import { collidesWorld, enemyPosition, ENEMY_COUNT, INTERACTION_RANGE, RESCUE_DURATION_MS, spawnPosition, wallAt, SLEIGH_Z, SUPPLIES, VILLAGE_GIFTS, FLIGHT_DURATION_MS, CITY_TARGETS, CITY_SPEED, CITY_LENGTH, CITY_CRUISE_ALTITUDE, CITY_REQUIRED_DELIVERIES } from "./world";

type Enemy = EnemyState & {nextAttack:number};
const freshRound = (round:number): RoundState => ({round,status:"playing",progress:0,resetAt:0,escort:0,blocked:false,giftCount:0,cityDistance:0,cityX:0,cityAltitude:0,cityDelivered:0,cityAttempts:0,cityPass:1});

/** One expedition per tab. Only active scene frames advance game time. */
export default class SoloGame {
  myPlayer:PlayerState|null=null;
  round=freshRound(1);
  enemies=new Map<number,Enemy>();
  spawnVersion=0;
  roundStarted=0;
  finishTime=0;
  broken=new Set<number>();
  collected=new Set<number>();
  villageCollected=new Set<number>();
  cityDeliveredTargets=new Set<number>();
  private cityPending:{at:number;targetId:number|null}[]=[];
  private lastCityDrop=-Infinity;
  private citySteer={x:0,z:0};
  private cityDropSerial=0;
  get santaZ(){return SLEIGH_Z*this.round.escort;}
  get playable(){return this.round.status==="playing"||this.round.status==="escort"||this.round.status==="village";}
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
    this.time=Date.now(); this.roundStarted=this.time;this.finishTime=0;this.remainder=0; this.round=freshRound(1);
    this.myPlayer={...spawnPosition(0),yaw:0,health:100,deadUntil:0,stunnedUntil:0,score:0,kills:0};
    this.broken.clear();this.collected.clear();this.villageCollected.clear();this.cityDeliveredTargets.clear();this.cityPending=[];this.lastCityDrop=-Infinity;this.citySteer={x:0,z:0};this.cityDropSerial=0;this.respawn(); this.seedEnemies(); this.publish();
  }
  stop(){this.myPlayer=null;this.enemies.clear();this.villageCollected.clear();this.cityDeliveredTargets.clear();this.cityPending=[];this.citySteer={x:0,z:0};this.heldSince=null;this.round=freshRound(1);this.publish();}
  private respawn(){
    if(!this.myPlayer)return;
    Object.assign(this.myPlayer,spawnPosition(0),{yaw:0,health:100,deadUntil:0,stunnedUntil:0});
    this.heldSince=null;this.protectedUntil=this.time+2000;this.lastThrow=-Infinity;this.spawnVersion++;
  }
  private seedEnemies(){
    this.enemies.clear();
    for(let id=0;id<ENEMY_COUNT;id++)this.enemies.set(id,{
      id,...enemyPosition(id,this.time),health:3,downUntil:0,stunnedUntil:0,attackUntil:0,windupUntil:0,lungeUntil:0,nextAttack:this.time+700
    });
  }
  setLocalPose(x:number,y:number,z:number,yaw:number){
    if(this.myPlayer)Object.assign(this.myPlayer,{x,y,z,yaw});
  }
  /** Analog input is sampled at 10Hz by the deterministic simulation. */
  setCitySteering(x:number,z:number){
    this.citySteer.x=Math.max(-1,Math.min(1,x));
    this.citySteer.z=Math.max(-1,Math.min(1,z));
  }
  getCityAim(){
    if(this.round.status!=="city")return null;
    const altitude=CITY_CRUISE_ALTITUDE+this.round.cityAltitude;
    const r=this.round;
    const wind=Math.sin(r.cityDistance*.009)*1.6;
    let closest:{target:(typeof CITY_TARGETS)[number];distance:number;impactX:number;impactZ:number;flightMs:number}|null=null;
    for(const target of CITY_TARGETS){
      if(this.cityDeliveredTargets.has(target.id)||this.cityPending.some(d=>d.targetId===target.id))continue;
      const flight=Math.sqrt(Math.max(1,2*(altitude-target.y)/9.81));
      const impactX=r.cityX+wind*flight*.38;
      const impactZ=-(r.cityDistance+CITY_SPEED*flight);
      const distance=Math.hypot((impactX-target.x),(impactZ-target.z));
      if(!closest||distance<closest.distance)closest={target,distance,impactX,impactZ,flightMs:flight*1000};
    }
    return closest?{...closest,aligned:closest.distance<=closest.target.radius}:null;
  }
  /** Ballistic gift throw: inherit sleigh forward speed, apply gravity and modest crosswind. */
  dropPresent(){
    if(this.round.status!=="city"||!this.myPlayer||this.time-this.lastCityDrop<650)return false;
    this.lastCityDrop=this.time;
    const r=this.round,aim=this.getCityAim();
    const hit=Boolean(aim?.aligned);
    const flight=hit?aim!.flightMs:Math.sqrt(2*(CITY_CRUISE_ALTITUDE+r.cityAltitude)/9.81)*1000;
    const impactX=hit?aim!.impactX:r.cityX+Math.sin(r.cityDistance*.009)*1.6*(flight/1000)*.38;
    const impactZ=hit?aim!.impactZ:-(r.cityDistance+CITY_SPEED*flight/1000);
    const impactY=hit?aim!.target.y:0.35;
    const id=hit?aim!.target.id:null;
    this.cityPending.push({at:this.time+flight,targetId:id});
    r.cityAttempts++;
    this.emit({type:"presentDrop",key:++this.cityDropSerial,x:r.cityX,y:CITY_CRUISE_ALTITUDE+r.cityAltitude,z:-r.cityDistance,impactX,impactY,impactZ,flightMs:flight,hit});
    this.publish();return true;
  }
  hold(held:boolean){
    const p=this.myPlayer;
    const allowed=p && this.round.status==="playing" && p.stunnedUntil<=this.time && !p.deadUntil && Math.hypot(p.x,p.z)<=INTERACTION_RANGE;
    this.heldSince=held && allowed ? this.heldSince??this.time : null;
  }
  fire(heavy=false){
    const p=this.myPlayer;
    if(!p||p.deadUntil||p.stunnedUntil>this.time|| !["playing","escort"].includes(this.round.status)||this.time-this.lastThrow<350)return false;
    this.lastThrow=this.time;
    const fx=Math.sin(p.yaw),fz=-Math.cos(p.yaw);
    let hit:Enemy|undefined,nearest=19.5;
    for(const e of this.enemies.values()){
      if(e.stunnedUntil>this.time||e.downUntil>this.time)continue;
      const dx=e.x-p.x,dz=e.z-p.z,forward=dx*fx+dz*fz;
      if(forward>.65 && forward<nearest && Math.abs(dx*fz-dz*fx)<1.55){hit=e;nearest=forward;}
    }
    let wall=-1;
    for(let d=.2;d<=nearest;d+=.2){
      wall=wallAt(p.x+fx*d,p.z+fz*d,.06,this.broken);
      if(wall>=0){hit=undefined;nearest=d;break;}
    }
    if(wall>=0 && heavy){
      this.broken.add(wall);
      this.emit({type:"shatter",x:p.x+fx*nearest,z:p.z+fz*nearest});
    }
    if(hit){
      hit.health=Math.max(0,hit.health-(heavy?2:1));hit.stunnedUntil=this.time+(heavy?1900:650);hit.windupUntil=0;hit.lungeUntil=0;
      if(!hit.health){hit.downUntil=this.time+7800;hit.attackUntil=0;p.kills++;}
      this.emit({type:"enemyHit",id:hit.id,health:hit.health});
    }
    this.emit({type:"snowball",x:p.x,y:p.y+.8,z:p.z,yaw:p.yaw,hitEnemy:hit?.id??null,range:nearest,heavy});
    return true;
  }
  advance(seconds:number){
    if(!this.myPlayer)return;
    this.remainder+=Math.min(seconds,.2)*1000;
    while(this.remainder>=100){this.remainder-=100;this.time+=100;this.tick();}
  }
  private tick(){
    const p=this.myPlayer!;
    if(this.round.status==="launching"){
      if(this.time>=this.round.resetAt){
        this.round.status="flight";this.round.resetAt=this.time+FLIGHT_DURATION_MS;
        this.round.progress=0;this.enemies.clear();
      }
      this.publish();return;
    }
    if(this.round.status==="flight"){
      this.round.progress=Math.min(1,Math.max(0,1-(this.round.resetAt-this.time)/FLIGHT_DURATION_MS));
      if(this.time>=this.round.resetAt){
        this.round.status="village";this.round.progress=0;
        Object.assign(p,{x:0,y:1.15,z:32,yaw:0,deadUntil:0,stunnedUntil:0,health:100});
        this.spawnVersion++;this.heldSince=null;
      }
      this.publish();return;
    }
    if(this.round.status==="village"){
      VILLAGE_GIFTS.forEach((gift,i)=>{
        if(!this.villageCollected.has(i) && Math.hypot(p.x-gift.x,p.z-gift.z)<2.15){
          this.villageCollected.add(i);
          this.round.giftCount=this.villageCollected.size;
          this.emit({type:"gift",count:this.round.giftCount});
        }
      });
      if(this.round.giftCount===VILLAGE_GIFTS.length){
        this.round.status="city";
        this.round.cityDistance=0;this.round.cityX=0;this.round.cityAltitude=0;
        this.round.cityDelivered=0;this.round.cityAttempts=0;this.round.cityPass=1;
        this.citySteer={x:0,z:0};this.cityDeliveredTargets.clear();this.cityPending=[];
        this.emit({type:"cityStarted"});
      }
      this.publish();return;
    }
    if(this.round.status==="city"){
      const r=this.round;
      r.cityX=Math.max(-29,Math.min(29,r.cityX+this.citySteer.x*1.65));
      r.cityAltitude=Math.max(-7,Math.min(9,r.cityAltitude+this.citySteer.z*.8));
      r.cityDistance+=CITY_SPEED*.1;
      for(let i=this.cityPending.length-1;i>=0;i--){
        const pending=this.cityPending[i];
        if(pending.at>this.time)continue;
        this.cityPending.splice(i,1);
        const didHit=pending.targetId!==null&&!this.cityDeliveredTargets.has(pending.targetId);
        if(didHit)this.cityDeliveredTargets.add(pending.targetId!);
        r.cityDelivered=this.cityDeliveredTargets.size;
        this.emit({type:"presentLanded",hit:didHit,count:r.cityDelivered,targetId:didHit?pending.targetId:null});
      }
      if(r.cityDelivered>=CITY_REQUIRED_DELIVERIES){
        r.status="rescued";this.finishTime=this.time-this.roundStarted;p.score++;
      } else if(r.cityDistance>=CITY_LENGTH){
        r.cityDistance=0;r.cityPass++;
        this.emit({type:"cityPass",pass:r.cityPass});
      }
      this.publish();return;
    }
    if(this.round.status==="rescued"){this.publish();return;}
    if(p.deadUntil && p.deadUntil<=this.time)this.respawn();
    for(const e of this.enemies.values()){
      if(e.downUntil>this.time||e.stunnedUntil>this.time)continue;
      if(e.downUntil){e.downUntil=0;e.health=3;e.nextAttack=this.time+700;}
      const chasing=!p.deadUntil && Math.hypot(p.x-e.x,p.z-e.z)<14.5;
      const guarding=this.round.status==="escort" && Math.hypot(e.x,e.z-this.santaZ)<12;
      const target=guarding && (!chasing || Math.hypot(e.x-p.x,e.z-p.z)>4)?{x:0,z:this.santaZ}:chasing?p:enemyPosition(e.id,this.time);
      if(e.windupUntil){
        if(this.time<e.windupUntil)continue;
        e.windupUntil=0;e.lungeUntil=this.time+400;e.attackUntil=e.lungeUntil;
      }
      if(e.lungeUntil>this.time){
        const x=e.x+Math.sin(e.yaw)*.78,z=e.z-Math.cos(e.yaw)*.78;
        if(collidesWorld(x,z,.42,this.broken)){
          e.stunnedUntil=this.time+1700;e.lungeUntil=0;continue;
        }
        e.x=x;e.z=z;
        if(!p.deadUntil && Math.hypot(p.x-x,p.z-z)<1.6 && p.y<2.15 && this.protectedUntil<=this.time){
          e.lungeUntil=0;
          p.health=Math.max(0,p.health-24);this.protectedUntil=this.time+1050;
          this.heldSince=null;p.stunnedUntil=this.time+380;
          if(!p.health){p.deadUntil=this.time+5200;p.stunnedUntil=p.deadUntil;}
          this.emit({type:"playerHit",damage:24,health:p.health});
        }
        continue;
      }
      if(chasing && this.time>=e.nextAttack && Math.hypot(p.x-e.x,p.z-e.z)<4){
        e.yaw=Math.atan2(p.x-e.x,e.z-p.z);e.windupUntil=this.time+650;e.nextAttack=this.time+2550;continue;
      }
      const dx=target.x-e.x,dz=target.z-e.z,len=Math.hypot(dx,dz);
      if(len>.05){
        const step=Math.min(chasing ? .345 : .29,len);
        const x=e.x+dx/len*step,z=e.z+dz/len*step;
        if(Math.hypot(x,z)>4.9&&!collidesWorld(x,z,.45,this.broken)){e.x=x;e.z=z;}
        e.yaw=Math.atan2(dx,-dz);
      }
    }
    if(!p.deadUntil && p.health<100){
      SUPPLIES.forEach((v,i)=>{
        if(!this.collected.has(i) && Math.hypot(v.x-p.x,v.z-p.z)<1.9){
          this.collected.add(i);p.health=Math.min(100,p.health+35);this.emit({type:"supply"});
        }
      });
    }
    if(this.round.status==="escort"){
      const danger=[...this.enemies.values()].some(e=>e.downUntil<=this.time && e.stunnedUntil<=this.time && Math.hypot(e.x,e.z-this.santaZ)<3.2);
      this.round.blocked=danger;
      if(!danger && !p.deadUntil && Math.hypot(p.x,p.z-this.santaZ)<9){
        this.round.escort=Math.min(1,this.round.escort+.012);
        if(this.round.escort===1){this.round.status="launching";this.round.resetAt=this.time+5000;}
      }
      this.publish();return;
    }
    if(Math.hypot(p.x,p.z)>INTERACTION_RANGE)this.heldSince=null;
    this.round.progress=this.heldSince===null?0:Math.min(1,(this.time-this.heldSince)/RESCUE_DURATION_MS);
    if(this.round.progress===1){this.round.status="escort";this.heldSince=null;
      const guard=this.enemies.get(0)!;
      Object.assign(guard,{x:2,z:-8,health:3,downUntil:0,stunnedUntil:0,windupUntil:0,lungeUntil:0,nextAttack:this.time+1000});
    }
    this.publish();
  }
}
