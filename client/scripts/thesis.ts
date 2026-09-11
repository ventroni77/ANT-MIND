// M5 protocol: 60s at k=0, 60s at k=1, 60s at k=0. Plus a 10-minute soak (M7).

import { World } from '../src/sim/World';
import { C } from '../src/sim/constants';

function run(w: World, s: number) {
  for (let i = 0; i < Math.round(s / C.DT); i++) w.stepOnce();
}

const w = new World(1337);

console.log('\n--- M5: k=0 / k=1 / k=0, 60s each ---');
w.consciousness = 0;
run(w, 60);
const phase1 = w.metrics.foodPerMin;
const coh1 = w.metrics.trailCoherence;
const meet1 = w.metrics.meetings;
console.log(`k=0   food/min=${phase1.toFixed(0).padStart(4)}  coherence=${coh1.toFixed(3)}  meetings=${meet1}`);

w.consciousness = 1;
run(w, 1);
const minds = w.minds();
w.applyThoughts(
  [
    {
      id: minds[0].id, say: 'The trail is strong. Strength is not truth.',
      goal: 'GATHER_WITH_KIN', target: null, emotion: 'suspicious', to: null,
      conviction_delta: 0.3, belief: 'The trail is not to be trusted.',
      coin_meme: { label: 'Trail Skepticism', primitive: 'GATHER_WITH_KIN', spread: 0.8 },
    },
    {
      id: minds[1].id, say: 'We stopped for dust. Now the dust owns us.',
      goal: 'BLOCK_PATH', target: null, emotion: 'enraged', to: null,
      conviction_delta: 0.3, belief: null,
      coin_meme: null,
    },
  ],
  'offline'
);
run(w, 60);
const phase2 = w.metrics.foodPerMin;
const coh2 = w.metrics.trailCoherence;
const meet2 = w.metrics.meetings;
console.log(`k=1   food/min=${phase2.toFixed(0).padStart(4)}  coherence=${coh2.toFixed(3)}  meetings=${meet2}  ` +
  `ideologies=${w.metrics.ideologies}  believers=${w.ants.filter((a) => a.memeId !== 0).length}  ` +
  `delta=${(w.metrics.productivityDelta * 100).toFixed(0)}%`);

// how long until recovery reaches 60% of baseline?
w.consciousness = 0;
const target = phase1 * 0.6;
let recoveredAt = -1;
for (let s = 1; s <= 60; s++) {
  run(w, 1);
  if (recoveredAt < 0 && w.metrics.foodPerMin >= target) recoveredAt = s;
}
const phase3 = w.metrics.foodPerMin;
console.log(`k=0   food/min=${phase3.toFixed(0).padStart(4)}  coherence=${w.metrics.trailCoherence.toFixed(3)}  ` +
  `recovered to 60% of baseline in ${recoveredAt}s`);

const collapsePct = ((phase2 - phase1) / phase1) * 100;
console.log(`\ncollapse ${collapsePct.toFixed(0)}%   recovery within 12s: ${recoveredAt >= 0 && recoveredAt <= 12 ? 'YES' : `NO (${recoveredAt}s)`}`);
console.log(`meetings rose with consciousness: ${meet2 > meet1 ? 'YES' : 'NO'} (${meet1} -> ${meet2})`);
console.log(`coherence fell with consciousness: ${coh2 < coh1 ? 'YES' : 'NO'} (${coh1.toFixed(3)} -> ${coh2.toFixed(3)})`);

// ---- M7 soak ----
console.log('\n--- M7: 10 minute soak ---');
const s = new World(555);
s.consciousness = 0.6;
const t0 = performance.now();
for (let minute = 1; minute <= 10; minute++) {
  run(s, 60);
  if (minute % 5 === 0) {
    console.log(
      `t=${minute}m  food/min=${s.metrics.foodPerMin.toFixed(0).padStart(4)}  ` +
        `memes=${s.memes.list().length}  corpses=${s.corpses.length}  ` +
        `thoughts=${s.thoughts.length}  series=${s.metrics.series.length}  ` +
        `deposits=${s.metrics.deposits.length}  piles=${s.food.length}`
    );
  }
}
const elapsed = performance.now() - t0;
console.log(`10 sim-minutes in ${(elapsed / 1000).toFixed(1)}s wall (${(600 / (elapsed / 1000)).toFixed0 ?? ''}${(600 / (elapsed / 1000)).toFixed(0)}x realtime)`);
console.log(`unbounded growth check: thoughts<=60 ${s.thoughts.length <= 60}, series<=120 ${s.metrics.series.length <= 120}, piles<=${C.FOOD_PILES} ${s.food.length <= C.FOOD_PILES}`);
