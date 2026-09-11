from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from .brain import Brain
from .schemas import Perceive

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("formica")

app = FastAPI(title="FORMICA Cortex")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

brain = Brain()


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "brain": "groq" if brain.enabled else "offline",
        "model": brain.model if brain.enabled else None,
    }


@app.websocket("/ws")
async def ws(socket: WebSocket) -> None:
    await socket.accept()
    log.info("client connected")
    inflight: asyncio.Task | None = None

    async def handle(payload: dict) -> None:
        batch, source, latency = await brain.think(payload)
        try:
            await socket.send_text(
                json.dumps(
                    {
                        "type": "thoughts",
                        "tick": payload.get("tick", 0),
                        "latency_ms": latency,
                        "source": source,
                        "thoughts": batch.get("thoughts", []),
                    }
                )
            )
        except (WebSocketDisconnect, RuntimeError):
            pass

    try:
        while True:
            raw = await socket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if data.get("type") == "ping":
                await socket.send_text(json.dumps({"type": "pong"}))
                continue
            if data.get("type") != "perceive":
                continue

            try:
                packet = Perceive.model_validate(data)
            except ValidationError as exc:
                log.warning("bad perceive packet: %s", exc)
                continue
            if not packet.minds:
                continue

            # one request in flight at a time: drop rather than queue, so the
            # cortex never lags behind the world it is describing
            if inflight and not inflight.done():
                continue
            inflight = asyncio.create_task(handle(packet.model_dump()))
    except WebSocketDisconnect:
        log.info("client disconnected")
    except Exception as exc:  # pragma: no cover
        log.warning("ws error: %s", exc)
    finally:
        if inflight and not inflight.done():
            inflight.cancel()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server.main:app",
        host="127.0.0.1",
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )
