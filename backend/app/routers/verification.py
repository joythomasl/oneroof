"""
ONE ROOF - Verification Router (Person 5B)

    POST /verification/{incident_id}/approve
    POST /verification/{incident_id}/reject
    POST /verification/{incident_id}/flag-location
    GET  /verification/{incident_id}

Person 5A owns the Incident model, its CRUD, and all spatial logic.
This router owns only the *decision* and routes it through
`app.services.incident_adapter`, which is the single integration point.

While Person 5A's hooks are unregistered the adapter runs in degraded
mode: decisions live in this process and every response says
`"persisted": false`. Nothing here pretends a database write happened.
"""

from __future__ import annotations

import logging
from datetime import datetime
from enum import Enum
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies import require_role
from app.models.events import EventType
from app.models.user import User, UserRole
from app.services.incident_adapter import (
    VerificationStatus,
    incident_adapter,
)
from app.services.redis_service import redis_service
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verification", tags=["Verification"])


# -- Schemas --------------------------------------------------

class VerificationAction(str, Enum):
    APPROVE = "approve"
    REJECT = "reject"
    FLAG_LOCATION = "flag_location"


class VerificationRequest(BaseModel):
    """Note from the CPOC performing the review."""

    note: str = Field(
        default="",
        max_length=500,
        description="Reason for the decision. Required when rejecting.",
        examples=["Confirmed on site by SDRF team 4."],
    )


class LocationFlagRequest(BaseModel):
    """Flags a suspected location mismatch. No spatial maths here."""

    reason: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Why the reported location looks wrong.",
        examples=["Photo landmarks do not match the reported ward."],
    )


class VerificationResponse(BaseModel):
    incident_id: UUID
    action: VerificationAction
    status: VerificationStatus
    note: str = ""
    verified_by: Optional[UUID] = None
    verified_at: datetime
    message: str
    #: True only if Person 5A's database writer committed the change.
    persisted: bool = False
    #: False when Person 5A's lookup hook is not registered, so the
    #: incident's existence could not actually be checked.
    existence_checked: bool = False
    #: True only if the event genuinely reached Redis.
    event_published: bool = False


class VerificationStateResponse(BaseModel):
    incident_id: UUID
    status: VerificationStatus
    verified_by: Optional[UUID] = None
    verified_at: Optional[datetime] = None
    reason: str = ""
    location_flagged: bool = False
    location_flag_reason: str = ""


# -- Shared helpers -------------------------------------------

async def _assert_incident_exists(incident_id: UUID) -> bool:
    """
    404 if Person 5A's lookup says the incident is missing.

    Returns whether existence was actually verifiable.
    """
    exists = await incident_adapter.incident_exists(incident_id)
    if exists is False:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident {} not found.".format(incident_id),
        )
    if exists is None:
        logger.warning(
            "Incident %s existence NOT checked - Person 5A's lookup hook is "
            "not registered (adapter mode=%s).",
            incident_id,
            incident_adapter.mode,
        )
        return False
    return True


async def _emit(event: EventType, incident_id: UUID, data: dict) -> bool:
    """Publish to Redis; fall back to a local broadcast if Redis is down."""
    published = await redis_service.publish_event(
        event.value, incident_id=str(incident_id), data=data
    )
    if not published:
        await ws_manager.broadcast_local(
            {
                "event": event.value,
                "incident_id": str(incident_id),
                "data": data,
                "delivered_via": "local",
            }
        )
    return published


# -- POST /verification/{incident_id}/approve -----------------

@router.post(
    "/{incident_id}/approve",
    response_model=VerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Approve an incident (cpoc_admin only)",
    responses={
        403: {"description": "Requires cpoc_admin"},
        404: {"description": "Incident not found"},
    },
)
async def approve_incident(
    incident_id: UUID,
    body: VerificationRequest,
    user: User = Depends(require_role(UserRole.CPOC_ADMIN)),
) -> VerificationResponse:
    """
    A CPOC approves the incident and an `incident_verified` event is
    published to Redis, reaching every WebSocket client.
    """
    checked = await _assert_incident_exists(incident_id)

    record, persisted = await incident_adapter.set_verification(
        incident_id,
        VerificationStatus.APPROVED,
        verified_by=user.id,
        reason=body.note,
    )

    published = await _emit(
        EventType.INCIDENT_VERIFIED,
        incident_id,
        {
            "status": VerificationStatus.APPROVED.value,
            "verified_by": str(user.id),
            "verified_at": record.verified_at.isoformat(),
            "note": body.note,
        },
    )

    logger.info("Incident %s APPROVED by %s", incident_id, user.id)

    return VerificationResponse(
        incident_id=incident_id,
        action=VerificationAction.APPROVE,
        status=record.status,
        note=body.note,
        verified_by=user.id,
        verified_at=record.verified_at,
        message="Incident {} has been approved.".format(incident_id),
        persisted=persisted,
        existence_checked=checked,
        event_published=published,
    )


# -- POST /verification/{incident_id}/reject ------------------

@router.post(
    "/{incident_id}/reject",
    response_model=VerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Reject an incident (cpoc_admin only)",
    responses={
        403: {"description": "Requires cpoc_admin"},
        404: {"description": "Incident not found"},
        422: {"description": "A rejection note is required"},
    },
)
async def reject_incident(
    incident_id: UUID,
    body: VerificationRequest,
    user: User = Depends(require_role(UserRole.CPOC_ADMIN)),
) -> VerificationResponse:
    """
    A CPOC rejects the incident (duplicate, spam, unclear photo).
    A note is mandatory so the reporter can be told why.
    """
    if not body.note.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A rejection note is required.",
        )

    checked = await _assert_incident_exists(incident_id)

    record, persisted = await incident_adapter.set_verification(
        incident_id,
        VerificationStatus.REJECTED,
        verified_by=user.id,
        reason=body.note,
    )

    published = await _emit(
        EventType.INCIDENT_REJECTED,
        incident_id,
        {
            "status": VerificationStatus.REJECTED.value,
            "verified_by": str(user.id),
            "verified_at": record.verified_at.isoformat(),
            "reason": body.note,
        },
    )

    logger.info("Incident %s REJECTED by %s - %s", incident_id, user.id, body.note)

    return VerificationResponse(
        incident_id=incident_id,
        action=VerificationAction.REJECT,
        status=record.status,
        note=body.note,
        verified_by=user.id,
        verified_at=record.verified_at,
        message="Incident {} has been rejected.".format(incident_id),
        persisted=persisted,
        existence_checked=checked,
        event_published=published,
    )


# -- POST /verification/{incident_id}/flag-location -----------

@router.post(
    "/{incident_id}/flag-location",
    response_model=VerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Flag a suspected location mismatch (cpoc_admin only)",
    description=(
        "Records that the reported location looks wrong. This endpoint "
        "stores and broadcasts the flag only - deciding whether the "
        "location *is* wrong is spatial logic and belongs to Person 5A."
    ),
    responses={
        403: {"description": "Requires cpoc_admin"},
        404: {"description": "Incident not found"},
    },
)
async def flag_location(
    incident_id: UUID,
    body: LocationFlagRequest,
    user: User = Depends(require_role(UserRole.CPOC_ADMIN)),
) -> VerificationResponse:
    checked = await _assert_incident_exists(incident_id)

    record = await incident_adapter.flag_location(
        incident_id, body.reason, flagged_by=user.id
    )

    published = await _emit(
        EventType.INCIDENT_LOCATION_FLAGGED,
        incident_id,
        {
            "location_flagged": True,
            "reason": body.reason,
            "flagged_by": str(user.id),
        },
    )

    return VerificationResponse(
        incident_id=incident_id,
        action=VerificationAction.FLAG_LOCATION,
        status=record.status,
        note=body.reason,
        verified_by=user.id,
        verified_at=record.verified_at,
        message="Location mismatch flagged on incident {}.".format(incident_id),
        persisted=False,  # the flag is 5B-side metadata until 5A stores it
        existence_checked=checked,
        event_published=published,
    )


# -- GET /verification/{incident_id} --------------------------

@router.get(
    "/{incident_id}",
    response_model=VerificationStateResponse,
    summary="Get the current verification state of an incident",
    responses={404: {"description": "No verification recorded"}},
)
async def get_verification(incident_id: UUID) -> VerificationStateResponse:
    record = await incident_adapter.get_verification(incident_id)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No verification recorded for incident {}.".format(incident_id),
        )
    return VerificationStateResponse(
        incident_id=record.incident_id,
        status=record.status,
        verified_by=record.verified_by,
        verified_at=record.verified_at,
        reason=record.reason,
        location_flagged=record.location_flagged,
        location_flag_reason=record.location_flag_reason,
    )
