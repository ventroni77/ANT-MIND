"""Grammar-based fallback cortex.

Grounded in each ant's real perception, just much dumber than the LLM. Exists so
the demo survives bad venue wifi. Whenever this is used the server reports
source="offline" and the client shows a red badge. Never use it in rehearsal.
"""

from __future__ import annotations

import random
from typing import Any

EMOTIONS = ["anxious", "suspicious", "weary", "curious", "certain", "nihilistic"]

DOCTRINE_WORDS = [
    ("Border", "Law"),
    ("Dust", "Doctrine"),
    ("Trail", "Skepticism"),
    ("Still", "Order"),
    ("Deep", "Hunger"),
    ("Quiet", "Rule"),
]


def _pick(rng: random.Random, seq: list) -> Any:
    return seq[rng.randrange(len(seq))]


def think(payload: dict) -> dict:
    rng = random.Random(payload.get("tick", 0))
    minds = payload.get("minds", [])
    existing = {i.get("label", "").lower() for i in payload.get("colony", {}).get("ideologies", [])}
    out = []
    coined = False

    for m in minds:
        v = m.get("vision", {})
        idle = float(m.get("idle_seconds", 0))
        neighbors = v.get("neighbors", [])
        named = [n for n in neighbors if n.get("name")]
        food = v.get("food", [])
        trail = float(v.get("food_trail_strength", 0))

        goal = "SEEK_FOOD"
        target = None
        to = None
        say = "The ground says nothing today."
        emotion = _pick(rng, EMOTIONS)
        coin = None

        if idle > 8:
            goal, say, emotion = "WANDER", f"I have not moved in {int(idle)} seconds. Explain that.", "anxious"
        elif v.get("corpses_near", 0) > 0:
            goal, target, say, emotion = "FLEE", None, "Something ended here. Nothing marked the place.", "afraid"
        elif v.get("cursor_shadow"):
            goal, target, say, emotion = "ORBIT_POINT", "shadow", "The dark came close and did not explain.", "reverent"
        elif v.get("chalk_near"):
            goal, target, say, emotion = "PATROL_LINE", "chalk", "The pale line is here. I did not consent.", "suspicious"
        elif v.get("wall_near"):
            goal, say, emotion = "AVOID_ANT", "The world stops and offers no reason.", "weary"
        elif m.get("carrying_food"):
            goal, target, say, emotion = "RETURN_HOME", "nest", "I carry this. I never agreed to carry.", "weary"
        elif food:
            goal, target = "MARCH_TO", "food"
            say = f"Food {int(food[0].get('dist', 0))} away, {food[0].get('dir', '')}. Suspiciously convenient."
            emotion = "curious"
        elif trail > 0.35:
            goal, say, emotion = "FOLLOW_TRAIL", "The trail is strong. Strength is not truth.", "suspicious"
        elif named:
            n = _pick(rng, named)
            goal, target, to = "STARE", n["name"], n["name"]
            say = f"{n['name']} is {int(n.get('dist', 0))} away and says nothing."
            emotion = "suspicious"

        if not coined and rng.random() < 0.09:
            for a, b in DOCTRINE_WORDS:
                label = f"{a} {b}"
                if label.lower() not in existing:
                    coin = {"label": label, "primitive": goal, "spread": round(rng.uniform(0.3, 0.8), 2)}
                    existing.add(label.lower())
                    coined = True
                    break

        out.append(
            {
                "id": m.get("id"),
                "say": say,
                "goal": goal,
                "target": target,
                "emotion": emotion,
                "to": to,
                "conviction_delta": round(rng.uniform(-0.1, 0.25), 2),
                "belief": say if rng.random() < 0.25 else None,
                "coin_meme": coin,
            }
        )

    return {"thoughts": out}
