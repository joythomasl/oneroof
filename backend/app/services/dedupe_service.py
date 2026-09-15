"""
Person 5A — Incident Deduplication Service

Determines whether a new incident is a probable duplicate of an existing one.

Algorithm (deterministic, easy to explain at presentation):
  1. Find nearby incidents within DEDUPE_RADIUS_METERS (PostGIS ST_DWithin)
  2. Filter to those created within DEDUPE_TIME_WINDOW_MINUTES
  3. Match on same incident_type
  4. If a match is found → return the oldest original's ID
  5. Otherwise → None (not a duplicate)

Duplicates are LINKED (duplicate_of_id), never deleted.
"""

from datetime import timedelta
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement

from app.config import get_settings
from app.models.incident import Incident, IncidentStatus


def check_duplicate(
    db: Session,
    incident: Incident,
) -> Optional[int]:
    """
    Check if `incident` is a probable duplicate of an existing incident.

    Returns the ID of the original incident if a duplicate is found,
    or None if it's a new unique incident.
    """
    settings = get_settings()

    # Delayed offline reports are compared using their original report time,
    # not the time at which a gateway eventually syncs them.
    time_threshold = incident.created_at - timedelta(
        minutes=settings.DEDUPE_TIME_WINDOW_MINUTES
    )
    ref_point = WKTElement(
        f"POINT({incident.longitude} {incident.latitude})", srid=4326
    )

    # Run every predicate in PostgreSQL. ST_DWithin can use the GiST index;
    # type/time predicates use the composite B-tree index on the model.
    return (
        db.query(Incident.id)
        .filter(
            Incident.id != incident.id,
            Incident.incident_type == incident.incident_type,
            Incident.status != IncidentStatus.DUPLICATE,
            Incident.created_at >= time_threshold,
            Incident.created_at <= incident.created_at,
            func.ST_DWithin(
                Incident.location,
                ref_point,
                settings.DEDUPE_RADIUS_METERS,
            ),
        )
        .order_by(Incident.created_at.asc(), Incident.id.asc())
        .limit(1)
        .scalar()
    )


def link_duplicate(
    db: Session,
    incident: Incident,
    original_id: int,
) -> Incident:
    """
    Link an incident as a duplicate of the original.
    Sets duplicate_of_id and changes status to DUPLICATE.
    Does NOT delete the duplicate — preserves the citizen report.
    """
    incident.duplicate_of_id = original_id
    incident.status = IncidentStatus.DUPLICATE
    db.add(incident)
    db.flush()
    return incident
