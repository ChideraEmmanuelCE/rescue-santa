"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/lib/store";
import { RigidBody, CuboidCollider } from "@react-three/rapier";

export function IceCage() {
  const iceProgress = useGameStore((s) => s.iceProgress);
  const cageMelted = useGameStore((s) => s.cageMelted);
  const cageRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (cageRef.current && !cageMelted) {
      cageRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.05;
    }
    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + Math.sin(clock.getElapsedTime() * 2) * 0.1 + iceProgress * 0.08;
    }
  });

  const meltScale = cageMelted ? 0.01 : 1 - iceProgress * 0.12;
  const opacity = cageMelted ? 0 : 0.55 + iceProgress * 0.08;

  return (
    <group position={[0, 0, 0]}>
      <mesh receiveShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[5.5, 6, 0.3, 32]} />
        <meshStandardMaterial color="#c8e6f5" roughness={0.3} metalness={0.2} />
      </mesh>

      {!cageMelted && (
        <group ref={cageRef} scale={[meltScale, meltScale, meltScale]}>
          {[...Array(12)].map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 3.2, 2.5, Math.sin(a) * 3.2]} castShadow>
                <boxGeometry args={[0.25, 5, 0.25]} />
                <meshPhysicalMaterial color="#a8d8f0" transparent opacity={opacity} roughness={0.1} metalness={0.1} transmission={0.6} thickness={0.5} />
              </mesh>
            );
          })}
          <mesh position={[0, 5, 0]} castShadow>
            <torusGeometry args={[3.2, 0.2, 8, 32]} />
            <meshPhysicalMaterial color="#b0e0f0" transparent opacity={opacity} roughness={0.1} transmission={0.5} />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <torusGeometry args={[3.2, 0.18, 8, 32]} />
            <meshPhysicalMaterial color="#b0e0f0" transparent opacity={opacity} roughness={0.1} transmission={0.5} />
          </mesh>
        </group>
      )}

      <group position={[0, cageMelted ? 1.5 : 1.8, 0]}>
        <mesh castShadow position={[0, 0.9, 0]}>
          <capsuleGeometry args={[0.45, 0.9, 8, 16]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <mesh castShadow position={[0, 1.85, 0]}>
          <sphereGeometry args={[0.38, 16, 16]} />
          <meshStandardMaterial color="#fde8d0" />
        </mesh>
        <mesh castShadow position={[0, 2.35, 0]}>
          <coneGeometry args={[0.42, 0.7, 16]} />
          <meshStandardMaterial color="#dc2626" />
        </mesh>
        <mesh position={[0, 2.65, 0]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0, 1.55, 0.25]}>
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshStandardMaterial color="white" />
        </mesh>
      </group>

      <mesh ref={glowRef} position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.2, 5.2, 32]} />
        <meshBasicMaterial color="#7dd3fc" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      <RigidBody type="fixed" colliders={false} position={[0, 1, 0]}>
        <CuboidCollider args={[2.8, 2.5, 2.8]} />
      </RigidBody>
    </group>
  );
}
