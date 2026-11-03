"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { PlayerState } from "@/lib/store";

export function RemotePlayer({ player }: { player: PlayerState }) {
  const group = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(player.x, player.y, player.z));
  const targetRot = useRef(player.rotationY);

  useFrame((_, delta) => {
    if (!group.current) return;
    targetPos.current.set(player.x, player.y, player.z);
    targetRot.current = player.rotationY;
    group.current.position.lerp(targetPos.current, Math.min(1, 10 * delta));
    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetRot.current, Math.min(1, 10 * delta));
  });

  return (
    <group ref={group} position={[player.x, player.y, player.z]}>
      <mesh castShadow position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.38, 0.7, 6, 12]} />
        <meshStandardMaterial color={player.color} roughness={0.35} />
      </mesh>
      <mesh castShadow position={[0, 1.55, 0]}>
        <coneGeometry args={[0.4, 0.55, 12]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>
      <mesh position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color="#f8fafc" />
      </mesh>
    </group>
  );
}
