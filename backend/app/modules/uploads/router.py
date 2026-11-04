import io
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import ForbiddenError, QuotaExceededError
from app.core.config import settings
from app.dependencies.database import get_db
from app.dependencies.owner import NoteOwner, get_note_owner
from app.modules.notes.models import Note, NoteImage
from app.modules.notes.service import get_note
from app.core.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/uploads", tags=["uploads"])
FORMATS = {"JPEG": (".jpg", "image/jpeg"), "PNG": (".png", "image/png"), "WEBP": (".webp", "image/webp")}
LOSSY_IMAGE_QUALITY = 85  # Deliberately above the 70% quality floor.


def _upload_dir() -> Path:
    directory = Path(settings.UPLOAD_DIR).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def _storage_limit(owner: NoteOwner) -> int:
    return settings.ACCOUNT_IMAGE_STORAGE_BYTES if owner.kind == "user" else settings.GUEST_IMAGE_STORAGE_BYTES


async def _owner_storage(db: AsyncSession, owner: NoteOwner) -> int:
    owner_column = Note.user_id if owner.kind == "user" else Note.guest_workspace_id
    return await db.scalar(select(func.coalesce(func.sum(NoteImage.size_bytes), 0)).select_from(NoteImage).join(Note).where(owner_column == owner.id)) or 0


def _compress_image(payload: bytes, image_format: str) -> bytes:
    """Re-encode accepted images safely; PNG remains lossless and lossy formats stay at quality 85."""
    source = Image.open(io.BytesIO(payload))
    source.load()
    if getattr(source, "is_animated", False):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Animated images are not supported")
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
    payload = await image.read(settings.MAX_IMAGE_UPLOAD_BYTES + 1)
    if not payload or len(payload) > settings.MAX_IMAGE_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image is empty or exceeds the upload limit")
    try:
        parsed = Image.open(io.BytesIO(payload)); parsed.verify(); image_format = parsed.format
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Only valid JPEG, PNG, or WEBP images can be uploaded") from exc
    format_details = FORMATS.get(image_format or "")
    if not format_details:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Supported image types: JPEG, PNG, WEBP")
    try:
        payload = _compress_image(payload, image_format)
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Image could not be processed safely") from exc
    images = await db.scalar(select(func.count()).select_from(NoteImage).where(NoteImage.note_id == note.id))
    if images >= settings.IMAGES_PER_NOTE_LIMIT:
        raise QuotaExceededError("This note already has the maximum number of images")
    if await _owner_storage(db, owner) + len(payload) > _storage_limit(owner):
        raise QuotaExceededError("Image storage quota reached")
    image_id = uuid.uuid4(); extension, content_type = format_details
    stored = NoteImage(id=image_id, note_id=note.id, storage_key=f"{image_id}{extension}", content_type=content_type, size_bytes=len(payload))
    db.add(stored)
    path = _upload_dir() / stored.storage_key
    try:
        path.write_bytes(payload)
        await db.commit()
    except Exception:
        path.unlink(missing_ok=True)
        await db.rollback()
        raise
    return {"id": str(image_id), "url": str(request.base_url).rstrip("/") + f"/uploads/images/{image_id}"}


@router.get("/images/{image_id}")
async def get_image(image_id: uuid.UUID, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> FileResponse:
    result = await db.execute(select(NoteImage).where(NoteImage.id == image_id))
    image = result.scalar_one_or_none()
    if not image:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")
    await get_note(db, owner, image.note_id)
    path = _upload_dir() / image.storage_key
    if not path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image file not found")
    return FileResponse(path, media_type=image.content_type)
