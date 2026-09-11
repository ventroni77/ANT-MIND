import { C, GRID_W, GRID_H } from './constants';
import type { Ant } from './Ant';
import type { Pheromone } from './Pheromone';

const DREAD_EMOTIONS = new Set(['anxious', 'nihilistic', 'afraid', 'grieving', 'despairing', 'dread']);

interface Cluster {
  key: string;
  since: number;
}

export interface MetricSample {
  t: number;
  foodPerMin: number;
  consciousness: number;
}

export class Metrics {
  deposits: number[] = []; // timestamps of nest deposits
  foodStored = 0;
  foodPerMin = 0;
  trailCoherence = 0;
  meetings = 0;
  ideologies = 0;
  dominantShare = 0;
  dread = 0;
  hoardedFood = 0;
  antsIdle = 0;
  baselineFoodPerMin = 0; // best 30s window measured at k=0 this session

  series: MetricSample[] = [];
  private clusters: Cluster[] = [];
  private lastSample = 0;
  private lastHeavy = 0;

  reset() {
    this.deposits = [];
    this.foodStored = 0;
    this.foodPerMin = 0;
    this.trailCoherence = 0;
    this.meetings = 0;
    this.ideologies = 0;
    this.dominantShare = 0;
    this.dread = 0;
    this.hoardedFood = 0;
    this.antsIdle = 0;
    this.baselineFoodPerMin = 0;
    this.series = [];
    this.clusters = [];
    this.lastSample = 0;
    this.lastHeavy = 0;
  }

  recordDeposit(now: number) {
    this.foodStored++;
    this.deposits.push(now);
  }

  get productivityDelta(): number {
    if (this.baselineFoodPerMin <= 0.01) return 0;
    return (this.foodPerMin - this.baselineFoodPerMin) / this.baselineFoodPerMin;
  }

  update(now: number, ants: Ant[], phero: Pheromone, k: number, hoarded: number) {
    // Rolling window, extrapolated to per-minute. The window has to be short:
    // a 30s window cannot show a recovery inside 12s no matter how fast the
    // colony actually recovers, because two thirds of it is still the collapse.
    const cutoff = now - Metrics.WINDOW_MS;
    while (this.deposits.length && this.deposits[0] < cutoff) this.deposits.shift();
    this.foodPerMin = this.deposits.length * (60000 / Metrics.WINDOW_MS);

    if (k < 0.02 && this.foodPerMin > this.baselineFoodPerMin) {
      this.baselineFoodPerMin = this.foodPerMin;
    }

    this.hoardedFood = hoarded;

    let idle = 0;
    let dreadCount = 0;
    let minds = 0;
    for (const a of ants) {
      if (!a.alive) continue;
      if (a.lastSpeed < 5) idle++;
      if (a.isMind) {
        minds++;
        if (DREAD_EMOTIONS.has(a.emotion)) dreadCount++;
      }
    }
    const live = ants.length || 1;
    this.antsIdle = idle / live;
    this.dread = minds > 0 ? dreadCount / minds : 0;

    // heavier passes at 4Hz
    if (now - this.lastHeavy > 250) {
      this.lastHeavy = now;
      this.trailCoherence = this.computeCoherence(phero);
      this.meetings = this.computeMeetings(now, ants);
    }

    if (now - this.lastSample > 500) {
      this.lastSample = now;
      this.series.push({ t: now, foodPerMin: this.foodPerMin, consciousness: k * 100 });
      if (this.series.length > 120) this.series.shift(); // 60s window
    }
  }

  /**
   * How much the food gradient agrees with itself locally, in 0..1.
   *
   * Raw gradient magnitude is the wrong measure: a crowd of stalled ants dumps a
   * dense blob and scores higher than a real trail. Directional agreement is what
   * "coherence" should mean. A route has neighbouring gradients pointing the same
   * way (near 1); a blob has them pointing radially inward, cancelling out (near 0).
   */
  private computeCoherence(phero: Pheromone): number {
    const a = phero.food;
    const BLOCK = 4;
    let total = 0;
    let blocks = 0;

    for (let by = 1; by < GRID_H - BLOCK - 1; by += BLOCK) {
      for (let bx = 1; bx < GRID_W - BLOCK - 1; bx += BLOCK) {
        let sx = 0;
        let sy = 0;
        let n = 0;
        for (let gy = by; gy < by + BLOCK; gy++) {
          for (let gx = bx; gx < bx + BLOCK; gx++) {
            const i = gy * GRID_W + gx;
            if (a[i] < 0.5) continue;
            const gxv = a[i + 1] - a[i - 1];
            const gyv = a[i + GRID_W] - a[i - GRID_W];
            const mag = Math.sqrt(gxv * gxv + gyv * gyv);
            if (mag < 1e-6) continue;
            sx += gxv / mag;
            sy += gyv / mag;
            n++;
          }
        }
        if (n < 4) continue;
        total += Math.sqrt(sx * sx + sy * sy) / n;
        blocks++;
      }
    }
    return blocks > 0 ? total / blocks : 0;
  }

  /** Clusters of >=5 ants within r=45 moving slower than 8px/s for >3s. */
  private computeMeetings(now: number, ants: Ant[]): number {
    const R = 45;
    const CELLSZ = R;
    const buckets = new Map<string, Ant[]>();
    for (const a of ants) {
      if (!a.alive || a.lastSpeed > 8) continue;
      const key = `${(a.x / CELLSZ) | 0},${(a.y / CELLSZ) | 0}`;
      const arr = buckets.get(key);
      if (arr) arr.push(a);
      else buckets.set(key, [a]);
    }
    const activeKeys = new Set<string>();
    for (const [key, arr] of buckets) {
      if (arr.length < 5) continue;
      activeKeys.add(key);
    }
    this.clusters = this.clusters.filter((c) => activeKeys.has(c.key));
    for (const key of activeKeys) {
      if (!this.clusters.some((c) => c.key === key)) this.clusters.push({ key, since: now });
    }
    return this.clusters.filter((c) => now - c.since > 3000).length;
  }

  static WINDOW_MS = 10000;
  static nestRadius = C.ANT.NEST_R;
}
