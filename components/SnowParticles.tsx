"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

const COUNT = 600;

export function SnowParticles() {
  const points = useRef<THREE.Points>(null);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 90;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
      vel[i] = 0.8 + Math.random() * 1.4;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame((_, delta) => {
    if (!points.current) return;
    const arr = points.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] -= velocities[i] * delta * 3.5;
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 0.1 + i) * 0.3 * delta;
      if (arr[i * 3 + 1] < -2) {
        arr[i * 3 + 1] = 35 + Math.random() * 10;
        arr[i * 3] = (Math.random() - 0.5) * 90;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 90;
      }
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.18} color="#e0f2fe" transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}
