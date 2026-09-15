"""
Person 5A — Incident CRUD + Spatial Search Router

Endpoints:
  POST   /incidents           — Create incident (with auto-dedupe)
  GET    /incidents            — List incidents (filterable, paginated)
  GET    /incidents/nearby     — Spatial search (PostGIS)
  GET    /incidents/{id}       — Get single incident
  PATCH  /incidents/{id}       — Partial update
  DELETE /incidents/{id}       — Hard delete
"""

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from geoalchemy2.elements import WKTElement

from app.database import get_db
from app.models.incident import Incident, IncidentType, Severity, IncidentStatus
from app.models.events import EventType
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
    IncidentListResponse,
    IncidentNearbyItem,
    NearbySearchResponse,
)
from app.services.postgis_service import find_incidents_nearby
from app.services.dedupe_service import check_duplicate, link_duplicate
from app.services.redis_service import redis_service

router = APIRouter(prefix="/incidents", tags=["Incidents"])


# ── Helpers ───────────────────────────────────────────────────────────────────


def _make_location(longitude: float, latitude: float) -> WKTElement:
    """Build a PostGIS GEOGRAPHY point. WKT order: (lon, lat)."""
    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


# ── CREATE ────────────────────────────────────────────────────────────────────


@router.post("/", response_model=IncidentResponse, status_code=201)
def create_incident(
    payload: IncidentCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Create a new incident report.

    - Validates coordinates, type, severity (via Pydantic schema).
    - Creates the PostGIS geographic point.
    - Stores the incident.
    - Checks for duplicates and links if appropriate.
    - Never deletes duplicate reports — preserves the original citizen report.
    """
    # Fast path for replayed mesh events. The database unique constraint remains
    # the final guard against two concurrent requests racing this check.
    if payload.external_event_id is not None:
        existing_id = (
            db.query(Incident.id)
            .filter(Incident.external_event_id == payload.external_event_id)
            .scalar()
        )
        if existing_id is not None:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "EXTERNAL_EVENT_EXISTS",
                    "message": "This external event was already ingested.",
                    "incident_id": existing_id,
                },
            )

    incident = Incident(
        reporter_id=payload.reporter_id,
        area_id=payload.area_id,
        incident_type=payload.incident_type,
        severity=payload.severity,
        title=payload.title,
        description=payload.description,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location=_make_location(payload.longitude, payload.latitude),
        status=IncidentStatus.OPEN,
        external_event_id=payload.external_event_id,
        source_device_id=payload.source_device_id,
    )

    db.add(incident)

    try:
        db.flush()  # Get the ID before dedupe check
    except IntegrityError as exc:
        db.rollback()
        constraint = (
            getattr(getattr(exc.orig, "diag", None), "constraint_name", "") or ""
        )
        if payload.external_event_id and "external_event_id" in constraint:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "EXTERNAL_EVENT_EXISTS",
                    "message": "This external event was already ingested.",
                },
            ) from exc
        raise HTTPException(status_code=409, detail="Incident violates a database constraint.") from exc

    # Auto-dedupe check
    original_id = check_duplicate(db, incident)
    if original_id is not None:
        link_duplicate(db, incident, original_id)

    try:
        db.commit()
        db.refresh(incident)
    except SQLAlchemyError:
        db.rollback()
        raise
    background_tasks.add_task(
        redis_service.publish_event,
        EventType.INCIDENT_CREATED.value,
        str(incident.id),
        {
            "type": incident.incident_type.value,
            "severity": incident.severity.value,
            "status": incident.status.value,
            "latitude": incident.latitude,
            "longitude": incident.longitude,
        },
    )
    return incident


# ── NEARBY (must be before /{incident_id} to avoid route conflict) ────────


@router.get("/nearby", response_model=NearbySearchResponse)
def get_nearby_incidents(
    latitude: float = Query(..., ge=-90, le=90, description="Search center latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Search center longitude"),
    radius_meters: float = Query(5000, gt=0, le=50000, description="Search radius in meters"),
    limit: int = Query(100, ge=1, le=500, description="Maximum returned incidents"),
    db: Session = Depends(get_db),
):
    """
    Find incidents near a geographic point using PostGIS ST_DWithin.
    All spatial filtering runs inside PostgreSQL — not in Python.
    """
    results = find_incidents_nearby(
        db, latitude, longitude, radius_meters, limit=limit
    )

    items = [
        IncidentNearbyItem(
            id=inc.id,
            distance_meters=round(dist, 1),
            incident_type=inc.incident_type,
            severity=inc.severity,
            title=inc.title,
            latitude=inc.latitude,
            longitude=inc.longitude,
            status=inc.status,
            created_at=inc.created_at,
        )
        for inc, dist in results
    ]

    return NearbySearchResponse(count=len(items), incidents=items)


# ── LIST ──────────────────────────────────────────────────────────────────────


@router.get("/", response_model=IncidentListResponse)
def list_incidents(
    incident_type: Optional[IncidentType] = Query(None, description="Filter by incident type"),
    severity: Optional[Severity] = Query(None, description="Filter by severity"),
    status: Optional[IncidentStatus] = Query(None, description="Filter by status"),
    offset: int = Query(0, ge=0, alias="offset", description="Pagination offset"),
    skip: Optional[int] = Query(None, ge=0, description="Deprecated alias for offset"),
    limit: int = Query(20, ge=1, le=100, description="Pagination limit"),
    db: Session = Depends(get_db),
):
    """List incidents with optional filters and pagination."""
    query = db.query(Incident)

    if incident_type is not None:
        query = query.filter(Incident.incident_type == incident_type)
    if severity is not None:
        query = query.filter(Incident.severity == severity)
    if status is not None:
        query = query.filter(Incident.status == status)

    pagination_offset = skip if skip is not None else offset
    total = query.with_entities(func.count(Incident.id)).scalar() or 0
    incidents = (
        query.order_by(Incident.created_at.desc())
        .order_by(Incident.id.desc())
        .offset(pagination_offset)
        .limit(limit)
        .all()
    )

    return IncidentListResponse(count=total, incidents=incidents)


# ── READ ──────────────────────────────────────────────────────────────────────


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    """Retrieve a single incident by ID."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


# ── UPDATE ────────────────────────────────────────────────────────────────────


@router.patch("/{incident_id}", response_model=IncidentResponse)
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Partially update an incident. Only provided fields are changed."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    update_data = payload.model_dump(exclude_unset=True)

    # If coordinates changed, regenerate the PostGIS location
    new_lat = update_data.get("latitude", incident.latitude)
    new_lon = update_data.get("longitude", incident.longitude)
    if "latitude" in update_data or "longitude" in update_data:
        update_data["location"] = _make_location(new_lon, new_lat)

    for field, value in update_data.items():
        setattr(incident, field, value)

    try:
        db.commit()
        db.refresh(incident)
    except SQLAlchemyError:
        db.rollback()
        raise
    background_tasks.add_task(
        redis_service.publish_event,
        EventType.INCIDENT_UPDATED.value,
        str(incident.id),
        {"changed_fields": sorted(update_data), "status": incident.status.value},
    )
    return incident


# ── DELETE ────────────────────────────────────────────────────────────────────


@router.delete("/{incident_id}", status_code=204)
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    """Hard-delete an incident."""
    incident = db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    db.delete(incident)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
    return None
