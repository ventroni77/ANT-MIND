import { C, GRID_W, GRID_H } from './constants';

export type DynChannel = 'food' | 'home' | 'danger';

const N = GRID_W * GRID_H;

export class Pheromone {
  food = new Float32Array(N);
  home = new Float32Array(N);
  danger = new Float32Array(N);
  chalk = new Float32Array(N); // static, user-drawn, never evaporates
  wall = new Uint8Array(N); // hard obstacle
  memeId = new Uint16Array(N);
  memeStr = new Float32Array(N);

  private scratch = new Float32Array(N);
  private accum = 0;

  reset() {
    this.food.fill(0);
    this.home.fill(0);
    this.danger.fill(0);
    this.chalk.fill(0);
    this.wall.fill(0);
    this.memeId.fill(0);
    this.memeStr.fill(0);
    this.accum = 0;
  }

  idx(x: number, y: number): number {
    const gx = Math.min(GRID_W - 1, Math.max(0, (x / C.CELL) | 0));
    const gy = Math.min(GRID_H - 1, Math.max(0, (y / C.CELL) | 0));
    return gy * GRID_W + gx;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < C.WORLD_W && y < C.WORLD_H;
  }

  isWall(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return true;
    return this.wall[this.idx(x, y)] === 1;
  }

  deposit(x: number, y: number, channel: DynChannel, amount: number) {
    if (!this.inBounds(x, y)) return;
    const i = this.idx(x, y);
    this[channel][i] += amount;
  }

  paint(x: number, y: number, channel: 'chalk', amount: number, radius = 1) {
    const gx = (x / C.CELL) | 0;
    const gy = (y / C.CELL) | 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const cx = gx + dx;
        const cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) continue;
        this[channel][cy * GRID_W + cx] = amount;
      }
    }
  }

  setWall(x: number, y: number, on: boolean, radius = 1) {
    const gx = (x / C.CELL) | 0;
    const gy = (y / C.CELL) | 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const cx = gx + dx;
        const cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) continue;
        this.wall[cy * GRID_W + cx] = on ? 1 : 0;
      }
    }
  }

  erase(x: number, y: number, radius = 2) {
    const gx = (x / C.CELL) | 0;
    const gy = (y / C.CELL) | 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const cx = gx + dx;
        const cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) continue;
        const i = cy * GRID_W + cx;
        this.chalk[i] = 0;
        this.wall[i] = 0;
        this.danger[i] = 0;
      }
    }
  }

  /** Sample a channel at SENSOR_DIST along `angle` from (x,y). */
  sense(x: number, y: number, angle: number, channel: DynChannel | 'chalk'): number {
    const sx = x + Math.cos(angle) * C.ANT.SENSOR_DIST;
    const sy = y + Math.sin(angle) * C.ANT.SENSOR_DIST;
    if (!this.inBounds(sx, sy)) return -1;
    const i = this.idx(sx, sy);
    if (this.wall[i] === 1) return -1;
    return this[channel][i];
  }

  valueAt(x: number, y: number, channel: DynChannel | 'chalk'): number {
    if (!this.inBounds(x, y)) return 0;
    return this[channel][this.idx(x, y)];
  }

  memeAt(x: number, y: number): { id: number; strength: number } {
    if (!this.inBounds(x, y)) return { id: 0, strength: 0 };
    const i = this.idx(x, y);
    return { id: this.memeId[i], strength: Math.min(1, this.memeStr[i] / 100) };
  }

  /**
   * Ideological territory. Same meme reinforces; a rival meme contests and can
   * flip ownership of the cell. This is what makes ideologies fight over the map.
   */
  depositMeme(x: number, y: number, memeId: number, amount: number) {
    if (!this.inBounds(x, y) || memeId === 0) return;
    const i = this.idx(x, y);
    const owner = this.memeId[i];
    if (owner === 0 || owner === memeId) {
      this.memeId[i] = memeId;
      this.memeStr[i] = Math.min(255, this.memeStr[i] + amount);
    } else {
      this.memeStr[i] -= amount;
      if (this.memeStr[i] <= 0) {
        this.memeId[i] = memeId;
        this.memeStr[i] = -this.memeStr[i];
      }
    }
  }

  /** Nearest cell of a channel above `min` within `radius` px. */
  nearestCell(
    x: number,
    y: number,
    channel: DynChannel | 'chalk',
    radius: number,
    min = 0.01
  ): { x: number; y: number } | null {
    const gx = (x / C.CELL) | 0;
    const gy = (y / C.CELL) | 0;
    const r = Math.max(1, (radius / C.CELL) | 0);
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    const arr = this[channel];
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const cx = gx + dx;
        const cy = gy + dy;
        if (cx < 0 || cy < 0 || cx >= GRID_W || cy >= GRID_H) continue;
        if (arr[cy * GRID_W + cx] <= min) continue;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { x: (cx + 0.5) * C.CELL, y: (cy + 0.5) * C.CELL };
        }
      }
    }
    return best;
  }

  /** Fixed-rate evaporation + diffusion. Call every frame with dt in ms. */
  update(dtMs: number) {
    this.accum += dtMs;
    while (this.accum >= C.PHERO_TICK_MS) {
      this.accum -= C.PHERO_TICK_MS;
      this.step();
    }
  }

  private step() {
    this.decay(this.food, C.EVAPORATE.food);
    this.decay(this.home, C.EVAPORATE.home);
    this.decay(this.danger, C.EVAPORATE.danger);

    this.blur(this.food);
    this.blur(this.home);

    // meme decay + ownership expiry
    const f = C.EVAPORATE.meme;
    for (let i = 0; i < N; i++) {
      if (this.memeId[i] === 0) continue;
      this.memeStr[i] *= f;
      if (this.memeStr[i] < 0.02) {
        this.memeStr[i] = 0;
        this.memeId[i] = 0;
      }
    }
  }

  private decay(a: Float32Array, factor: number) {
    for (let i = 0; i < N; i++) {
      const v = a[i] * factor;
      a[i] = v < 0.01 ? 0 : v;
    }
  }

  /** 3x3 box blur mixed in at DIFFUSE strength. Walls block spread. */
  private blur(a: Float32Array) {
    const mix = C.DIFFUSE;
    const s = this.scratch;
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        const i = gy * GRID_W + gx;
        if (this.wall[i] === 1) {
          s[i] = 0;
          continue;
        }
        let sum = 0;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const cy = gy + dy;
          if (cy < 0 || cy >= GRID_H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const cx = gx + dx;
            if (cx < 0 || cx >= GRID_W) continue;
            const j = cy * GRID_W + cx;
            if (this.wall[j] === 1) continue;
            sum += a[j];
            n++;
          }
        }
        s[i] = n > 0 ? sum / n : a[i];
      }
    }
    for (let i = 0; i < N; i++) {
      a[i] += (s[i] - a[i]) * mix;
    }
  }
}
