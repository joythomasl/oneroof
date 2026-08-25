"""
ONE ROOF - WebSocket Connection Manager (Person 5B)

One Redis subscriber for the whole process, fanned out to every
connected client.

The naive alternative - one `pubsub.subscribe()` per WebSocket -
opens a Redis connection per browser tab and falls over at a few
hundred clients. Here a single background task owns the subscription
and pushes each message to all sockets.

    Redis channel 'incident_updates'
              |
       _listener() task            <- one per process
              |
       ConnectionManager.broadcast()
              |
      every connected WebSocket
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional, Set

from fastapi import WebSocket

from app.config import get_settings
from app.services.redis_service import redis_service

logger = logging.getLogger(__name__)

# Backoff between reconnect attempts when Redis drops.
RECONNECT_DELAY_SECONDS = 5


class ConnectionManager:
    """Tracks live WebSocket clients and broadcasts events to them."""

    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()
        self._listener_task: Optional[asyncio.Task] = None
        self._stopping = False
        self._redis_listener_healthy = False

    # -- Connection lifecycle ---------------------------------

    async def connect(self, websocket: WebSocket) -> None:
        """Accept the socket and register it for broadcasts."""
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)
        client = self._describe(websocket)
        logger.info(
            "WebSocket connected: %s (total=%d)", client, len(self._connections)
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        """Deregister a socket. Safe to call more than once."""
        async with self._lock:
            self._connections.discard(websocket)
        logger.info(
            "WebSocket disconnected: %s (total=%d)",
            self._describe(websocket),
            len(self._connections),
        )

    @staticmethod
    def _describe(websocket: WebSocket) -> str:
        try:
            client = websocket.client
            return "{}:{}".format(client.host, client.port) if client else "unknown"
        except Exception:  # pragma: no cover - defensive
            return "unknown"

    @property
    def connection_count(self) -> int:
        return len(self._connections)

    @property
    def redis_listener_healthy(self) -> bool:
        """True only if the background Redis subscriber is actually running."""
        return self._redis_listener_healthy

    # -- Broadcasting -----------------------------------------

    async def send_personal(self, websocket: WebSocket, message: Dict[str, Any]) -> None:
        """Send to one socket, ignoring a client that just vanished."""
        try:
            await websocket.send_json(message)
        except Exception as exc:
            logger.debug("Personal send failed (%s); dropping socket.", exc)
            await self.disconnect(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> int:
        """
        Push *message* to every connected client.

        Dead sockets are pruned rather than raising. Returns the number
        of clients that actually received it.
        """
        async with self._lock:
            targets = list(self._connections)

        if not targets:
            return 0

        results = await asyncio.gather(
            *(ws.send_json(message) for ws in targets), return_exceptions=True
        )

        delivered = 0
        dead = []
        for websocket, result in zip(targets, results):
            if isinstance(result, Exception):
                dead.append(websocket)
            else:
                delivered += 1

        if dead:
            async with self._lock:
                for websocket in dead:
                    self._connections.discard(websocket)
            logger.info("Pruned %d dead WebSocket connection(s).", len(dead))

        logger.debug("Broadcast delivered to %d client(s).", delivered)
        return delivered

    async def broadcast_local(self, message: Dict[str, Any]) -> int:
        """
        Deliver an event directly, bypassing Redis.

        Used ONLY as a documented fallback when Redis is down, so a
        single-process demo still works. Callers must report this
        honestly (`delivered_via: "local"`), never as a Redis publish.
        In multi-worker deployments this reaches one worker's clients.
        """
        logger.warning(
            "Broadcasting locally (Redis unavailable) - this does NOT "
            "reach other worker processes."
        )
        return await self.broadcast(message)

    # -- Redis listener ---------------------------------------

    async def _listener(self) -> None:
        """Subscribe to Redis and forward everything to connected clients."""
        settings = get_settings()
        channel = settings.redis_incident_channel

        while not self._stopping:
            try:
                if not redis_service.available:
                    await redis_service.connect()
                if not redis_service.available:
                    self._redis_listener_healthy = False
                    await asyncio.sleep(RECONNECT_DELAY_SECONDS)
                    continue

                self._redis_listener_healthy = True
                logger.info("WebSocket listener subscribed to '%s'.", channel)

                async for event in redis_service.subscribe_to_channel(channel):
                    if self._stopping:
                        break
                    await self.broadcast(event)

            except asyncio.CancelledError:
                logger.info("WebSocket listener cancelled.")
                raise
            except Exception as exc:
                self._redis_listener_healthy = False
                logger.error(
                    "WebSocket listener error (%s); retrying in %ss.",
                    exc,
                    RECONNECT_DELAY_SECONDS,
                )
                await asyncio.sleep(RECONNECT_DELAY_SECONDS)

        self._redis_listener_healthy = False

    async def start(self) -> None:
        """Launch the background listener. Called from the app lifespan."""
        if self._listener_task is not None and not self._listener_task.done():
            return
        self._stopping = False
        self._listener_task = asyncio.create_task(self._listener())
        logger.info("WebSocket Redis listener started.")

    async def stop(self) -> None:
        """Cancel the listener and close every open socket."""
        self._stopping = True

        if self._listener_task is not None:
            self._listener_task.cancel()
            try:
                await self._listener_task
            except (asyncio.CancelledError, Exception):
                pass
            self._listener_task = None

        async with self._lock:
            sockets = list(self._connections)
            self._connections.clear()

        for websocket in sockets:
            try:
                await websocket.close(code=1001, reason="Server shutting down")
            except Exception:
                pass

        self._redis_listener_healthy = False
        logger.info("WebSocket manager stopped (%d socket(s) closed).", len(sockets))


# Module-level singleton
ws_manager = ConnectionManager()
