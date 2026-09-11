import { Sprite, Texture, ImageSource, BLEND_MODES } from 'pixi.js';
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
    this.sprite.blendMode = 'add' as unknown as BLEND_MODES;
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

      // base: food = cyan-green, home = dim blue
      let r = danger * 235;
      let g = food * 200 + home * 30;
      let b = food * 150 + home * 120;

      // meme colour rides on top
      const mid = p.memeId[i];
      if (mid !== 0) {
        const str = Math.min(1, p.memeStr[i] / 90);
        const hue = (mid * 47 + ((mid * 129) % 360)) % 360;
        const [mr, mg, mb] = hsv(hue, 0.85, str);
        r += mr * 0.85;
        g += mg * 0.55;
        b += mb * 0.85;
      }

      if (chalk) {
        r += 190;
        g += 190;
        b += 190;
      }
      if (wall) {
        r = 90;
        g = 80;
        b = 110;
      }

      d[o] = r > 255 ? 255 : r;
      d[o + 1] = g > 255 ? 255 : g;
      d[o + 2] = b > 255 ? 255 : b;
      d[o + 3] = 255;
    }

    this.ctx2d.putImageData(this.imageData, 0, 0);
    this.source.update();
  }

  destroy() {
    this.sprite.destroy();
  }
}
