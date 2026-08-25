"""Combined ONE ROOF FastAPI application for Person 5A and Person 5B."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import app.models.incident  # noqa: F401 - register SQLAlchemy metadata
from app.config import get_settings
from app.database import Base, engine
from app.routers import auth, dedupe, incidents, upload, verification, websockets
from app.services.incident_adapter import incident_adapter
from app.services.jwt_service import jwt_service
from app.services.photo_store import photo_store
from app.services.redis_service import redis_service
from app.services.s3_service import s3_service
from app.services.user_store import user_store
from app.services.ws_manager import ws_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize 5A storage and 5B infrastructure, then cleanly stop it."""
    settings = get_settings()
    logger.info("Starting %s (environment=%s)", settings.app_name, settings.environment)

    # Person 5A: create incident tables for hackathon deployments without Alembic.
    Base.metadata.create_all(bind=engine)

    jwt_service.warn_if_insecure()
    if not jwt_service.available:
        logger.warning("PyJWT missing - login will succeed but issue no token.")

    await redis_service.connect()
    if not redis_service.available:
        logger.warning("Redis DOWN - OTP uses memory fallback, pub/sub disabled.")

    if not await s3_service.ensure_bucket():
        logger.warning("MinIO unavailable - uploads return 503 until it recovers.")

    await ws_manager.start()
    if settings.is_development:
        await user_store.seed_demo_users()

    try:
        yield
    finally:
        await ws_manager.stop()
        await redis_service.close()


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description=(
        "ONE ROOF backend: incident CRUD, PostGIS search, deduplication, "
        "authentication, media storage, verification, Redis, and WebSockets."
    ),
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error."},
    )


@app.get("/", tags=["Health"], summary="Service banner")
async def root() -> dict:
    return {"message": "Backend is running successfully"}


@app.get("/health", tags=["Health"], summary="Dependency health check")
async def health() -> dict:
    redis_ok = await redis_service.ping()
    minio_ok = s3_service.bucket_ready or await s3_service.ensure_bucket()
    return {
        "status": "healthy" if (redis_ok and minio_ok) else "degraded",
        "environment": settings.environment,
        "dependencies": {
            "redis": {
                "connected": redis_ok,
                "channel": settings.redis_incident_channel,
                "error": None if redis_ok else redis_service.last_error,
            },
            "minio": {
                "bucket_ready": minio_ok,
                "bucket": settings.minio_bucket,
                "error": None if minio_ok else s3_service.last_error,
            },
            "jwt": "available" if jwt_service.available else "unavailable",
            "postgis": "configured",
        },
        "websockets": {
            "connected_clients": ws_manager.connection_count,
            "listener_healthy": ws_manager.redis_listener_healthy,
        },
        "stores": {
            "users": user_store.backend,
            "photos": photo_store.backend,
            "photo_count": photo_store.count,
        },
        "incident_integration": incident_adapter.mode,
    }


# Person 5B routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(verification.router)
app.include_router(websockets.router)

# Person 5A routers
app.include_router(incidents.router, prefix="/api/v1")
app.include_router(dedupe.router, prefix="/api/v1")
