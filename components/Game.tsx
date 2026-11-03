"use client";

import { Canvas } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { Suspense, useEffect } from "react";
import { GameScene } from "./GameScene";
import { UIOverlay } from "./UIOverlay";
import { useGameStore } from "@/lib/store";
import { connectMultiplayer, disconnectMultiplayer } from "@/lib/multiplayer";

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

export default function Game() {
  const setLocalId = useGameStore((s) => s.setLocalId);
  const upsertPlayer = useGameStore((s) => s.upsertPlayer);

  useEffect(() => {
    const id = crypto.randomUUID();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnDist = 32 + Math.random() * 8;

    const local = {
      id,
      x: Math.cos(spawnAngle) * spawnDist,
      y: 3,
      z: Math.sin(spawnAngle) * spawnDist,
      rotationY: 0,
      color,
      name: `Elf-${id.slice(0, 4)}`,
      interacting: false,
      throwing: false,
    };

    setLocalId(id);
    upsertPlayer(local);
    connectMultiplayer(local);

    return () => disconnectMultiplayer();
  }, [setLocalId, upsertPlayer]);

  return (
    <div className="fixed inset-0">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        camera={{ position: [0, 14, 28], fov: 55, near: 0.1, far: 180 }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: false }}
      >
        <color attach="background" args={["#0b1a2b"]} />
        <fog attach="fog" args={["#0b1a2b", 45, 95]} />
        <Suspense fallback={null}>
          <Physics gravity={[0, -20, 0]} colliders={false}>
            <GameScene />
          </Physics>
        </Suspense>
      </Canvas>
      <UIOverlay />
    </div>
  );
}
