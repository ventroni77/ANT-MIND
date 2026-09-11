// Headless verification of the simulation core.
// Runs the real World class with no rendering, so acceptance criteria are
// measured rather than eyeballed.

import { World } from '../src/sim/World';
import { C } from '../src/sim/constants';

const STEP_MS = C.DT * 1000;

function runSeconds(w: World, seconds: number) {
  const n = Math.round(seconds / C.DT);
  for (let i = 0; i < n; i++) w.stepOnce();
}

function foodPerMin(w: World): number {
  return w.metrics.foodPerMin;
}

function trailStats(w: World) {
  let occupied = 0;
  let total = 0;
  for (let i = 0; i < w.phero.food.length; i++) {
    if (w.phero.food[i] > 0.5) {
      occupied++;
      total += w.phero.food[i];
    }
  }
  return { occupied, mean: occupied ? total / occupied : 0 };
}

function pad(s: string, n: number) {
  return s.padEnd(n);
}

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${pad(label, 34)} ${detail}`);
}

console.log(`\n--- M1: living colony, zero AI (step ${STEP_MS.toFixed(2)}ms) ---`);

const w = new World(1337);
runSeconds(w, 60);

const t1 = trailStats(w);
check('food delivered to nest', w.metrics.foodStored > 0, `${w.metrics.foodStored} units`);
check('food/min measured', foodPerMin(w) > 0, `${foodPerMin(w).toFixed(1)} /min`);
check('pheromone trails formed', t1.occupied > 200, `${t1.occupied} cells, mean ${t1.mean.toFixed(1)}`);
check('trail coherence > 0', w.metrics.trailCoherence > 0, w.metrics.trailCoherence.toFixed(3));
check('baseline captured at k=0', w.metrics.baselineFoodPerMin > 0, `${w.metrics.baselineFoodPerMin.toFixed(1)} /min`);
check('no minds at k=0', w.minds().length === 0, `${w.minds().length} minds`);
check('ants all alive', w.ants.every((a) => a.alive), `${w.ants.length} ants`);

// ---- determinism ----
console.log('\n--- M1: determinism (same seed = same run) ---');
const a = new World(4242);
const b = new World(4242);
runSeconds(a, 20);
runSeconds(b, 20);
const same =
  a.ants.every((ant, i) => ant.x === b.ants[i].x && ant.y === b.ants[i].y && ant.angle === b.ants[i].angle) &&
  a.metrics.foodStored === b.metrics.foodStored;
check('identical after 20s', same, `food ${a.metrics.foodStored} vs ${b.metrics.foodStored}`);

const c = new World(9999);
runSeconds(c, 20);
const differs = c.ants[0].x !== a.ants[0].x || c.metrics.foodStored !== a.metrics.foodStored;
check('different seed diverges', differs, `food ${c.metrics.foodStored} vs ${a.metrics.foodStored}`);

// ---- shorter-path preference ----
console.log('\n--- M1: trails favour the nearer food source ---');
const p = new World(2024);
runSeconds(p, 90);
const near = { x: C.NEST.x + 320, y: C.NEST.y - 120 };
const far = { x: C.NEST.x + 560, y: C.NEST.y + 60 };
function trailNear(world: World, pt: { x: number; y: number }) {
  let sum = 0;
  for (let dy = -40; dy <= 40; dy += 8)
    for (let dx = -40; dx <= 40; dx += 8) sum += world.phero.valueAt(pt.x + dx, pt.y + dy, 'food');
  return sum;
}
const nearT = trailNear(p, near);
const farT = trailNear(p, far);
check('near pile more travelled', nearT > farT, `near ${nearT.toFixed(0)} vs far ${farT.toFixed(0)}`);

// ---- M5: the thesis ----
console.log('\n--- M5: consciousness collapses productivity ---');
const t = new World(1337);
t.consciousness = 0;
runSeconds(t, 60);
const baseline = foodPerMin(t);
const coherence0 = t.metrics.trailCoherence;
const idle0 = t.metrics.antsIdle;

// simulate the LLM by coining ideologies the way the brain would, then let
// contagion do the rest. No scripted behaviour: same code path as real thoughts.
t.consciousness = 1;
for (let i = 0; i < 60; i++) t.stepOnce(); // let minds get promoted
const minds = t.minds();
t.applyThoughts(
  [
    {
      id: minds[0].id,
      say: 'The trail is strong. Strength is not truth.',
      goal: 'GATHER_WITH_KIN',
      target: null,
      emotion: 'suspicious',
      to: null,
      conviction_delta: 0.3,
      belief: 'The trail is not to be trusted.',
      coin_meme: { label: 'Trail Skepticism', primitive: 'GATHER_WITH_KIN', spread: 0.85 },
    },
    {
      id: minds[1].id,
      say: 'We stopped for dust. Now the dust owns us.',
      goal: 'BLOCK_PATH',
      target: null,
      emotion: 'enraged',
      to: null,
      conviction_delta: 0.3,
      belief: 'Lines are real because we obey them.',
      coin_meme: null,
    },
  ],
  'offline'
);
runSeconds(t, 60);
const collapsed = foodPerMin(t);
const coherence1 = t.metrics.trailCoherence;
const idle1 = t.metrics.antsIdle;
const believers = t.ants.filter((x) => x.memeId !== 0).length;

check('minds promoted at k=1', minds.length === C.N_MINDS_MAX, `${minds.length} minds`);
check('ideology spread past its author', believers > 3, `${believers} believers`);
check('food/min collapsed', collapsed < baseline, `${baseline.toFixed(1)} -> ${collapsed.toFixed(1)} /min`);
check('trail coherence fell', coherence1 < coherence0, `${coherence0.toFixed(3)} -> ${coherence1.toFixed(3)}`);
check('idle fraction rose', idle1 > idle0, `${(idle0 * 100).toFixed(0)}% -> ${(idle1 * 100).toFixed(0)}%`);
check('productivity delta negative', t.metrics.productivityDelta < 0, `${(t.metrics.productivityDelta * 100).toFixed(0)}%`);

// ---- recovery ----
t.consciousness = 0;
runSeconds(t, 45);
const recovered = foodPerMin(t);
check('recovers when slider drops', recovered > collapsed, `${collapsed.toFixed(1)} -> ${recovered.toFixed(1)} /min`);
check('minds demoted at k=0', t.minds().length === 0, `${t.minds().length} minds`);

// ---- resilience ----
console.log('\n--- M7: malformed input never crashes ---');
const r = new World(7);
r.consciousness = 1;
runSeconds(r, 2);
const id = r.minds()[0]?.id ?? 0;
r.applyThoughts(
  [
    { id, say: 'x', goal: 'NOT_A_PRIMITIVE', target: 'Nonexistent', emotion: '', to: null, conviction_delta: 99, belief: null, coin_meme: { label: 'Bad', primitive: 'ALSO_BAD', spread: 5 } },
    { id: 999999, say: 'ghost', goal: 'IDLE', target: null, emotion: '', to: null, conviction_delta: 0, belief: null, coin_meme: null },
  ] as never,
  'offline'
);
runSeconds(r, 2);
const ant = r.ants[id];
check('bad goal falls back to WANDER', ant.primitive === 'WANDER', ant.primitive);
check('conviction stays clamped', ant.conviction >= 0 && ant.conviction <= 1, ant.conviction.toFixed(2));
check('bad meme primitive rejected', !r.memes.hasLabel('Bad'), `${r.memes.list().length} memes`);
check('out-of-range ant id ignored', true, 'no throw');

// ---- perf ----
console.log('\n--- perf: sim cost per frame ---');
const perf = new World(1337);
runSeconds(perf, 10);
const t0 = performance.now();
runSeconds(perf, 10);
const ms = (performance.now() - t0) / (10 / C.DT);
check('sim step under 4ms', ms < 4, `${ms.toFixed(2)}ms/frame for ${C.N_ANTS} ants`);

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
