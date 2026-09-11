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
  private dotTex: Texture;
  private glowTex: Texture;

  constructor(renderer: Renderer, count: number) {
    this.antTex = AntLayer.makeAntTexture(renderer);
    this.dotTex = AntLayer.makeDotTexture(renderer, 0x7dff9b, 3);
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

      const c = new Sprite(this.dotTex);
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
    const g = new Graphics();
    // abdomen, thorax, head along +x
    g.ellipse(-3.2, 0, 3.1, 2.3).fill(0x1b1410);
    g.ellipse(0.4, 0, 1.7, 1.5).fill(0x241a14);
    g.ellipse(3.2, 0, 2.0, 1.7).fill(0x2e211a);
    // legs
    g.moveTo(0, 0).lineTo(-2, -4).moveTo(0, 0).lineTo(-2, 4);
    g.moveTo(1, 0).lineTo(2, -4).moveTo(1, 0).lineTo(2, 4);
    g.stroke({ width: 0.7, color: 0x16100c });
    const tex = renderer.generateTexture({ target: g, resolution: 3 });
    g.destroy();
    return tex;
  }

  static makeDotTexture(renderer: Renderer, color: number, r: number): Texture {
    const g = new Graphics().circle(0, 0, r).fill(color);
    const tex = renderer.generateTexture({ target: g, resolution: 3 });
    g.destroy();
    return tex;
  }

  static makeGlowTexture(renderer: Renderer): Texture {
    const g = new Graphics();
    for (let i = 8; i > 0; i--) {
      g.circle(0, 0, i * 1.7).fill({ color: 0xb079ff, alpha: 0.045 });
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
      s.visible = true;
      s.x = a.x;
      s.y = a.y;
      s.rotation = a.angle;
      s.scale.set(a.isMind ? 1.55 : 1);
      s.tint = a.isMind ? 0x5a3f6b : 0xffffff;

      const c = this.carry[i];
      if (a.carrying) {
        c.visible = true;
        c.x = a.x + Math.cos(a.angle) * 5;
        c.y = a.y + Math.sin(a.angle) * 5;
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
