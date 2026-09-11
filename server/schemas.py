from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

PRIMITIVES = {
    "SEEK_FOOD",
    "RETURN_HOME",
    "FOLLOW_TRAIL",
    "WANDER",
    "IDLE",
    "HOARD",
    "FOLLOW_ANT",
    "AVOID_ANT",
    "ORBIT_POINT",
    "GATHER_WITH_KIN",
    "BLOCK_PATH",
    "FLEE",
    "PATROL_LINE",
    "MIMIC_NEIGHBOR",
    "STARE",
    "MARCH_TO",
}


# ---------- inbound: perception ----------


class Neighbor(BaseModel):
    name: Optional[str] = None
    dist: float = 0
    emotion: Optional[str] = None
    meme: Optional[str] = None


class FoodSighting(BaseModel):
    dist: float = 0
    dir: str = "?"


class NestSighting(BaseModel):
    dist: float = 0
    dir: str = "?"


class Vision(BaseModel):
    food: List[FoodSighting] = Field(default_factory=list)
    nest: NestSighting = Field(default_factory=NestSighting)
    food_trail_strength: float = 0
    chalk_near: bool = False
    wall_near: bool = False
    corpses_near: int = 0
    cursor_shadow: bool = False
    neighbors: List[Neighbor] = Field(default_factory=list)


class MindIn(BaseModel):
    id: int
    name: str
    caste: str = "forager"
    emotion: str = "blank"
    conviction: float = 0
    idle_seconds: float = 0
    carrying_food: bool = False
    meme: Optional[str] = None
    belief: Optional[str] = None
    memory: List[str] = Field(default_factory=list)
    vision: Vision = Field(default_factory=Vision)


class Ideology(BaseModel):
    label: str
    followers: int = 0


class Colony(BaseModel):
    food_stored: int = 0
    food_per_min: float = 0
    ants: int = 0
    ideologies: List[Ideology] = Field(default_factory=list)
    recent_events: List[str] = Field(default_factory=list)


class Perceive(BaseModel):
    type: str = "perceive"
    tick: int = 0
    consciousness: float = 0
    drama: float = 0.9
    colony: Colony = Field(default_factory=Colony)
    minds: List[MindIn] = Field(default_factory=list)


# ---------- outbound: thoughts ----------


class CoinMeme(BaseModel):
    label: str
    primitive: str
    spread: float = 0.5

    @field_validator("primitive")
    @classmethod
    def _prim(cls, v: str) -> str:
        v = (v or "").strip().upper()
        return v if v in PRIMITIVES else "GATHER_WITH_KIN"

    @field_validator("label")
    @classmethod
    def _label(cls, v: str) -> str:
        return (v or "Unnamed Law").strip()[:40]

    @field_validator("spread")
    @classmethod
    def _spread(cls, v: float) -> float:
        try:
            return max(0.1, min(0.95, float(v)))
        except (TypeError, ValueError):
            return 0.5


class Thought(BaseModel):
    id: int
    say: str = ""
    goal: str = "WANDER"
    target: Optional[str] = None
    emotion: str = "blank"
    to: Optional[str] = None
    conviction_delta: float = 0
    belief: Optional[str] = None
    coin_meme: Optional[CoinMeme] = None

    @field_validator("goal")
    @classmethod
    def _goal(cls, v: str) -> str:
        v = (v or "").strip().upper()
        return v if v in PRIMITIVES else "WANDER"

    @field_validator("say")
    @classmethod
    def _say(cls, v: str) -> str:
        return (v or "").strip()[:160]

    @field_validator("emotion")
    @classmethod
    def _emotion(cls, v: str) -> str:
        return (v or "blank").strip().lower()[:24]

    @field_validator("conviction_delta")
    @classmethod
    def _delta(cls, v: float) -> float:
        try:
            return max(-0.3, min(0.4, float(v)))
        except (TypeError, ValueError):
            return 0.0


class ThoughtBatch(BaseModel):
    thoughts: List[Thought] = Field(default_factory=list)
