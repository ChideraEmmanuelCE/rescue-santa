"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useGameStore } from "@/lib/store";
import { sendInteract } from "@/lib/multiplayer";

const MOVE_SPEED = 9;
const JUMP_FORCE = 8;

export function Player({ id }: { id: string }) {
  const body = useRef<any>(null);
  const { camera } = useThree();
  const player = useGameStore((s) => s.players[id]);
  const upsert = useGameStore((s) => s.upsertPlayer);
  const setIceProgress = useGameStore((s) => s.setIceProgress);
  const cageMelted = useGameStore((s) => s.cageMelted);
  const addScore = useGameStore((s) => s.addScore);

  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false, space: false, e: false });
  const isGrounded = useRef(true);
  const interactTimer = useRef(0);
  const lastPos = useRef(new THREE.Vector3());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "e"].includes(k)) setKeys((p) => ({ ...p, [k]: true }));
      if (k === " ") setKeys((p) => ({ ...p, space: true }));
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "e"].includes(k)) setKeys((p) => ({ ...p, [k]: false }));
      if (k === " ") setKeys((p) => ({ ...p, space: false }));
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, delta) => {
    if (!body.current || !player) return;
    const rb = body.current;
    const pos = rb.translation();
    const linvel = rb.linvel();

    const camOffset = new THREE.Vector3(0, 7, 14);
    camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotationY);
    const targetCam = new THREE.Vector3(pos.x, pos.y, pos.z).add(camOffset);
    camera.position.lerp(targetCam, Math.min(1, 6 * delta));
    camera.lookAt(pos.x, pos.y + 1.6, pos.z);

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotationY);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotationY);

    let vx = 0, vz = 0;
    if (keys.w) { vx += forward.x; vz += forward.z; }
    if (keys.s) { vx -= forward.x; vz -= forward.z; }
    if (keys.a) { vx -= right.x; vz -= right.z; }
    if (keys.d) { vx += right.x; vz += right.z; }

    const len = Math.sqrt(vx * vx + vz * vz);
    if (len > 0) {
      vx = (vx / len) * MOVE_SPEED;
      vz = (vz / len) * MOVE_SPEED;
      rb.setLinvel({ x: vx, y: linvel.y, z: vz }, true);
      const targetRot = Math.atan2(vx, vz);
      const newRot = THREE.MathUtils.lerp(player.rotationY, targetRot, 12 * delta);
      upsert({ ...player, rotationY: newRot });
    } else {
      rb.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
    }

    if (keys.space && isGrounded.current && linvel.y < 0.5) {
      rb.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
      isGrounded.current = false;
    }
    if (pos.y < 1.4) isGrounded.current = true;

    const distToCage = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (keys.e && distToCage < 7 && !cageMelted) {
      interactTimer.current += delta;
      const prog = Math.min(5, interactTimer.current);
      setIceProgress(prog);
      sendInteract(prog);
      upsert({ ...player, interacting: true });
      if (prog >= 5) addScore(1000);
    } else {
      interactTimer.current = Math.max(0, interactTimer.current - delta * 0.6);
      upsert({ ...player, interacting: false });
    }

    if (Math.abs(pos.x - lastPos.current.x) > 0.02 || Math.abs(pos.z - lastPos.current.z) > 0.02) {
      lastPos.current.set(pos.x, pos.y, pos.z);
      upsert({ ...player, x: pos.x, y: pos.y, z: pos.z });
    }
  });

  if (!player) return null;

  return (
    <RigidBody ref={body} position={[player.x, player.y, player.z]} colliders={false} enabledRotations={[false, true, false]} linearDamping={0.8} mass={1} lockRotations>
      <CapsuleCollider args={[0.45, 0.35]} position={[0, 0.85, 0]} />
      <group>
        <mesh castShadow position={[0, 0.85, 0]}>
          <capsuleGeometry args={[0.38, 0.7, 6, 12]} />
          <meshStandardMaterial color={player.color} roughness={0.35} metalness={0.05} />
        </mesh>
        <mesh castShadow position={[0, 1.55, 0]}>
          <coneGeometry args={[0.4, 0.55, 12]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0, 1.78, 0]}>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
        <mesh position={[0, 1.15, 0.25]}>
          <boxGeometry args={[0.5, 0.12, 0.08]} />
          <meshStandardMaterial color="#f8fafc" />
        </mesh>
      </group>
    </RigidBody>
  );
}
