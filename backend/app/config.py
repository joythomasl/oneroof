"""
Person 5A — Configuration
Environment-based settings for database and deduplication parameters.
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://oneroof:oneroof@localhost:5432/oneroof"

    # ── Deduplication ─────────────────────────────────────────
    DEDUPE_RADIUS_METERS: float = 500.0
    DEDUPE_TIME_WINDOW_MINUTES: int = 30

    # ── App ───────────────────────────────────────────────────
    APP_NAME: str = "OneRoof — Spatial & Data Core"
    DEBUG: bool = False

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
