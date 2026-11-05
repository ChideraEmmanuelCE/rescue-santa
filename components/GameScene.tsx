"use client";

import { memo, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject, RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Html, Sky, Stars } from "@react-three/drei";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import SoloGame from "@/lib/SoloGame";
import { InputController } from "@/lib/InputController";
import type { GameEvent } from "@/lib/protocol";
import { LocalPlayer } from "./Player";
import SnowTrail from "./SnowTrail";
import {RouteMarkers,SleighEscape} from "./EscapeTrail";
import {useSyncExternalStore} from "react";
import WinterLight, { Powder } from "./WinterLight";
import Scenery from "./Scenery";
import NorthPoleDistrict,{NorthPoleCollisions} from "./NorthPoleDistrict";
import SkyChapter from "./SkyChapter";
import CityChapter from "./CityChapter";
import { ENEMY_COUNT, enemyPosition, ICE_WALLS, random01, TREES, WORLD_HALF, collidesWall } from "@/lib/world";

function snowSurfaceTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const data = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4;
    const grain = random01(x * 17 + y * 41 + 17);
    const sparkle = grain > .994 ? 255 : 0;
    const shade = Math.round(198 + grain * 30 + 8*Math.sin((x+y)*.09817477+2*Math.sin(y*.073631)) + 6*Math.cos(y*.049087+x*.024544));
    data.data[i] = Math.min(255, shade + sparkle / 5);
    data.data[i + 1] = Math.min(255, shade + 8 + sparkle / 6);
    data.data[i + 2] = Math.min(255, shade + 15 + sparkle / 7);
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(31, 31);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function Ground() {
  const texture = useMemo(() => snowSurfaceTexture(), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <>
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -.055, 0]}>
      <planeGeometry args={[WORLD_HALF * 2, WORLD_HALF * 2, 1, 1]} />
      <meshPhysicalMaterial map={texture} color="#edf4f2" roughness={.94} metalness={0} clearcoat={.05} bumpMap={texture} bumpScale={.14} />
    </mesh>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.18,0]}><planeGeometry args={[550,550]}/><meshStandardMaterial color="#cfdae1" roughness={.95}/></mesh>
    <RigidBody type="fixed" colliders={false} name="ground">
      <CuboidCollider args={[WORLD_HALF, .2, WORLD_HALF]} position={[0, -.24, 0]} friction={1.0} />
    </RigidBody>
    <RigidBody type="fixed" colliders={false}>
      <CuboidCollider args={[.5, 2.5, WORLD_HALF]} position={[WORLD_HALF, 2.5, 0]} />
      <CuboidCollider args={[.5, 2.5, WORLD_HALF]} position={[-WORLD_HALF, 2.5, 0]} />
      <CuboidCollider args={[WORLD_HALF, 2.5, .5]} position={[0, 2.5, WORLD_HALF]} />
      <CuboidCollider args={[WORLD_HALF, 2.5, .5]} position={[0, 2.5, -WORLD_HALF]} />
    </RigidBody>
  </>;
}

function ForestCollisions() {
  return <RigidBody type="fixed" colliders={false}>
    {TREES.map((t,i)=><CuboidCollider key={i} position={[t.x,t.size*.9,t.z]} args={[t.size*.30,t.size*.9,t.size*.30]}/>)}
  </RigidBody>;
}

function IceBarricades({game}:{game:SoloGame}){
  const mask=useSyncExternalStore(game.subscribe,()=>[...game.broken].reduce((a,i)=>a|(1<<i),0),()=>0);
  const stems=useRef<THREE.InstancedMesh>(null),tips=useRef<THREE.InstancedMesh>(null);
  const pieces=useMemo(()=>ICE_WALLS.flatMap((w,i)=>{
    if(mask & (1<<i))return [];
    const count=Math.ceil(w.width/.95);
    return Array.from({length:count},(_,j)=>{
      const offset=(j+.5-count/2)*w.width/count,shift=(random01(i*19+j)-.5)*.28;
      return {x:w.x+offset*Math.cos(w.yaw)-shift*Math.sin(w.yaw),z:w.z+offset*Math.sin(w.yaw)+shift*Math.cos(w.yaw),
        h:1.5+random01(i*45+j*17)*1.8,r:.39+random01(j*3+i)*.2,yaw:w.yaw+j*.8,tilt:(random01(i+j*4)-.5)*.16};
    });
  }),[mask]);
  useEffect(()=>{
    const o=new THREE.Object3D(),color=new THREE.Color();
    pieces.forEach((v,i)=>{
      o.position.set(v.x,v.h*.39,v.z);o.rotation.set(0,v.yaw,v.tilt);o.scale.set(v.r,v.h*.78,v.r);o.updateMatrix();stems.current!.setMatrixAt(i,o.matrix);
      color.set(i%3?"#9cc8d4":"#c0dce3");stems.current!.setColorAt(i,color);
      o.position.y=v.h*.84;o.scale.set(v.r*.72,v.h*.35,v.r*.72);o.updateMatrix();tips.current!.setMatrixAt(i,o.matrix);
    });
    for(const m of [stems.current,tips.current])if(m){m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}
  },[pieces]);
  return <>
    <instancedMesh ref={stems} args={[undefined,undefined,pieces.length]} castShadow receiveShadow><cylinderGeometry args={[.6,1,1,6]}/><meshStandardMaterial roughness={.29} metalness={.12}/></instancedMesh>
    <instancedMesh ref={tips} args={[undefined,undefined,pieces.length]} castShadow><coneGeometry args={[1,1,6]}/><meshStandardMaterial color="#d2e5e8" roughness={.33}/></instancedMesh>
    {ICE_WALLS.map((w,i)=>!(mask&(1<<i))&&<group key={i} position={[w.x,1.4,w.z]} rotation-y={-w.yaw}>
      {[-1,1].map(side=><group key={side} position-z={side*.7}>
        <mesh rotation-z={-.5}><boxGeometry args={[.07,1,.055]}/><meshBasicMaterial color="#3e8f9e"/></mesh>
        <mesh position={[-.03,.63,0]} rotation-z={.65}><boxGeometry args={[.055,.65,.055]}/><meshBasicMaterial color="#3e8f9e"/></mesh>
      </group>)}
    </group>)}
    <RigidBody type="fixed" colliders={false}>{ICE_WALLS.map((w,i)=>!(mask & (1<<i)) && <CuboidCollider key={i} args={[w.width/2,1.65,w.depth/2]} position={[w.x,1.65,w.z]} rotation={[0,-w.yaw,0]}/>)}</RigidBody>
  </>;
}

function IceCage({ game }: { game: SoloGame }) {
  const group = useRef<THREE.Group>(null);
  const captive=useSyncExternalStore(game.subscribe,()=>game.round.status==="playing",()=>true);
  useFrame((_, dt) => {
    if (!group.current) return;
    const scale = game.round.status === "playing" ? 1 : .001;
    group.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 1 - Math.exp(-dt * 1.65));
    group.current.rotation.y += dt * .025;
  });
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .08, 0]} receiveShadow>
      <circleGeometry args={[4.45, 48]} />
      <meshPhysicalMaterial color="#82b7d3" roughness={.14} metalness={.23} clearcoat={1} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .12, 0]}>
      <ringGeometry args={[4.1, 4.3, 64]} /><meshBasicMaterial color="#78f0ff" toneMapped={false} transparent opacity={.9} side={THREE.DoubleSide} />
    </mesh>
    <SleighEscape game={game}/>
    <group ref={group}>
      {Array.from({ length: 10 }, (_, i) => {
        const theta = i / 10 * Math.PI * 2;
        return <mesh key={i} castShadow position={[Math.sin(theta) * 3.6, 2.48, Math.cos(theta) * 3.6]}>
          <cylinderGeometry args={[.16, .27, 4.8, 7]} />
          <meshPhysicalMaterial color="#8ad8f2" metalness={.08} roughness={.08}  thickness={.7} clearcoat={1} transparent opacity={.65} />
        </mesh>;
      })}
      <mesh position={[0, 4.92, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.62, .28, 10, 48]} /><meshPhysicalMaterial color="#aaf0ff" roughness={.13}  thickness={.8} /></mesh>
      <mesh position={[0, 5.0, 0]}><sphereGeometry args={[3.48, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshPhysicalMaterial color="#83c9f1" roughness={.11} metalness={.08}  transparent opacity={.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
    {captive && <Billboard position={[0, 6.2, 0]} follow>
      <Html center distanceFactor={13} style={{ pointerEvents: "none", whiteSpace: "nowrap" }}>
        <div style={{ padding: "7px 12px", borderRadius: 18, background: "rgba(6,32,51,.8)", border: "1px solid #b1edff80", color: "#e7faff", fontSize: 13, fontWeight: 800, textShadow: "0 1px 4px #000" }}>✦ FREE SANTA ✦</div>
      </Html>
    </Billboard>}
    <pointLight position={[0, 5.1, 0]} color="#95e6ff" intensity={22} distance={15} decay={2} />
  </group>;
}

function Snowman({ game, id }: { game: SoloGame; id: number }) {
  const group=useRef<THREE.Group>(null),head=useRef<THREE.Group>(null),arms=useRef<THREE.Group>(null),eyes=useRef<THREE.Group>(null);
  const heart=useRef<THREE.Group>(null);
  useFrame(({clock},dt)=>{
    const item=game.enemies.get(id);
    if(!group.current)return;
    const e=item||enemyPosition(id,game.now());
    const down=Boolean(item && item.downUntil>game.now());
    const stunned=Boolean(item && item.stunnedUntil>game.now());
    const winding=Boolean(item && item.windupUntil>game.now());
    group.current.rotation.x=winding?-.18:0;
    const attacking=Boolean(item && item.attackUntil>game.now());
    group.current.position.lerp(new THREE.Vector3(e.x,down?-.85:Math.sin(clock.elapsedTime*3.3+id)*.055,e.z),1-Math.exp(-dt*9));
    const da=Math.atan2(Math.sin(-e.yaw-group.current.rotation.y),Math.cos(-e.yaw-group.current.rotation.y));
    group.current.rotation.y+=da*(1-Math.exp(-dt*9));
    const scale=down ? .012 : stunned ? .88 : 1;
    group.current.scale.lerp(new THREE.Vector3(scale,scale,scale),1-Math.exp(-dt*8));
    if(head.current)head.current.rotation.z=stunned?.25:Math.sin(clock.elapsedTime*2+id)*.04;
    if(arms.current)arms.current.rotation.x=attacking?-1.15:Math.sin(clock.elapsedTime*4+id)*.13;
    if(eyes.current)eyes.current.scale.setScalar(winding?1.5+.42*Math.sin(clock.elapsedTime*30):attacking?1.35:1);
    if(heart.current){heart.current.visible=Boolean(item&&item.health<3&&!down);heart.current.scale.x=Math.max(.01,(item?.health??3)/3);}
  });
  return <group ref={group}>
    <mesh castShadow receiveShadow position={[0,.78,0]}><sphereGeometry args={[.88,20,16]}/><meshStandardMaterial color="#dee9e7" roughness={.81}/></mesh>
    <mesh castShadow position={[0,1.92,0]}><sphereGeometry args={[.65,20,16]}/><meshStandardMaterial color="#ecf4f1" roughness={.82}/></mesh>
    <group ref={head}>
      <mesh castShadow position={[0,2.64,0]}><sphereGeometry args={[.49,18,14]}/><meshStandardMaterial color="#d4e2e4" roughness={.78}/></mesh>
      <group ref={eyes}>{[-.2,.2].map(x=><group key={x}>
        <mesh position={[x,2.72,-.433]}><sphereGeometry args={[.10,12,9]}/><meshStandardMaterial color="#ef2b43" emissive="#ff1436" emissiveIntensity={2}/></mesh>
        <mesh position={[x,2.9,-.43]} rotation={[0,0,x>0?-.4:.4]}><boxGeometry args={[.25,.06,.07]}/><meshStandardMaterial color="#25313c" roughness={.8}/></mesh>
      </group>)}</group>
      <mesh position={[0,2.52,-.65]} rotation={[Math.PI/2,0,0]}><coneGeometry args={[.12,.62,10]}/><meshStandardMaterial color="#e98c37" roughness={.86}/></mesh>
      <mesh castShadow position={[0,3.23,0]}><cylinderGeometry args={[.42,.42,.75,18]}/><meshStandardMaterial color="#242b31" roughness={.72}/></mesh>
      <mesh castShadow position={[0,2.87,0]}><cylinderGeometry args={[.72,.72,.12,18]}/><meshStandardMaterial color="#232932" roughness={.75}/></mesh>
      <mesh position={[0,3.07,0]}><cylinderGeometry args={[.425,.425,.12,18]}/><meshStandardMaterial color="#ba263d" roughness={.8}/></mesh>
    </group>
    <group ref={arms}>{[-1,1].map(side=><group key={side} position={[side*.96,1.78,0]} rotation={[0,0,side*.9]}>
      <mesh castShadow><cylinderGeometry args={[.08,.15,1.27,9]}/><meshStandardMaterial color="#604635" roughness={1}/></mesh>
      {[-1,0,1].map((j)=><mesh key={j} castShadow position={[side*.1,-.61,j*.16]} rotation={[j*.3,0,side*.22]}><coneGeometry args={[.07,.51,5]}/><meshStandardMaterial color="#584632" roughness={1}/></mesh>)}
    </group>)}</group>
    {[0,1,2].map(i=><mesh key={i} position={[0,2.05-i*.5,-.64+((i===0)?.01:0)]}><sphereGeometry args={[.08,10,8]}/><meshStandardMaterial color="#20323a"/></mesh>)}
    <group ref={heart} position={[0,3.95,0]} visible={false}>
      <mesh position={[0,0,0]}><planeGeometry args={[1.0,.12]}/><meshBasicMaterial color="#1c3340" side={THREE.DoubleSide}/></mesh>
      <mesh position={[-.35,0,.012]}><planeGeometry args={[.3,.1]}/><meshBasicMaterial color="#e76169" side={THREE.DoubleSide}/></mesh>
    </group>
  </group>;
}

function FollowCamera({game,input,position,lowPower}:{game:SoloGame;input:InputController;position:MutableRefObject<THREE.Vector3>;lowPower:boolean}){
 const {camera}=useThree();
 const focus=useRef(new THREE.Vector3(0,2,34));
 const yawRef=useRef(0);
 const desired=new THREE.Vector3();
 const front=new THREE.Vector3();
 useFrame((_,dt)=>{
   if(game.round.status==="launching"){
     const t=5-(game.round.resetAt-game.now())/1000;
     desired.set(9,4+t*.9,-3-t*2);camera.position.lerp(desired,1-Math.exp(-dt*3));
     front.set(0,1+t*t*.8,-14-t*t*1.65);focus.current.lerp(front,1-Math.exp(-dt*5));camera.lookAt(focus.current);return;
   }
   const follow=position.current;
   const alpha=1-Math.exp(-dt*7.5);
   const d=Math.atan2(Math.sin(input.yaw-yawRef.current),Math.cos(input.yaw-yawRef.current));
   yawRef.current+=d*(1-Math.exp(-dt*12));
   const mounted=game.vehicles.active;
   const yaw=yawRef.current,dist=mounted?(lowPower?9.5:11.5):(lowPower?5.3:6.2);
   const h=(mounted?3.6:1.9)+input.pitch*3.2;
   front.set(follow.x+Math.sin(yaw)*4, Math.max(.5,follow.y)+1.15-input.pitch*2,follow.z-Math.cos(yaw)*4);
   let distance=dist;
   // Pull camera toward the avatar near ice or trees rather than clipping through them.
   for(let t=.35;t<1;t+=.14){
     const x=follow.x-Math.sin(yaw)*dist*t,z=follow.z+Math.cos(yaw)*dist*t;
     const obstruct=collidesWall(x,z,.3,game.broken)||TREES.some(tr=>Math.hypot(tr.x-x,tr.z-z)<tr.size*.49+.12);
     if(obstruct){distance=Math.max(1.8,dist*Math.max(.26,t-.16));break;}
   }
   desired.set(follow.x-Math.sin(yaw)*distance+Math.cos(yaw)*.7,Math.max(1.75,follow.y+h),follow.z+Math.cos(yaw)*distance+Math.sin(yaw)*.7);
   camera.position.lerp(desired,alpha);
   focus.current.lerp(front,1-Math.exp(-dt*13));
   camera.lookAt(focus.current);
   const targetFov=mounted?Math.min(80,(lowPower?65:62)+8+Math.abs(mounted.speed)*.21):(lowPower?65:62);
   if(Math.abs((camera as THREE.PerspectiveCamera).fov-targetFov)>.03){(camera as THREE.PerspectiveCamera).fov=THREE.MathUtils.damp((camera as THREE.PerspectiveCamera).fov,targetFov,6,dt);(camera as THREE.PerspectiveCamera).updateProjectionMatrix();}
 });
 return null;
}

type Projectile = { key: number; x: number; y: number; z: number; yaw: number; created: number; heavy:boolean; range:number; hitEnemy: number | null };
function Snowball({ item, expire }: { item: Projectile; expire: (key: number) => void }) {
  const group = useRef<THREE.Group>(null);
  const done = useRef(false);
  useFrame(() => {
    if (!group.current) return;
    const age = (performance.now() - item.created) / 1000;
    if (age > item.range/25) {
      if (!done.current) { done.current = true; expire(item.key); }
      return;
    }
    const t = Math.min(age, .78);
    const distance = t * 25;
    group.current.rotation.y=-item.yaw;
    group.current.position.set(item.x + Math.sin(item.yaw) * distance,
      item.y + Math.sin(t / .8 * Math.PI) * .25, item.z - Math.cos(item.yaw) * distance);
    group.current.scale.setScalar(item.heavy?1.65:1);
  });
  return <group ref={group}>
    <mesh castShadow><sphereGeometry args={[.31, 16, 12]} /><meshStandardMaterial color="#f5fcff" roughness={.58} emissive="#aeefff" emissiveIntensity={.1} /></mesh>
    
    {[0,1,2,3].map(i=><mesh key={i} position={[0,.08*i,.18+i*.16]} scale={.72-i*.12}><sphereGeometry args={[.115,9,6]}/><meshBasicMaterial color="#dcf9ff" transparent opacity={.45-i*.08}/></mesh>)}
  </group>;
}

type Burst={key:number;pos:THREE.Vector3;created:number};
function IceBurst({burst,expire}:{burst:Burst;expire:(id:number)=>void}){
 const ref=useRef<THREE.Group>(null);const positions=useMemo(()=>Array.from({length:13},(_,i)=>new THREE.Vector3((random01(i*17+burst.key*5)-.5)*2,(random01(i*33+burst.key*8)-.15)*2,(random01(i*37+burst.key*13)-.5)*2).normalize()),[burst.key]);
 const finished=useRef(false);
 useFrame(()=>{const t=(performance.now()-burst.created)/1000;if(t>.55){if(!finished.current){finished.current=true;expire(burst.key)}return;}if(ref.current){ref.current.position.copy(burst.pos);ref.current.scale.setScalar((.3+t*3.7)*(1-t/1.2));ref.current.rotation.y+=.04;}});
 return <group ref={ref}>{positions.map((v,i)=><mesh key={i} position={[v.x,v.y,v.z]} rotation={[v.z,v.x,v.y]}><octahedronGeometry args={[i%2?.08:.15,0]}/><meshBasicMaterial color={i%3===0?"#fce4bc":"#d6f6ff"} transparent opacity={.9}/></mesh>)}</group>;
}
function SnowballEffects({game}:{game:SoloGame}){
 const [shots,setShots]=useState<Projectile[]>([]);
 const [bursts,setBursts]=useState<Burst[]>([]);
 const nextId=useRef(0);
 useEffect(()=>game.onEvent((event:GameEvent)=>{
   if(event.type==="snowball"){
     const shot:Projectile={key:nextId.current++,x:event.x,y:event.y,z:event.z,yaw:event.yaw,created:performance.now(),heavy:event.heavy,range:event.range,hitEnemy:event.hitEnemy};
     setShots(items=>[...items.slice(-18),shot]);
   } else if(event.type==="shatter"){
     setBursts(items=>[...items.slice(-10),{key:nextId.current++,pos:new THREE.Vector3(event.x,1.4,event.z),created:performance.now()}]);
   } else if(event.type==="enemyHit"){
     const e=game.enemies.get(event.id);
     if(e)setBursts(items=>[...items.slice(-10),{key:nextId.current++,pos:new THREE.Vector3(e.x,2.15,e.z),created:performance.now()}]);
   }
 }),[game]);
 return <>{shots.map(shot=><Snowball key={shot.key} item={shot} expire={key=>setShots(list=>list.filter(x=>x.key!==key))}/>)}
   {bursts.map(b=><IceBurst key={b.key} burst={b} expire={key=>setBursts(list=>list.filter(x=>x.key!==key))}/>)}
 </>;
}

function ResolutionBudget({mobile}:{mobile:boolean}){
  const setDpr=useThree(s=>s.setDpr), last=useRef({time:0,frames:0,ratio:0});
  useFrame((_,dt)=>{
    const v=last.current; if(document.hidden||dt>.25)return;
    v.time+=dt;v.frames++;if(v.time<3)return;
    const max=Math.min(window.devicePixelRatio,mobile?1.4:1.8),current=v.ratio||max,avg=v.time/v.frames;
    const ratio=THREE.MathUtils.clamp(current+(avg>.027?-.16:avg<.017?.08:0),.75,max);
    if(Math.abs(current-ratio)>.01){v.ratio=ratio;setDpr(ratio);}v.time=0;v.frames=0;
  });return null;
}
function World({ game, input, lowPower }: { game: SoloGame; input: InputController; lowPower: boolean }) {
  const captive=useSyncExternalStore(game.subscribe,()=>game.round.status==="playing",()=>true);
  useFrame((_,dt)=>game.advance(dt));
  const playerPosition = useRef(new THREE.Vector3(0, 1.15, 36.5));

  return <>
    <color attach="background" args={["#a6bac8"]} />
    <fogExp2 attach="fog" args={["#b8cdd2", .007]} />
    <WinterLight lowPower={lowPower} />
    <Physics gravity={[0, -24, 0]} timeStep={1 / 60} interpolate>
      <Ground />
      <Scenery lowPower={lowPower}/><ForestCollisions/><NorthPoleCollisions lowPower={lowPower}/>
      <IceBarricades game={game}/><RouteMarkers game={game}/>
      {captive && <RigidBody type="fixed" colliders={false}>
        {Array.from({ length: 12 }, (_, i) => {
          const theta = i * Math.PI * 2 / 12;
          return <CuboidCollider key={i} args={[1.0, 2.4, .23]}
            position={[Math.sin(theta) * 3.6, 2.4, Math.cos(theta) * 3.6]}
            rotation={[0, theta, 0]} />;
        })}
      </RigidBody>}
      <LocalPlayer game={game} input={input} position={playerPosition} />
    </Physics>
    <NorthPoleDistrict game={game} lowPower={lowPower}/>
    <IceCage game={game} />
    {Array.from({ length: ENEMY_COUNT }, (_, id) => <Snowman key={id} game={game} id={id} />)}

    <SnowTrail game={game} position={playerPosition}/>
    <SnowballEffects game={game} />
    <Powder count={lowPower ? 600 : 1450} />
    <FollowCamera game={game} input={input} position={playerPosition} lowPower={lowPower} />
  </>;
}

function GameScene({ game, input, lowPower }: {
  game: SoloGame; input: InputController; lowPower: boolean;
}) {
  const phase=useSyncExternalStore(game.subscribe,()=>game.round.status,()=> "playing" as const);
  const chapterTwo=phase==="flight"||phase==="village"||phase==="cityLaunch";
  const city=phase==="city"||phase==="rescued"||phase==="routeEnded";
  return <div className="absolute inset-0">
    <Canvas shadows dpr={lowPower ? [1, 1.4] : [1, 1.8]}
      camera={{ position: [0, 5, 43], fov: 66, near: .1, far: 450 }}
      gl={{ antialias: !lowPower, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.07; }}>
      <ResolutionBudget mobile={lowPower}/><Suspense fallback={null}>{city?<CityChapter game={game} input={input} lowPower={lowPower}/>:chapterTwo?<SkyChapter game={game} input={input} lowPower={lowPower}/>:<World game={game} input={input} lowPower={lowPower} />}</Suspense>
    </Canvas>
  </div>;
}

// HUD updates arrive at 10 Hz. The scene subscribes to chapter changes itself.
export default memo(GameScene);
