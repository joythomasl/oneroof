"""
ONE ROOF - Photo / Media Schemas (Person 5B)

Pydantic DTOs used by the upload and verification routers. They are
not ORM models; when Person 5A's database lands, `Photo` maps 1:1
onto a table and `incident_id` becomes a real foreign key.

NOTE ON STATUS: the original scaffolding used pending/verified/
rejected. The team spec defines pending/approved/rejected, so those
are now canonical and match the verification endpoints
(/approve, /reject). Nothing outside 5B referenced the old names.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field

# MIME types the upload endpoint accepts.
ALLOWED_CONTENT_TYPES: frozenset[str] = frozenset(
    {"image/jpeg", "image/png", "image/webp"}
)


# -- Enums ----------------------------------------------------

class PhotoStatus(str, Enum):
    """Lifecycle states of an uploaded photo."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# -- Core record ----------------------------------------------

class Photo(BaseModel):
    """
    Canonical photo record.

    `incident_id` is nullable today. Person 5A owns the Incident
    model; once it exists this becomes a foreign key and nothing
    else here has to change.
    """

    id: UUID = Field(default_factory=uuid4)
    incident_id: Optional[UUID] = Field(
        default=None,
        description="Incident this photo belongs to. FK once Person 5A's model exists.",
    )
    object_key: str = Field(..., description="Key inside the MinIO bucket.")
    content_type: str
    size_bytes: Optional[int] = None
    status: PhotoStatus = PhotoStatus.PENDING
    caption: Optional[str] = None
    uploaded_by: Optional[UUID] = Field(
        default=None, description="User id of the uploader, when authenticated."
    )
    uploaded_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    verified_at: Optional[datetime] = None
    verified_by: Optional[UUID] = None

    model_config = {"from_attributes": True}


# -- Request schemas ------------------------------------------

class PhotoUploadMeta(BaseModel):
    """
    Optional metadata a client may send alongside the binary.

    Sent as multipart form fields, not JSON - see routers/upload.py.
    """

    incident_id: Optional[UUID] = Field(
        default=None, description="UUID of the incident this photo belongs to."
    )
    caption: Optional[str] = Field(
        default=None, max_length=280, description="Short description of the photo."
    )


# -- Response schemas -----------------------------------------

class PhotoOut(BaseModel):
    """Returned to the client after a successful upload."""

    id: UUID
    incident_id: Optional[UUID] = None
    object_key: str
    # Plain str, not HttpUrl: presigned MinIO URLs are long and we do
    # not want Pydantic rejecting a URL the object store just handed us.
    url: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    status: PhotoStatus = PhotoStatus.PENDING
    caption: Optional[str] = None
    uploaded_by: Optional[UUID] = None
    uploaded_at: datetime
    verified_at: Optional[datetime] = None
    verified_by: Optional[UUID] = None

    model_config = {"from_attributes": True}
