"""
ONE ROOF - Real-time Event Contract (Person 5B)

The single source of truth for what travels over Redis pub/sub and
out through /ws/incidents.

Any module - including Person 5A's incident CRUD - publishes with:

    from app.services.redis_service import redis_service
    from app.models.events import EventType

    await redis_service.publish_event(
        EventType.INCIDENT_CREATED,
        incident_id=str(incident.id),
        data={"title": incident.title},
    )

No WebSocket knowledge required on the publisher's side.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class EventType(str, Enum):
    """Every event the WebSocket stream can carry."""

    # Incident lifecycle - published by Person 5A's CRUD layer
    INCIDENT_CREATED = "incident_created"
    INCIDENT_UPDATED = "incident_updated"
    AREA_UPDATED = "area_updated"

    # Verification - published by Person 5B's verification router
    INCIDENT_VERIFIED = "incident_verified"
    INCIDENT_REJECTED = "incident_rejected"
    INCIDENT_LOCATION_FLAGGED = "incident_location_flagged"

    # Media - published by Person 5B's upload router
    PHOTO_UPLOADED = "photo_uploaded"
    PHOTO_VERIFIED = "photo_verified"

    # Connection housekeeping, sent directly to the socket (not Redis)
    CONNECTION_ESTABLISHED = "connection_established"
    ERROR = "error"


class IncidentEvent(BaseModel):
    """
    Envelope for every real-time message.

    Example::

        {
          "event": "incident_verified",
          "incident_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
          "data": {"status": "approved", "verified_by": "..."},
          "timestamp": "2026-01-01T12:00:00+00:00"
        }
    """

    event: EventType
    incident_id: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
