import { C, type Primitive } from './constants';
import { hash } from './rng';

export interface Meme {
  id: number;
  label: string;
  primitive: Primitive;
  hue: number;
  spread: number;
  coinedBy: string;
  coinedAtTick: number;
  coinedAtMs: number;
  followers: number;
  history: number[]; // follower counts, for sparklines
  extinct: boolean;
  lifespanMs: number;
  zeroSince: number | null;
}

export class MemeRegistry {
  private nextId = 1;
  memes = new Map<number, Meme>();

  reset() {
    this.nextId = 1;
    this.memes.clear();
  }

  get(id: number): Meme | undefined {
    return this.memes.get(id);
  }

  list(): Meme[] {
    return [...this.memes.values()];
  }

  /** Active ideologies with a real footprint — what the prompt sees. */
  active(): Meme[] {
    return this.list()
      .filter((m) => !m.extinct && m.followers >= 3)
      .sort((a, b) => b.followers - a.followers);
  }

  hasLabel(label: string): boolean {
    const key = label.trim().toLowerCase();
    for (const m of this.memes.values()) if (m.label.toLowerCase() === key) return true;
    return false;
  }

  coin(
    label: string,
    primitive: Primitive,
    spread: number,
    coinedBy: string,
    tick: number,
    nowMs: number
  ): Meme | null {
    if (this.hasLabel(label)) return null;
    const meme: Meme = {
      id: this.nextId++,
      label: label.trim().slice(0, 40),
      primitive,
      hue: hash(label) % 360,
      spread: Math.max(0.05, Math.min(0.95, spread)),
      coinedBy,
      coinedAtTick: tick,
      coinedAtMs: nowMs,
      followers: 0,
      history: [],
      extinct: false,
      lifespanMs: 0,
      zeroSince: null,
    };
    this.memes.set(meme.id, meme);
    return meme;
  }

  /** Recount followers from the actual population. Measured, never assigned. */
  recount(counts: Map<number, number>, nowMs: number) {
    for (const m of this.memes.values()) {
      m.followers = counts.get(m.id) ?? 0;
      if (m.history.length === 0 || m.history[m.history.length - 1] !== m.followers) {
        m.history.push(m.followers);
        if (m.history.length > 40) m.history.shift();
      }
      if (m.extinct) continue;
      if (m.followers === 0) {
        if (m.zeroSince === null) m.zeroSince = nowMs;
        else if (nowMs - m.zeroSince > C.MEME_EXTINCT_MS) {
          m.extinct = true;
          m.lifespanMs = nowMs - m.coinedAtMs;
        }
      } else {
        m.zeroSince = null;
      }
    }
  }
}
