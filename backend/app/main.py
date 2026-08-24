"""
ONE ROOF - FastAPI Application Entrypoint

    uvicorn app.main:app --reload

Startup connects Redis, ensures the MinIO bucket exists, and starts
the WebSocket fan-out listener. None of these are fatal: if Redis or
MinIO is down the API still boots, and /health reports the real state
rather than a green light.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import auth, upload, verification, websockets
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
    """Start and stop shared infrastructure alongside the app."""
    settings = get_settings()
    logger.info("Starting %s (environment=%s)", settings.app_name, settings.environment)

    jwt_service.warn_if_insecure()
    if not jwt_service.available:
        logger.warning("PyJWT missing - login will succeed but issue no token.")

    # Redis: never fatal.
    await redis_service.connect()
    if redis_service.available:
        logger.info("Redis ready.")
    else:
        logger.warning("Redis DOWN - OTP uses memory fallback, pub/sub disabled.")

    # MinIO: never fatal, uploads self-heal once it comes up.
    if await s3_service.ensure_bucket():
        logger.info("MinIO bucket '%s' ready.", settings.minio_bucket)
    else:
        logger.warning(
            "MinIO DOWN or bucket unavailable - uploads will return 503 until fixed."
        )

    await ws_manager.start()

    if settings.is_development:
        await user_store.seed_demo_users()

    try:
        yield
    finally:
        logger.info("Shutting down...")
        await ws_manager.stop()
        await redis_service.close()
        logger.info("Shutdown complete.")


settings = get_settings()

app = FastAPI(
    title="SIH Emergency Response Backend",
    description=(
        "ONE ROOF backend API.\n\n"
        "**Person 5B scope:** OTP authentication, user and role management, "
        "MinIO media storage, Redis pub/sub, real-time WebSockets, and "
        "incident verification.\n\n"
        "**Person 5A scope:** incident CRUD, PostGIS spatial queries and "
        "deduplication - integrated through `app/services/incident_adapter.py`."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

# Open CORS: the web and mobile clients are served from other origins
# during the hackathon. Restrict `allow_origins` before any real deploy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -- Error handling -------------------------------------------

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catch-all so an unexpected error never leaks a stack trace to a
    client. The full traceback still goes to the server log.
    """
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error."},
    )


# -- Root and health ------------------------------------------

@app.get("/", tags=["Health"], summary="Service banner")
async def root() -> dict:
    return {"message": "Backend is running successfully"}


@app.get(
    "/health",
    tags=["Health"],
    summary="Dependency health check",
    description=(
        "Reports the real state of each dependency. `status` is "
        "`healthy` only when Redis and MinIO are both usable; otherwise "
        "`degraded`. Contains no secrets."
    ),
)
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
                # str() of a connection error, never a credential.
                "error": None if redis_ok else redis_service.last_error,
            },
            "minio": {
                "bucket_ready": minio_ok,
                "bucket": settings.minio_bucket,
                "error": None if minio_ok else s3_service.last_error,
            },
            "jwt": "available" if jwt_service.available else "unavailable (PyJWT missing)",
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
        # Tells the team at a glance whether Person 5A is wired in yet.
        "incident_integration": incident_adapter.mode,
    }


# -- Routers --------------------------------------------------

app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(verification.router)
app.include_router(websockets.router)

# PERSON 5A: register your incident router here, e.g.
#   from app.routers import incidents
#   app.include_router(incidents.router)
