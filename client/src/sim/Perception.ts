import { C } from './constants';
import type { Ant } from './Ant';
import type { World } from './World';

const DIRS = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];

function dirName(dx: number, dy: number): string {
  const a = Math.atan2(dy, dx);
  const i = Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  return DIRS[i];
}

export interface MindPayload {
  id: number;
  name: string;
  caste: string;
  emotion: string;
  conviction: number;
  idle_seconds: number;
  carrying_food: boolean;
  meme: string | null;
  belief: string | null;
  memory: string[];
  vision: {
    food: { dist: number; dir: string }[];
    nest: { dist: number; dir: string };
    food_trail_strength: number;
    chalk_near: boolean;
    wall_near: boolean;
    corpses_near: number;
    cursor_shadow: boolean;
    neighbors: { name: string | null; dist: number; emotion: string | null; meme: string | null }[];
  };
}

export interface PerceivePacket {
  type: 'perceive';
  tick: number;
  consciousness: number;
  drama: number;
  colony: {
    food_stored: number;
    food_per_min: number;
    ants: number;
    ideologies: { label: string; followers: number }[];
    recent_events: string[];
  };
  minds: MindPayload[];
}

function perceiveAnt(w: World, a: Ant): MindPayload {
  const memeLabel = a.memeId ? (w.memes.get(a.memeId)?.label ?? null) : null;

  const foodSeen = w.food
    .map((f) => ({ f, d: Math.hypot(f.x - a.x, f.y - a.y) }))
    .filter((o) => o.d < C.ANT.VISION_R * 3)
    .sort((p, q) => p.d - q.d)
    .slice(0, 2)
    .map((o) => ({ dist: Math.round(o.d), dir: dirName(o.f.x - a.x, o.f.y - a.y) }));

  const nestDx = C.NEST.x - a.x;
  const nestDy = C.NEST.y - a.y;

  const neighbors = w.neighbors(a, C.ANT.VISION_R).slice(0, 3).map((b) => ({
    name: b.name,
    dist: Math.round(Math.hypot(b.x - a.x, b.y - a.y)),
    emotion: b.isMind ? b.emotion : null,
    meme: b.memeId ? (w.memes.get(b.memeId)?.label ?? null) : null,
  }));

  const chalkNear = w.phero.nearestCell(a.x, a.y, 'chalk', 60, 0.05) !== null;
  let wallNear = false;
  for (let ang = 0; ang < Math.PI * 2 && !wallNear; ang += Math.PI / 4) {
    if (w.phero.isWall(a.x + Math.cos(ang) * 24, a.y + Math.sin(ang) * 24)) wallNear = true;
  }

  const shadow =
    w.handActive && Math.hypot(w.cursor.x - a.x, w.cursor.y - a.y) < 250;

  return {
    id: a.id,
    name: a.name ?? `Ant${a.id}`,
    caste: a.caste,
    emotion: a.emotion || 'blank',
    conviction: Math.round(a.conviction * 100) / 100,
    idle_seconds: Math.round(a.idleSeconds * 10) / 10,
    carrying_food: a.carrying,
    meme: memeLabel,
    belief: a.belief || null,
    memory: a.memory.slice(-3),
    vision: {
      food: foodSeen,
      nest: { dist: Math.round(Math.hypot(nestDx, nestDy)), dir: dirName(nestDx, nestDy) },
      food_trail_strength:
        Math.round(Math.min(1, w.phero.valueAt(a.x, a.y, 'food') / 60) * 100) / 100,
      chalk_near: chalkNear,
      wall_near: wallNear,
      corpses_near: w.corpsesNear(a.x, a.y, 140),
      cursor_shadow: shadow,
      neighbors,
    },
  };
}

/** Build a perceive packet for one rotating group of minds. */
export function buildPerceive(w: World, group: number): PerceivePacket | null {
  const minds = w.minds();
  if (minds.length === 0) return null;
  const size = C.MIND_GROUP_SIZE;
  const groups = Math.max(1, Math.ceil(minds.length / size));
  const g = group % groups;
  const slice = minds.slice(g * size, g * size + size);
  if (slice.length === 0) return null;

  return {
    type: 'perceive',
    tick: w.tick,
    consciousness: Math.round(w.consciousness * 100) / 100,
    drama: w.drama,
    colony: {
      food_stored: w.metrics.foodStored,
      food_per_min: Math.round(w.metrics.foodPerMin * 10) / 10,
      ants: w.ants.filter((a) => a.alive).length,
      ideologies: w.memes.active().map((m) => ({ label: m.label, followers: m.followers })),
      recent_events: [...w.recentEvents],
    },
    minds: slice.map((a) => perceiveAnt(w, a)),
  };
}
