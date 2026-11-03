import { create } from "zustand";

export type PlayerState = {
  id: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  color: string;
  name: string;
  interacting: boolean;
  throwing: boolean;
};

type GameStore = {
  players: Record<string, PlayerState>;
  localId: string | null;
  iceProgress: number;
  cageMelted: boolean;
  score: number;
  setLocalId: (id: string) => void;
  upsertPlayer: (p: PlayerState) => void;
  removePlayer: (id: string) => void;
  setIceProgress: (v: number) => void;
  setCageMelted: (v: boolean) => void;
  addScore: (n: number) => void;
};

export const useGameStore = create<GameStore>((set) => ({
  players: {},
  localId: null,
  iceProgress: 0,
  cageMelted: false,
  score: 0,
  setLocalId: (id) => set({ localId: id }),
  upsertPlayer: (p) =>
    set((s) => ({ players: { ...s.players, [p.id]: p } })),
  removePlayer: (id) =>
    set((s) => {
      const next = { ...s.players };
      delete next[id];
      return { players: next };
    }),
  setIceProgress: (v) => set({ iceProgress: Math.min(5, Math.max(0, v)) }),
  setCageMelted: (v) => set({ cageMelted: v }),
  addScore: (n) => set((s) => ({ score: s.score + n })),
}));
