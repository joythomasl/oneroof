"""
ONE ROOF - Upload Router (Person 5B)

    POST /upload/photo          -> store an image in MinIO, return metadata
    GET  /upload/photos         -> list uploaded photo metadata
    GET  /upload/photos/{id}    -> one photo, with a fresh presigned URL
    POST /upload/photos/{id}/verify -> approve/reject a photo (cpoc_admin)

The photo binary goes to MinIO; only metadata is kept by the API.
"""

from __future__ import annotations

import logging
from tempfile import SpooledTemporaryFile
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)

from app.config import get_settings
from app.dependencies import get_optional_user, require_role
from app.models.events import EventType
from app.models.photo import ALLOWED_CONTENT_TYPES, Photo, PhotoOut, PhotoStatus
from app.models.user import User, UserRole
from app.services.photo_store import photo_store
from app.services.redis_service import redis_service
from app.services.s3_service import S3ServiceError, s3_service
from app.services.ws_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["Media"])

# Read the upload in 1 MB chunks so a hostile 5 GB body is rejected
# after ~10 MB instead of being buffered in full.
CHUNK_SIZE = 1024 * 1024


async def _read_with_limit(upload: UploadFile, limit_bytes: int) -> tuple:
    """
    Stream *upload* into a spooled temp file, aborting past *limit_bytes*.

    Returns ``(file_obj, size)`` positioned at byte 0.
    Raises HTTPException 413 if the limit is exceeded.
    """
    buffer = SpooledTemporaryFile(max_size=CHUNK_SIZE * 2)
    size = 0
    while True:
        chunk = await upload.read(CHUNK_SIZE)
        if not chunk:
            break
        size += len(chunk)
        if size > limit_bytes:
            buffer.close()
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File exceeds the {} MB limit.".format(
                    limit_bytes // (1024 * 1024)
                ),
            )
        buffer.write(chunk)
    buffer.seek(0)
    return buffer, size


# -- POST /upload/photo ---------------------------------------

@router.post(
    "/photo",
    response_model=PhotoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a photo",
    description=(
        "Accepts `multipart/form-data` with a `file` field.\n\n"
        "Allowed types: `image/jpeg`, `image/png`, `image/webp`. "
        "Maximum size: 10 MB (configurable via `MAX_UPLOAD_SIZE_MB`).\n\n"
        "`incident_id` and `caption` are optional form fields. Sending a "
        "bearer token is optional too - if present the upload is "
        "attributed to that user."
    ),
    responses={
        413: {"description": "File too large"},
        415: {"description": "Unsupported media type"},
        503: {"description": "Object storage unavailable"},
    },
)
async def upload_photo(
    file: UploadFile = File(..., description="The image to upload."),
    incident_id: Optional[UUID] = Form(
        default=None, description="Incident this photo belongs to (optional)."
    ),
    caption: Optional[str] = Form(
        default=None, max_length=280, description="Short description (optional)."
    ),
    user: Optional[User] = Depends(get_optional_user),
) -> PhotoOut:
    settings = get_settings()

    # -- Validate content type --------------------------------
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Unsupported file type '{}'. Allowed: {}.".format(
                file.content_type, ", ".join(sorted(ALLOWED_CONTENT_TYPES))
            ),
        )

    # -- Read with a hard size cap ----------------------------
    file_obj, size = await _read_with_limit(file, settings.max_upload_size_bytes)
    if size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    # -- Store the binary in MinIO ----------------------------
    try:
        result = await s3_service.upload_file_to_minio(
            file_obj=file_obj,
            filename=file.filename,
            content_type=file.content_type,
        )
    except S3ServiceError as exc:
        # Never return a URL for an object that was not stored.
        logger.error("Upload rejected: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Media storage is unavailable. Try again shortly.",
        )
    finally:
        file_obj.close()
        await file.close()

    # -- Record the metadata ----------------------------------
    photo = Photo(
        id=uuid4(),
        incident_id=incident_id,
        object_key=result["object_key"],
        content_type=result["content_type"],
        size_bytes=size,
        status=PhotoStatus.PENDING,
        caption=caption,
        uploaded_by=user.id if user else None,
    )
    await photo_store.add(photo)

    # -- Announce it ------------------------------------------
    payload = {
        "photo_id": str(photo.id),
        "object_key": photo.object_key,
        "status": photo.status.value,
        "uploaded_by": str(photo.uploaded_by) if photo.uploaded_by else None,
    }
    published = await redis_service.publish_event(
        EventType.PHOTO_UPLOADED.value,
        incident_id=str(incident_id) if incident_id else None,
        data=payload,
    )
    if not published:
        # Redis is down; still reach clients attached to this process.
        await ws_manager.broadcast_local(
            {
                "event": EventType.PHOTO_UPLOADED.value,
                "incident_id": str(incident_id) if incident_id else None,
                "data": payload,
                "delivered_via": "local",
            }
        )

    logger.info(
        "Photo %s uploaded (%d bytes) -> %s", photo.id, size, photo.object_key
    )

    return PhotoOut(
        id=photo.id,
        incident_id=photo.incident_id,
        object_key=photo.object_key,
        url=result["url"],
        content_type=photo.content_type,
        size_bytes=photo.size_bytes,
        status=photo.status,
        caption=photo.caption,
        uploaded_by=photo.uploaded_by,
        uploaded_at=photo.uploaded_at,
    )


# -- GET /upload/photos ---------------------------------------

@router.get(
    "/photos",
    response_model=List[PhotoOut],
    summary="List uploaded photos",
)
async def list_photos(
    incident_id: Optional[UUID] = Query(
        default=None, description="Filter to one incident."
    ),
) -> List[PhotoOut]:
    photos = await photo_store.list_all(incident_id=incident_id)
    out = []
    for photo in photos:
        url = await s3_service.get_presigned_url(photo.object_key)
        out.append(PhotoOut(url=url, **photo.model_dump()))
    return out


@router.get(
    "/photos/{photo_id}",
    response_model=PhotoOut,
    summary="Get one photo with a fresh presigned URL",
    responses={404: {"description": "Photo not found"}},
)
async def get_photo(photo_id: UUID) -> PhotoOut:
    photo = await photo_store.get(photo_id)
    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo {} not found.".format(photo_id),
        )
    url = await s3_service.get_presigned_url(photo.object_key)
    return PhotoOut(url=url, **photo.model_dump())


# -- POST /upload/photos/{id}/verify --------------------------

@router.post(
    "/photos/{photo_id}/verify",
    response_model=PhotoOut,
    summary="Approve or reject a photo (cpoc_admin only)",
    responses={
        403: {"description": "Requires cpoc_admin"},
        404: {"description": "Photo not found"},
    },
)
async def verify_photo(
    photo_id: UUID,
    approve: bool = Query(default=True, description="True approves, False rejects."),
    user: User = Depends(require_role(UserRole.CPOC_ADMIN)),
) -> PhotoOut:
    new_status = PhotoStatus.APPROVED if approve else PhotoStatus.REJECTED
    photo = await photo_store.set_status(photo_id, new_status, verified_by=user.id)
    if photo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Photo {} not found.".format(photo_id),
        )

    await redis_service.publish_event(
        EventType.PHOTO_VERIFIED.value,
        incident_id=str(photo.incident_id) if photo.incident_id else None,
        data={
            "photo_id": str(photo.id),
            "status": photo.status.value,
            "verified_by": str(user.id),
        },
    )

    url = await s3_service.get_presigned_url(photo.object_key)
    return PhotoOut(url=url, **photo.model_dump())
