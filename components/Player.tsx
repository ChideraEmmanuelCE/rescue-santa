"use client";

import { useFrame } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useRef } from "react";
import * as THREE from "three";
import type { MutableRefObject } from "react";

import { InputController } from "@/lib/InputController";
import SoloGame from "@/lib/SoloGame";
import { JUMP_IMPULSE, PLAYER_SPEED, spawnPosition } from "@/lib/world";

import SantaRig, {type Motion} from "./SantaRig";

import { sound } from "@/lib/sound";
export function LocalPlayer({ game, input, position }: {
  game: SoloGame;
  input: InputController;
  position: MutableRefObject<THREE.Vector3>;
}) {
  const rigid = useRef<RapierRigidBody>(null);
  const model = useRef<THREE.Group>(null);

  const lastBell=useRef(0);
  const lastJump = useRef(0);
  const lastSpawn = useRef(-1);
  const motion = useRef<Motion>({speed:0,airborne:false,shot:-2000});
  const stepClock = useRef(0);

  const initial = spawnPosition(0);

  useFrame((_, dt) => {
    const body = rigid.current;
    if (!body) return;
    const me = game.myPlayer;
    const mounted=game.vehicles.active;
    if(mounted){
      const v=input.getMovement();
      game.setVehicleControls(v.x,v.z,input.keys.has("Space"),input.keys.has("ShiftLeft")||input.keys.has("ShiftRight"));
      const dest={x:mounted.x,y:1.15,z:mounted.z};
      body.setTranslation(dest,true);body.setLinvel({x:0,y:0,z:0},true);
      if(model.current)model.current.visible=false;
      input.yaw=mounted.heading;
      input.consumeJump();input.consumeThrow();
      position.current.set(dest.x,dest.y,dest.z);
      game.setLocalPose(dest.x,dest.y,dest.z,mounted.heading);
      return;
    }
    if(model.current)model.current.visible=true;
    if (me && lastSpawn.current !== game.spawnVersion) {
      lastSpawn.current = game.spawnVersion;
      input.yaw=me.yaw;
      body.setTranslation({ x: me.x, y: me.y, z: me.z }, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    const p = body.translation();
    const velocity = body.linvel();
    const frozen = !me || !game.playable || me.stunnedUntil > game.now() || me.deadUntil > game.now();
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
    const shot=input.consumeThrow();
    if(frozen)input.cancelThrow();
    if(shot!==null && !frozen){
      game.setLocalPose(p.x,p.y,p.z,input.yaw);
      if(game.fire(shot)){sound("fire",shot?1:.65);motion.current.shot=performance.now();}
    }
    const distance=Math.hypot(p.x,p.z-game.santaZ);
    if(!frozen && distance<30 && game.now()-lastBell.current>1500+distance*95){
      lastBell.current=game.now();sound("bell",1-distance/35);
    }
    if (model.current) {
      const current=model.current.rotation.y;
      const delta=Math.atan2(Math.sin(-input.yaw-current),Math.cos(-input.yaw-current));
      model.current.rotation.y += delta*(1-Math.exp(-dt*15));
    }
    motion.current.speed=Math.hypot(vx,vz); motion.current.airborne=p.y>1.4;
    stepClock.current+=dt*motion.current.speed; if(stepClock.current>2.1&&!motion.current.airborne){stepClock.current=0;sound("step");}
    position.current.set(p.x, p.y, p.z);
    game.setLocalPose(p.x,p.y,p.z,input.yaw);
  });

  return <RigidBody ref={rigid} position={[initial.x, initial.y, initial.z]} colliders={false}
    enabledRotations={[false, false, false]} canSleep={false} linearDamping={.15} friction={.8} restitution={0}>
    <CapsuleCollider args={[.44, .42]} friction={.8} />
    <group ref={model} position={[0,-.86,0]}><SantaRig motion={motion}/></group>
  </RigidBody>;
}

