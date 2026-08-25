"""
ONE ROOF - JWT Issuing / Verification (Person 5B)

Wraps PyJWT so the rest of the app never touches the library directly.

PyJWT is imported defensively. If it is not installed the API still
boots and OTP login still succeeds - it just returns `access_token:
null` plus a warning, and /health reports `jwt: "unavailable"`. That
keeps the pre-existing auth flow working for anyone who has not run
`pip install -r requirements.txt` yet.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from app.config import get_settings

logger = logging.getLogger(__name__)

try:
    import jwt as _pyjwt
    from jwt import ExpiredSignatureError, InvalidTokenError

    JWT_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on install state
    _pyjwt = None
    JWT_AVAILABLE = False

    class ExpiredSignatureError(Exception):
        """Placeholder so callers can catch it unconditionally."""

    class InvalidTokenError(Exception):
        """Placeholder so callers can catch it unconditionally."""

    logger.warning(
        "PyJWT is not installed - tokens will not be issued. "
        "Run: pip install -r requirements.txt"
    )

DEFAULT_SECRET = "change_this_in_production"


class JWTService:
    """Creates and validates bearer tokens."""

    @property
    def available(self) -> bool:
        return JWT_AVAILABLE

    def warn_if_insecure(self) -> None:
        """Shout at startup if a production deploy is using the default secret."""
        settings = get_settings()
        if not settings.is_development and settings.jwt_secret_key == DEFAULT_SECRET:
            logger.error(
                "JWT_SECRET_KEY is still the default value while ENVIRONMENT=%s. "
                "Set a real secret: python -c \"import secrets; "
                "print(secrets.token_urlsafe(48))\"",
                settings.environment,
            )

    def create_access_token(
        self,
        user_id: UUID | str,
        phone: str,
        role: str,
        expires_minutes: Optional[int] = None,
    ) -> Optional[str]:
        """
        Issue a signed JWT. Returns None if PyJWT is unavailable.

        Claims: sub (user id), phone, role, iat, exp.
        """
        if not JWT_AVAILABLE:
            return None

        settings = get_settings()
        now = datetime.now(timezone.utc)
        expiry = now + timedelta(
            minutes=expires_minutes or settings.jwt_expire_minutes
        )
        payload = {
            "sub": str(user_id),
            "phone": phone,
            "role": role,
            "iat": now,
            "exp": expiry,
        }
        return _pyjwt.encode(
            payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        )

    def decode_token(self, token: str) -> dict:
        """
        Validate and decode a token.

        Raises
        ------
        ExpiredSignatureError, InvalidTokenError
            Caught by the auth dependency and turned into a 401.
        RuntimeError
            If PyJWT is not installed.
        """
        if not JWT_AVAILABLE:
            raise RuntimeError("PyJWT is not installed; cannot verify tokens.")

        settings = get_settings()
        return _pyjwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )


# Module-level singleton
jwt_service = JWTService()
