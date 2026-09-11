"""Round-trip smoke test: send one perceive packet, print the thoughts frame."""

import asyncio
import json

from websockets.asyncio.client import connect

PACKET = {
    "type": "perceive",
    "tick": 4120,
    "consciousness": 0.85,
    "drama": 0.95,
    "colony": {
        "food_stored": 31,
        "food_per_min": 2.1,
        "ants": 400,
        "ideologies": [],
        "recent_events": ["A line of white dust crossed the trail"],
    },
    "minds": [
        {
            "id": 7,
            "name": "Bramble",
            "caste": "forager",
            "emotion": "anxious",
            "conviction": 0.4,
            "idle_seconds": 6.2,
            "carrying_food": False,
            "meme": None,
            "belief": "The trail is not to be trusted.",
            "memory": ["I stopped at the dust.", "Others stopped behind me."],
            "vision": {
                "food": [{"dist": 41, "dir": "NE"}],
                "nest": {"dist": 120, "dir": "SW"},
                "food_trail_strength": 0.18,
                "chalk_near": True,
                "wall_near": False,
                "corpses_near": 1,
                "cursor_shadow": False,
                "neighbors": [{"name": "Mott", "dist": 12, "emotion": "smug", "meme": None}],
            },
        }
    ],
}


async def main() -> None:
    async with connect("ws://127.0.0.1:8000/ws") as ws:
        await ws.send(json.dumps(PACKET))
        reply = json.loads(await asyncio.wait_for(ws.recv(), timeout=15))
        print("source:", reply["source"], "latency:", reply["latency_ms"], "ms")
        for t in reply["thoughts"]:
            print(json.dumps(t, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
