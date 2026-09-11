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

    // nest
    g.circle(C.NEST.x, C.NEST.y, C.ANT.NEST_R).fill({ color: 0x3a2a1c, alpha: 0.75 });
    g.circle(C.NEST.x, C.NEST.y, C.ANT.NEST_R).stroke({ width: 2, color: 0x6b5136, alpha: 0.9 });
    g.circle(C.NEST.x, C.NEST.y, 9).fill(0x120c08);

    // food piles: size tracks remaining amount
    for (const f of w.food) {
      const r = 5 + Math.sqrt(f.amount) * 1.5;
      g.circle(f.x, f.y, r).fill({ color: 0x4d7a2e, alpha: 0.85 });
      g.circle(f.x, f.y, r).stroke({ width: 1, color: 0x8fd45a, alpha: 0.7 });
    }

    // private hoards
    for (const s of w.stashes) {
      const r = 3 + Math.sqrt(s.amount) * 1.3;
      g.circle(s.x, s.y, r).fill({ color: 0x7a6a2e, alpha: 0.8 });
    }

    // corpses
    for (const c of w.corpses) {
      g.circle(c.x, c.y, 2.5).fill({ color: 0x8a2c2c, alpha: 0.85 });
    }

    if (w.handActive) {
      this.shadow.visible = true;
      this.shadow.x = w.cursor.x;
      this.shadow.y = w.cursor.y;
    } else this.shadow.visible = false;

    this.tint.alpha = 0.22 * w.consciousness;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}
