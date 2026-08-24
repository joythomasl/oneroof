"""
Person 5A — Deduplication Info Router

Endpoints:
  GET /dedupe/status               — Dedupe config & stats
  GET /dedupe/duplicates/{id}      — All duplicates linked to a given incident
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import get_settings
from app.models.incident import Incident, IncidentStatus
from app.schemas.incident import (
    DedupeStatusResponse,
    DuplicateGroupResponse,
    IncidentResponse,
)

router = APIRouter(prefix="/dedupe", tags=["Deduplication"])


@router.get("/status", response_model=DedupeStatusResponse)
def dedupe_status(db: Session = Depends(get_db)):
    """Return current deduplication configuration and statistics."""
    settings = get_settings()
    total = db.query(Incident).count()
    dupes = db.query(Incident).filter(Incident.status == IncidentStatus.DUPLICATE).count()

    return DedupeStatusResponse(
        dedupe_radius_meters=settings.DEDUPE_RADIUS_METERS,
        dedupe_time_window_minutes=settings.DEDUPE_TIME_WINDOW_MINUTES,
        total_incidents=total,
        duplicate_incidents=dupes,
    )


@router.get("/duplicates/{incident_id}", response_model=DuplicateGroupResponse)
def get_duplicates(incident_id: int, db: Session = Depends(get_db)):
    """Return all incidents that are marked as duplicates of the given incident."""
    original = db.get(Incident, incident_id)
    if not original:
        raise HTTPException(status_code=404, detail="Incident not found")

    duplicates = (
        db.query(Incident)
        .filter(Incident.duplicate_of_id == incident_id)
        .order_by(Incident.created_at.asc())
        .all()
    )

    return DuplicateGroupResponse(
        original_incident_id=incident_id,
        duplicate_count=len(duplicates),
        duplicates=duplicates,
    )
