"""
ONE ROOF - Incident Adapter (Person 5B <-> Person 5A boundary)

Person 5A owns the Incident model, its CRUD, PostGIS queries and
deduplication. Person 5B owns verification *decisions*.

This module is the only place the two meet. It holds verification
state (approved / rejected / location-flagged) keyed by incident id,
and exposes a hook Person 5A can register so existence checks become
real without touching the verification router.

>>> HOW PERSON 5A WIRES THIS UP <<<
Add three lines to their startup (or any import-time module):

    from app.services.incident_adapter import incident_adapter

    async def _lookup(incident_id):
        return await session.get(Incident, incident_id)   # or None

    incident_adapter.register_lookup(_lookup)

    async def _apply(incident_id, status, verified_by, note):
        inc = await session.get(Incident, incident_id)
        inc.status = status
        await session.commit()

    incident_adapter.register_writer(_apply)

Until those are registered the adapter runs in DEGRADED mode:
verification decisions are stored in this process only, and every
response carries `"persisted": false` so nobody mistakes a prototype
for a database write.

This module deliberately contains NO spatial logic, NO ST_DWithin,
NO deduplication and NO incident CRUD.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Awaitable, Callable, Dict, List, Optional
from uuid import UUID

logger = logging.getLogger(__name__)


class VerificationStatus(str, Enum):
    """Verification decisions owned by Person 5B."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class VerificationRecord:
    """One verification decision about one incident."""

    def __init__(
        self,
        incident_id: int,
        status: VerificationStatus,
        verified_by: Optional[UUID] = None,
        reason: str = "",
    ) -> None:
        self.incident_id = incident_id
        self.status = status
        self.verified_by = verified_by
        self.reason = reason
        self.verified_at = datetime.now(timezone.utc)
        self.location_flagged: bool = False
        self.location_flag_reason: str = ""
        self.location_distance_meters: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "incident_id": str(self.incident_id),
            "status": self.status.value,
            "verified_by": str(self.verified_by) if self.verified_by else None,
            "verified_at": self.verified_at.isoformat(),
            "reason": self.reason,
            "location_flagged": self.location_flagged,
            "location_flag_reason": self.location_flag_reason,
            "location_distance_meters": self.location_distance_meters,
        }


# Type aliases for the hooks Person 5A registers.
LookupFn = Callable[[int], Awaitable[Optional[object]]]
WriterFn = Callable[[int, str, Optional[UUID], str], Awaitable[None]]


class IncidentAdapter:
    """Bridge between verification decisions and Person 5A's incident store."""

    def __init__(self) -> None:
        self._records: Dict[int, VerificationRecord] = {}
        self._lookup: Optional[LookupFn] = None
        self._writer: Optional[WriterFn] = None

    # -- Registration (called by Person 5A) -------------------

    def register_lookup(self, fn: LookupFn) -> None:
        """Register an async `incident_id -> incident|None` lookup."""
        self._lookup = fn
        logger.info("Incident lookup registered by Person 5A - 404s are now real.")

    def register_writer(self, fn: WriterFn) -> None:
        """Register an async writer that persists the decision to the DB."""
        self._writer = fn
        logger.info("Incident writer registered by Person 5A - decisions now persist.")

    @property
    def has_database(self) -> bool:
        """True once Person 5A has wired both hooks."""
        return self._lookup is not None and self._writer is not None

    @property
    def mode(self) -> str:
        if self.has_database:
            return "database"
        if self._lookup is not None:
            return "partial"
        return "degraded"

    # -- Existence --------------------------------------------

    async def incident_exists(self, incident_id: int) -> Optional[bool]:
        """
        Does this incident exist?

        Returns True / False when Person 5A's lookup is registered, and
        **None meaning "unknown"** when it is not. The router turns
        False into a 404 and None into a permissive path with an
        explicit `"existence_checked": false` marker in the response.
        We never invent a "yes".
        """
        if self._lookup is None:
            return None
        try:
            return await self._lookup(incident_id) is not None
        except Exception as exc:
            logger.error("Incident lookup failed for %s: %s", incident_id, exc)
            return None

    async def get_incident(self, incident_id: int) -> Optional[object]:
        """Return the database incident when the Person 5 lookup is registered."""
        if self._lookup is None:
            return None
        try:
            return await self._lookup(incident_id)
        except Exception as exc:
            logger.error("Incident lookup failed for %s: %s", incident_id, exc)
            return None

    # -- Decisions --------------------------------------------

    async def set_verification(
        self,
        incident_id: int,
        status: VerificationStatus,
        verified_by: Optional[UUID] = None,
        reason: str = "",
    ) -> tuple[VerificationRecord, bool]:
        """
        Record a verification decision.

        Returns ``(record, persisted)`` where *persisted* is True only
        if Person 5A's writer actually committed it to the database.
        """
        record = VerificationRecord(incident_id, status, verified_by, reason)
        # Carry any previous location flag forward.
        previous = self._records.get(incident_id)
        if previous is not None:
            record.location_flagged = previous.location_flagged
            record.location_flag_reason = previous.location_flag_reason
            record.location_distance_meters = previous.location_distance_meters
        self._records[incident_id] = record

        persisted = False
        if self._writer is not None:
            try:
                await self._writer(
                    incident_id, status.value, verified_by, reason
                )
                persisted = True
            except Exception as exc:
                logger.error(
                    "Person 5A writer failed for incident %s: %s", incident_id, exc
                )

        logger.info(
            "Incident %s -> %s (persisted=%s, mode=%s)",
            incident_id,
            status.value,
            persisted,
            self.mode,
        )
        return record, persisted

    async def flag_location(
        self,
        incident_id: int,
        reason: str,
        flagged_by: Optional[UUID] = None,
        distance_meters: Optional[float] = None,
    ) -> VerificationRecord:
        """
        Mark a possible location mismatch.

        Stores and exposes the flag only. Deciding *whether* the
        location is actually wrong is spatial logic and belongs to
        Person 5A - this method never computes distance.
        """
        record = self._records.get(incident_id)
        if record is None:
            record = VerificationRecord(
                incident_id, VerificationStatus.PENDING, flagged_by
            )
            self._records[incident_id] = record
        record.location_flagged = True
        record.location_flag_reason = reason
        record.location_distance_meters = distance_meters
        logger.info("Incident %s location flagged: %s", incident_id, reason)
        return record

    # -- Reads ------------------------------------------------

    async def get_verification(self, incident_id: int) -> Optional[VerificationRecord]:
        return self._records.get(incident_id)

    async def list_verifications(self) -> List[dict]:
        return [r.to_dict() for r in self._records.values()]


# Module-level singleton
incident_adapter = IncidentAdapter()
