# FORMICA 🐜
## Basic Details
### Team Name: [VENTRON]

Team Members
Team Lead: [Chandra Prakash N] - [College of engineering Chengannur]

Member 2: [Faheem Ibnu Rashif] - [College of engineering Chengannur]

### Project Description
A colony of 400 simulated ants forages via pheromone-trail stigmergy — pure instinct, no individual plan. We give twelve of them LLM-powered minds capable of doubting the trail and inventing beliefs, then watch those ideas spread to the rest of the colony and collapse measured food throughput by ~85%, live and unscripted.

### The Problem (that doesn't exist)
Ant colonies have been optimizing foraging routes for roughly 100 million years without a single ant ever understanding the route it's walking — and somehow nobody has stopped to ask whether that's actually a problem. Nobody needed to know what happens if an ant starts thinking for itself, because ants were never supposed to think in the first place. We decided this gap in scientific urgency needed fixing, so we gave twelve out of four hundred ants the ability to doubt the pheromone trail, form opinions, and invent ideologies — a problem literally no ant, colony, or entomologist ever asked us to solve.

### The Solution (that nobody asked for)
We hooked twelve unlucky ants up to an actual LLM brain, gave them memory, names, and the ability to form opinions, then let them loose in a colony of 388 perfectly content instinct-driven ants who were doing just fine without any of this. The twelve thinkers start questioning the pheromone trail, inventing doctrines like "Border Law," and — because ideas are just as contagious as scent in our simulation — spread their beliefs through a second pheromone channel to ants who have literally zero capacity to understand what they're now fervently patrolling. The result: food collection drops by ~85%, meetings start happening, a shadow above the colony gets mistaken for a god about 60% of the time, and somewhere in there we accidentally built a very convincing argument that consciousness is a productivity bug. Drag the slider back to zero and watch everyone forget it ever happened, mid-sentence.

# Technical Details
## Technologies/Components Used
For Software: **Languages:** TypeScript, Python
* **Frameworks:** FastAPI (backend server), PixiJS (real-time rendering)
* **Libraries:** Groq SDK (LLM inference via llama-3.3-70b, JSON mode), WebSocket (client-server communication), browser SpeechSynthesis API (per-ant voice generation)
* **Tools:** Node.js / npm, Python venv, seeded RNG for deterministic/reproducible simulation runs, `npm run check` and `npm run thesis` custom test/verification scripts

### Implementation
For Software:Installation

bash

(Clone the repo, then from the project root:)

cp .env.example .env          (# add your GROQ_API_KEY)

python -m venv .venv

.venv/Scripts/python -m pip install -r requirements.txt

cd client

npm install

### Run
bash
# Terminal 1 — backend (from project root)
.venv/Scripts/python -m uvicorn server.main:app --reload

# Terminal 2 — frontend
cd client

npm run dev

Then open http://localhost:5173 in your browser.

## Live link and why it is a landing page
## Live link
Source URL : https://ant-front.vercel.app/

This is a frontend-only build, deployed on the guidance of the TinkerHub coordinators and mentors for the event, who asked that every team submit a working link. It shows the interface and the design. The conversation itself runs on a Node server that cannot be made public, so the talking part is not live at that URL.

Landing Page : https://drive.google.com/file/d/1fcomMUt1tjfpwwqfN993Lt6FKnOEioS2/view?usp=drivesdk

# Screenshots (Add at least 3)
![Screenshot2](" https://drive.google.com/file/d/1f34B74zQ9d3h1jUOe5rRgSpDtF2u-tV2/view?usp=drive_link ")
![Screenshot2](" https://drive.google.com/file/d/1UIGRci5uVWJJ-1nNGx1azQmG5zKPRMzm/view?usp=drive_link ")
![Screenshot3](" https://drive.google.com/file/d/1Gtcet2paLcjKgaygUn8YYj-orF1USfKZ/view?usp=drive_link ")

# Diagrams
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
# Build Photos
![Components](" https://drive.google.com/file/d/1F2I9qBDHKbQBT3tij3ZES0OxKiaN7ikl/view?usp=drive_link ") 
![Components](" https://drive.google.com/file/d/1BND7x9rm8Ru7DYtARoOAaoA7jAkNzj85/view?usp=drive_link ")
![Build](" https://drive.google.com/file/d/1riMM4nlpSG0JIB0S5Fp33w7qmPWDOhFS/view?usp=drive_link ")
![Build](" https://drive.google.com/file/d/1ZFKBz6_8JAaMVchxA4Q8LIXesfBkNBtl/view?usp=drive_link ")
![Build](" https://drive.google.com/file/d/13NaXMxQ0lzcjUAd0R-mfKUvXMg-Iq7GO/view?usp=drive_link ")
![Final](" https://drive.google.com/file/d/13LO-RM5G_hK0LE8kC3kbYz9Id3xuYPNl/view?usp=drive_link ")


### Project Demo
# Video
![vedio](" https://drive.google.com/file/d/1-HBz79wH6puewb1KICc2RHM-9-cmuAzA/view?usp=sharing ")

## Team Contributions
- [Chandra Prakash N]: [Bankend + Iteration]
- [Faheem Ibnu Rashif]: [Frontend + Testing]
