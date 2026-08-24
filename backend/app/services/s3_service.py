"""
ONE ROOF - S3 / MinIO Media Storage (Person 5B)

Thin wrapper around boto3 pointed at MinIO's S3-compatible API.

boto3 is synchronous, so every network call is pushed onto a worker
thread with `asyncio.to_thread`. Blocking the event loop inside an
async endpoint would stall every other request, including WebSockets.

Usage
-----
    from app.services.s3_service import s3_service

    result = await s3_service.upload_file_to_minio(
        file_obj=upload.file, filename="photo.png", content_type="image/png"
    )
    result["object_key"]  -> "photos/<uuid>.png"
    result["url"]         -> presigned GET URL
"""

from __future__ import annotations

import asyncio
import logging
import mimetypes
import uuid
from typing import BinaryIO, Optional

import boto3
from botocore.config import Config as BotoConfig
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings

logger = logging.getLogger(__name__)

# Extension used when we cannot infer one from the filename.
DEFAULT_EXTENSION = "bin"

# MIME type -> canonical extension. mimetypes.guess_extension picks
# ".jpe" for image/jpeg on some platforms, which looks broken in MinIO.
CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
}


class S3ServiceError(RuntimeError):
    """Raised when the object store cannot satisfy a request."""


class S3Service:
    """Manages a single boto3 S3 client pointed at MinIO."""

    def __init__(self) -> None:
        self._client = None
        self._bucket_ready: bool = False
        self._last_error: Optional[str] = None

    # -- Client -----------------------------------------------

    @property
    def client(self):
        """Lazily build the boto3 client on first access."""
        if self._client is None:
            settings = get_settings()
            self._client = boto3.client(
                "s3",
                endpoint_url=settings.minio_endpoint,
                aws_access_key_id=settings.minio_access_key,
                aws_secret_access_key=settings.minio_secret_key,
                region_name=settings.minio_region,
                config=BotoConfig(
                    signature_version="s3v4",
                    # Fail fast instead of hanging a request for minutes
                    # when MinIO is down.
                    connect_timeout=5,
                    read_timeout=10,
                    retries={"max_attempts": 2, "mode": "standard"},
                ),
            )
        return self._client

    @property
    def bucket_ready(self) -> bool:
        return self._bucket_ready

    @property
    def last_error(self) -> Optional[str]:
        return self._last_error

    # -- Bucket management ------------------------------------

    def _ensure_bucket_exists_sync(self) -> bool:
        """Blocking bucket check/create. Call via ensure_bucket()."""
        settings = get_settings()
        bucket = settings.minio_bucket
        try:
            self.client.head_bucket(Bucket=bucket)
            logger.info("MinIO bucket '%s' is available.", bucket)
            self._bucket_ready = True
            self._last_error = None
            return True
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            # 404 / NoSuchBucket -> create it. Anything else is real.
            if code in {"404", "NoSuchBucket", "NotFound"}:
                try:
                    self.client.create_bucket(Bucket=bucket)
                    logger.info("Created MinIO bucket '%s'.", bucket)
                    self._bucket_ready = True
                    self._last_error = None
                    return True
                except (ClientError, BotoCoreError) as create_exc:
                    self._bucket_ready = False
                    self._last_error = str(create_exc)
                    logger.error("Could not create bucket '%s': %s", bucket, create_exc)
                    return False
            self._bucket_ready = False
            self._last_error = str(exc)
            logger.error("Bucket check failed for '%s': %s", bucket, exc)
            return False
        except BotoCoreError as exc:
            # Connection refused, DNS failure, timeout.
            self._bucket_ready = False
            self._last_error = str(exc)
            logger.warning(
                "MinIO unreachable at %s (%s). Uploads will fail until it is up.",
                settings.minio_endpoint,
                exc,
            )
            return False

    async def ensure_bucket(self) -> bool:
        """
        Check the bucket exists, creating it if needed.

        Returns True only if the bucket is genuinely usable. Called on
        app startup and again lazily before the first upload.
        """
        return await asyncio.to_thread(self._ensure_bucket_exists_sync)

    # -- Helpers ----------------------------------------------

    @staticmethod
    def build_object_key(filename: Optional[str], content_type: Optional[str]) -> str:
        """
        Produce a collision-proof object key: ``photos/<uuid>.<ext>``.

        The extension comes from the declared content type first (a
        client can lie in a filename more easily than in a validated
        MIME type), then the filename, then a safe default.
        """
        extension = CONTENT_TYPE_EXTENSIONS.get(content_type or "")
        if not extension and filename and "." in filename:
            candidate = filename.rsplit(".", 1)[-1].lower()
            # Guard against absurd or hostile "extensions".
            if candidate.isalnum() and 1 <= len(candidate) <= 5:
                extension = candidate
        if not extension and content_type:
            guessed = mimetypes.guess_extension(content_type)
            if guessed:
                extension = guessed.lstrip(".")
        return "photos/{}.{}".format(uuid.uuid4(), extension or DEFAULT_EXTENSION)

    @staticmethod
    def detect_content_type(filename: Optional[str], declared: Optional[str]) -> str:
        """Trust the declared type if present, else infer from filename."""
        if declared:
            return declared
        if filename:
            guessed, _ = mimetypes.guess_type(filename)
            if guessed:
                return guessed
        return "application/octet-stream"

    def _public_url(self, object_key: str) -> str:
        settings = get_settings()
        return "{}/{}/{}".format(
            settings.minio_endpoint.rstrip("/"), settings.minio_bucket, object_key
        )

    def _presigned_url_sync(self, object_key: str, expires_in: int) -> str:
        settings = get_settings()
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.minio_bucket, "Key": object_key},
            ExpiresIn=expires_in,
        )

    async def get_presigned_url(
        self, object_key: str, expires_in: Optional[int] = None
    ) -> str:
        """Time-limited GET URL for a private object."""
        settings = get_settings()
        expiry = expires_in or settings.minio_presign_expiry_seconds
        try:
            return await asyncio.to_thread(self._presigned_url_sync, object_key, expiry)
        except (ClientError, BotoCoreError) as exc:
            logger.warning("Presign failed for %s (%s); returning direct URL.",
                           object_key, exc)
            return self._public_url(object_key)

    # -- Upload -----------------------------------------------

    def _upload_sync(
        self, file_obj: BinaryIO, object_key: str, content_type: str
    ) -> None:
        settings = get_settings()
        self.client.upload_fileobj(
            file_obj,
            settings.minio_bucket,
            object_key,
            ExtraArgs={"ContentType": content_type},
        )

    async def upload_file_to_minio(
        self,
        file_obj: BinaryIO,
        filename: Optional[str] = None,
        content_type: Optional[str] = None,
        object_key: Optional[str] = None,
    ) -> dict:
        """
        Upload *file_obj* to MinIO and return its key and URL.

        Returns
        -------
        dict
            ``{"object_key": str, "url": str, "content_type": str}``

        Raises
        ------
        S3ServiceError
            If the bucket is unusable or the upload fails. The caller
            turns this into a 503 - we never return a URL for an object
            that was not actually stored.
        """
        settings = get_settings()
        resolved_type = self.detect_content_type(filename, content_type)
        key = object_key or self.build_object_key(filename, resolved_type)

        # Self-heal: the bucket may have been created after startup, or
        # MinIO may have come up late.
        if not self._bucket_ready:
            await self.ensure_bucket()
        if not self._bucket_ready:
            raise S3ServiceError(
                "Object storage is unavailable ({}).".format(
                    self._last_error or "bucket not ready"
                )
            )

        try:
            await asyncio.to_thread(self._upload_sync, file_obj, key, resolved_type)
        except (ClientError, BotoCoreError) as exc:
            self._last_error = str(exc)
            logger.error("Upload failed for %s: %s", key, exc)
            raise S3ServiceError("Failed to store the file.") from exc

        if settings.minio_use_presigned_urls:
            url = await self.get_presigned_url(key)
        else:
            url = self._public_url(key)

        logger.info("Uploaded %s -> %s", key, settings.minio_bucket)
        return {"object_key": key, "url": url, "content_type": resolved_type}

    async def object_exists(self, object_key: str) -> bool:
        """True if the object is really in the bucket. Used by tests."""
        settings = get_settings()

        def _head() -> bool:
            try:
                self.client.head_object(Bucket=settings.minio_bucket, Key=object_key)
                return True
            except (ClientError, BotoCoreError):
                return False

        return await asyncio.to_thread(_head)

    # -- Backwards-compatible alias ---------------------------
    # The original scaffolding exposed upload_file(file_obj, object_key,
    # content_type) -> str. Keep that signature working.

    async def upload_file(
        self,
        file_obj: BinaryIO,
        object_key: str,
        content_type: Optional[str] = None,
    ) -> str:
        result = await self.upload_file_to_minio(
            file_obj=file_obj,
            filename=object_key,
            content_type=content_type,
            object_key=object_key,
        )
        return result["url"]


# Module-level singleton
s3_service = S3Service()


async def upload_file_to_minio(
    file_obj: BinaryIO,
    filename: Optional[str] = None,
    content_type: Optional[str] = None,
) -> dict:
    """Module-level shortcut matching the name used in the spec."""
    return await s3_service.upload_file_to_minio(file_obj, filename, content_type)
