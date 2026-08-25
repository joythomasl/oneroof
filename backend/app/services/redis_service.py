"""
ONE ROOF - Redis Service (Person 5B)

Two responsibilities:

1. **OTP storage** with a server-side TTL, so codes expire even if
   the API process restarts.
2. **Pub/Sub fan-out** - any module can publish an event without
   knowing that WebSockets exist:

       from app.services.redis_service import redis_service
       await redis_service.publish_event("incident_verified", incident_id, {...})

Graceful degradation
--------------------
If Redis is unreachable the app still boots. OTP falls back to an
in-process dictionary (the original behaviour, preserved) and
publishes become no-ops that log a warning. `redis_service.available`
and `/health` both report the real state - we never pretend Redis
is up when it is not.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, Optional, Tuple

import redis.asyncio as aioredis
from redis.exceptions import RedisError

from app.config import get_settings

logger = logging.getLogger(__name__)

# Errors that mean "Redis is not reachable right now".
CONNECTION_ERRORS = (RedisError, OSError, TimeoutError)


class RedisService:
    """Async Redis connection manager, OTP store, and pub/sub helper."""

    def __init__(self) -> None:
        self._redis: Optional[aioredis.Redis] = None
        self._available: bool = False
        self._last_error: Optional[str] = None
        # Fallback OTP store, used only when Redis is unavailable.
        # Maps phone -> (otp, expires_at_epoch)
        self._memory_otp: Dict[str, Tuple[str, float]] = {}

    # -- Connection management --------------------------------

    async def connect(self) -> Optional[aioredis.Redis]:
        """
        Create the async Redis connection and verify it with PING.

        Returns the client, or None if Redis is unreachable. Never
        raises - a missing Redis must not stop the API from booting.
        """
        if self._redis is not None and self._available:
            return self._redis

        settings = get_settings()
        try:
            client = aioredis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
                health_check_interval=30,
            )
            await client.ping()
        except CONNECTION_ERRORS as exc:
            self._redis = None
            self._available = False
            self._last_error = str(exc)
            logger.warning(
                "Redis unavailable at %s (%s). "
                "OTP will use in-memory fallback; pub/sub disabled.",
                settings.redis_url,
                exc,
            )
            return None

        self._redis = client
        self._available = True
        self._last_error = None
        logger.info("Connected to Redis at %s", settings.redis_url)
        return self._redis

    async def close(self) -> None:
        """Gracefully close the Redis connection pool."""
        if self._redis is not None:
            try:
                await self._redis.aclose()
            except Exception as exc:  # pragma: no cover - shutdown path
                logger.warning("Error closing Redis: %s", exc)
            finally:
                self._redis = None
                self._available = False
                logger.info("Redis connection closed.")

    @property
    def available(self) -> bool:
        """True only if a PING has succeeded and the client is live."""
        return self._available and self._redis is not None

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    @property
    def client(self) -> Optional[aioredis.Redis]:
        """The live client, or None. Callers must handle None."""
        return self._redis if self._available else None

    async def ping(self) -> bool:
        """Re-check connectivity. Used by /health."""
        if self._redis is None:
            return False
        try:
            await self._redis.ping()
            self._available = True
            return True
        except CONNECTION_ERRORS as exc:
            self._available = False
            self._last_error = str(exc)
            return False

    # -- OTP storage ------------------------------------------

    @staticmethod
    def _otp_key(phone: str) -> str:
        return "otp:" + phone

    def _purge_expired_memory_otps(self) -> None:
        now = time.time()
        expired = [p for p, (_, exp) in self._memory_otp.items() if exp <= now]
        for phone in expired:
            self._memory_otp.pop(phone, None)

    async def store_otp(self, phone: str, otp: str, ttl: int) -> str:
        """
        Store *otp* for *phone*, expiring after *ttl* seconds.

        Returns the backend actually used: "redis" or "memory", so the
        caller can log the truth instead of assuming Redis worked.
        """
        if self.available:
            try:
                await self._redis.setex(self._otp_key(phone), ttl, otp)
                return "redis"
            except CONNECTION_ERRORS as exc:
                self._available = False
                self._last_error = str(exc)
                logger.warning("Redis SETEX failed (%s); falling back to memory.", exc)

        self._purge_expired_memory_otps()
        self._memory_otp[phone] = (otp, time.time() + ttl)
        return "memory"

    async def get_otp(self, phone: str) -> Optional[str]:
        """Return the stored OTP, or None if missing/expired."""
        if self.available:
            try:
                return await self._redis.get(self._otp_key(phone))
            except CONNECTION_ERRORS as exc:
                self._available = False
                self._last_error = str(exc)
                logger.warning("Redis GET failed (%s); reading memory fallback.", exc)

        self._purge_expired_memory_otps()
        entry = self._memory_otp.get(phone)
        if entry is None:
            return None
        otp, expires_at = entry
        if expires_at <= time.time():
            self._memory_otp.pop(phone, None)
            return None
        return otp

    async def delete_otp(self, phone: str) -> None:
        """Remove the OTP so it cannot be replayed."""
        if self.available:
            try:
                await self._redis.delete(self._otp_key(phone))
            except CONNECTION_ERRORS as exc:
                logger.warning("Redis DEL failed (%s).", exc)
        self._memory_otp.pop(phone, None)

    async def otp_ttl(self, phone: str) -> Optional[int]:
        """Seconds until the OTP expires. Used by tests and debugging."""
        if self.available:
            try:
                ttl = await self._redis.ttl(self._otp_key(phone))
                return ttl if ttl and ttl > 0 else None
            except CONNECTION_ERRORS:
                return None
        entry = self._memory_otp.get(phone)
        if entry is None:
            return None
        remaining = int(entry[1] - time.time())
        return remaining if remaining > 0 else None

    # -- Pub/Sub ----------------------------------------------

    async def publish(self, channel: str, data: Any) -> bool:
        """
        Publish a JSON-serialised payload to *channel*.

        Returns True only if it actually reached Redis. Never raises -
        a publish failure must not fail the HTTP request that caused it.
        """
        if not self.available:
            logger.warning(
                "Redis unavailable - event NOT published to '%s': %s", channel, data
            )
            return False
        try:
            payload = json.dumps(data, default=str)
            await self._redis.publish(channel, payload)
            logger.info("Event published to '%s': %s", channel, payload)
            return True
        except CONNECTION_ERRORS as exc:
            self._available = False
            self._last_error = str(exc)
            logger.error("Failed to publish to '%s': %s", channel, exc)
            return False

    async def publish_event(
        self,
        event: str,
        incident_id: Optional[str] = None,
        data: Optional[dict] = None,
        channel: Optional[str] = None,
    ) -> bool:
        """
        Publish a well-formed ONE ROOF event.

        This is the function other backend modules (including Person
        5A) should call. They never need to know WebSockets exist.

            await redis_service.publish_event(
                "incident_created", incident_id=str(inc.id), data={...}
            )

        Emitted shape::

            {"event": "...", "incident_id": "...", "data": {...},
             "timestamp": "2026-01-01T00:00:00+00:00"}
        """
        settings = get_settings()
        payload = {
            "event": event,
            "incident_id": incident_id,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        return await self.publish(channel or settings.redis_incident_channel, payload)

    async def subscribe_to_channel(self, channel: str) -> AsyncIterator[dict]:
        """
        Yield parsed messages from *channel* as an async iterator.

        Consumed by the WebSocket endpoint. Malformed (non-JSON)
        messages are logged and skipped rather than killing the socket.
        Raises ConnectionError if Redis is unavailable, so the caller
        can tell the client the truth.
        """
        if not self.available:
            raise ConnectionError("Redis is not available; cannot subscribe.")

        pubsub = self._redis.pubsub()
        await pubsub.subscribe(channel)
        logger.info("Subscribed to Redis channel '%s'.", channel)
        try:
            async for message in pubsub.listen():
                if message.get("type") != "message":
                    continue
                raw = message.get("data")
                try:
                    yield json.loads(raw)
                except (TypeError, ValueError):
                    logger.warning(
                        "Skipping malformed message on '%s': %r", channel, raw
                    )
                    continue
        finally:
            try:
                await pubsub.unsubscribe(channel)
                await pubsub.aclose()
            except Exception as exc:  # pragma: no cover - teardown path
                logger.debug("pubsub teardown: %s", exc)
            logger.info("Unsubscribed from Redis channel '%s'.", channel)

    # -- Backwards-compatible aliases -------------------------
    # The original scaffolding exposed connect/disconnect/subscribe.
    # Keep them so any existing import keeps working.

    async def disconnect(self) -> None:
        await self.close()

    def subscribe(self, channel: str) -> AsyncIterator[dict]:
        return self.subscribe_to_channel(channel)


# Module-level singleton
redis_service = RedisService()


# -- Module-level convenience functions (named per the spec) --

async def get_redis_client() -> Optional[aioredis.Redis]:
    """Return the live Redis client, connecting on first call."""
    if not redis_service.available:
        await redis_service.connect()
    return redis_service.client


async def close_redis() -> None:
    """Close the shared Redis connection."""
    await redis_service.close()


async def publish_event(
    event: str,
    incident_id: Optional[str] = None,
    data: Optional[dict] = None,
) -> bool:
    """Module-level shortcut so other modules can do a one-line import."""
    return await redis_service.publish_event(event, incident_id, data)


def subscribe_to_channel(channel: str) -> AsyncIterator[dict]:
    """Module-level shortcut mirroring RedisService.subscribe_to_channel."""
    return redis_service.subscribe_to_channel(channel)


async def store_otp(phone: str, otp: str, ttl: int) -> str:
    return await redis_service.store_otp(phone, otp, ttl)


async def get_otp(phone: str) -> Optional[str]:
    return await redis_service.get_otp(phone)


async def delete_otp(phone: str) -> None:
    await redis_service.delete_otp(phone)
