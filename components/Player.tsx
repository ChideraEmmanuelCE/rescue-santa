"use client";

import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import type { MutableRefObject } from "react";
import type { PlayerState } from "@/lib/protocol";
import { InputController } from "@/lib/InputController";
import MultiplayerSync from "@/lib/MultiplayerSync";
import { JUMP_IMPULSE, PLAYER_SPEED, spawnPosition } from "@/lib/world";

import SantaRig, {type Motion} from "./SantaRig";
import { Billboard, Html } from "@react-three/drei";
import { useEffect } from "react";
import { sound } from "@/lib/sound";
export function LocalPlayer({ sync, input, position }: {
  sync: MultiplayerSync;
  input: InputController;
  position: MutableRefObject<THREE.Vector3>;
}) {
  const rigid = useRef<RapierRigidBody>(null);
  const model = useRef<THREE.Group>(null);
  const lastMoveSend = useRef(0);
  const lastThrow = useRef(0);
  const lastJump = useRef(0);
  const loadedRound = useRef(-1);
  const motion = useRef<Motion>({speed:0,airborne:false,shot:-2000});
  const stepClock = useRef(0);
  const identity = useRef("");
  const initial = spawnPosition(0);

  useFrame((_, dt) => {
    const body = rigid.current;
    if (!body) return;
    const me = sync.myPlayer;
    if (me && (loadedRound.current !== sync.round.round || identity.current !== me.id)) {
      loadedRound.current = sync.round.round;
      identity.current=me.id; input.yaw=Math.atan2(-me.x,me.z);
      body.setTranslation({ x: me.x, y: me.y, z: me.z }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    const correction = sync.localCorrection;
    if (correction) {
      sync.localCorrection = null;
      const current = body.translation();
      if (Math.hypot(current.x - correction.x, current.z - correction.z) > .8) {
        body.setTranslation(correction, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
    const p = body.translation();
    const velocity = body.linvel();
    const frozen = !me || sync.round.status !== "playing" || me.stunnedUntil > sync.serverNow() || me.deadUntil > sync.serverNow();
    const movement = frozen ? { x: 0, z: 0 } : input.getMovement();
    const s = Math.sin(input.yaw), c = Math.cos(input.yaw);
    const worldX = movement.x * c + movement.z * s;
    const worldZ = movement.x * s - movement.z * c;
    const alpha = 1 - Math.exp(-dt * 13);
    const vx = THREE.MathUtils.lerp(velocity.x, worldX * PLAYER_SPEED, alpha);
    const vz = THREE.MathUtils.lerp(velocity.z, worldZ * PLAYER_SPEED, alpha);
    body.setLinvel({ x: vx, y: velocity.y, z: vz }, true);

    if (input.consumeJump() && !frozen && p.y < 1.36 && performance.now() - lastJump.current > 480) {
      body.setLinvel({ x: vx, y: JUMP_IMPULSE, z: vz }, true);
      lastJump.current = performance.now(); sound("jump");
    }
    if ((input.consumeThrow() || input.firing) && !frozen && performance.now() - lastThrow.current > 560) {
      sync.send({type:"move",x:p.x,y:p.y,z:p.z,yaw:input.yaw});
      sync.send({ type: "throw" }); sound("fire"); motion.current.shot=performance.now();
      lastThrow.current = performance.now();
    }
    if (model.current) {
      const current=model.current.rotation.y;
      const delta=Math.atan2(Math.sin(-input.yaw-current),Math.cos(-input.yaw-current));
      model.current.rotation.y += delta*(1-Math.exp(-dt*15));
    }
    motion.current.speed=Math.hypot(vx,vz); motion.current.airborne=p.y>1.4;
    stepClock.current+=dt*motion.current.speed; if(stepClock.current>2.1&&!motion.current.airborne){stepClock.current=0;sound("step");}
    position.current.set(p.x, p.y, p.z);
    if (me && performance.now() - lastMoveSend.current > 1000 / 30) {
      // Authoritative server may correct illegal positions. Never transmit during round-over.
      sync.setLocalPose(p.x, p.y, p.z, input.yaw);
      if (!frozen) sync.send({ type: "move", x: p.x, y: p.y, z: p.z, yaw: input.yaw });
      lastMoveSend.current = performance.now();
    }
  });

  const color = sync.myPlayer?.color || "#4ef2ca";
  return <RigidBody ref={rigid} position={[initial.x, initial.y, initial.z]} colliders={false}
    enabledRotations={[false, false, false]} canSleep={false} linearDamping={.15} friction={.8} restitution={0}>
    <CapsuleCollider args={[.44, .42]} friction={.8} />
    <group ref={model} position={[0,-.86,0]}><SantaRig motion={motion}/></group>
  </RigidBody>;
}

export function RemotePlayer({ sync, playerId }: { sync: MultiplayerSync; playerId: string }) {
  const group = useRef<THREE.Group>(null);
  const motion = useRef<Motion>({speed:0,airborne:false,shot:-2000});
  const desired=useRef(new THREE.Vector3());
  const initialized=useRef(false);
  useEffect(()=>sync.onEvent(e=>{
    if(e.type==="snowball" && e.id===playerId){
      motion.current.shot=performance.now();
      const p=sync.players.get(playerId), me=sync.myPlayer;
      if(p && me) sound("fire",Math.min(.7,4/Math.max(4,Math.hypot(p.x-me.x,p.z-me.z))));
    }
  }),[sync,playerId]);
  useFrame((_,dt)=>{
    const p=sync.players.get(playerId),g=group.current;
    if(!p||!g)return;
    desired.current.set(p.x,p.y-.86,p.z);
    const distance=Math.hypot(g.position.x-p.x,g.position.z-p.z);
    if(!initialized.current||distance>5){g.position.copy(desired.current); initialized.current=true;}
    motion.current.speed=Math.min(7,distance*13);
    motion.current.airborne=p.y>1.4;
    g.position.lerp(desired.current,1-Math.exp(-dt*13));
    const delta=-p.yaw-g.rotation.y;
    g.rotation.y+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-dt*14));
  });
  const p=sync.players.get(playerId);
  if(!p)return null;
  return <group ref={group}><SantaRig motion={motion}/><Billboard position={[0,2.65,0]}>
    <Html center distanceFactor={9} style={{pointerEvents:"none",whiteSpace:"nowrap"}}><span className="nameplate" style={{borderColor:p.color}}>{p.name}</span></Html>
  </Billboard></group>;
}
