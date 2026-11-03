import PartySocket from "partysocket";
import { useGameStore, type PlayerState } from "./store";

const PARTY_HOST = process.env.NEXT_PUBLIC_PARTY_HOST || "";
const ROOM = "rescue-santa-main";

let socket: PartySocket | null = null;
let sendInterval: ReturnType<typeof setInterval> | null = null;

export function connectMultiplayer(localPlayer: PlayerState) {
  if (!PARTY_HOST || socket) return;

  try {
    socket = new PartySocket({
      host: PARTY_HOST,
      room: ROOM,
    });

    socket.addEventListener("open", () => {
      console.log("[MP] Connected");
      socket?.send(JSON.stringify({ type: "join", player: localPlayer }));
    });

    socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data as string);
        const store = useGameStore.getState();

        if (data.type === "players" && Array.isArray(data.players)) {
          data.players.forEach((p: PlayerState) => {
            if (p.id !== store.localId) store.upsertPlayer(p);
          });
        }
        if (data.type === "player-update" && data.player?.id !== store.localId) {
          store.upsertPlayer(data.player);
        }
        if (data.type === "player-left") {
          store.removePlayer(data.id);
        }
        if (data.type === "ice") {
          store.setIceProgress(data.progress);
          if (data.progress >= 5) store.setCageMelted(true);
        }
      } catch (e) {
        console.warn("[MP] message error", e);
      }
    });

    socket.addEventListener("error", () => {
      console.warn("[MP] Connection error – running in single-player mode");
    });

    sendInterval = setInterval(() => {
      const store = useGameStore.getState();
      const me = store.localId ? store.players[store.localId] : null;
      if (me && socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "update", player: me }));
      }
    }, 1000 / 30);
  } catch (err) {
    console.warn("[MP] Failed to connect – single-player mode", err);
  }
}

export function sendInteract(progress: number) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "interact", progress }));
  }
}

export function disconnectMultiplayer() {
  if (sendInterval) clearInterval(sendInterval);
  sendInterval = null;
  socket?.close();
  socket = null;
}
