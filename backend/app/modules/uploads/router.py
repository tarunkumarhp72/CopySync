import io
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import QuotaExceededError
from app.core.config import settings
from app.core.rate_limit import enforce_rate_limit
from app.dependencies.database import get_db
from app.dependencies.owner import NoteOwner, get_note_owner
from app.modules.notes.models import Note, NoteImage
from app.modules.notes.service import get_note
from app.modules.uploads.storage import storage_service

router = APIRouter(prefix="/uploads", tags=["uploads"])
FORMATS = {"JPEG": (".jpg", "image/jpeg"), "PNG": (".png", "image/png"), "WEBP": (".webp", "image/webp")}
LOSSY_IMAGE_QUALITY = 85  # Deliberately above the 70% quality floor.


def _storage_limit(owner: NoteOwner) -> int:
    return settings.ACCOUNT_IMAGE_STORAGE_BYTES if owner.kind == "user" else settings.GUEST_IMAGE_STORAGE_BYTES


async def _owner_storage(db: AsyncSession, owner: NoteOwner) -> int:
    owner_column = Note.user_id if owner.kind == "user" else Note.guest_workspace_id
    return (
        await db.scalar(
            select(func.coalesce(func.sum(NoteImage.size_bytes), 0))
            .select_from(NoteImage)
            .join(Note)
            .where(owner_column == owner.id)
        )
        or 0
    )


def _compress_image(payload: bytes, image_format: str) -> bytes:
    """Re-encode accepted images safely with pixel size limits; PNG remains lossless, lossy stays at quality 85."""
    source = Image.open(io.BytesIO(payload))
    source.load()
    if getattr(source, "is_animated", False):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Animated images are not supported",
        )
    output = io.BytesIO()
    if image_format == "JPEG":
        if source.mode not in {"RGB", "L"}:
            background = Image.new("RGB", source.size, "white")
            background.paste(source.convert("RGBA"), mask=source.convert("RGBA").getchannel("A"))
            source = background
        source.save(output, format="JPEG", quality=LOSSY_IMAGE_QUALITY, optimize=True, progressive=True)
    elif image_format == "WEBP":
        source.save(output, format="WEBP", quality=LOSSY_IMAGE_QUALITY, method=6)
    else:
        source.save(output, format="PNG", optimize=True)
    compressed = output.getvalue()
    return compressed if len(compressed) < len(payload) else payload


@router.post("/images", status_code=status.HTTP_201_CREATED)
async def upload_image(
    request: Request,
    note_id: uuid.UUID,
    image: UploadFile = File(...),
    owner: NoteOwner = Depends(get_note_owner),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    await enforce_rate_limit(request, "image-upload", 20, 60, str(owner.id))
    note = await get_note(db, owner, note_id)

    # 1. Read file with strict size enforcement
    payload = await image.read(settings.MAX_IMAGE_UPLOAD_BYTES + 1)
    if not payload or len(payload) > settings.MAX_IMAGE_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image is empty or exceeds the upload limit",
        )

    # 2. Verify image format
    try:
        parsed = Image.open(io.BytesIO(payload))
        parsed.verify()
        image_format = parsed.format
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only valid JPEG, PNG, or WEBP images can be uploaded",
        ) from exc

    format_details = FORMATS.get(image_format or "")
    if not format_details:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Supported image types: JPEG, PNG, WEBP",
        )

    # 3. Compress / sanitize image safely
    try:
        payload = _compress_image(payload, image_format)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Image could not be processed safely",
        ) from exc

    # 4. Check quota constraints
    images_count = await db.scalar(select(func.count()).select_from(NoteImage).where(NoteImage.note_id == note.id))
    if (images_count or 0) >= settings.IMAGES_PER_NOTE_LIMIT:
        raise QuotaExceededError("This note already has the maximum number of images")

    current_storage = await _owner_storage(db, owner)
    if current_storage + len(payload) > _storage_limit(owner):
        raise QuotaExceededError("Image storage quota reached")

    # 5. Stream chunks directly to Supabase Storage (or configured storage backend)
    image_id = uuid.uuid4()
    extension, content_type = format_details
    storage_key = f"{image_id}{extension}"

    stream_buf = io.BytesIO(payload)
    public_url = await storage_service.upload_stream(
        file_obj=stream_buf,
        storage_key=storage_key,
        content_type=content_type,
    )

    # 6. Record metadata in DB
    stored = NoteImage(
        id=image_id,
        note_id=note.id,
        storage_key=storage_key,
        content_type=content_type,
        size_bytes=len(payload),
    )
    db.add(stored)
    try:
        await db.commit()
    except Exception:
        await storage_service.delete_object(storage_key)
        await db.rollback()
        raise

    return {
        "id": str(image_id),
        "url": public_url,
    }


@router.get("/images/{image_id}")
async def get_image(
    image_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Redirect to Supabase public CDN URL or serve from local fallback."""
    result = await db.execute(select(NoteImage).where(NoteImage.id == image_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    if settings.STORAGE_BACKEND == "supabase":
        public_url = storage_service.get_public_url(image.storage_key)
        return RedirectResponse(url=public_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)

    # Local fallback
    path = storage_service.upload_dir / image.storage_key
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image file not found")
    return FileResponse(path, media_type=image.content_type)
