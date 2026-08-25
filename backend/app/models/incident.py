"""
Person 5A — Incident Database Model
PostgreSQL + PostGIS model for disaster/emergency incident reports.
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    Enum,
    DateTime,
    ForeignKey,
    Index,
    CheckConstraint,
    Boolean,
)
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography

from app.database import Base


# ── Enums ─────────────────────────────────────────────────────────────────────


class IncidentType(str, enum.Enum):
    FIRE = "FIRE"
    FLOOD = "FLOOD"
    EARTHQUAKE = "EARTHQUAKE"
    LANDSLIDE = "LANDSLIDE"
    MEDICAL = "MEDICAL"
    ACCIDENT = "ACCIDENT"
    SOS = "SOS"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    OTHER = "OTHER"


class Severity(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REOPENED = "REOPENED"
    DUPLICATE = "DUPLICATE"


# ── Model ─────────────────────────────────────────────────────────────────────


class Incident(Base):
    __tablename__ = "incidents"

    # Primary key
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    area_id = Column(
        Integer,
        ForeignKey("areas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Reporter — plain int for now; Person 5B will create the User model/auth.
    reporter_id = Column(Integer, nullable=True)

    # Classification
    incident_type = Column(
        Enum(IncidentType, name="incident_type_enum", create_constraint=True),
        nullable=False,
    )
    severity = Column(
        Enum(Severity, name="severity_enum", create_constraint=True),
        nullable=False,
    )

    # Details
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Coordinates (stored as plain floats for convenience AND as PostGIS geography)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # PostGIS GEOGRAPHY(Point, 4326) — the real spatial column
    # IMPORTANT: WKT point order is (longitude, latitude)
    location = Column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=False,
    )

    # Status
    status = Column(
        Enum(IncidentStatus, name="incident_status_enum", create_constraint=True),
        nullable=False,
        default=IncidentStatus.OPEN,
    )

    # Verification outcome from the CPOC workflow.
    verification_note = Column(Text, nullable=True)
    verified_by = Column(String(36), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    location_flagged = Column(Boolean, nullable=False, default=False)
    location_flag_reason = Column(Text, nullable=True)
    closure_photo_distance_meters = Column(Float, nullable=True)

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Mesh integration — prevents the same mesh event from being inserted twice
    external_event_id = Column(String(255), unique=True, nullable=True)
    source_device_id = Column(String(255), nullable=True)

    # Deduplication — self-referencing FK
    duplicate_of_id = Column(
        Integer,
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Self-referencing relationship
    duplicate_of = relationship(
        "Incident",
        remote_side=[id],
        foreign_keys=[duplicate_of_id],
        backref="duplicates",
    )

    # ── GiST spatial index on the location column ──
    __table_args__ = (
        CheckConstraint(
            "latitude >= -90 AND latitude <= 90",
            name="ck_incidents_latitude_range",
        ),
        CheckConstraint(
            "longitude >= -180 AND longitude <= 180",
            name="ck_incidents_longitude_range",
        ),
        Index("idx_incidents_location_gist", "location", postgresql_using="gist"),
        # Supports the map filters and the recent-same-type dedupe query.
        Index("idx_incidents_status_created", "status", "created_at"),
        Index("idx_incidents_type_created", "incident_type", "created_at"),
        Index("idx_incidents_severity_created", "severity", "created_at"),
        Index("idx_incidents_duplicate_of", "duplicate_of_id"),
        Index("idx_incidents_area_status", "area_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<Incident(id={self.id}, type={self.incident_type}, "
            f"severity={self.severity}, status={self.status})>"
        )
