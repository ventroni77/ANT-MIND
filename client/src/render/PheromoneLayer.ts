import { Sprite, Texture, ImageSource } from 'pixi.js';
import { C, GRID_W, GRID_H } from '../sim/constants';
import type { World } from '../sim/World';

/** hsv -> rgb, h in degrees, s/v in 0..1 */
function hsv(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = (h % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = v - c;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * Trails as worn earth, not a heatmap. Ants tramp the soil into paler, packed
 * paths, so busy routes read as trodden dirt over the terrain rather than glowing
 * lines. Rendered with normal alpha compositing over the terrain, never additive.
 * Memes are faint coloured stains of territory. Danger scorches. Chalk is dust.
 */
export class PheromoneLayer {
  sprite: Sprite;
  private buf: Uint8Array;
  private source: ImageSource;
  private canvas: HTMLCanvasElement;
  private ctx2d: CanvasRenderingContext2D;
  private imageData: ImageData;
  private last = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = GRID_W;
    this.canvas.height = GRID_H;
    const ctx = this.canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx2d = ctx;
    this.imageData = ctx.createImageData(GRID_W, GRID_H);
    this.buf = this.imageData.data as unknown as Uint8Array;

    this.source = new ImageSource({
      resource: this.canvas,
      width: GRID_W,
      height: GRID_H,
      scaleMode: 'linear',
    });
    this.sprite = new Sprite(new Texture({ source: this.source }));
    this.sprite.width = C.WORLD_W;
    this.sprite.height = C.WORLD_H;
    // normal blending over the terrain — this is the key change away from the heatmap
  }

  update(w: World, nowMs: number) {
    if (nowMs - this.last < C.PHERO_RENDER_MS) return;
    this.last = nowMs;

    const p = w.phero;
    const d = this.buf;
    for (let i = 0; i < GRID_W * GRID_H; i++) {
      const o = i * 4;
      const food = Math.min(1, p.food[i] / 70);
      const home = Math.min(1, p.home[i] / 90);
      const danger = Math.min(1, p.danger[i] / 90);
      const chalk = p.chalk[i] > 0 ? 1 : 0;
      const wall = p.wall[i];
      const mid = p.memeId[i];

      // Trodden earth: the more traffic, the more packed and pale the dirt.
      // Foraging (food) and homing (home) trails both wear the ground; we take
      // the stronger so a used route is one coherent path, not two colours.
      const traffic = Math.max(food, home * 0.85);
      let r = 0;
      let g = 0;
      let b = 0;
      let alpha = 0;

      if (traffic > 0.01) {
        // packed soil is a touch warmer and lighter than the surrounding ground
        const t = Math.pow(traffic, 0.7);
        r = 120 + t * 60;
        g = 96 + t * 52;
        b = 72 + t * 40;
        alpha = Math.min(0.72, 0.12 + t * 0.6);
      }

      // ideological territory: a thin coloured stain washed over the dirt
      if (mid !== 0) {
        const str = Math.min(1, p.memeStr[i] / 90);
        const hue = w.memes.get(mid)?.hue ?? (mid * 47) % 360;
        const [mr, mg, mb] = hsv(hue, 0.7, 1);
        const ma = Math.min(0.5, str * 0.5);
        // composite the stain over whatever trail colour is there
        r = r * (1 - ma) + mr * ma;
        g = g * (1 - ma) + mg * ma;
        b = b * (1 - ma) + mb * ma;
        alpha = Math.max(alpha, ma);
      }

      // danger: scorched, dark red
      if (danger > 0.02) {
        const da = Math.min(0.8, danger * 0.8);
        r = r * (1 - da) + 150 * da;
        g = g * (1 - da) + 30 * da;
        b = b * (1 - da) + 24 * da;
        alpha = Math.max(alpha, da);
      }

      // chalk: pale dust sitting on top
      if (chalk) {
        r = 214;
        g = 210;
        b = 198;
        alpha = 0.9;
      }

      // wall: solid dark stone (fully opaque, drawn here for simplicity)
      if (wall) {
        r = 58;
        g = 52;
        b = 60;
        alpha = 1;
      }

      d[o] = r > 255 ? 255 : r;
      d[o + 1] = g > 255 ? 255 : g;
      d[o + 2] = b > 255 ? 255 : b;
      d[o + 3] = (alpha > 1 ? 1 : alpha) * 255;
    }

    this.ctx2d.putImageData(this.imageData, 0, 0);
    this.source.update();
  }

  destroy() {
    this.sprite.destroy();
  }
}
