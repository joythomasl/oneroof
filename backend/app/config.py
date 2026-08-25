"""Central configuration for the combined ONE ROOF backend."""

from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Read configuration from environment variables or ``.env``."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "One Roof API"
    environment: str = "development"
    debug: bool = Field(default=False, validation_alias="ONEROOF_DEBUG")
    auto_create_schema: bool = False
    allow_ephemeral_stores: bool = False
    api_prefix: str = "/api/v1"
    cors_origins: str = "*"

    DATABASE_URL: str = "postgresql://oneroof:oneroof@localhost:5432/oneroof"
    DEDUPE_RADIUS_METERS: float = 500.0
    DEDUPE_TIME_WINDOW_MINUTES: int = 30
    CLOSURE_PHOTO_MAX_DISTANCE_METERS: float = 250.0

    otp_expiry_seconds: int = 300
    otp_length: int = 6
    otp_print_to_console: bool = True
    jwt_secret_key: str = "change_this_in_production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    minio_endpoint: str = "http://localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "oneroof-uploads"
    minio_region: str = "us-east-1"
    minio_use_presigned_urls: bool = True
    minio_presign_expiry_seconds: int = 3600

    redis_url: str = "redis://localhost:6379/0"
    redis_incident_channel: str = "incident_updates"
    max_upload_size_mb: int = 10

    # Supabase project metadata. Database access continues through DATABASE_URL
    # so hosted and self-hosted projects use the same repositories.
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_service_role_key: Optional[str] = None

    @property
    def is_development(self) -> bool:
        return self.environment.lower() in {"development", "dev", "local"}

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    @property
    def supabase_configured(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)

    @property
    def cors_origin_list(self) -> list[str]:
        """Return the comma-separated browser origins accepted by CORS."""
        origins = [origin.strip() for origin in self.cors_origins.split(",")]
        return [origin for origin in origins if origin] or ["*"]

    @property
    def APP_NAME(self) -> str:
        return self.app_name

    @property
    def DEBUG(self) -> bool:
        return self.debug

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
    return Settings()
