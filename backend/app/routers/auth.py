"""
ONE ROOF - Authentication Router (Person 5B)

OTP-over-phone login.

    POST /auth/send-otp     -> generates a code, stores it in Redis with
                               a TTL, prints it to the terminal in dev
    POST /auth/verify-otp   -> validates the code, creates/finds the user,
                               returns a JWT
    GET  /auth/me           -> the caller's profile
    POST /auth/users/{id}/role -> promote a user (cpoc_admin only)

The original in-memory OTP flow is preserved as an automatic fallback
inside redis_service, so this endpoint keeps working when Redis is
down - it just logs that it did so.
"""

from __future__ import annotations

import logging
import secrets
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.config import get_settings
from app.dependencies import get_current_user, require_role
from app.models.user import (
    OTPRequest,
    OTPResponse,
    OTPVerify,
    TokenResponse,
    User,
    UserOut,
    UserRole,
    UserRoleUpdate,
)
from app.services.jwt_service import jwt_service
from app.services.redis_service import redis_service
from app.services.user_store import user_store

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _generate_otp(length: int) -> str:
    """
    Cryptographically secure numeric OTP.

    `secrets` rather than `random` - the original used random.randint,
    which is seeded predictably and unsuitable for auth codes.
    """
    upper = 10 ** length
    lower = 10 ** (length - 1)
    return str(secrets.randbelow(upper - lower) + lower)


# -- POST /auth/send-otp --------------------------------------

@router.post(
    "/send-otp",
    response_model=OTPResponse,
    status_code=status.HTTP_200_OK,
    summary="Request a login OTP",
    description=(
        "Generates a 6-digit OTP and stores it with a 5-minute TTL.\n\n"
        "The OTP is **never** returned in the response. In development "
        "it is printed to the uvicorn terminal; in production it would "
        "go out over SMS."
    ),
)
async def send_otp(data: OTPRequest) -> OTPResponse:
    settings = get_settings()
    otp = _generate_otp(settings.otp_length)

    backend = await redis_service.store_otp(
        data.phone, otp, settings.otp_expiry_seconds
    )

    if settings.otp_print_to_console and settings.is_development:
        # Deliberately noisy - this is how the team logs in locally.
        print("\n" + "=" * 46)
        print("  OTP for {}: {}".format(data.phone, otp))
        print("  expires in {}s   (stored in: {})".format(
            settings.otp_expiry_seconds, backend))
        print("=" * 46 + "\n", flush=True)

    if backend == "memory":
        logger.warning(
            "OTP for %s stored in process memory - Redis is unavailable. "
            "It will be lost on restart.",
            data.phone,
        )

    return OTPResponse(
        message="OTP generated successfully",
        expires_in_seconds=settings.otp_expiry_seconds,
    )


# -- POST /auth/verify-otp ------------------------------------

@router.post(
    "/verify-otp",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify an OTP and receive a JWT",
    responses={
        400: {"description": "OTP not found or expired"},
        401: {"description": "Invalid OTP"},
        403: {"description": "Account deactivated"},
    },
)
async def verify_otp(data: OTPVerify) -> TokenResponse:
    """
    Validate the OTP, create the user on first login, and issue a token.

    The OTP is deleted immediately on success, so it cannot be replayed.
    """
    stored = await redis_service.get_otp(data.phone)

    if stored is None:
        # Covers both "never requested" and "TTL expired" - Redis
        # cannot distinguish them, and neither should the error, since
        # doing so would leak whether a number has an active session.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP not found or expired. Request a new one.",
        )

    if not secrets.compare_digest(str(stored), str(data.otp)):
        # Constant-time compare avoids leaking the code via timing.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid OTP.",
        )

    # Single-use: burn it before doing anything else.
    await redis_service.delete_otp(data.phone)

    user = await user_store.get_or_create(data.phone)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is deactivated.",
        )

    token = jwt_service.create_access_token(
        user_id=user.id, phone=user.phone, role=user.role.value
    )

    warning = None
    if token is None:
        warning = (
            "Authenticated, but no token was issued because PyJWT is not "
            "installed. Run 'pip install -r requirements.txt'."
        )
        logger.warning("Issued a tokenless login for %s (PyJWT missing).", user.phone)

    logger.info("User %s (%s) logged in.", user.id, user.phone)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        phone=user.phone,
        role=user.role,
        authenticated=True,
        message="Login successful",
        warning=warning,
    )


# -- GET /auth/me ---------------------------------------------

@router.get(
    "/me",
    response_model=UserOut,
    summary="Get the authenticated user's profile",
)
async def read_me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user, from_attributes=True)


# -- Admin: list and promote users ----------------------------

@router.get(
    "/users",
    response_model=List[UserOut],
    summary="List users (cpoc_admin only)",
)
async def list_users(
    _: User = Depends(require_role(UserRole.CPOC_ADMIN)),
) -> List[UserOut]:
    users = await user_store.list_users()
    return [UserOut.model_validate(u, from_attributes=True) for u in users]


@router.post(
    "/users/{user_id}/role",
    response_model=UserOut,
    summary="Change a user's role (cpoc_admin only)",
    responses={404: {"description": "User not found"}},
)
async def set_user_role(
    user_id: UUID,
    body: UserRoleUpdate,
    _: User = Depends(require_role(UserRole.CPOC_ADMIN)),
) -> UserOut:
    updated = await user_store.set_role(user_id, body.role)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User {} not found.".format(user_id),
        )
    return UserOut.model_validate(updated, from_attributes=True)
