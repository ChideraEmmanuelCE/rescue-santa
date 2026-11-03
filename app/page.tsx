"use client";

import dynamic from "next/dynamic";

const Game = dynamic(() => import("@/components/Game"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#0a1628] text-white gap-4">
      <div className="text-4xl animate-pulse">❄️</div>
      <div className="text-xl font-medium">Loading winter wonderland…</div>
      <div className="text-sm text-white/60">Preparing snow, trees & Santa</div>
    </div>
  ),
});

export default function Home() {
  return <Game />;
}
