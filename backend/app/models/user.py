"""
ONE ROOF - User / Auth Schemas (Person 5B)

Covers the OTP-based phone authentication flow:

  1. Client sends phone number  -> OTPRequest
  2. Server replies             -> OTPResponse (never contains the OTP)
  3. Client sends phone + otp   -> OTPVerify
  4. Server replies             -> TokenResponse (JWT bearer token)

These are Pydantic DTOs, not ORM models. When Person 5A's database
layer lands, `User` below maps cleanly onto a SQLAlchemy table -
see app/services/user_store.py for the single integration point.

NOTE ON ROLES: the original scaffolding used
citizen/cpoc/agency_admin/super_admin. The team spec defines three
roles - citizen/responder/cpoc_admin - so those are now canonical.
Nothing outside 5B referenced the old names.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


# -- Enums ----------------------------------------------------

class UserRole(str, Enum):
    """Roles that govern endpoint access."""

    CITIZEN = "citizen"          # report incidents, upload photos
    RESPONDER = "responder"      # view/receive incident updates
    CPOC_ADMIN = "cpoc_admin"    # approve / reject / flag incidents


# Accepts 10-digit Indian numbers and E.164 (+91...).
PHONE_PATTERN = re.compile(r"^\+?[1-9]\d{9,14}$")


def normalise_phone(value: str) -> str:
    """
    Strip spaces, dashes and brackets so '+91 98765-43210' and
    '9876543210' do not become two different users.
    """
    cleaned = re.sub(r"[\s\-()]", "", (value or "").strip())
    if not PHONE_PATTERN.match(cleaned):
        raise ValueError(
            "Invalid phone number. Use 10-15 digits, optionally prefixed with '+'."
        )
    return cleaned


# -- OTP flow schemas -----------------------------------------

class OTPRequest(BaseModel):
    """Step 1 - user requests an OTP."""

    phone: str = Field(
        ...,
        min_length=10,
        max_length=16,
        description="Phone number, e.g. '9876543210' or '+919876543210'.",
        examples=["9876543210"],
    )

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, v: str) -> str:
        return normalise_phone(v)


class OTPVerify(BaseModel):
    """Step 2 - user submits the OTP code."""

    phone: str = Field(..., min_length=10, max_length=16, examples=["9876543210"])
    otp: str = Field(
        ...,
        min_length=4,
        max_length=8,
        description="The OTP shown in the server terminal (development).",
        examples=["123456"],
    )

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, v: str) -> str:
        return normalise_phone(v)

    @field_validator("otp")
    @classmethod
    def _validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit():
            raise ValueError("OTP must contain digits only.")
        return v


class OTPResponse(BaseModel):
    """
    Acknowledgement that an OTP was generated.

    Deliberately does NOT contain the OTP - it is printed to the
    server terminal in development and sent by SMS in production.
    """

    message: str = "OTP generated successfully"
    expires_in_seconds: int = 300


class TokenResponse(BaseModel):
    """Returned after successful OTP verification."""

    access_token: Optional[str] = Field(
        default=None,
        description="JWT bearer token. Null only if PyJWT is not installed.",
    )
    token_type: str = "bearer"
    user_id: UUID
    phone: str
    role: UserRole = UserRole.CITIZEN
    authenticated: bool = True
    message: str = "Login successful"
    warning: Optional[str] = Field(
        default=None,
        description="Set when authentication succeeded but no token could be issued.",
    )


# -- User -----------------------------------------------------

class User(BaseModel):
    """
    Canonical user record.

    Field names match the target database columns so that swapping the
    in-memory store for Person 5A's SQLAlchemy table is a one-file change.
    """

    id: UUID = Field(default_factory=uuid4)
    phone: str
    name: Optional[str] = None
    role: UserRole = UserRole.CITIZEN
    is_active: bool = True
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    """Public-safe representation of a user."""

    id: UUID
    phone: str
    name: Optional[str] = None
    role: UserRole = UserRole.CITIZEN
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class UserRoleUpdate(BaseModel):
    """Body for promoting a user (cpoc_admin only)."""

    role: UserRole
