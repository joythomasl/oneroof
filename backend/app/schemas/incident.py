"""
Person 5A — Incident Pydantic Schemas
Request/response models for the incident API.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.incident import IncidentType, Severity, IncidentStatus


# ── Request Schemas ───────────────────────────────────────────────────────────


class IncidentCreate(BaseModel):
    """Schema for creating a new incident."""

    reporter_id: Optional[int] = None
    incident_type: IncidentType
    severity: Severity
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    latitude: float
    longitude: float
    external_event_id: Optional[str] = Field(None, max_length=255)
    source_device_id: Optional[str] = Field(None, max_length=255)

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not -90.0 <= v <= 90.0:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not -180.0 <= v <= 180.0:
            raise ValueError("Longitude must be between -180 and 180")
        return v


class IncidentUpdate(BaseModel):
    """Schema for partially updating an incident. All fields optional."""

    incident_type: Optional[IncidentType] = None
    severity: Optional[Severity] = None
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[IncidentStatus] = None

    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not -90.0 <= v <= 90.0:
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and not -180.0 <= v <= 180.0:
            raise ValueError("Longitude must be between -180 and 180")
        return v


# ── Response Schemas ──────────────────────────────────────────────────────────


class IncidentResponse(BaseModel):
    """Standard incident response."""

    id: int
    reporter_id: Optional[int] = None
    incident_type: IncidentType
    severity: Severity
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime
    external_event_id: Optional[str] = None
    source_device_id: Optional[str] = None
    duplicate_of_id: Optional[int] = None

    model_config = {"from_attributes": True}


class IncidentNearbyItem(BaseModel):
    """A single incident in a nearby-search response, with distance."""

    id: int
    distance_meters: float
    incident_type: IncidentType
    severity: Severity
    title: str
    latitude: float
    longitude: float
    status: IncidentStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class NearbySearchResponse(BaseModel):
    """Response wrapper for the /incidents/nearby endpoint."""

    count: int
    incidents: List[IncidentNearbyItem]


class IncidentListResponse(BaseModel):
    """Paginated list of incidents."""

    count: int
    incidents: List[IncidentResponse]


class DedupeStatusResponse(BaseModel):
    """Deduplication configuration and stats."""

    dedupe_radius_meters: float
    dedupe_time_window_minutes: int
    total_incidents: int
    duplicate_incidents: int


class DuplicateGroupResponse(BaseModel):
    """All duplicates linked to a specific incident."""

    original_incident_id: int
    duplicate_count: int
    duplicates: List[IncidentResponse]
