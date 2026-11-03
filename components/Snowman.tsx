"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { RigidBody, BallCollider } from "@react-three/rapier";

export function Snowman({ index }: { index: number }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<any>(null);

  const { startAngle, radius, speed, offset } = useMemo(() => {
    const a = (index / 9) * Math.PI * 2;
    return {
      startAngle: a,
      radius: 14 + (index % 3) * 5,
      speed: 0.25 + (index % 4) * 0.08,
      offset: index * 1.7,
    };
  }, [index]);

  useFrame(({ clock }) => {
    if (!group.current || !body.current) return;
    const t = clock.getElapsedTime() * speed + offset;
    const x = Math.cos(startAngle + t) * radius;
    const z = Math.sin(startAngle + t) * radius;
    group.current.position.set(x, 0, z);
    group.current.rotation.y = startAngle + t + Math.PI / 2;
    body.current.setNextKinematicTranslation({ x, y: 1.2, z });
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={[0, 1.2, 0]}>
      <BallCollider args={[1.1]} />
      <group ref={group}>
        <mesh castShadow position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.9, 16, 16]} />
          <meshStandardMaterial color="#f0f7fc" roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 1.9, 0]}>
          <sphereGeometry args={[0.65, 16, 16]} />
          <meshStandardMaterial color="#f0f7fc" roughness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 2.85, 0]}>
          <sphereGeometry args={[0.48, 16, 16]} />
          <meshStandardMaterial color="#f0f7fc" roughness={0.6} />
        </mesh>
        <mesh position={[-0.15, 2.95, 0.4]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0.15, 2.95, 0.4]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 2.85, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.08, 0.35, 8]} />
          <meshStandardMaterial color="#f97316" />
        </mesh>
        <mesh castShadow position={[0, 3.4, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.45, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[0, 3.15, 0]}>
          <cylinderGeometry args={[0.48, 0.48, 0.08, 12]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[-1.0, 2.0, 0]} rotation={[0, 0, Math.PI / 3]}>
          <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
          <meshStandardMaterial color="#4a3728" />
        </mesh>
        <mesh position={[1.0, 2.0, 0]} rotation={[0, 0, -Math.PI / 3]}>
          <cylinderGeometry args={[0.04, 0.04, 1.1, 6]} />
          <meshStandardMaterial color="#4a3728" />
        </mesh>
      </group>
    </RigidBody>
  );
}
