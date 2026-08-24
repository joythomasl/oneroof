"""
ONE ROOF - Application Configuration

Centralises every environment variable the backend needs.
All secrets and tunables live here so that router / service
modules never read os.environ directly.

Owned by Person 5B. Person 5A may add their own fields (e.g.
database_url) - `extra="ignore"` means unknown env vars never
crash the app.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Reads values from environment variables (or a .env file).
    Pydantic-settings matches field names case-insensitively, so
    `minio_endpoint` is populated from `MINIO_ENDPOINT`.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Person 5A will add DATABASE_URL etc. to the shared .env.
        # Ignoring unknown keys keeps our config from rejecting theirs.
        extra="ignore",
    )

    # -- General ----------------------------------------------
    app_name: str = "One Roof API"
    environment: str = "development"
    debug: bool = False

    # -- Auth / OTP -------------------------------------------
    otp_expiry_seconds: int = 300  # 5 minutes
    otp_length: int = 6
    # When true (development), the generated OTP is printed to the
    # terminal. Never enable this in production.
    otp_print_to_console: bool = True

    # -- JWT --------------------------------------------------
    jwt_secret_key: str = "change_this_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440  # 24 hours

    # -- MinIO / S3 -------------------------------------------
    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "oneroof-uploads"
    minio_region: str = "us-east-1"
    # Presigned URLs are safe to hand to a browser; direct URLs
    # only work if the bucket is public.
    minio_use_presigned_urls: bool = True
    minio_presign_expiry_seconds: int = 3600

    # -- Redis ------------------------------------------------
    redis_url: str = "redis://localhost:6379/0"
    redis_incident_channel: str = "incident_updates"

    # -- Uploads ----------------------------------------------
    max_upload_size_mb: int = 10

    # -- Derived helpers --------------------------------------

    @property
    def is_development(self) -> bool:
        return self.environment.lower() in {"development", "dev", "local"}

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    # Backwards-compatible aliases. The original config used
    # `s3_*` names; keep them working so nothing that already
    # imports them breaks.
    @property
    def s3_endpoint_url(self) -> str:
        return self.minio_endpoint

    @property
    def s3_access_key(self) -> str:
        return self.minio_access_key

    @property
    def s3_secret_key(self) -> str:
        return self.minio_secret_key

    @property
    def s3_bucket_name(self) -> str:
        return self.minio_bucket

    @property
    def s3_region(self) -> str:
        return self.minio_region


@lru_cache()
def get_settings() -> Settings:
    """Return a cached Settings instance (reads env only once)."""
    return Settings()
