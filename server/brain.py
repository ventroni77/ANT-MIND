from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from collections import defaultdict, deque
from typing import Any

from pydantic import ValidationError

from . import offline_cortex
from .prompts import RETRY_NUDGE, SYSTEM, build_user_message
from .schemas import ThoughtBatch

log = logging.getLogger("formica.brain")

TIMEOUT_S = 4.5
MAX_TOKENS = 900


class Brain:
    """Talks to Groq. Never raises, never blocks the simulation."""

    def __init__(self) -> None:
        self.model = os.getenv("MODEL", "llama-3.3-70b-versatile")
        self.fallback_model = os.getenv("FALLBACK_MODEL", "llama-3.1-8b-instant")
        self.base_temp = float(os.getenv("TEMPERATURE", "0.95"))
        self.history: dict[int, deque[str]] = defaultdict(lambda: deque(maxlen=3))
        self.client: Any = None
        self.enabled = False

        key = os.getenv("GROQ_API_KEY", "").strip()
        if not key:
            log.warning("GROQ_API_KEY not set - offline cortex only")
            return
        try:
            from groq import AsyncGroq

            self.client = AsyncGroq(api_key=key)
            self.enabled = True
        except Exception as exc:  # pragma: no cover - import/edge env issues
            log.warning("groq client unavailable (%s) - offline cortex only", exc)

    async def think(self, payload: dict) -> tuple[dict, str, int]:
        """Returns (batch_dict, source, latency_ms)."""
        started = time.perf_counter()

        if not self.enabled:
            return offline_cortex.think(payload), "offline", 0

        drama = float(payload.get("drama", 0.9))
        temperature = min(1.4, 0.6 + 0.4 * drama * (self.base_temp / 0.95))
        user = build_user_message(payload, {k: list(v) for k, v in self.history.items()})

        messages = [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user},
        ]

        batch = await self._attempt(messages, temperature, self.model)
        if batch is None:
            messages.append({"role": "user", "content": RETRY_NUDGE})
            batch = await self._attempt(messages, temperature, self.fallback_model)

        latency = int((time.perf_counter() - started) * 1000)

        if batch is None:
            return offline_cortex.think(payload), "offline", latency

        for t in batch.thoughts:
            if t.say:
                self.history[t.id].append(t.say)

        return batch.model_dump(), "groq", latency

    async def _attempt(
        self, messages: list[dict], temperature: float, model: str
    ) -> ThoughtBatch | None:
        try:
            resp = await asyncio.wait_for(
                self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=temperature,
                    max_tokens=MAX_TOKENS,
                ),
                timeout=TIMEOUT_S,
            )
            raw = resp.choices[0].message.content or "{}"
            return ThoughtBatch.model_validate(json.loads(raw))
        except asyncio.TimeoutError:
            log.warning("groq timeout on %s", model)
        except (json.JSONDecodeError, ValidationError) as exc:
            log.warning("groq invalid payload on %s: %s", model, exc)
        except Exception as exc:
            log.warning("groq error on %s: %s", model, exc)
        return None
