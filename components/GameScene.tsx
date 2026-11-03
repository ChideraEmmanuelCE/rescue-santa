"use client";

import { Environment, Sky, Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { Player } from "./Player";
import { RemotePlayer } from "./RemotePlayer";
import { Snowman } from "./Snowman";
import { IceCage } from "./IceCage";
import { Terrain } from "./Terrain";
import { SnowParticles } from "./SnowParticles";
import { useGameStore } from "@/lib/store";

export function GameScene() {
  const players = useGameStore((s) => s.players);
  const localId = useGameStore((s) => s.localId);
  const lightRef = useRef<THREE.DirectionalLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.04;
    if (lightRef.current) {
      lightRef.current.position.x = Math.sin(t) * 35;
      lightRef.current.position.z = Math.cos(t) * 35;
      lightRef.current.intensity = 1.15 + Math.sin(t) * 0.35;
    }
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        ref={lightRef}
        castShadow
        position={[25, 45, 15]}
        intensity={1.3}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0005}
      />
      <hemisphereLight args={["#87ceeb", "#1a2a3a", 0.35]} />

      <Sky sunPosition={[80, 15, 60]} turbidity={6} rayleigh={1.8} mieCoefficient={0.005} />
      <Stars radius={120} depth={60} count={2500} factor={3} saturation={0} fade speed={0.4} />
      <Environment preset="night" />

      <Terrain />
      <IceCage />
      <SnowParticles />

      {localId && players[localId] && <Player id={localId} />}

      {Object.values(players)
        .filter((p) => p.id !== localId)
        .map((p) => (
          <RemotePlayer key={p.id} player={p} />
        ))}

      {[...Array(9)].map((_, i) => (
        <Snowman key={i} index={i} />
      ))}
    </>
  );
}
