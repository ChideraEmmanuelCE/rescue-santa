/** Collision and patrol data for the expedition. */
export const WORLD_HALF = 46;
export const PLAYER_SPEED = 7.1;
export const JUMP_IMPULSE = 8.1;
export const INTERACTION_RANGE = 4.8;
export const RESCUE_DURATION_MS = 5000;
export const ROUND_RESET_MS = 12000;
export const ENEMY_COUNT = 7;

export type Tree = { x: number; z: number; size: number };
export type IceWall = { x: number; z: number; width: number; depth: number; yaw: number };

const fract = (x: number) => x - Math.floor(x);
export const random01 = (seed: number) => fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453);

export const ICE_WALLS: IceWall[] = [
  { x: -20, z: -16, width: 11, depth: 2.3, yaw: 0.36 },
  { x: 17, z: -18, width: 12, depth: 2.3, yaw: -0.4 },
  { x: -15, z: 18, width: 12, depth: 2.4, yaw: -0.43 },
  { x: 21, z: 14, width: 11, depth: 2.4, yaw: 0.34 },
  { x: -26, z: 5, width: 9, depth: 2.2, yaw: Math.PI / 2 },
  { x: 27, z: -4, width: 9, depth: 2.2, yaw: Math.PI / 2 },
  { x: -3, z: -23, width: 9, depth: 2.0, yaw: 0.2 },
  { x: 6, z: 25, width: 11, depth: 2.0, yaw: -0.2 },
  { x: -10, z: -7, width: 7, depth: 1.7, yaw: -0.45 },
  { x: 12, z: 8, width: 8, depth: 1.7, yaw: 0.37 }
];

export function wallAt(x:number,z:number,padding=.6,broken?:ReadonlySet<number>) {
  return ICE_WALLS.findIndex((wall,i) => {
    if(broken?.has(i))return false;
    const dx = x - wall.x;
    const dz = z - wall.z;
    const c = Math.cos(wall.yaw);
    const s = Math.sin(wall.yaw);
    const localX = dx * c + dz * s;
    const localZ = -dx * s + dz * c;
    return Math.abs(localX) < wall.width / 2 + padding && Math.abs(localZ) < wall.depth / 2 + padding;
  });
}

export function collidesWall(x:number,z:number,padding=.6,broken?:ReadonlySet<number>){
  return wallAt(x,z,padding,broken)>=0;
}
export const SLEIGH_Z=-14;
export const SUPPLIES=[{x:2,z:31},{x:-6,z:9},{x:4,z:-9}];
export const TREES: Tree[] = (() => {
  const trees: Tree[] = [];
  for (let i = 0; i < 285 && trees.length < 46; i++) {
    const x = (random01(i * 3 + 10) * 2 - 1) * 43;
    const z = (random01(i * 3 + 11) * 2 - 1) * 43;
    const r = Math.hypot(x, z);
    if (r < 13 || r > 43 || collidesWall(x, z, 4) || (r > 33 && r < 40)) continue;
    const size = 0.84 + random01(i * 3 + 12) * 0.83;
    if (trees.some((t) => Math.hypot(x - t.x, z - t.z) < 5.1)) continue;
    trees.push({ x, z, size });
  }
  return trees;
})();

export function collidesWorld(x: number, z: number, padding = 0.55, broken?:ReadonlySet<number>) {
  // The circular ice cage is solid until the end-of-round celebration.
  if (Math.hypot(x, z) < 3.56 + padding) return true;
  if (Math.abs(x) > WORLD_HALF - 2 - padding || Math.abs(z) > WORLD_HALF - 2 - padding) return true;
  if (collidesWall(x, z, padding,broken)) return true;
  if (TREES.some((t) => Math.hypot(x - t.x, z - t.z) < t.size * 0.6 + padding)) return true;
  return false;
}

export function spawnPosition(slot: number) {
  const theta = ((slot % 12) / 12) * Math.PI * 2 + 0.13;
  return { x: Math.sin(theta) * 36.5, y: 1.15, z: Math.cos(theta) * 36.5 };
}

/** Patrol path is deterministic by timestamp, allowing both runtime types to agree. */
export function enemyPosition(index: number, timeMs: number) {
  const i = index % ENEMY_COUNT;
  const phase = timeMs * (0.00024 + (i % 3) * 0.00006) + (i * Math.PI * 2) / ENEMY_COUNT;
  const radius = 9.5 + (i % 3) * 6.2;
  const x = Math.sin(phase) * radius + Math.cos(phase * 2.1 + i) * 2.3;
  const z = Math.cos(phase) * radius + Math.sin(phase * 1.7 + i) * 2.3;
  return { x, z, yaw: Math.atan2(Math.cos(phase), Math.sin(phase)) };
}

/** Locations of the five interactive deliveries in Chapter II's Aurora Village. */
export const VILLAGE_GIFTS = [
  {x:-8,z:20}, {x:8,z:2}, {x:-27,z:-8}, {x:27,z:-28}, {x:3,z:-33}
] as const;
export const FLIGHT_DURATION_MS = 24000;


/** Chapter III. Distances and offsets are metres in the gameplay world. */
export const CITY_SPEED = 15;
export const CITY_LENGTH = 1160;
export const CITY_CRUISE_ALTITUDE = 44;
export const CITY_REQUIRED_DELIVERIES = 8;
export type CityTarget = {id:number;x:number;z:number;y:number;radius:number;name:string;kind:"roof"|"street"};
export const CITY_TARGETS: readonly CityTarget[] = [
  {id:0,x:-21,z:-115,y:11,radius:16,name:"Toy Workshop",kind:"roof"},
  {id:1,x:18,z:-210,y:1,radius:17,name:"Market Square",kind:"street"},
  {id:2,x:-23,z:-310,y:17,radius:17,name:"Grand Hotel",kind:"roof"},
  {id:3,x:22,z:-405,y:1,radius:17,name:"Lantern Avenue",kind:"street"},
  {id:4,x:-20,z:-498,y:13,radius:17,name:"Children's Hospital",kind:"roof"},
  {id:5,x:18,z:-592,y:1,radius:17,name:"Town Plaza",kind:"street"},
  {id:6,x:23,z:-685,y:20,radius:17,name:"Skyline Apartments",kind:"roof"},
  {id:7,x:-18,z:-778,y:1,radius:17,name:"Winter Market",kind:"street"},
  {id:8,x:21,z:-875,y:15,radius:17,name:"Riverside School",kind:"roof"},
  {id:9,x:-20,z:-968,y:1,radius:17,name:"Central Park",kind:"street"},
  {id:10,x:22,z:-1065,y:12,radius:18,name:"Last Stop",kind:"roof"}
] as const;
