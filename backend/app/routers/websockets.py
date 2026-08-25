"""
ONE ROOF - WebSocket Router (Person 5B)

    WS   /ws/incidents      -> real-time incident + photo events
    GET  /ws/status         -> how many clients, is the listener healthy
    POST /ws/test-broadcast -> development-only event injector

Architecture::

    Redis pub/sub 'incident_updates'
              |
      ws_manager background listener   (one per process)
              |
      broadcast to every connected WebSocket

The socket handler itself does not subscribe to Redis - see
app/services/ws_manager.py for why.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field

from app.config import get_settings
from app.models.events import EventType
from app.services.redis_service import redis_service
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


# -- WS /ws/incidents -----------------------------------------

@router.websocket("/ws/incidents")
async def incidents_ws(websocket: WebSocket) -> None:
    """
    Stream real-time incident events to a connected client.

    On connect the client receives a `connection_established` frame,
    then every event published to Redis until it disconnects.

    Anything the client sends is treated as a keepalive; sending the
    literal string ``ping`` gets ``{"event": "pong"}`` back.
    """
    await ws_manager.connect(websocket)

    try:
        await ws_manager.send_personal(
            websocket,
            {
                "event": EventType.CONNECTION_ESTABLISHED.value,
                "data": {
                    "message": "Connected to ONE ROOF incident stream.",
                    "channel": get_settings().redis_incident_channel,
                    # Told plainly: without Redis this socket only sees
                    # events raised inside this worker process.
                    "redis_connected": redis_service.available,
                    "listener_healthy": ws_manager.redis_listener_healthy,
                    "clients": ws_manager.connection_count,
                },
            },
        )

        # Block on receive purely to detect disconnects. Broadcasts are
        # pushed by the manager's listener task, not from this loop.
        while True:
            message = await websocket.receive_text()
            if message.strip().lower() == "ping":
                await ws_manager.send_personal(websocket, {"event": "pong"})

    except WebSocketDisconnect:
        logger.info("Client disconnected from /ws/incidents.")
    except Exception as exc:
        logger.error("WebSocket error: %s", exc)
        try:
            await websocket.close(code=1011, reason="Internal server error")
        except Exception:
            pass
    finally:
        await ws_manager.disconnect(websocket)


# -- GET /ws/status -------------------------------------------

class WebSocketStatus(BaseModel):
    connected_clients: int
    redis_connected: bool
    redis_listener_healthy: bool
    channel: str


@router.get(
    "/ws/status",
    response_model=WebSocketStatus,
    tags=["WebSocket"],
    summary="WebSocket fan-out status",
)
async def websocket_status() -> WebSocketStatus:
    settings = get_settings()
    return WebSocketStatus(
        connected_clients=ws_manager.connection_count,
        redis_connected=redis_service.available,
        redis_listener_healthy=ws_manager.redis_listener_healthy,
        channel=settings.redis_incident_channel,
    )


# -- POST /ws/test-broadcast (development only) ---------------

class TestBroadcast(BaseModel):
    event: str = Field(default="incident_updated", examples=["incident_updated"])
    incident_id: Optional[str] = Field(default=None)
    data: Dict[str, Any] = Field(default_factory=dict)


@router.post(
    "/ws/test-broadcast",
    tags=["WebSocket"],
    summary="Publish a test event (development only)",
    description=(
        "Publishes an event to Redis so you can verify the full "
        "Redis -> WebSocket path without creating a real incident.\n\n"
        "Returns 403 unless `ENVIRONMENT=development`."
    ),
    responses={403: {"description": "Not available outside development"}},
)
async def test_broadcast(body: TestBroadcast) -> dict:
    settings = get_settings()
    if not settings.is_development:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Test broadcast is disabled outside development.",
        )

    published = await redis_service.publish_event(
        body.event, incident_id=body.incident_id, data=body.data
    )

    delivered_locally = 0
    if not published:
        delivered_locally = await ws_manager.broadcast_local(
            {
                "event": body.event,
                "incident_id": body.incident_id,
                "data": body.data,
                "delivered_via": "local",
            }
        )

    return {
        # Reported honestly: False means Redis did not accept it.
        "published_to_redis": published,
        "delivered_locally": delivered_locally,
        "connected_clients": ws_manager.connection_count,
    }
