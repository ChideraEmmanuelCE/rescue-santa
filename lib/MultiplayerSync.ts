import PartySocket from "partysocket";
import type { ClientMessage, EnemyState, PlayerState, RoundState, ServerMessage } from "./protocol";

export type NetworkStatus = "idle" | "connecting" | "online" | "reconnecting" | "error";
export type GameHUD = {
  status: NetworkStatus;
  me: PlayerState | null;
  roster: PlayerState[];
  round: RoundState;
  notice: string;
  room: string;
};

type EventListener = (event: ServerMessage) => void;
const emptyRound: RoundState = {
  round: 1, status: "playing", winner: null, winnerName: null,
  resetAt: 0, progress: 0, holderId: null
};

/** WebSocket store with 30Hz movement updates and React-safe throttled HUD snapshots. */
export default class MultiplayerSync {
  socket: PartySocket | null = null;
  myId: string | null = null;
  players = new Map<string, PlayerState>();
  enemies = new Map<number, EnemyState>();
  round: RoundState = { ...emptyRound };
  room = "north-pole";
  serverClockOffset = 0;
  localCorrection: { x: number; y: number; z: number } | null = null;
  private status: NetworkStatus = "idle";
  private notice = "";
  private wantedName = "Christmas Elf";
  private listeners = new Set<() => void>();
  private events = new Set<EventListener>();
  private lastHudEmit = 0;
  private hud: GameHUD = this.getHUD();

  private getHUD(): GameHUD {
    return { status: this.status, me: this.myId ? (this.players.get(this.myId) || null) : null,
      roster: [...this.players.values()].sort((a, b) => b.score - a.score),
      round: { ...this.round }, notice: this.notice, room: this.room };
  }
  getSnapshot = () => this.hud;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  onEvent = (fn: EventListener) => { this.events.add(fn); return () => { this.events.delete(fn); }; };
  private emitHUD(force = false) {
    const now = Date.now();
    if (!force && now - this.lastHudEmit < 110) return;
    this.lastHudEmit = now;
    this.hud = this.getHUD();
    for (const fn of this.listeners) fn();
  }
  private emitEvent(event: ServerMessage) { for (const fn of this.events) fn(event); }
  serverNow() { return Date.now() + this.serverClockOffset; }
  get myPlayer() { return this.myId ? this.players.get(this.myId) : null; }

  connect(room: string, name: string) {
    this.disconnect();
    this.room = room.replace(/[^a-z0-9-]/gi, "").slice(0, 24) || "north-pole";
    this.wantedName = name.trim().slice(0, 18) || "Christmas Elf";
    this.status = "connecting";
    this.emitHUD(true);
    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST?.trim() ||
      (typeof window !== "undefined" && window.location.hostname === "localhost" ? "localhost:1999" : "rescue-santa-realtime.onrender.com");
    if (!host) {
      this.status = "error";
      this.notice = "Multiplayer host is not configured. Set NEXT_PUBLIC_PARTYKIT_HOST on Vercel.";
      this.emitHUD(true);
      return;
    }
    const socket = new PartySocket({ host, party: "main", room: this.room });
    this.socket = socket;
    socket.addEventListener("open", () => {
      if (this.socket !== socket) return;
      this.status = "connecting";
      this.emitHUD(true);
    });
    socket.addEventListener("message", (event) => {
      if (this.socket !== socket) return;
      let message: ServerMessage;
      try { message = JSON.parse(String(event.data)) as ServerMessage; } catch { return; }
      if ("serverTime" in message && typeof message.serverTime === "number") {
        const offset = message.serverTime - Date.now();
        this.serverClockOffset = this.serverClockOffset ? this.serverClockOffset * 0.85 + offset * 0.15 : offset;
      }
      switch (message.type) {
        case "welcome":
          this.myId = message.id;
          this.localCorrection = null;
          this.players.clear();
          for (const p of message.players) this.players.set(p.id, p);
          this.enemies.clear();
          for (const e of message.enemies) this.enemies.set(e.id, e);
          this.round = message.round;
          this.status = "online";
          this.notice = "";
          this.send({ type: "rename", name: this.wantedName });
          this.emitHUD(true);
          break;
        case "join": this.players.set(message.player.id, message.player); this.emitHUD(true); break;
        case "leave": this.players.delete(message.id); this.emitHUD(true); break;
        case "move":
          this.players.set(message.player.id, message.player);
          if (message.player.id === this.myId) this.localCorrection = { x: message.player.x, y: message.player.y, z: message.player.z };
          this.emitHUD();
          break;
        case "rename": {
          const p = this.players.get(message.id);
          if (p) p.name = message.name;
          this.emitHUD(true);
          break;
        }
        case "enemies":
          for (const e of message.enemies) this.enemies.set(e.id, e);
          break;
        case "round":
          this.round = message.round;
          this.emitHUD();
          break;
        case "playerHit": {
          const p=this.players.get(message.id);
          if(p){p.health=message.health;p.deadUntil=message.deadUntil;p.lastHit=message.serverTime;}
          this.emitHUD(true);
          break;
        }
        case "enemyHit": {
          const e=this.enemies.get(message.id);
          if(e){e.health=message.health;e.downUntil=message.downUntil;}
          this.emitHUD();
          break;
        }
        case "stunned": {
          const p = this.players.get(message.id);
          if (p) p.stunnedUntil = message.until;
          this.emitHUD(true);
          break;
        }
        case "notice": this.notice = message.message; this.emitHUD(true); break;
      }
      this.emitEvent(message);
    });
    socket.addEventListener("close", () => {
      if (this.socket !== socket) return;
      this.status = "reconnecting";
      this.emitHUD(true);
    });
    socket.addEventListener("error", () => {
      if (this.socket !== socket) return;
      this.status = "reconnecting";
      this.emitHUD(true);
    });
  }

  setLocalPose(x: number, y: number, z: number, yaw: number) {
    const p = this.myPlayer;
    if (!p) return;
    p.x = x; p.y = y; p.z = z; p.yaw = yaw;
    this.emitHUD();
  }

  send(message: ClientMessage) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.socket) {
      const old = this.socket;
      this.socket = null;
      old.close();
    }
    this.myId = null;
    this.localCorrection = null;
    this.players.clear();
    this.enemies.clear();
    this.round = { ...emptyRound };
    this.status = "idle";
    this.notice = "";
    this.emitHUD(true);
  }
}
