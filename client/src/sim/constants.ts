// ALL tunables live here. One file, on purpose.

export const C = {
  WORLD_W: 1600,
  WORLD_H: 1000,
  CELL: 8, // grid 200 x 125

  N_ANTS: 400,
  N_MINDS_MAX: 12,

  DT: 1 / 60,
  PHERO_TICK_MS: 50,

  EVAPORATE: { food: 0.994, home: 0.996, danger: 0.985, meme: 0.997 },
  DIFFUSE: 0.12,
  DEPOSIT: { food: 28, home: 22, danger: 90, meme: 35 },

  ANT: {
    SPEED: 62, // px/s
    TURN: 7.0, // rad/s max
    SENSOR_DIST: 22,
    SENSOR_ANGLE: 0.52, // ~30deg
    WANDER: 0.35,
    PICKUP_R: 8,
    NEST_R: 40,
    VISION_R: 70,
  },

  NEST: { x: 300, y: 500 },

  BRAIN_TICK_MS: 2000,
  MIND_GROUP_SIZE: 6,

  // meme / contagion
  SUSCEPTIBILITY: 0.55,
  CONVICTION_DECAY: 0.02, // per second
  MEME_EXTINCT_MS: 15000,
  ADOPTION_FRAME_INTERVAL: 10,

  // world content
  SCARCITY: 0.5, // 0 = plentiful, 1 = brutal
  FOOD_PILES: 6,
  FOOD_PER_PILE: 400,
  // Sources regrow in place rather than vanishing. A pile that disappears leaves
  // a strong trail leading nowhere, which starves the colony for reasons that
  // have nothing to do with consciousness.
  FOOD_REGROW_PER_SEC: 9,
  PILE_RADIUS: 20, // ants can pick up anywhere on the pile, not just its centre

  // rendering
  PHERO_RENDER_MS: 100,
  MAX_THOUGHT_BUBBLES: 5,
  THOUGHT_BUBBLE_MS: 3500,

  SEED: 1337,
} as const;

export const GRID_W = Math.floor(C.WORLD_W / C.CELL); // 200
export const GRID_H = Math.floor(C.WORLD_H / C.CELL); // 125

export const PRIMITIVES = [
  'SEEK_FOOD',
  'RETURN_HOME',
  'FOLLOW_TRAIL',
  'WANDER',
  'IDLE',
  'HOARD',
  'FOLLOW_ANT',
  'AVOID_ANT',
  'ORBIT_POINT',
  'GATHER_WITH_KIN',
  'BLOCK_PATH',
  'FLEE',
  'PATROL_LINE',
  'MIMIC_NEIGHBOR',
  'STARE',
  'MARCH_TO',
] as const;

export type Primitive = (typeof PRIMITIVES)[number];

export function isPrimitive(v: unknown): v is Primitive {
  return typeof v === 'string' && (PRIMITIVES as readonly string[]).includes(v);
}
