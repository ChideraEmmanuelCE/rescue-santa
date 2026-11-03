"use client";

import { useGameStore } from "@/lib/store";
import { MobileControls } from "./MobileControls";

export function UIOverlay() {
  const iceProgress = useGameStore((s) => s.iceProgress);
  const cageMelted = useGameStore((s) => s.cageMelted);
  const score = useGameStore((s) => s.score);
  const players = useGameStore((s) => s.players);
  const localId = useGameStore((s) => s.localId);
  const local = localId ? players[localId] : null;
  const playerCount = Object.keys(players).length;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 p-4 pointer-events-none z-50 flex justify-between items-start">
        <div className="bg-black/50 backdrop-blur-md rounded-2xl px-5 py-3 text-white border border-white/10">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">Rescue Santa</div>
          <div className="text-2xl font-bold">{score} pts</div>
          <div className="text-sm text-white/70 mt-1">{playerCount} player{playerCount !== 1 ? "s" : ""} online</div>
        </div>
        <div className="bg-black/50 backdrop-blur-md rounded-2xl px-5 py-3 text-white border border-white/10 text-right">
          <div className="text-xs uppercase tracking-wider text-white/60 mb-1">You</div>
          <div className="flex items-center gap-2 justify-end">
            <div className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: local?.color || "#fff" }} />
            <span className="font-medium">{local?.name || "…"}</span>
          </div>
        </div>
      </div>

      {!cageMelted && iceProgress > 0 && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-72 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md rounded-full h-4 overflow-hidden border border-cyan-400/40">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-sky-300 transition-all duration-100" style={{ width: `${(iceProgress / 5) * 100}%` }} />
          </div>
          <div className="text-center text-cyan-200 text-sm mt-2 font-medium">Melting ice… {Math.floor((iceProgress / 5) * 100)}%</div>
        </div>
      )}

      {cageMelted && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-xl rounded-3xl px-12 py-10 text-center border border-amber-400/30 shadow-2xl">
            <div className="text-6xl mb-4">🎅</div>
            <h1 className="text-4xl font-bold text-amber-300 mb-2">Santa is Free!</h1>
            <p className="text-white/80 text-lg">You saved Christmas</p>
            <p className="text-amber-200/80 mt-4 text-sm">+1000 points</p>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-6 z-40 pointer-events-none hidden md:block">
        <div className="bg-black/45 backdrop-blur-md rounded-xl px-4 py-3 text-white/80 text-sm border border-white/10 space-y-1">
          <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">WASD</kbd> Move</div>
          <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">Space</kbd> Jump</div>
          <div><kbd className="px-1.5 py-0.5 bg-white/10 rounded text-xs">E</kbd> Hold near cage to melt ice</div>
        </div>
      </div>

      <MobileControls />
    </>
  );
}
