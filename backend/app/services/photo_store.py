"""Durable photo metadata repository with an in-memory fallback."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError

from app.database import SessionLocal
from app.models.database_records import PhotoRecord
from app.models.photo import Photo, PhotoStatus

logger = logging.getLogger(__name__)


class PhotoStore:
    def __init__(self) -> None:
        self._photos: Dict[UUID, Photo] = {}
        self._database_available = True

    @property
    def backend(self) -> str:
        return "database" if self._database_available else "memory-fallback"

    @staticmethod
    def _domain(row: PhotoRecord) -> Photo:
        return Photo(
            id=row.id if isinstance(row.id, UUID) else UUID(str(row.id)),
            incident_id=row.incident_id,
            object_key=row.object_key,
            content_type=row.content_type,
            size_bytes=row.size_bytes,
            status=PhotoStatus(row.status),
            caption=row.caption,
            latitude=row.latitude,
            longitude=row.longitude,
            captured_at=row.captured_at,
            uploaded_by=(
                row.uploaded_by
                if isinstance(row.uploaded_by, UUID)
                else UUID(str(row.uploaded_by))
            ) if row.uploaded_by else None,
            uploaded_at=row.uploaded_at,
            verified_at=row.verified_at,
            verified_by=(
                row.verified_by
                if isinstance(row.verified_by, UUID)
                else UUID(str(row.verified_by))
            ) if row.verified_by else None,
        )

    def _remember(self, photo: Photo) -> Photo:
        self._photos[photo.id] = photo
        return photo

    def _database_failed(self, exc: Exception) -> None:
        self._database_available = False
        logger.warning("Photo database unavailable; using memory fallback: %s", exc)

    async def add(self, photo: Photo) -> Photo:
        try:
            with SessionLocal() as db:
                row = PhotoRecord(
                    id=str(photo.id),
                    incident_id=photo.incident_id,
                    object_key=photo.object_key,
                    content_type=photo.content_type,
                    size_bytes=photo.size_bytes,
                    status=photo.status.value,
                    caption=photo.caption,
                    latitude=photo.latitude,
                    longitude=photo.longitude,
                    captured_at=photo.captured_at,
                    uploaded_by=str(photo.uploaded_by) if photo.uploaded_by else None,
                    uploaded_at=photo.uploaded_at,
                    verified_at=photo.verified_at,
                    verified_by=str(photo.verified_by) if photo.verified_by else None,
                )
                db.add(row)
                db.commit()
                db.refresh(row)
                self._database_available = True
                return self._remember(self._domain(row))
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            return self._remember(photo)

    async def get(self, photo_id: UUID) -> Optional[Photo]:
        try:
            with SessionLocal() as db:
                row = db.get(PhotoRecord, str(photo_id))
                self._database_available = True
                return self._remember(self._domain(row)) if row else None
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            return self._photos.get(photo_id)

    async def list_all(self, incident_id: Optional[int] = None) -> List[Photo]:
        try:
            with SessionLocal() as db:
                query = db.query(PhotoRecord)
                if incident_id is not None:
                    query = query.filter(PhotoRecord.incident_id == incident_id)
                rows = query.order_by(PhotoRecord.uploaded_at.desc()).all()
                self._database_available = True
                return [self._remember(self._domain(row)) for row in rows]
        except SQLAlchemyError as exc:
            self._database_failed(exc)
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
        try:
            with SessionLocal() as db:
                row = db.get(PhotoRecord, str(photo_id))
                if row is None:
                    return None
                row.status = photo_status.value
                row.verified_by = verified_by
                row.verified_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(row)
                self._database_available = True
                return self._remember(self._domain(row))
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            photo = self._photos.get(photo_id)
            if photo is None:
                return None
            photo.status = photo_status
            photo.verified_by = verified_by
            photo.verified_at = datetime.now(timezone.utc)
            return photo

    async def attach_to_incident(self, photo_id: UUID, incident_id: int) -> Optional[Photo]:
        try:
            with SessionLocal() as db:
                row = db.get(PhotoRecord, str(photo_id))
                if row is None:
                    return None
                row.incident_id = incident_id
                db.commit()
                db.refresh(row)
                self._database_available = True
                return self._remember(self._domain(row))
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            photo = self._photos.get(photo_id)
            if photo is not None:
                photo.incident_id = incident_id
            return photo

    @property
    def count(self) -> int:
        try:
            with SessionLocal() as db:
                count = db.query(PhotoRecord).count()
                self._database_available = True
                return count
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            return len(self._photos)


photo_store = PhotoStore()
