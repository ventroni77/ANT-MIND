# FORMICA 🐜

**A colony of 400 ants solves problems no ant understands. Give twelve of them an inner life and the whole thing falls apart.**

Drag the consciousness slider and watch measured food throughput collapse by ~85%. Drag it back and watch the colony recover in under ten seconds. Nothing about the collapse is scripted.

## The paradox

Real ants are dumb on purpose. An ant deposits pheromone, follows the strongest gradient it can smell, and never forms an opinion about any of it. Shorter paths get walked more often, so they accumulate more pheromone, so they get walked more often still. The route optimises itself. No ant knows the route exists..

This is **stigmergy**: coordination through traces left in a shared environment rather than through communication or deliberation. It works precisely *because* no individual reasons about the global picture. There is no plan to disagree with.

So: what happens if an ant can doubt the trail?

FORMICA wires twelve of the four hundred to an LLM. They receive real sensory input and return one of sixteen fixed motor primitives, plus, occasionally, an invented ideology. Those ideologies spread through a second pheromone channel to ants that have no brain at all — **ideological stigmergy**. Twelve thinkers infect four hundred bodies.

The colony does not become smarter. It stops eating.

## Architecture

```
   ┌───────────────────────── BROWSER (60fps, never blocks) ─────────────────────────┐
   │                                                                                 │
   │   World.ts ──── fixed timestep, seeded RNG (same seed = same run)               │
   │      │                                                                          │
   │      ├── 400 × Ant ──── 16 motor primitives, pure steering                     │
   │      │                  ~388 instinct  ·  up to 12 with an LLM cortex          │
   │      │                                                                          │
   │      ├── Pheromone ──── 200×125 grid, 6 channels                               │
   │      │                  food · home · danger · chalk · memeId · memeStr        │
   │      │                  ideologies contest cells → territory wars              │
   │      │                                                                          │
   │      ├── Memes ─────── registry + contagion; semantics travel with the idea     │
   │      └── Metrics ───── everything measured, nothing assigned                    │
   │                                                                                 │
   │   PixiJS ──── pheromone texture · ants · thought bubbles · tint                 │
   └────────────────────────────────────┬────────────────────────────────────────────┘
                                        │  WebSocket, every 2s, one mind group
                                        │  fire-and-forget: late replies are fine
   ┌────────────────────────────────────┴────────────────────────────────────────────┐
   │  FastAPI                                                                        │
   │     brain.py ────── Groq · llama-3.3-70b · JSON mode · 4.5s timeout             │
   │                     invalid JSON → retry once → offline cortex                  │
   │     offline_cortex.py ── grammar fallback, grounded in real perception,          │
   │                          reports source="offline" → red badge in the UI         │
   └─────────────────────────────────────────────────────────────────────────────────┘
```

The simulation never waits for the network. If the cortex is slow, the colony keeps foraging and the thoughts arrive when they arrive — which reads as hesitation rather than lag.

## How consciousness breaks the colony

The slider `k` ∈ [0,1] does four things, all mechanical:

| Mechanism | Effect |
|---|---|
| **Cortex count** | `round(k × 12)` ants get an LLM brain, a name, memory, and beliefs |
| **Trail fidelity** | Conscious ants lay weaker, noisier trails: `1 − 0.75k` |
| **Trail trust** | Conscious ants weight the gradient less and their own reasoning more: `1 − 0.8k(1 − conviction)` |
| **Deliberation tax** | Thinking costs seconds not moved. Ants stop mid-trail to consider things |

Ideologies then do the rest. A believing ant switches to whatever primitive its ideology implies, and deposits that ideology as it walks. `GATHER_WITH_KIN` clumps the faithful into meetings. `BLOCK_PATH` parks them on the trail. Neither shape is ever drawn — both fall out of steering.

Conviction decays, so ideas die if nothing reinforces them. Hunger erodes doctrine, so the colony can be crippled but never fully flatlines.

## Verified, not asserted

`npm run check` runs the real simulation headlessly and measures the claims:

```
--- M1: living colony, zero AI ---
PASS  food delivered to nest             496 units
PASS  pheromone trails formed            1920 cells
PASS  near pile more travelled           near 4765 vs far 0
PASS  identical after 20s                same seed = same run
PASS  different seed diverges

--- M5: consciousness collapses productivity ---
PASS  ideology spread past its author    271 believers from 1 coiner
PASS  food/min collapsed                 876 -> 118 /min
PASS  trail coherence fell               0.960 -> 0.932
PASS  idle fraction rose                 0% -> 59%
PASS  productivity delta negative        -87%
PASS  recovers when slider drops         118 -> 666 /min

--- M7: malformed input never crashes ---
PASS  bad goal falls back to WANDER
PASS  bad meme primitive rejected

--- perf ---
PASS  sim step under 4ms                 0.35ms/frame for 400 ants
```

`npm run thesis` runs the demo protocol — 60s at k=0, 60s at k=1, 60s at k=0 — plus a ten-minute soak:

```
k=0   food/min= 450  coherence=0.960  meetings=0
k=1   food/min=  78  coherence=0.946  meetings=13  believers=278  delta=-94%
k=0   food/min= 360  recovered to 60% of baseline in 8s

collapse -83%   recovery within 12s: YES
10 sim-minutes in 14.4s wall — no memory growth
```

## Run it

```bash
cp .env.example .env          # add your GROQ_API_KEY

python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m uvicorn server.main:app --reload

cd client && npm install && npm run dev
```

Open http://localhost:5173. Without a key the offline cortex takes over and labels itself in red — the colony still runs, it just thinks in a grammar instead of a language model.

## Controls

| Key | Action |
|---|---|
| **slider** | Consciousness 0–100% |
| **MERCY** | Slider to zero, voices cut mid-word |
| `1` drag | Chalk — a line ants can perceive but that does nothing |
| `2` click | Drop food |
| `3` drag | Wall |
| `E` | Eraser |
| `G` hold | The Hand — an unexplained shadow |
| `⇧ click` | Smite — erase an ant, witnesses remember |
| `click` | Inspect an ant: belief, memory, conviction |
| `space` `.` `R` | Pause · step · reset (seed preserved) |
| `M` `~` `F` | Mute · operator panel · reset camera |
| wheel / drag | Zoom · pan |

## The boundary test

Draw a chalk line across a working trail at k=0. The ants walk straight over it; it has no physics and nothing to say to an instinct.

Raise the slider and draw it again. A mind perceives `chalk_near: true`, stops, and says something about it. If it reaches a conclusion it coins a doctrine — *Border Law*, `PATROL_LINE` — which spreads down the same trail the ants were using to eat, and ants with no brain at all begin patrolling a line that was never there.

The line does nothing. The belief about the line does everything.

## Design rules held throughout

- No scripted events, no `if (tick == 180)`, no timers that spawn behaviour
- No hardcoded formations — rings, queues and clumps emerge from steering
- No fake thoughts on the primary path; the fallback labels itself on screen
- No hardcoded meme semantics — the LLM invents the ideology *and* declares its behavioural primitive at runtime
- Every metric measured from the population, never assigned
- Deterministic core: seeded RNG, fixed timestep
