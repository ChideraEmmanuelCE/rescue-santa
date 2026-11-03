"use client";

import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useMemo } from "react";

function PineTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.25, 0.35, 2.4, 8]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 2.8, 0]}>
        <coneGeometry args={[1.8, 2.6, 8]} />
        <meshStandardMaterial color="#1a4d2e" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 4.2, 0]}>
        <coneGeometry args={[1.3, 2.0, 8]} />
        <meshStandardMaterial color="#1e5c36" roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 5.4, 0]}>
        <coneGeometry args={[0.85, 1.5, 8]} />
        <meshStandardMaterial color="#226b3e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.9, 0]}>
        <coneGeometry args={[0.9, 0.5, 8]} />
        <meshStandardMaterial color="#f0f8ff" roughness={0.4} />
      </mesh>
    </group>
  );
}

export function Terrain() {
  const trees = useMemo(() => {
    const list: [number, number, number][] = [];
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 38;
      if (dist < 10) continue;
      list.push([Math.cos(angle) * dist, 0, Math.sin(angle) * dist]);
    }
    return list;
  }, []);

  return (
    <>
      <RigidBody type="fixed" colliders={false} position={[0, -0.5, 0]}>
        <CuboidCollider args={[60, 0.5, 60]} />
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.5, 0]}>
          <planeGeometry args={[120, 120, 32, 32]} />
          <meshStandardMaterial color="#e8f4fc" roughness={0.75} metalness={0.05} envMapIntensity={0.4} />
        </mesh>
      </RigidBody>

      {[...Array(12)].map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const r = 48;
        return (
          <mesh key={i} position={[Math.cos(a) * r, -1.5, Math.sin(a) * r]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[8 + Math.random() * 4, 16]} />
            <meshStandardMaterial color="#d6ebf7" roughness={0.8} />
          </mesh>
        );
      })}

      {trees.map((pos, i) => (
        <group key={i}>
          <PineTree position={pos} />
          <RigidBody type="fixed" colliders={false} position={pos}>
            <CuboidCollider args={[0.6, 3, 0.6]} position={[0, 3, 0]} />
          </RigidBody>
        </group>
      ))}
    </>
  );
}
