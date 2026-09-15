"""
Person 5A — PostGIS Spatial Service
Performs spatial queries using ST_DWithin and ST_Distance inside PostgreSQL.
All spatial filtering happens in the database — nothing is done in Python.
"""

from typing import List, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session
from geoalchemy2.elements import WKTElement

from app.models.incident import Incident, IncidentStatus


def _make_point(longitude: float, latitude: float) -> WKTElement:
    """Create a PostGIS GEOGRAPHY point. WKT order is (lon, lat)."""
    return WKTElement(f"POINT({longitude} {latitude})", srid=4326)


def find_incidents_nearby(
    db: Session,
    latitude: float,
    longitude: float,
    radius_meters: float,
    exclude_id: int | None = None,
    exclude_duplicates: bool = False,
    limit: int | None = None,
) -> List[Tuple[Incident, float]]:
    """
    Find incidents within `radius_meters` of the given coordinates.

    Returns a list of (Incident, distance_meters) tuples, sorted by distance.

    All filtering uses PostGIS ST_DWithin (spatial index scan) and distance
    is computed with ST_Distance — both run inside PostgreSQL.
    """
    ref_point = _make_point(longitude, latitude)

    # Distance in meters (geography type uses meters by default)
    distance_col = func.ST_Distance(Incident.location, ref_point).label(
        "distance_meters"
    )

    query = (
        db.query(Incident, distance_col)
        .filter(
            func.ST_DWithin(Incident.location, ref_point, radius_meters)
        )
    )

    # Optionally exclude a specific incident (e.g., the one being deduped)
    if exclude_id is not None:
        query = query.filter(Incident.id != exclude_id)

    # Optionally exclude incidents already marked as duplicates
    if exclude_duplicates:
        query = query.filter(Incident.status != IncidentStatus.DUPLICATE)

    query = query.order_by(distance_col.asc(), Incident.id.asc())
    if limit is not None:
        query = query.limit(limit)

    return query.all()
