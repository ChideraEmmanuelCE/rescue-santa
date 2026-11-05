import type { EnemyState, GameEvent, PlayerState, RoundState } from "./protocol";
import {LANDMARKS,LOST_PRESENTS,PORTALS,OUTER_CABINS,OUTER_PINES} from "./OpenWorld";
import {VehicleFleet} from "./VehicleFleet";
import { collidesWorld, enemyPosition, ENEMY_COUNT, INTERACTION_RANGE, RESCUE_DURATION_MS, spawnPosition, wallAt, SLEIGH_Z, SUPPLIES, VILLAGE_GIFTS, FLIGHT_DURATION_MS, CITY_TARGETS, EXPRESS_STOPS, CITY_SPEED, CITY_LENGTH, CITY_CRUISE_ALTITUDE, CITY_REQUIRED_DELIVERIES } from "./world";

type Enemy = EnemyState & {nextAttack:number};
const freshRound = (round:number): RoundState => ({round,status:"playing",progress:0,resetAt:0,escort:0,blocked:false,giftCount:0,worldPresents:0,worldVisited:0,credits:0,magic:100,frostShieldUntil:0,cityScore:0,cityCombo:0,cityBestCombo:0,cityPerfect:0,cityDistance:0,cityX:0,cityAltitude:0,cityDelivered:0,cityAttempts:0,cityPass:1});

/** One expedition per tab. Only active scene frames advance game time. */
export default class SoloGame {
  myPlayer:PlayerState|null=null;
  readonly vehicles=new VehicleFleet();
  paused=false;
  readonly foundPresents=new Set<number>();
  readonly visitedLandmarks=new Set<string>();
  readonly completedMilestones=new Set<string>();
  credits=0;
  lifetimeDeliveries=0;
  private lastShieldCast=-Infinity;
  private lastWaveCast=-Infinity;
  private naughtyUntil=0;
  private recentNaughty=0;
  round=freshRound(1);
  enemies=new Map<number,Enemy>();
  spawnVersion=0;
  roundStarted=0;
  finishTime=0;
  startedFromCity=false;
  express=false;
  get deliveryStops(){return this.express ? EXPRESS_STOPS : CITY_TARGETS;}
  get deliveryGoal(){return this.express ? EXPRESS_STOPS.length : CITY_REQUIRED_DELIVERIES;}

  broken=new Set<number>();
  collected=new Set<number>();
  villageCollected=new Set<number>();
  cityDeliveredTargets=new Set<number>();
  private cityPending:{at:number;targetId:number|null;quality:number;perfect:boolean}[]=[];
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
  get nearbyLandmark(){
    const p=this.myPlayer;
    if(!p)return null;
    const landmark=LANDMARKS.reduce((best,next)=>!best||Math.hypot(next.x-p.x,next.z-p.z)<Math.hypot(best.x-p.x,best.z-p.z)?next:best,null as (typeof LANDMARKS)[number]|null);
    return landmark&&Math.hypot(landmark.x-p.x,landmark.z-p.z)<23?landmark:null;
  }
  get nearbyPortal(){
    const p=this.myPlayer;
    if(!p||!["playing","escort"].includes(this.round.status)||this.vehicles.active)return null;
    return PORTALS.find(portal=>Math.hypot(p.x-portal.x,p.z-portal.z)<portal.radius)??null;
  }
  get canBoardVehicle(){
    const p=this.myPlayer;
    return Boolean(p&&["playing","escort"].includes(this.round.status)&&(this.vehicles.active||this.vehicles.closest(p.x,p.z,5.6)));
  }
  getProfile(){
    return {version:1,credits:this.credits,found:[...this.foundPresents],visited:[...this.visitedLandmarks],milestones:[...this.completedMilestones],lifetimeDeliveries:this.lifetimeDeliveries};
  }
  loadProfile(value:unknown){
    if(!value||typeof value!=="object")return;
    const v=value as Record<string,unknown>;
    if(v.version!==1)return;
    this.credits=typeof v.credits==="number"&&Number.isFinite(v.credits)?Math.max(0,Math.min(1_000_000,Math.floor(v.credits))):0;
    this.lifetimeDeliveries=typeof v.lifetimeDeliveries==="number"&&Number.isFinite(v.lifetimeDeliveries)?Math.max(0,Math.min(100_000,Math.floor(v.lifetimeDeliveries))):0;
    this.foundPresents.clear();
    if(Array.isArray(v.found))for(const n of v.found)if(Number.isInteger(n)&&n>=0&&n<LOST_PRESENTS.length)this.foundPresents.add(n);
    this.visitedLandmarks.clear();this.completedMilestones.clear();
    if(Array.isArray(v.visited))for(const id of v.visited)if(typeof id==="string"&&LANDMARKS.some(spot=>spot.id===id))this.visitedLandmarks.add(id);
    if(Array.isArray(v.milestones))for(const id of v.milestones)if(typeof id==="string"&&["presents-10","presents-30","presents-60","presents-90","landmarks-5","landmarks-10"].includes(id))this.completedMilestones.add(id);
    this.round.worldPresents=this.foundPresents.size;this.round.worldVisited=this.visitedLandmarks.size;this.round.credits=this.credits;
    this.publish();
  }
  setVehicleControls(x:number,z:number,brake:boolean,boost:boolean){this.vehicles.setControls(x,z,brake,boost);}
  toggleVehicle(){
    const p=this.myPlayer;
    if(!p||!["playing","escort"].includes(this.round.status))return false;
    if(this.vehicles.active){
      const old=this.vehicles.active,d=this.vehicles.dismount();
      if(!d)return false;
      Object.assign(p,{x:d.x,y:1.15,z:d.z,yaw:d.heading});
      this.spawnVersion++;this.emit({type:"vehicle",boarded:false,name:old.name});this.publish();return true;
    }
    if(!this.vehicles.board(p.x,p.z))return false;
    const v=this.vehicles.active!;
    Object.assign(p,{x:v.x,y:1.15,z:v.z,yaw:v.heading});
    this.heldSince=null;this.spawnVersion++;this.emit({type:"vehicle",boarded:true,name:v.name});this.publish();return true;
  }
  castShield(){
    if(!this.myPlayer||!["playing","escort"].includes(this.round.status)||this.round.magic<35||this.time-this.lastShieldCast<8000)return false;
    this.lastShieldCast=this.time;this.round.magic-=35;this.round.frostShieldUntil=this.time+4500;
    this.emit({type:"shieldCast",magic:this.round.magic});this.publish();return true;
  }
  castFrostWave(){
    const p=this.myPlayer;
    if(!p||!["playing","escort"].includes(this.round.status)||this.round.magic<55||this.time-this.lastWaveCast<6500)return false;
    this.lastWaveCast=this.time;this.round.magic-=55;
    let hits=0;
    for(const foe of this.enemies.values()){
      if(foe.downUntil>this.time||Math.hypot(foe.x-p.x,foe.z-p.z)>10)continue;
      foe.stunnedUntil=this.time+2500;foe.windupUntil=foe.lungeUntil=0;hits++;
    }
    this.emit({type:"frostWave",hits});this.publish();return true;
  }
  private publish(){
    this.hud={me:this.myPlayer && {...this.myPlayer},round:{...this.round}};
    for(const fn of this.listeners)fn();
  }
  private emit(event:GameEvent){for(const fn of this.effects)fn(event);}
  start(){
    this.time=Date.now(); this.roundStarted=this.time;this.finishTime=0;this.startedFromCity=false;this.express=false;this.remainder=0; this.round=freshRound(1);
    this.myPlayer={...spawnPosition(0),yaw:0,health:100,deadUntil:0,stunnedUntil:0,score:0,kills:0};
    this.paused=false;this.vehicles.reset();this.lastShieldCast=this.lastWaveCast=-Infinity;this.recentNaughty=0;this.naughtyUntil=0;
    this.round.worldPresents=this.foundPresents.size;this.round.worldVisited=this.visitedLandmarks.size;this.round.credits=this.credits;
    this.broken.clear();this.collected.clear();this.villageCollected.clear();this.cityDeliveredTargets.clear();this.cityPending=[];this.lastCityDrop=-Infinity;this.citySteer={x:0,z:0};this.cityDropSerial=0;this.respawn(); this.seedEnemies(); this.publish();
  }
  /** Owner-friendly instant city preview; it never replaces or resets the adventure. */
  startCityPreview(express=false){
    this.start();
    this.startedFromCity=true;this.express=express;
    this.round.status="city";this.round.cityDistance=0;this.round.cityX=0;this.round.cityAltitude=0;
    this.round.cityDelivered=0;this.round.cityAttempts=0;this.round.cityPass=1;
    this.enemies.clear();
    this.emit({type:"cityStarted"});
    this.publish();
  }
  /** Regional gateway: jump to the existing Aurora Village on-foot chapter. */
  startAuroraVisit(){
    this.start();this.round.status="village";this.enemies.clear();
    Object.assign(this.myPlayer!,{x:0,y:1.15,z:32,yaw:0,deadUntil:0});
    this.spawnVersion++;this.publish();
  }
  stop(){this.paused=false;this.vehicles.reset();this.myPlayer=null;this.enemies.clear();this.villageCollected.clear();this.cityDeliveredTargets.clear();this.cityPending=[];this.citySteer={x:0,z:0};this.heldSince=null;this.round=freshRound(1);this.publish();}
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
    for(const target of this.deliveryStops){
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
    const quality=hit?Math.max(0,1-aim!.distance/aim!.target.radius):0;
    const perfect=Boolean(hit&&aim!.distance<3.7);
    this.cityPending.push({at:this.time+flight,targetId:id,quality,perfect});
    r.cityAttempts++;
    this.emit({type:"presentDrop",key:++this.cityDropSerial,x:r.cityX,y:CITY_CRUISE_ALTITUDE+r.cityAltitude,z:-r.cityDistance,impactX,impactY,impactZ,flightMs:flight,hit});
    this.publish();return true;
  }
  hold(held:boolean){
    const p=this.myPlayer;
    const allowed=p && !this.vehicles.active && this.round.status==="playing" && p.stunnedUntil<=this.time && !p.deadUntil && Math.hypot(p.x,p.z)<=INTERACTION_RANGE;
    this.heldSince=held && allowed ? this.heldSince??this.time : null;
  }
  fire(heavy=false){
    const p=this.myPlayer;
    if(this.vehicles.active)return false;
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
      if(!hit.health){hit.downUntil=this.time+7800;hit.attackUntil=0;p.kills++;this.credits+=20;this.round.credits=this.credits;}
      this.emit({type:"enemyHit",id:hit.id,health:hit.health});
    }
    this.emit({type:"snowball",x:p.x,y:p.y+.8,z:p.z,yaw:p.yaw,hitEnemy:hit?.id??null,range:nearest,heavy});
    return true;
  }
  advance(seconds:number){
    if(!this.myPlayer||this.paused)return;
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
    if(this.round.status==="cityLaunch"){
      if(this.time>=this.round.resetAt){this.round.status="city";this.emit({type:"cityStarted"});}
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
        this.round.status="cityLaunch";this.round.resetAt=this.time+4500;
        this.round.cityDistance=0;this.round.cityX=0;this.round.cityAltitude=0;
        this.round.cityDelivered=0;this.round.cityAttempts=0;this.round.cityPass=1;
        this.citySteer={x:0,z:0};this.cityDeliveredTargets.clear();this.cityPending=[];
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
        let points=0;
        if(didHit){
          this.cityDeliveredTargets.add(pending.targetId!);
          r.cityCombo++;
          r.cityBestCombo=Math.max(r.cityBestCombo,r.cityCombo);
          if(pending.perfect)r.cityPerfect++;
          points=Math.round((70+pending.quality*130+(pending.perfect?100:0))*(1+Math.min(5,r.cityCombo-1)*.20));
          r.cityScore+=points;this.credits+=Math.floor(points/10);
          this.lifetimeDeliveries++;r.credits=this.credits;
        }else{r.cityCombo=0;}
        r.cityDelivered=this.cityDeliveredTargets.size;
        this.emit({type:"presentLanded",hit:didHit,count:r.cityDelivered,targetId:didHit?pending.targetId:null,score:points,combo:r.cityCombo,perfect:didHit&&pending.perfect});
      }
      if(r.cityDelivered>=this.deliveryGoal){
        r.status="rescued";this.finishTime=this.time-this.roundStarted;p.score++;
      } else if(this.express && r.cityDistance>=CITY_LENGTH){
        r.status="routeEnded";this.finishTime=this.time-this.roundStarted;
      } else if(r.cityDistance>=CITY_LENGTH){
        r.cityDistance=0;r.cityPass++;
        this.emit({type:"cityPass",pass:r.cityPass});
      }
      this.publish();return;
    }
    if(this.round.status==="rescued" || this.round.status==="routeEnded")return;
    this.round.magic=Math.min(100,this.round.magic+.42);
    this.vehicles.step(.1,(x,z,padding)=>collidesWorld(x,z,padding,this.broken)||
      OUTER_CABINS.some(b=>Math.hypot(b.x-x,b.z-z)<4*b.size+padding)||
      OUTER_PINES.some(tree=>Math.hypot(tree.x-x,tree.z-z)<tree.size*.75+padding));
    if(this.vehicles.active){const v=this.vehicles.active;Object.assign(p,{x:v.x,y:1.15,z:v.z,yaw:v.heading});}
    if(!this.vehicles.active){
      for(const site of LANDMARKS){
        if(this.visitedLandmarks.has(site.id)||Math.hypot(site.x-p.x,site.z-p.z)>13)continue;
        this.visitedLandmarks.add(site.id);
        this.round.worldVisited=this.visitedLandmarks.size;
        this.credits+=35;this.round.credits=this.credits;
        this.emit({type:"landmark",name:site.name,count:this.visitedLandmarks.size,total:LANDMARKS.length,credits:this.credits});
      }
      for(const present of LOST_PRESENTS){
        if(!this.foundPresents.has(present.id)&&Math.hypot(p.x-present.x,p.z-present.z)<2.65){
          this.foundPresents.add(present.id);
          this.credits+=present.type==="golden"?100:present.type==="letter"?35:12;
          this.round.worldPresents=this.foundPresents.size;
          this.round.credits=this.credits;
          this.emit({type:"foundPresent",count:this.foundPresents.size,total:LOST_PRESENTS.length,credits:this.credits,kind:present.type});
        }
      }
    }
    for(const [id,goal,reward,name] of [
      ["presents-10",10,125,"Parcels Scout"],["presents-30",30,350,"Parcel Ranger"],
      ["presents-60",60,600,"Snowland Courier"],["presents-90",90,1000,"North Pole Treasure Master"]
    ] as [string,number,number,string][]){
      if(this.foundPresents.size>=goal&&!this.completedMilestones.has(id)){
        this.completedMilestones.add(id);this.credits+=reward;this.round.credits=this.credits;
        this.emit({type:"milestone",name,credits:reward});
      }
    }
    for(const [id,goal,reward,name] of [
      ["landmarks-5",5,200,"Tundra Pathfinder"],["landmarks-10",10,600,"Polar Explorer"]
    ] as [string,number,number,string][]){
      if(this.visitedLandmarks.size>=goal&&!this.completedMilestones.has(id)){
        this.completedMilestones.add(id);this.credits+=reward;this.round.credits=this.credits;
        this.emit({type:"milestone",name,credits:reward});
      }
    }
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
          if(this.round.frostShieldUntil>this.time){
            e.stunnedUntil=this.time+1200;this.emit({type:"shieldBlock"});this.protectedUntil=this.time+850;continue;
          }
          const attackDamage=e.id%4===2?18:e.id%4===3?30:24;
          p.health=Math.max(0,p.health-attackDamage);this.protectedUntil=this.time+1050;
          this.heldSince=null;p.stunnedUntil=this.time+380;
          if(!p.health){p.deadUntil=this.time+5200;p.stunnedUntil=p.deadUntil;}
          this.emit({type:"playerHit",damage:attackDamage,health:p.health});
        }
        continue;
      }
      if(chasing && this.time>=e.nextAttack && Math.hypot(p.x-e.x,p.z-e.z)<4){
        e.yaw=Math.atan2(p.x-e.x,e.z-p.z);e.windupUntil=this.time+650;e.nextAttack=this.time+2550;continue;
      }
      const dx=target.x-e.x,dz=target.z-e.z,len=Math.hypot(dx,dz);
      if(len>.05){
        const speed=e.id%4===2?1.3:e.id%4===3?.82:1;
        const step=Math.min((chasing ? .345 : .29)*speed,len);
        const x=e.x+dx/len*step,z=e.z+dz/len*step;
        if(Math.hypot(x,z)>4.9&&!collidesWorld(x,z,.45,this.broken)){e.x=x;e.z=z;}
        e.yaw=Math.atan2(dx,-dz);
      }
    }
    if(this.vehicles.active&&p.health<100){p.health=Math.min(100,p.health+.02);}
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
