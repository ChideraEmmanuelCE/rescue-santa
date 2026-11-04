export type Vec3 = { x: number; y: number; z: number };
export type PlayerState = Vec3 & {
  id: string;
  name: string;
  color: string;
  yaw: number;
  score: number;
  stunnedUntil: number;
  interacting: boolean;
  health: number;
  deadUntil: number;
  kills: number;
  lastHit: number;
};
export type EnemyState = { id: number; x: number; z: number; yaw: number; stunnedUntil: number; health: number; downUntil: number; attackUntil: number };
export type RoundState = {
  round: number;
  status: "playing" | "rescued";
  winner: string | null;
  winnerName: string | null;
  resetAt: number;
  progress: number;
  holderId: string | null;
};
export type ClientMessage =
  | { type: "move"; x: number; y: number; z: number; yaw: number }
  | { type: "interact"; held: boolean }
  | { type: "throw" }
  | { type: "rename"; name: string };
export type ServerMessage =
  | { type: "welcome"; id: string; players: PlayerState[]; enemies: EnemyState[]; round: RoundState; serverTime: number }
  | { type: "join"; player: PlayerState }
  | { type: "leave"; id: string }
  | { type: "move"; player: PlayerState; serverTime: number }
  | { type: "rename"; id: string; name: string }
  | { type: "enemies"; enemies: EnemyState[]; serverTime: number }
  | { type: "round"; round: RoundState; serverTime: number }
  | { type: "snowball"; id: string; x: number; y: number; z: number; yaw: number; hitEnemy: number | null; serverTime: number }
  | { type: "stunned"; id: string; until: number }
  | { type: "playerHit"; id: string; damage: number; health: number; deadUntil: number; enemyId: number; serverTime: number }
  | { type: "enemyHit"; id: number; health: number; downUntil: number; playerId: string; serverTime: number }
  | { type: "notice"; message: string };
