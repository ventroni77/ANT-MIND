import { Sprite, Texture, ImageSource } from 'pixi.js';
import { C } from '../sim/constants';

/**
 * A static soil floor generated once. Gives the world a real ground plane so the
 * trails read as worn earth rather than glowing lines on a void. Value-noise
 * mottling plus a soft vignette; deterministic, so it never shifts between runs.
 */
export class TerrainLayer {
  sprite: Sprite;

  constructor() {
    const W = 800;
    const H = 500;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    const d = img.data;

    // deterministic value noise
    let seed = 0x9e3779b9;
    const rand = () => {
      seed = (seed + 0x6d2b79f5) >>> 0;
      let t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    // low-res noise fields, bilinearly sampled, layered for a soil look
    const coarse = this.noiseField(48, 30, rand);
    const fine = this.noiseField(200, 125, rand);

    const cx = W / 2;
    const cy = H / 2;
    const maxD = Math.sqrt(cx * cx + cy * cy);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const o = (y * W + x) * 4;
        const c = this.sample(coarse, 48, 30, x / W, y / H);
        const f = this.sample(fine, 200, 125, x / W, y / H);
        const grain = rand() * 0.06;
        const n = c * 0.6 + f * 0.3 + grain;

        // warm dark earth palette
        let r = 34 + n * 46;
        let g = 24 + n * 34;
        let b = 18 + n * 24;

        // occasional darker specks: grit and pebbles
        if (rand() < 0.015) {
          const dk = 0.5 + rand() * 0.3;
          r *= dk;
          g *= dk;
          b *= dk;
        }

        // vignette toward the edges
        const dx = x - cx;
        const dy = y - cy;
        const vig = 1 - Math.pow(Math.sqrt(dx * dx + dy * dy) / maxD, 2.2) * 0.55;
        r *= vig;
        g *= vig;
        b *= vig;

        d[o] = r;
        d[o + 1] = g;
        d[o + 2] = b;
        d[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    const source = new ImageSource({ resource: canvas, width: W, height: H, scaleMode: 'linear' });
    this.sprite = new Sprite(new Texture({ source }));
    this.sprite.width = C.WORLD_W;
    this.sprite.height = C.WORLD_H;
  }

  private noiseField(w: number, h: number, rand: () => number): Float32Array {
    const f = new Float32Array(w * h);
    for (let i = 0; i < f.length; i++) f[i] = rand();
    return f;
  }

  private sample(field: Float32Array, w: number, h: number, u: number, v: number): number {
    const fx = u * (w - 1);
    const fy = v * (h - 1);
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const x1 = Math.min(w - 1, x0 + 1);
    const y1 = Math.min(h - 1, y0 + 1);
    const tx = fx - x0;
    const ty = fy - y0;
    const a = field[y0 * w + x0];
    const b = field[y0 * w + x1];
    const c = field[y1 * w + x0];
    const dd = field[y1 * w + x1];
    return (
      a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + dd * tx * ty
    );
  }

  destroy() {
    this.sprite.destroy();
  }
}
