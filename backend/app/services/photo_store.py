"""
ONE ROOF - Photo Metadata Store (Person 5B)

Keeps photo records in memory with the same shape a database table
would have. The binary itself always lives in MinIO - only metadata
is held here.

INTEGRATION POINT (Person 5A)
-----------------------------
When the Incident model exists, `Photo.incident_id` becomes a real
foreign key and these three methods become SQLAlchemy queries. The
call sites in routers/upload.py do not change.

State is per-process and lost on restart; /health reports this as
`photo_store: "memory"`.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID

from app.models.photo import Photo, PhotoStatus

logger = logging.getLogger(__name__)


class PhotoStore:
    """Id-keyed photo metadata repository."""

    backend: str = "memory"

    def __init__(self) -> None:
        self._photos: Dict[UUID, Photo] = {}

    async def add(self, photo: Photo) -> Photo:
        self._photos[photo.id] = photo
        return photo

    async def get(self, photo_id: UUID) -> Optional[Photo]:
        return self._photos.get(photo_id)

    async def list_all(self, incident_id: Optional[UUID] = None) -> List[Photo]:
        photos = list(self._photos.values())
        if incident_id is not None:
            photos = [p for p in photos if p.incident_id == incident_id]
        return sorted(photos, key=lambda p: p.uploaded_at, reverse=True)

    async def set_status(
        self,
        photo_id: UUID,
        photo_status: PhotoStatus,
        verified_by: Optional[UUID] = None,
    ) -> Optional[Photo]:
        photo = self._photos.get(photo_id)
        if photo is None:
            return None
        photo.status = photo_status
        photo.verified_by = verified_by
        photo.verified_at = datetime.now(timezone.utc)
        logger.info("Photo %s -> %s", photo_id, photo_status.value)
        return photo

    async def attach_to_incident(
        self, photo_id: UUID, incident_id: UUID
    ) -> Optional[Photo]:
        """Link a photo to an incident after the fact (Person 5A may call this)."""
        photo = self._photos.get(photo_id)
        if photo is None:
            return None
        photo.incident_id = incident_id
        return photo

    @property
    def count(self) -> int:
        return len(self._photos)


# Module-level singleton
photo_store = PhotoStore()
