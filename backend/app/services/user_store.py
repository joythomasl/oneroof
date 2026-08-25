"""Database-backed user repository with a resilient in-memory fallback."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError

from app.database import SessionLocal
from app.models.database_records import UserRecord
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


class UserStore:
    def __init__(self) -> None:
        self._by_phone: Dict[str, User] = {}
        self._by_id: Dict[UUID, User] = {}
        self._database_available = True

    @property
    def backend(self) -> str:
        return "database" if self._database_available else "memory-fallback"

    @staticmethod
    def _domain(row: UserRecord) -> User:
        return User(
            id=row.id if isinstance(row.id, UUID) else UUID(str(row.id)),
            phone=row.phone,
            name=row.name,
            role=UserRole(row.role),
            is_active=row.is_active,
            created_at=row.created_at,
        )

    def _remember(self, user: User) -> User:
        self._by_phone[user.phone] = user
        self._by_id[user.id] = user
        return user

    def _database_failed(self, exc: Exception) -> None:
        self._database_available = False
        logger.warning("User database unavailable; using memory fallback: %s", exc)

    async def get_by_phone(self, phone: str) -> Optional[User]:
        try:
            with SessionLocal() as db:
                row = db.query(UserRecord).filter(UserRecord.phone == phone).one_or_none()
                self._database_available = True
                return self._remember(self._domain(row)) if row else None
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            return self._by_phone.get(phone)

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        try:
            with SessionLocal() as db:
                row = db.get(UserRecord, str(user_id))
                self._database_available = True
                return self._remember(self._domain(row)) if row else None
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            return self._by_id.get(user_id)

    async def list_users(self) -> List[User]:
        try:
            with SessionLocal() as db:
                users = [self._remember(self._domain(row)) for row in db.query(UserRecord).all()]
                self._database_available = True
                return users
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            return list(self._by_phone.values())

    async def get_or_create(
        self,
        phone: str,
        role: UserRole = UserRole.CITIZEN,
        name: Optional[str] = None,
    ) -> User:
        try:
            with SessionLocal() as db:
                row = db.query(UserRecord).filter(UserRecord.phone == phone).one_or_none()
                if row is None:
                    row = UserRecord(phone=phone, role=role.value, name=name)
                    db.add(row)
                    db.commit()
                    db.refresh(row)
                self._database_available = True
                return self._remember(self._domain(row))
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            existing = self._by_phone.get(phone)
            if existing is not None:
                return existing
            return self._remember(User(phone=phone, role=role, name=name))

    async def set_role(self, user_id: UUID, role: UserRole) -> Optional[User]:
        try:
            with SessionLocal() as db:
                row = db.get(UserRecord, str(user_id))
                if row is None:
                    return None
                row.role = role.value
                db.commit()
                db.refresh(row)
                self._database_available = True
                return self._remember(self._domain(row))
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            user = self._by_id.get(user_id)
            if user is not None:
                user.role = role
            return user

    async def set_active(self, user_id: UUID, is_active: bool) -> Optional[User]:
        try:
            with SessionLocal() as db:
                row = db.get(UserRecord, str(user_id))
                if row is None:
                    return None
                row.is_active = is_active
                db.commit()
                db.refresh(row)
                self._database_available = True
                return self._remember(self._domain(row))
        except SQLAlchemyError as exc:
            self._database_failed(exc)
            user = self._by_id.get(user_id)
            if user is not None:
                user.is_active = is_active
            return user

    async def seed_demo_users(self) -> None:
        demo = [
            ("9000000001", UserRole.CITIZEN, "Demo Citizen"),
            ("9000000002", UserRole.RESPONDER, "Demo Responder"),
            ("9000000003", UserRole.CPOC_ADMIN, "Demo CPOC Admin"),
        ]
        for phone, role, name in demo:
            await self.get_or_create(phone, role, name)


user_store = UserStore()
