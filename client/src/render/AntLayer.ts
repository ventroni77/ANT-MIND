import { Container, Graphics, Sprite, Texture, Text, Renderer, ParticleContainer } from 'pixi.js';
import { C } from '../sim/constants';
import type { World } from '../sim/World';
import type { Ant } from '../sim/Ant';

interface Bubble {
  text: Text;
  antId: number;
  until: number;
}

export class AntLayer {
  root = new Container();
  private bodies = new Container();
  private glows = new Container();
  private labels = new Container();
  private bubbles: Bubble[] = [];
  private sprites: Sprite[] = [];
  private carry: Sprite[] = [];
  private glowSprites: Sprite[] = [];
  private nameTexts: Text[] = [];
  private antTex: Texture;
  private crumbTex: Texture;
  private glowTex: Texture;

  constructor(renderer: Renderer, count: number) {
    this.antTex = AntLayer.makeAntTexture(renderer);
    this.crumbTex = AntLayer.makeCrumbTexture(renderer);
    this.glowTex = AntLayer.makeGlowTexture(renderer);

    this.root.addChild(this.glows, this.bodies, this.labels);

    for (let i = 0; i < count; i++) {
      const g = new Sprite(this.glowTex);
      g.anchor.set(0.5);
      g.visible = false;
      g.alpha = 0.55;
      this.glows.addChild(g);
      this.glowSprites.push(g);

      const s = new Sprite(this.antTex);
      s.anchor.set(0.5);
      this.bodies.addChild(s);
      this.sprites.push(s);

      const c = new Sprite(this.crumbTex);
      c.anchor.set(0.5);
      c.visible = false;
      this.bodies.addChild(c);
      this.carry.push(c);

      const t = new Text({
        text: '',
        style: { fill: 0xd9c7ff, fontSize: 11, fontFamily: 'monospace' },
      });
      t.anchor.set(0.5, 1.4);
      t.visible = false;
      this.labels.addChild(t);
      this.nameTexts.push(t);
    }
  }

  static makeAntTexture(renderer: Renderer): Texture {
    // Anatomically-shaped ant facing +x: gaster, petiole (waist), thorax, head,
    // six jointed legs, two antennae. Drawn large then downscaled for smooth edges.
    const g = new Graphics();
    const body = 0x1a120c;
    const sheen = 0x3a2a1e;
    const leg = 0x140d09;

    // legs first, so the body sits on top. Three pairs, bent at a knee joint,
    // swept slightly so they read as walking rather than a splat.
    const legPairs: [number, number, number][] = [
      // [attach x, knee spread, foot reach]
      [2.4, 3.2, 6.0], // front, swept forward
      [0.2, 3.6, 6.6], // middle
      [-2.0, 3.2, 6.2], // rear, swept back
    ];
    for (const [ax, spread, reach] of legPairs) {
      for (const side of [-1, 1]) {
        const kneeX = ax + (ax > 0 ? 1.2 : -1.2);
        const kneeY = side * spread;
        const footX = ax + (ax > 0 ? 2.0 : -2.4);
        const footY = side * reach;
        g.moveTo(ax * 0.4, side * 0.6)
          .lineTo(kneeX, kneeY)
          .lineTo(footX, footY);
      }
    }
    g.stroke({ width: 0.9, color: leg, cap: 'round', join: 'round' });

    // antennae
    for (const side of [-1, 1]) {
      g.moveTo(5.4, side * 0.6)
        .lineTo(7.6, side * 1.8)
        .lineTo(9.2, side * 1.4);
    }
    g.stroke({ width: 0.7, color: leg, cap: 'round', join: 'round' });

    // gaster (rear, largest), thorax (middle), head (front)
    g.ellipse(-4.0, 0, 4.0, 3.0).fill(body);
    g.ellipse(-0.4, 0, 1.4, 1.0).fill(body); // petiole / waist
    g.ellipse(1.8, 0, 2.6, 2.0).fill(body); // thorax (alitrunk)
    g.ellipse(5.4, 0, 2.4, 2.1).fill(body); // head

    // subtle top sheen so the chitin catches light
    g.ellipse(-4.6, -0.9, 2.2, 1.2).fill({ color: sheen, alpha: 0.5 });
    g.ellipse(5.0, -0.7, 1.2, 0.8).fill({ color: sheen, alpha: 0.5 });

    // mandibles
    for (const side of [-1, 1]) {
      g.moveTo(7.4, side * 0.9)
        .lineTo(8.8, side * 1.6);
    }
    g.stroke({ width: 0.8, color: leg, cap: 'round' });

    const tex = renderer.generateTexture({ target: g, resolution: 4 });
    g.destroy();
    return tex;
  }

  /** A carried morsel: an irregular leaf-fragment held out at the mandibles. */
  static makeCrumbTexture(renderer: Renderer): Texture {
    const g = new Graphics();
    g.poly([-2.6, -1.8, 2.4, -2.6, 3.2, 1.4, -0.6, 3.0, -3.0, 1.2]).fill(0x5f8a3a);
    g.poly([-2.6, -1.8, 2.4, -2.6, 3.2, 1.4, -0.6, 3.0, -3.0, 1.2]).stroke({
      width: 0.6,
      color: 0x3c5d22,
    });
    // midrib + highlight
    g.moveTo(-2.4, -1.4).lineTo(2.8, 0.8).stroke({ width: 0.6, color: 0x3c5d22, alpha: 0.8 });
    g.ellipse(0, -0.4, 1.0, 0.7).fill({ color: 0x82b055, alpha: 0.6 });
    const tex = renderer.generateTexture({ target: g, resolution: 4 });
    g.destroy();
    return tex;
  }

  static makeGlowTexture(renderer: Renderer): Texture {
    const g = new Graphics();
    for (let i = 10; i > 0; i--) {
      g.circle(0, 0, i * 1.3).fill({ color: 0xb079ff, alpha: 0.03 });
    }
    const tex = renderer.generateTexture({ target: g, resolution: 2 });
    g.destroy();
    return tex;
  }

  addBubble(antId: number, say: string, now: number) {
    const t = new Text({
      text: say.length > 46 ? say.slice(0, 45) + '…' : say,
      style: {
        fill: 0xffffff,
        fontSize: 12,
        fontFamily: 'monospace',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    t.anchor.set(0.5, 2.4);
    this.labels.addChild(t);
    this.bubbles.push({ text: t, antId, until: now + C.THOUGHT_BUBBLE_MS });
    while (this.bubbles.length > C.MAX_THOUGHT_BUBBLES) {
      const old = this.bubbles.shift();
      old?.text.destroy();
    }
  }

  update(w: World, showLabels: boolean, now: number) {
    const ants = w.ants;
    for (let i = 0; i < this.sprites.length; i++) {
      const s = this.sprites[i];
      const a: Ant | undefined = ants[i];
      if (!a || !a.alive) {
        s.visible = false;
        this.carry[i].visible = false;
        this.glowSprites[i].visible = false;
        this.nameTexts[i].visible = false;
        continue;
      }
      // the texture is drawn ~4x larger than world scale for crisp edges
      const base = 0.5;
      s.visible = true;
      s.x = a.x;
      s.y = a.y;
      // a subtle gait: the body yaws a hair as it walks, from its own position
      const gait = a.lastSpeed > 5 ? Math.sin(now * 0.02 + a.id) * 0.08 : 0;
      s.rotation = a.angle + gait;
      s.scale.set(base * (a.isMind ? 1.45 : 1));
      // instinct ants keep natural chitin colour; minds take a faint violet cast
      s.tint = a.isMind ? 0x9a7fb5 : 0xffffff;

      const c = this.carry[i];
      if (a.carrying) {
        c.visible = true;
        // held ahead at the mandibles, bobbing gently with the stride
        const reach = 6.2;
        const bob = Math.sin(now * 0.02 + a.id) * 0.5;
        c.x = a.x + Math.cos(a.angle) * reach - Math.sin(a.angle) * bob;
        c.y = a.y + Math.sin(a.angle) * reach + Math.cos(a.angle) * bob;
        c.rotation = a.angle + now * 0.001;
        c.scale.set(base * 0.9);
      } else c.visible = false;

      const g = this.glowSprites[i];
      if (a.isMind) {
        g.visible = true;
        g.x = a.x;
        g.y = a.y;
        const conv = 0.35 + a.conviction * 0.5;
        g.alpha = now < a.hesitateUntil ? conv * 1.4 : conv;
        const meme = a.memeId ? w.memes.get(a.memeId) : undefined;
        g.tint = meme ? hueToInt(meme.hue) : 0xb079ff;
      } else if (a.memeId !== 0) {
        g.visible = true;
        g.x = a.x;
        g.y = a.y;
        g.alpha = 0.18 + a.conviction * 0.25;
        g.scale.set(0.55);
        const meme = w.memes.get(a.memeId);
        g.tint = meme ? hueToInt(meme.hue) : 0xffffff;
      } else {
        g.visible = false;
        g.scale.set(1);
      }

      const t = this.nameTexts[i];
      if (a.isMind && showLabels && a.name) {
        t.visible = true;
        t.text = a.name;
        t.x = a.x;
        t.y = a.y;
      } else t.visible = false;
    }

    // bubbles track their ant
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      const a = ants[b.antId];
      const left = b.until - now;
      if (left <= 0 || !a || !a.alive) {
        b.text.destroy();
        this.bubbles.splice(i, 1);
        continue;
      }
      b.text.x = a.x;
      b.text.y = a.y;
      b.text.alpha = Math.min(1, left / 700);
    }
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

export function hueToInt(h: number): number {
  const c = 1;
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
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}

export { ParticleContainer };
