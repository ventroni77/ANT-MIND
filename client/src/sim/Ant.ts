import { C, type Primitive } from './constants';
import type { Pheromone } from './Pheromone';
import type { RNG } from './rng';

export interface FoodPile {
  x: number;
  y: number;
  amount: number;
  capacity: number;
}

/** Everything a primitive is allowed to look at. */
export interface AntCtx {
  phero: Pheromone;
  rng: RNG;
  now: number; // ms
  dt: number; // seconds
  consciousness: number;
  colonyDoubt: number;
  ants: Ant[];
  neighbors(a: Ant, radius: number): Ant[];
  nearestFood(x: number, y: number, radius: number): FoodPile | null;
  cursor: { x: number; y: number; active: boolean };
}

export class Ant {
  id: number;
  name: string | null = null;
  caste: 'forager' | 'scout' | 'nurse';

  x: number;
  y: number;
  angle: number;
  speed = C.ANT.SPEED;

  carrying = false;
  isMind = false;
  alive = true;

  primitive: Primitive = 'SEEK_FOOD';
  targetX?: number;
  targetY?: number;
  targetAntId?: number;

  memeId = 0;
  conviction = 0;
  emotion = '';
  memory: string[] = [];
  belief = '';

  hesitateUntil = 0;
  idleSeconds = 0;

  // internals
  wanderBias = 0;
  lastSpeed = 0;
  stashX?: number;
  stashY?: number;
  mimicAt = 0;
  orbitRadius = 60;
  private prevX: number;
  private prevY: number;

  constructor(id: number, x: number, y: number, angle: number, caste: Ant['caste']) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.angle = angle;
    this.caste = caste;
  }

  /** Primitives that hold an ant still. Used by the gridlock guard. */
  get isStalling(): boolean {
    return (
      this.lastSpeed < 5 &&
      (this.primitive === 'IDLE' ||
        this.primitive === 'STARE' ||
        this.primitive === 'BLOCK_PATH' ||
        this.primitive === 'GATHER_WITH_KIN')
    );
  }

  pushMemory(line: string) {
    this.memory.push(line);
    if (this.memory.length > 6) this.memory.shift();
  }

  /** Conscious ants lay weaker, noisier trails. */
  trailFidelity(k: number, colonyDoubt: number): number {
    return this.isMind ? 1 - 0.75 * k : 1 - 0.35 * k * colonyDoubt;
  }

  /** Conscious ants weight the pheromone gradient less. */
  trailTrust(k: number): number {
    return 1 - 0.8 * k * (1 - this.conviction);
  }

  update(ctx: AntCtx) {
    const { dt, now } = ctx;

    // 1. deliberation freeze
    if (now < this.hesitateUntil) {
      this.idleSeconds += dt;
      this.lastSpeed = 0;
      return;
    }

    // 2. what does the current primitive want
    const desired = this.executePrimitive(ctx);

    // 3. deliberation tax — the cost of thinking, paid in seconds not moved
    const k = ctx.consciousness;
    if (this.isMind) {
      if (ctx.rng.next() < 0.06 * k) {
        this.hesitateUntil = now + (250 + (1100 - 250) * k);
      }
    } else if (ctx.rng.next() < 0.02 * k * ctx.colonyDoubt) {
      this.hesitateUntil = now + 120 + 380 * k;
    }

    // 4. steer, clamped
    this.steer(desired.angle, dt);

    // 5. move
    this.moveWith(desired.speedScale, ctx, dt);

    // idle bookkeeping (measured from actual displacement)
    if (this.lastSpeed < 5) this.idleSeconds += dt;
    else this.idleSeconds = Math.max(0, this.idleSeconds - dt * 2);

    // 6. lay pheromone
    const fid = Math.max(0, this.trailFidelity(k, ctx.colonyDoubt));
    if (this.carrying) ctx.phero.deposit(this.x, this.y, 'food', C.DEPOSIT.food * fid * dt * 6);
    else ctx.phero.deposit(this.x, this.y, 'home', C.DEPOSIT.home * fid * dt * 6);
    if (this.memeId !== 0) {
      ctx.phero.depositMeme(this.x, this.y, this.memeId, C.DEPOSIT.meme * this.conviction * dt * 6);
    }

    // 7. conviction decay — ideas die if not reinforced. An unexamined belief
    //    fades fastest, so beliefs cannot outlive the consciousness that held them.
    if (this.memeId !== 0) {
      this.conviction -= C.CONVICTION_DECAY * (1 + 6 * (1 - k)) * dt;
      if (this.conviction <= 0) {
        this.conviction = 0;
        this.memeId = 0;
        // no ideology left to justify the behaviour: fall back to instinct
        if (!this.isMind) this.primitive = this.carrying ? 'RETURN_HOME' : 'SEEK_FOOD';
      }
    }
  }

  private steer(target: number, dt: number) {
    let diff = target - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const max = C.ANT.TURN * dt;
    this.angle += Math.max(-max, Math.min(max, diff));
  }

  private moveWith(speedScale: number, ctx: AntCtx, dt: number) {
    const v = this.speed * speedScale;
    let nx = this.x + Math.cos(this.angle) * v * dt;
    let ny = this.y + Math.sin(this.angle) * v * dt;

    // world bounds: bounce
    if (nx < 2 || nx > C.WORLD_W - 2) {
      this.angle = Math.PI - this.angle;
      nx = Math.max(2, Math.min(C.WORLD_W - 2, nx));
    }
    if (ny < 2 || ny > C.WORLD_H - 2) {
      this.angle = -this.angle;
      ny = Math.max(2, Math.min(C.WORLD_H - 2, ny));
    }

    // walls: reflect off whichever axis is blocked
    if (ctx.phero.isWall(nx, ny)) {
      if (!ctx.phero.isWall(this.x, ny)) {
        nx = this.x;
        this.angle = Math.PI - this.angle;
      } else if (!ctx.phero.isWall(nx, this.y)) {
        ny = this.y;
        this.angle = -this.angle;
      } else {
        nx = this.x;
        ny = this.y;
        this.angle += Math.PI * 0.5;
      }
    }

    this.prevX = this.x;
    this.prevY = this.y;
    this.x = nx;
    this.y = ny;
    const dx = this.x - this.prevX;
    const dy = this.y - this.prevY;
    this.lastSpeed = Math.sqrt(dx * dx + dy * dy) / Math.max(1e-6, dt);
  }

  // ---- primitives: all pure steering. No teleporting, no snapping. ----

  private executePrimitive(ctx: AntCtx): { angle: number; speedScale: number } {
    switch (this.primitive) {
      case 'SEEK_FOOD':
        return { angle: this.seekFood(ctx), speedScale: 1 };
      case 'RETURN_HOME':
        return { angle: this.homeward(ctx), speedScale: 1 };
      case 'FOLLOW_TRAIL':
        return { angle: this.followStrongest(ctx), speedScale: 1 };
      case 'WANDER':
        return { angle: this.wander(ctx), speedScale: 0.9 };
      case 'IDLE':
        return { angle: this.angle, speedScale: 0.05 };
      case 'HOARD':
        return this.hoard(ctx);
      case 'FOLLOW_ANT':
        return this.followAnt(ctx);
      case 'AVOID_ANT':
        return this.avoidAnt(ctx);
      case 'ORBIT_POINT':
        return this.orbit(ctx);
      case 'GATHER_WITH_KIN':
        return this.gatherWithKin(ctx);
      case 'BLOCK_PATH':
        return this.blockPath(ctx);
      case 'FLEE':
        return { angle: this.gradientDescent(ctx, 'danger'), speedScale: 1.15 };
      case 'PATROL_LINE':
        return this.patrolLine(ctx);
      case 'MIMIC_NEIGHBOR':
        return this.mimic(ctx);
      case 'STARE':
        return this.stare(ctx);
      case 'MARCH_TO':
        return this.marchTo(ctx);
      default:
        return { angle: this.wander(ctx), speedScale: 1 };
    }
  }

  /**
   * Follow the food trail when there is one, otherwise explore. Without this an
   * exhausted trail traps the colony: gradient ascent on a flat field never
   * rediscovers distant food.
   */
  private seekFood(ctx: AntCtx): number {
    const seen = ctx.nearestFood(this.x, this.y, C.ANT.VISION_R);
    if (seen) return Math.atan2(seen.y - this.y, seen.x - this.x);
    if (ctx.phero.valueAt(this.x, this.y, 'food') > 1.5) return this.gradient(ctx, 'food');
    return this.wander(ctx);
  }

  /** 3-sensor gradient ascent, blended with wander by trailTrust. */
  private gradient(ctx: AntCtx, channel: 'food' | 'home'): number {
    const a = C.ANT.SENSOR_ANGLE;
    const c = ctx.phero.sense(this.x, this.y, this.angle, channel);
    const l = ctx.phero.sense(this.x, this.y, this.angle - a, channel);
    const r = ctx.phero.sense(this.x, this.y, this.angle + a, channel);

    const trust = Math.max(0, this.trailTrust(ctx.consciousness));
    let turn = 0;
    if (c >= l && c >= r) turn = 0;
    else if (l > r) turn = -a;
    else turn = a;

    const noise = (ctx.rng.next() - 0.5) * C.ANT.WANDER * 2;
    // low trust => the gradient barely steers, noise dominates
    return this.angle + turn * trust + noise * (1.4 - trust * 0.4);
  }

  private gradientDescent(ctx: AntCtx, channel: 'danger'): number {
    const a = C.ANT.SENSOR_ANGLE;
    const c = ctx.phero.sense(this.x, this.y, this.angle, channel);
    const l = ctx.phero.sense(this.x, this.y, this.angle - a, channel);
    const r = ctx.phero.sense(this.x, this.y, this.angle + a, channel);
    if (c <= l && c <= r) return this.angle + (ctx.rng.next() - 0.5) * 0.2;
    return this.angle + (l < r ? -a : a);
  }

  /**
   * Real ants path-integrate their way home rather than hunting a gradient, and
   * the home channel here is a "where ants have been" field with no reliable
   * slope. So: head for the nest, and let doubt corrupt the heading instead.
   */
  private homeward(ctx: AntCtx): number {
    const toNest = Math.atan2(C.NEST.y - this.y, C.NEST.x - this.x);
    const trust = Math.max(0, this.trailTrust(ctx.consciousness));
    // a conscious ant second-guesses even the way home
    const drift = (1 - trust) * (ctx.rng.next() - 0.5) * 2.2;
    return toNest + drift + (ctx.rng.next() - 0.5) * 0.12;
  }

  private followStrongest(ctx: AntCtx): number {
    const f = ctx.phero.valueAt(this.x, this.y, 'food');
    const h = ctx.phero.valueAt(this.x, this.y, 'home');
    return this.gradient(ctx, f >= h ? 'food' : 'home');
  }

  private wander(ctx: AntCtx): number {
    this.wanderBias += (ctx.rng.next() - 0.5) * 0.6;
    this.wanderBias = Math.max(-1.2, Math.min(1.2, this.wanderBias * 0.94));
    return this.angle + this.wanderBias * C.ANT.WANDER;
  }

  private hoard(ctx: AntCtx): { angle: number; speedScale: number } {
    if (!this.carrying) return { angle: this.gradient(ctx, 'food'), speedScale: 1 };
    if (this.stashX === undefined) {
      // personal stash: away from the nest, chosen once, deterministically
      const ang = ctx.rng.range(0, Math.PI * 2);
      const d = ctx.rng.range(380, 620);
      this.stashX = Math.max(40, Math.min(C.WORLD_W - 40, C.NEST.x + Math.cos(ang) * d));
      this.stashY = Math.max(40, Math.min(C.WORLD_H - 40, C.NEST.y + Math.sin(ang) * d));
    }
    const dx = this.stashX - this.x;
    const dy = this.stashY! - this.y;
    // also push away from the nearest neighbour: secrecy
    const nb = ctx.neighbors(this, 30)[0];
    let ax = dx;
    let ay = dy;
    if (nb) {
      ax -= (nb.x - this.x) * 0.8;
      ay -= (nb.y - this.y) * 0.8;
    }
    return { angle: Math.atan2(ay, ax), speedScale: 1 };
  }

  private followAnt(ctx: AntCtx): { angle: number; speedScale: number } {
    const t = this.resolveTargetAnt(ctx);
    if (!t) return { angle: this.wander(ctx), speedScale: 1 };
    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 10) return { angle: this.angle, speedScale: 0.1 };
    return { angle: Math.atan2(dy, dx), speedScale: 1 };
  }

  private avoidAnt(ctx: AntCtx): { angle: number; speedScale: number } {
    const nb = ctx.neighbors(this, 60)[0];
    if (!nb) return { angle: this.wander(ctx), speedScale: 1 };
    return { angle: Math.atan2(this.y - nb.y, this.x - nb.x), speedScale: 1.05 };
  }

  private orbit(ctx: AntCtx): { angle: number; speedScale: number } {
    const tx = this.targetX ?? ctx.cursor.x;
    const ty = this.targetY ?? ctx.cursor.y;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    this.orbitRadius += (ctx.rng.next() - 0.5) * 6 * ctx.dt * 10;
    this.orbitRadius = Math.max(45, Math.min(75, this.orbitRadius));
    const toCenter = Math.atan2(dy, dx);
    const tangent = toCenter + Math.PI / 2;
    // blend tangent with radial correction
    const err = (d - this.orbitRadius) / this.orbitRadius;
    const radial = err > 0 ? toCenter : toCenter + Math.PI;
    const w = Math.min(1, Math.abs(err) * 1.6);
    return { angle: this.blendAngles(tangent, radial, w), speedScale: 1 };
  }

  private gatherWithKin(ctx: AntCtx): { angle: number; speedScale: number } {
    if (this.memeId === 0) return { angle: this.wander(ctx), speedScale: 1 };
    const kin = ctx.neighbors(this, 220).filter((a) => a.memeId === this.memeId).slice(0, 8);
    if (kin.length === 0) return { angle: this.wander(ctx), speedScale: 1 };
    let cx = 0;
    let cy = 0;
    for (const a of kin) {
      cx += a.x;
      cy += a.y;
    }
    cx /= kin.length;
    cy /= kin.length;
    const dx = cx - this.x;
    const dy = cy - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 18) return { angle: this.angle, speedScale: 0.08 };
    return { angle: Math.atan2(dy, dx), speedScale: 0.95 };
  }

  private blockPath(ctx: AntCtx): { angle: number; speedScale: number } {
    const cell = ctx.phero.nearestCell(this.x, this.y, 'food', 140, 2);
    if (!cell) return { angle: this.wander(ctx), speedScale: 0.6 };
    const dx = cell.x - this.x;
    const dy = cell.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 8) return { angle: this.angle, speedScale: 0.02 };
    return { angle: Math.atan2(dy, dx), speedScale: 0.9 };
  }

  private patrolLine(ctx: AntCtx): { angle: number; speedScale: number } {
    const cell = ctx.phero.nearestCell(this.x, this.y, 'chalk', 260, 0.05);
    if (!cell) return { angle: this.wander(ctx), speedScale: 0.8 };
    const dx = cell.x - this.x;
    const dy = cell.y - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d > 16) return { angle: Math.atan2(dy, dx), speedScale: 1 };
    // on the line: steer along it (tangent to the chalk gradient)
    const g = this.chalkGradient(ctx);
    return { angle: g + Math.PI / 2, speedScale: 0.7 };
  }

  private chalkGradient(ctx: AntCtx): number {
    const s = C.CELL * 2;
    const gx =
      ctx.phero.valueAt(this.x + s, this.y, 'chalk') - ctx.phero.valueAt(this.x - s, this.y, 'chalk');
    const gy =
      ctx.phero.valueAt(this.x, this.y + s, 'chalk') - ctx.phero.valueAt(this.x, this.y - s, 'chalk');
    if (gx === 0 && gy === 0) return this.angle;
    return Math.atan2(gy, gx);
  }

  private mimic(ctx: AntCtx): { angle: number; speedScale: number } {
    if (ctx.now > this.mimicAt) {
      this.mimicAt = ctx.now + 500;
      const nb = ctx.neighbors(this, 45)[0];
      if (nb && nb.primitive !== 'MIMIC_NEIGHBOR') {
        this.primitive = nb.primitive;
        this.targetX = nb.targetX;
        this.targetY = nb.targetY;
        this.targetAntId = nb.targetAntId;
      }
    }
    return { angle: this.wander(ctx), speedScale: 0.8 };
  }

  private stare(ctx: AntCtx): { angle: number; speedScale: number } {
    const t = this.resolveTargetAnt(ctx);
    if (t) return { angle: Math.atan2(t.y - this.y, t.x - this.x), speedScale: 0 };
    if (this.targetX !== undefined) {
      return { angle: Math.atan2(this.targetY! - this.y, this.targetX - this.x), speedScale: 0 };
    }
    return { angle: this.angle, speedScale: 0 };
  }

  private marchTo(ctx: AntCtx): { angle: number; speedScale: number } {
    if (this.targetX === undefined || this.targetY === undefined) {
      return { angle: this.wander(ctx), speedScale: 1 };
    }
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 12) return { angle: this.angle, speedScale: 0.05 };
    return { angle: Math.atan2(dy, dx), speedScale: 1 };
  }

  private resolveTargetAnt(ctx: AntCtx): Ant | null {
    if (this.targetAntId === undefined) return null;
    const t = ctx.ants[this.targetAntId];
    return t && t.alive && t.id !== this.id ? t : null;
  }

  private blendAngles(a: number, b: number, w: number): number {
    const x = Math.cos(a) * (1 - w) + Math.cos(b) * w;
    const y = Math.sin(a) * (1 - w) + Math.sin(b) * w;
    return Math.atan2(y, x);
  }
}
