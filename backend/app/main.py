"""
Person 5A — FastAPI Application Entry Point

Registers ONLY Person 5A routers (incidents, dedupe).
Other teammates will add their routers when merging.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.config import get_settings
from app.database import engine, Base
from app.routers import incidents, dedupe

# Import models so Base.metadata knows about them
import app.models.incident  # noqa: F401


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Create database tables on startup (hackathon convenience — no Alembic)."""
    Base.metadata.create_all(bind=engine)
    yield


settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "OneRoof — Spatial & Data Core (Person 5A)\n\n"
        "Incident CRUD, PostGIS spatial search, and deduplication service."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ── Person 5A routers ────────────────────────────────────────────────────────
app.include_router(incidents.router, prefix="/api/v1")
app.include_router(dedupe.router, prefix="/api/v1")


# ── Health check ──────────────────────────────────────────────────────────────


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "component": "person-5a-spatial-core"}
