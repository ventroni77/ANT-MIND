import { Container, Graphics, Sprite, Renderer } from 'pixi.js';
import { C } from '../sim/constants';
import type { World } from '../sim/World';

/** Nest, food piles, stashes, corpses, the Hand shadow, and the consciousness tint. */
export class ToolLayer {
  root = new Container();
  private g = new Graphics();
  private shadow: Sprite;
  private tint: Sprite;

  constructor(renderer: Renderer) {
    const sg = new Graphics();
    for (let i = 20; i > 0; i--) {
      sg.circle(0, 0, i * 13).fill({ color: 0x000000, alpha: 0.03 });
    }
    const tex = renderer.generateTexture({ target: sg, resolution: 1 });
    sg.destroy();
    this.shadow = new Sprite(tex);
    this.shadow.anchor.set(0.5);
    this.shadow.visible = false;

    const tg = new Graphics().rect(0, 0, 8, 8).fill(0x1a0033);
    const ttex = renderer.generateTexture({ target: tg, resolution: 1 });
    tg.destroy();
    this.tint = new Sprite(ttex);
    this.tint.width = C.WORLD_W;
    this.tint.height = C.WORLD_H;
    this.tint.alpha = 0;

    this.root.addChild(this.g, this.shadow, this.tint);
  }

  /** The tint sprite must sit above ants, so expose it for reordering. */
  get tintSprite(): Sprite {
    return this.tint;
  }

  update(w: World) {
    const g = this.g;
    g.clear();

    // nest: a raised earth mound with concentric packed rings and a dark entrance
    const nr = C.ANT.NEST_R;
    g.circle(C.NEST.x, C.NEST.y, nr + 8).fill({ color: 0x2a1e14, alpha: 0.55 });
    g.circle(C.NEST.x, C.NEST.y, nr + 2).fill({ color: 0x5a4228, alpha: 0.85 });
    g.circle(C.NEST.x, C.NEST.y, nr - 4).fill({ color: 0x6e5230, alpha: 0.9 });
    g.circle(C.NEST.x, C.NEST.y, nr - 12).fill({ color: 0x4a3721, alpha: 0.9 });
    // entrance crater
    g.circle(C.NEST.x, C.NEST.y, 11).fill(0x0d0906);
    g.circle(C.NEST.x, C.NEST.y, 11).stroke({ width: 2, color: 0x7a5c38, alpha: 0.7 });

    // food piles: clustered seeds/grains, deterministically scattered per pile
    for (const f of w.food) {
      const r = 6 + Math.sqrt(f.amount) * 1.4;
      // damp patch of ground under the pile
      g.circle(f.x, f.y, r + 3).fill({ color: 0x3c3016, alpha: 0.4 });
      const seeds = Math.min(46, 6 + Math.floor(f.amount / 9));
      let s = (Math.floor(f.x) * 73856093) ^ (Math.floor(f.y) * 19349663);
      const rnd = () => {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        return s / 0x7fffffff;
      };
      for (let n = 0; n < seeds; n++) {
        const ang = rnd() * Math.PI * 2;
        const dist = Math.sqrt(rnd()) * r;
        const sx = f.x + Math.cos(ang) * dist;
        const sy = f.y + Math.sin(ang) * dist;
        const sr = 1.4 + rnd() * 1.3;
        const tone = rnd();
        g.ellipse(sx, sy, sr, sr * 0.78)
          .fill({ color: tone < 0.5 ? 0x6f9838 : tone < 0.8 ? 0x88b04b : 0xc8a24a });
      }
    }

    // private hoards: a small scatter of hidden grains
    for (const st of w.stashes) {
      const r = 3 + Math.sqrt(st.amount) * 1.2;
      g.circle(st.x, st.y, r + 2).fill({ color: 0x33290f, alpha: 0.4 });
      g.ellipse(st.x, st.y, r * 0.7, r * 0.55).fill({ color: 0x9a842f, alpha: 0.9 });
    }

    // corpses: a curled dark husk with faint danger stain
    for (const c of w.corpses) {
      g.circle(c.x, c.y, 4).fill({ color: 0x5a1616, alpha: 0.35 });
      g.ellipse(c.x, c.y, 2.6, 1.8).fill({ color: 0x140d09, alpha: 0.9 });
    }

    if (w.handActive) {
      this.shadow.visible = true;
      this.shadow.x = w.cursor.x;
      this.shadow.y = w.cursor.y;
    } else this.shadow.visible = false;

    // a restrained dusk shift as minds take over; capped so the ground stays legible
    this.tint.alpha = 0.16 * w.consciousness;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}
