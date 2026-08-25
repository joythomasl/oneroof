"""
ONE ROOF - Shared FastAPI Dependencies (Person 5B)

Role-based access control, kept deliberately small.

    @router.post("/x", dependencies=[Depends(require_role(UserRole.CPOC_ADMIN))])

or, when the handler needs the caller's identity:

    async def handler(user: User = Depends(require_cpoc_admin)):
        ...

Permission model (per team spec)
--------------------------------
  citizen     : request OTP, verify OTP, upload photo
  responder   : receive / view incident updates
  cpoc_admin  : approve, reject and flag incidents
"""

from __future__ import annotations

import logging
from typing import Callable, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.user import User, UserRole
from app.services.jwt_service import (
    ExpiredSignatureError,
    InvalidTokenError,
    jwt_service,
)
from app.services.user_store import user_store

logger = logging.getLogger(__name__)

# auto_error=False so we can return our own 401 body and so the
# "optional auth" dependency does not blow up on anonymous callers.
_bearer = HTTPBearer(auto_error=False, description="JWT from /auth/verify-otp")

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Not authenticated. Send 'Authorization: Bearer <token>'.",
    headers={"WWW-Authenticate": "Bearer"},
)


async def _user_from_credentials(
    credentials: Optional[HTTPAuthorizationCredentials],
) -> Optional[User]:
    """Decode a bearer token into a User, or None if absent/invalid."""
    if credentials is None or not credentials.credentials:
        return None

    if not jwt_service.available:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Token verification unavailable: PyJWT is not installed. "
                   "Run 'pip install -r requirements.txt'.",
        )

    try:
        payload = jwt_service.decode_token(credentials.credentials)
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    subject = payload.get("sub")
    if not subject:
        raise CREDENTIALS_ERROR

    try:
        user_id = UUID(str(subject))
    except (ValueError, TypeError):
        raise CREDENTIALS_ERROR

    user = await user_store.get_by_id(user_id)
    if user is None:
        # The user store is in-memory, so a server restart invalidates
        # previously-issued tokens. Say so rather than a bare 401.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists (the server may have restarted). "
                   "Log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[User]:
    """
    Return the caller if they sent a valid token, else None.

    Used by /upload/photo so an anonymous citizen can still report
    during an emergency, while an authenticated one gets attribution.
    """
    return await _user_from_credentials(credentials)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> User:
    """Return the caller, or raise 401."""
    user = await _user_from_credentials(credentials)
    if user is None:
        raise CREDENTIALS_ERROR
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is deactivated.",
        )
    return user


def require_role(*allowed: UserRole) -> Callable:
    """
    Build a dependency that admits only the listed roles.

        Depends(require_role(UserRole.CPOC_ADMIN))
        Depends(require_role(UserRole.RESPONDER, UserRole.CPOC_ADMIN))
    """
    allowed_set = set(allowed)

    async def _guard(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_set:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Requires role: {}. Your role: '{}'.".format(
                    ", ".join(sorted(r.value for r in allowed_set)), user.role.value
                ),
            )
        return user

    return _guard


# Ready-made guards for the common cases.
require_cpoc_admin = require_role(UserRole.CPOC_ADMIN)
require_responder = require_role(UserRole.RESPONDER, UserRole.CPOC_ADMIN)
require_any_user = get_current_user
