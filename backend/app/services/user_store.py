"""
ONE ROOF - User Store (Person 5B)

An in-memory user repository with the exact shape a database-backed
repository would have. Person 5A's SQLAlchemy session is not required
for auth to work, and when it lands only this file changes.

INTEGRATION POINT (Person 5A)
-----------------------------
Replace the three method bodies below with real queries:

    async def get_by_phone(self, phone):
        return await session.scalar(select(User).where(User.phone == phone))

The call sites in routers/auth.py and app/dependencies.py do not change.

WARNING: state lives in the process. Restarting uvicorn forgets every
user. That is acceptable for a hackathon prototype and is reported
honestly by /health as `user_store: "memory"`.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional
from uuid import UUID

from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


class UserStore:
    """Phone-keyed user repository."""

    #: Flips to "database" when Person 5A's layer is wired in.
    backend: str = "memory"

    def __init__(self) -> None:
        self._by_phone: Dict[str, User] = {}
        self._by_id: Dict[UUID, User] = {}

    # -- Reads ------------------------------------------------

    async def get_by_phone(self, phone: str) -> Optional[User]:
        return self._by_phone.get(phone)

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        return self._by_id.get(user_id)

    async def list_users(self) -> List[User]:
        return list(self._by_phone.values())

    # -- Writes -----------------------------------------------

    async def get_or_create(
        self,
        phone: str,
        role: UserRole = UserRole.CITIZEN,
        name: Optional[str] = None,
    ) -> User:
        """
        Return the existing user for *phone*, or create one.

        First login creates a `citizen`. Promotion to responder or
        cpoc_admin is an explicit admin action - never inferred.
        """
        existing = self._by_phone.get(phone)
        if existing is not None:
            return existing

        user = User(phone=phone, role=role, name=name)
        self._by_phone[phone] = user
        self._by_id[user.id] = user
        logger.info("Created user %s (%s) with role '%s'.", user.id, phone, role.value)
        return user

    async def set_role(self, user_id: UUID, role: UserRole) -> Optional[User]:
        user = self._by_id.get(user_id)
        if user is None:
            return None
        user.role = role
        logger.info("User %s role changed to '%s'.", user_id, role.value)
        return user

    async def set_active(self, user_id: UUID, is_active: bool) -> Optional[User]:
        user = self._by_id.get(user_id)
        if user is None:
            return None
        user.is_active = is_active
        return user

    # -- Development helper -----------------------------------

    async def seed_demo_users(self) -> None:
        """
        Create one user per role so RBAC is testable without a database.

        Only runs when ENVIRONMENT=development. These are login-by-OTP
        accounts - no passwords exist, so seeding them grants nothing
        an attacker could not get by requesting an OTP.
        """
        demo = [
            ("9000000001", UserRole.CITIZEN, "Demo Citizen"),
            ("9000000002", UserRole.RESPONDER, "Demo Responder"),
            ("9000000003", UserRole.CPOC_ADMIN, "Demo CPOC Admin"),
        ]
        for phone, role, name in demo:
            if phone not in self._by_phone:
                user = User(phone=phone, role=role, name=name)
                self._by_phone[phone] = user
                self._by_id[user.id] = user
        logger.info(
            "Seeded %d demo users (citizen/responder/cpoc_admin).", len(demo)
        )


# Module-level singleton
user_store = UserStore()
