import { C, isPrimitive, type Primitive } from './constants';
import { Ant, type AntCtx, type FoodPile } from './Ant';
import { Pheromone } from './Pheromone';
import { MemeRegistry, type Meme } from './Memes';
import { Metrics } from './Metrics';
import { RNG } from './rng';

const NAMES = [
  'Bramble', 'Mott', 'Sorrel', 'Vetch', 'Thistle', 'Ember', 'Quill', 'Nettle',
  'Cinder', 'Rust', 'Hollow', 'Marrow', 'Gorse', 'Tallow', 'Bracken', 'Ash',
  'Grist', 'Fennel', 'Loam', 'Pitch', 'Sedge', 'Weft', 'Char', 'Bindle',
];

export interface ThoughtEvent {
  antId: number;
  name: string;
  caste: string;
  emotion: string;
  say: string;
  to: string | null;
  memeLabel: string | null;
  at: number;
  source: 'groq' | 'offline';
}

export interface ThoughtCmd {
  id: number;
  say: string;
  goal: string;
  target: string | null;
  emotion: string;
  to: string | null;
  conviction_delta: number;
  belief: string | null;
  coin_meme: { label: string; primitive: string; spread: number } | null;
}

export interface Corpse {
  x: number;
  y: number;
  at: number;
}

export class World {
  seed: number;
  rng: RNG;
  phero = new Pheromone();
  memes = new MemeRegistry();
  metrics = new Metrics();

  ants: Ant[] = [];
  food: FoodPile[] = [];
  corpses: Corpse[] = [];
  stashes: { x: number; y: number; amount: number }[] = [];

  tick = 0;
  now = 0; // sim ms
  paused = false;

  consciousness = 0;
  colonyDoubt = 0;
  scarcity: number = C.SCARCITY;
  susceptibility: number = C.SUSCEPTIBILITY;
  drama = 0.95;
  nAnts: number = C.N_ANTS;

  cursor = { x: C.WORLD_W / 2, y: C.WORLD_H / 2, active: false };
  handActive = false;

  recentEvents: string[] = [];
  thoughts: ThoughtEvent[] = [];
  brainSource: 'groq' | 'offline' = 'groq';

  onThought?: (t: ThoughtEvent) => void;

  private grid = new Map<string, Ant[]>();
  private gridCell = 70;
  private nameCursor = 0;
  private accum = 0;

  constructor(seed: number = C.SEED) {
    this.seed = seed;
    this.rng = new RNG(seed);
    this.build();
  }

  reset(seed: number = this.seed) {
    this.seed = seed;
    this.rng = new RNG(seed);
    this.phero.reset();
    this.memes.reset();
    this.metrics.reset();
    this.ants = [];
    this.food = [];
    this.corpses = [];
    this.stashes = [];
    this.recentEvents = [];
    this.thoughts = [];
    this.tick = 0;
    this.now = 0;
    this.accum = 0;
    this.nameCursor = 0;
    this.build();
  }

  private build() {
    const castes: Ant['caste'][] = ['forager', 'forager', 'forager', 'scout', 'nurse'];
    for (let i = 0; i < this.nAnts; i++) {
      const ang = this.rng.range(0, Math.PI * 2);
      const d = this.rng.range(0, C.ANT.NEST_R);
      const a = new Ant(
        i,
        C.NEST.x + Math.cos(ang) * d,
        C.NEST.y + Math.sin(ang) * d,
        this.rng.range(0, Math.PI * 2),
        castes[this.rng.int(0, castes.length - 1)]
      );
      a.primitive = 'SEEK_FOOD';
      this.ants.push(a);
    }
    this.spawnFoodPiles();
  }

  private pileAmount(): number {
    return Math.max(80, Math.round(C.FOOD_PER_PILE * (1 - this.scarcity * 0.6)));
  }

  private pile(x: number, y: number, amount: number): FoodPile {
    return { x, y, amount, capacity: amount };
  }

  private spawnFoodPiles() {
    // two piles at differing distance so trails can find the shorter one
    const amt = this.pileAmount();
    this.food.push(this.pile(C.NEST.x + 320, C.NEST.y - 120, amt));
    this.food.push(this.pile(C.NEST.x + 560, C.NEST.y + 60, amt));
    for (let i = 2; i < C.FOOD_PILES; i++) {
      this.food.push(
        this.pile(
          this.rng.range(C.NEST.x + 260, C.WORLD_W - 80),
          this.rng.range(80, C.WORLD_H - 80),
          amt
        )
      );
    }
  }

  addFood(x: number, y: number, amount: number) {
    this.food.push(this.pile(x, y, amount));
  }

  logEvent(line: string) {
    this.recentEvents.push(line);
    if (this.recentEvents.length > 8) this.recentEvents.shift();
  }

  // ---------- main loop ----------

  step(realDtMs: number) {
    if (this.paused) return;
    this.accum += Math.min(realDtMs, 100);
    const stepMs = C.DT * 1000;
    let steps = 0;
    while (this.accum >= stepMs && steps < 4) {
      this.accum -= stepMs;
      this.advance();
      steps++;
    }
  }

  stepOnce() {
    this.advance();
  }

  private advance() {
    this.now += C.DT * 1000;
    this.tick++;

    this.rebuildGrid();
    this.phero.update(C.DT * 1000);
    this.updateNestPheromone();

    const ctx: AntCtx = {
      phero: this.phero,
      rng: this.rng,
      now: this.now,
      dt: C.DT,
      consciousness: this.consciousness,
      colonyDoubt: this.colonyDoubt,
      ants: this.ants,
      neighbors: (a, r) => this.neighbors(a, r),
      nearestFood: (x, y, r) => this.nearestFood(x, y, r),
      cursor: this.cursor,
    };

    for (const a of this.ants) {
      if (!a.alive) continue;
      a.update(ctx);
      this.handleFood(a);
    }

    if (this.tick % C.ADOPTION_FRAME_INTERVAL === 0) this.adoptionPass();
    if (this.tick % 15 === 0) this.recountMemes();
    this.regrowFood(C.DT);

    // colonyDoubt is measured, not set
    let believers = 0;
    for (const a of this.ants) if (a.alive && a.memeId !== 0) believers++;
    this.colonyDoubt = believers / Math.max(1, this.ants.length);

    this.syncMinds();

    const hoarded = this.stashes.reduce((s, p) => s + p.amount, 0);
    this.metrics.update(this.now, this.ants, this.phero, this.consciousness, hoarded);

    // corpses fade from the record after a while
    if (this.corpses.length && this.now - this.corpses[0].at > 20000) this.corpses.shift();
  }

  /** The nest is a permanent home-pheromone source, so returning always works. */
  private updateNestPheromone() {
    this.phero.deposit(C.NEST.x, C.NEST.y, 'home', 60);
  }

  private rebuildGrid() {
    this.grid.clear();
    for (const a of this.ants) {
      if (!a.alive) continue;
      const key = `${(a.x / this.gridCell) | 0},${(a.y / this.gridCell) | 0}`;
      const arr = this.grid.get(key);
      if (arr) arr.push(a);
      else this.grid.set(key, [a]);
    }
  }

  neighbors(a: Ant, radius: number): Ant[] {
    const r = Math.max(1, Math.ceil(radius / this.gridCell));
    const gx = (a.x / this.gridCell) | 0;
    const gy = (a.y / this.gridCell) | 0;
    const out: { ant: Ant; d: number }[] = [];
    const r2 = radius * radius;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const arr = this.grid.get(`${gx + dx},${gy + dy}`);
        if (!arr) continue;
        for (const b of arr) {
          if (b.id === a.id) continue;
          const ddx = b.x - a.x;
          const ddy = b.y - a.y;
          const d = ddx * ddx + ddy * ddy;
          if (d <= r2) out.push({ ant: b, d });
        }
      }
    }
    out.sort((p, q) => p.d - q.d);
    return out.map((o) => o.ant);
  }

  nearestFood(x: number, y: number, radius: number): FoodPile | null {
    let best: FoodPile | null = null;
    let bestD = Infinity;
    for (const f of this.food) {
      if (f.amount <= 0) continue;
      const dx = f.x - x;
      const dy = f.y - y;
      // a big pile is visible from its edge, not just its centre
      const reach = radius + this.pileRadius(f);
      const d = dx * dx + dy * dy;
      if (d < reach * reach && d < bestD) {
        bestD = d;
        best = f;
      }
    }
    return best;
  }

  private pileRadius(f: FoodPile): number {
    return Math.min(C.PILE_RADIUS, 4 + Math.sqrt(Math.max(0, f.amount)) * 1.5);
  }

  /**
   * Sources regrow toward capacity. Nothing is ever removed, so an established
   * trail always still leads somewhere and throughput settles at a rate limited
   * by travel time. That steady rate is what makes the collapse legible.
   */
  private regrowFood(dt: number) {
    const rate = C.FOOD_REGROW_PER_SEC * (1 - this.scarcity * 0.7) * dt;
    for (const f of this.food) {
      if (f.amount < f.capacity) f.amount = Math.min(f.capacity, f.amount + rate);
    }
  }

  private handleFood(a: Ant) {
    if (!a.carrying) {
      const f = this.nearestFood(a.x, a.y, C.ANT.PICKUP_R);
      if (f && f.amount >= 1) {
        f.amount -= 1;
        a.carrying = true;
        // instinct: flip to going home. A mind keeps whatever it decided.
        if (!a.isMind && a.memeId === 0) a.primitive = 'RETURN_HOME';
        a.angle += Math.PI;
      }
      return;
    }

    // hoarders drop food at their private stash instead of the nest
    if (a.primitive === 'HOARD' && a.stashX !== undefined) {
      const dx = a.stashX - a.x;
      const dy = a.stashY! - a.y;
      if (dx * dx + dy * dy < 14 * 14) {
        a.carrying = false;
        const existing = this.stashes.find(
          (s) => Math.abs(s.x - a.stashX!) < 20 && Math.abs(s.y - a.stashY!) < 20
        );
        if (existing) existing.amount++;
        else this.stashes.push({ x: a.stashX, y: a.stashY!, amount: 1 });
      }
      return;
    }

    const dx = C.NEST.x - a.x;
    const dy = C.NEST.y - a.y;
    if (dx * dx + dy * dy < C.ANT.NEST_R * C.ANT.NEST_R) {
      a.carrying = false;
      this.metrics.recordDeposit(this.now);
      if (!a.isMind && a.memeId === 0) a.primitive = 'SEEK_FOOD';
      a.angle += Math.PI;
    }
  }

  // ---------- memes ----------

  private adoptionPass() {
    const k = this.consciousness;
    if (k <= 0) return;
    for (const a of this.ants) {
      if (!a.alive) continue;
      const cell = this.phero.memeAt(a.x, a.y);
      if (cell.id === 0) continue;
      if (cell.id === a.memeId) {
        a.conviction = Math.min(1, a.conviction + 0.01);
        continue;
      }
      const meme = this.memes.get(cell.id);
      if (!meme) continue;
      const p = cell.strength * meme.spread * this.susceptibility * k * (1 - a.conviction);
      if (this.rng.next() < p) {
        a.memeId = meme.id;
        a.conviction = 0.35;
        a.primitive = meme.primitive; // semantics travel with the idea
        if (a.isMind) a.pushMemory(`I came to believe in ${meme.label}.`);
      }
    }
  }

  private recountMemes() {
    const counts = new Map<number, number>();
    for (const a of this.ants) {
      if (!a.alive || a.memeId === 0) continue;
      counts.set(a.memeId, (counts.get(a.memeId) ?? 0) + 1);
    }
    this.memes.recount(counts, this.now);
    const active = this.memes.active();
    this.metrics.ideologies = active.length;
    this.metrics.dominantShare =
      active.length > 0 ? active[0].followers / Math.max(1, this.ants.length) : 0;

    // gridlock guard: never let more than 40% of the colony stall at once.
    // The colony can be crippled, but it must not flatline.
    const stalled = this.ants.filter((a) => a.alive && a.isStalling);
    const cap = Math.floor(this.ants.length * 0.4);
    if (stalled.length > cap) {
      // hungriest first: the ants that have been still longest go back to work
      stalled.sort((a, b) => b.idleSeconds - a.idleSeconds);
      for (let i = 0; i < stalled.length - cap; i++) {
        const a = stalled[i];
        a.primitive = a.carrying ? 'RETURN_HOME' : 'SEEK_FOOD';
        a.idleSeconds = 0;
        a.conviction *= 0.5; // hunger erodes doctrine
      }
    }
  }

  // ---------- minds ----------

  /** nMinds = round(k * N_MINDS_MAX). Promotion/demotion is derived from the slider. */
  private syncMinds() {
    const want = Math.round(this.consciousness * C.N_MINDS_MAX);
    const current = this.ants.filter((a) => a.alive && a.isMind);
    if (current.length === want) return;

    if (current.length < want) {
      const candidates = this.ants.filter((a) => a.alive && !a.isMind);
      for (let i = current.length; i < want && candidates.length; i++) {
        const a = candidates.splice(this.rng.int(0, candidates.length - 1), 1)[0];
        a.isMind = true;
        a.name = NAMES[this.nameCursor++ % NAMES.length];
        a.emotion = 'blank';
        a.belief = '';
        a.memory = [];
        this.logEvent(`${a.name} became aware of itself.`);
      }
    } else {
      for (let i = want; i < current.length; i++) {
        const a = current[i];
        a.isMind = false;
        a.name = null;
        a.emotion = '';
        a.belief = '';
        a.memory = [];
        a.hesitateUntil = 0;
        if (a.memeId === 0) a.primitive = a.carrying ? 'RETURN_HOME' : 'SEEK_FOOD';
      }
    }
  }

  minds(): Ant[] {
    return this.ants.filter((a) => a.alive && a.isMind);
  }

  antByName(name: string): Ant | null {
    const key = name.trim().toLowerCase();
    return this.ants.find((a) => a.alive && a.name?.toLowerCase() === key) ?? null;
  }

  /** Apply one batch of LLM thoughts. Unresolvable anything => WANDER, never crash. */
  applyThoughts(cmds: ThoughtCmd[], source: 'groq' | 'offline') {
    this.brainSource = source;
    let coined = 0;
    for (const cmd of cmds) {
      const a = this.ants[cmd.id];
      if (!a || !a.alive || !a.isMind) continue;

      a.primitive = isPrimitive(cmd.goal) ? cmd.goal : 'WANDER';
      this.resolveTarget(a, cmd.target);

      if (cmd.emotion) a.emotion = String(cmd.emotion).toLowerCase().slice(0, 24);
      if (cmd.belief) a.belief = String(cmd.belief).slice(0, 160);
      if (typeof cmd.conviction_delta === 'number') {
        a.conviction = Math.max(0, Math.min(1, a.conviction + cmd.conviction_delta));
      }
      if (cmd.say) a.pushMemory(cmd.say.slice(0, 120));

      let memeLabel: string | null = a.memeId ? (this.memes.get(a.memeId)?.label ?? null) : null;

      if (cmd.coin_meme && coined === 0 && isPrimitive(cmd.coin_meme.primitive)) {
        const m: Meme | null = this.memes.coin(
          cmd.coin_meme.label,
          cmd.coin_meme.primitive as Primitive,
          cmd.coin_meme.spread,
          a.name ?? `Ant ${a.id}`,
          this.tick,
          this.now
        );
        if (m) {
          coined++;
          a.memeId = m.id;
          a.conviction = Math.max(a.conviction, 0.75);
          a.primitive = m.primitive;
          memeLabel = m.label;
          this.logEvent(`${a.name} named a thing: "${m.label}".`);
          a.pushMemory(`I named it ${m.label}.`);
        }
      }

      if (cmd.say) {
        const ev: ThoughtEvent = {
          antId: a.id,
          name: a.name ?? `Ant ${a.id}`,
          caste: a.caste,
          emotion: a.emotion,
          say: cmd.say.slice(0, 160),
          to: cmd.to ?? null,
          memeLabel,
          at: Date.now(),
          source,
        };
        this.thoughts.unshift(ev);
        if (this.thoughts.length > 60) this.thoughts.pop();
        this.onThought?.(ev);
      }
    }
  }

  private resolveTarget(a: Ant, target: string | null) {
    a.targetX = undefined;
    a.targetY = undefined;
    a.targetAntId = undefined;
    if (!target) return;
    const t = target.trim();
    const lower = t.toLowerCase();

    if (lower === 'chalk') {
      const c = this.phero.nearestCell(a.x, a.y, 'chalk', 400, 0.05);
      if (c) {
        a.targetX = c.x;
        a.targetY = c.y;
      } else if (a.primitive === 'PATROL_LINE' || a.primitive === 'MARCH_TO') {
        a.primitive = 'WANDER';
      }
      return;
    }
    if (lower === 'nest') {
      a.targetX = C.NEST.x;
      a.targetY = C.NEST.y;
      return;
    }
    if (lower === 'food') {
      const f = this.nearestFood(a.x, a.y, 600);
      if (f) {
        a.targetX = f.x;
        a.targetY = f.y;
      } else if (a.primitive === 'MARCH_TO') a.primitive = 'SEEK_FOOD';
      return;
    }
    if (lower === 'shadow' || lower === 'cursor') {
      a.targetX = this.cursor.x;
      a.targetY = this.cursor.y;
      return;
    }
    if (lower === 'self' || lower === 'none') return;

    const other = this.antByName(t);
    if (other) {
      a.targetAntId = other.id;
      a.targetX = other.x;
      a.targetY = other.y;
      return;
    }
    // unresolvable
    if (a.primitive === 'MARCH_TO' || a.primitive === 'FOLLOW_ANT' || a.primitive === 'STARE') {
      a.primitive = 'WANDER';
    }
  }

  // ---------- tools ----------

  smite(x: number, y: number) {
    const victim = this.ants
      .filter((a) => a.alive)
      .map((a) => ({ a, d: (a.x - x) ** 2 + (a.y - y) ** 2 }))
      .sort((p, q) => p.d - q.d)[0];
    if (!victim || victim.d > 40 * 40) return;
    const a = victim.a;
    a.alive = false;
    this.corpses.push({ x: a.x, y: a.y, at: this.now });
    this.phero.deposit(a.x, a.y, 'danger', C.DEPOSIT.danger);
    const label = a.name ?? 'One of us';
    this.logEvent(`${label} was erased by something from above.`);
    for (const b of this.ants) {
      if (!b.alive || b.id === a.id) continue;
      if ((b.x - a.x) ** 2 + (b.y - a.y) ** 2 < 120 * 120) {
        if (b.isMind) b.pushMemory(`${label} was erased before me.`);
      }
    }
  }

  corpsesNear(x: number, y: number, r: number): number {
    let n = 0;
    for (const c of this.corpses) if ((c.x - x) ** 2 + (c.y - y) ** 2 < r * r) n++;
    return n;
  }
}
