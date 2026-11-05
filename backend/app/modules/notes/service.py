import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import ConflictError, ForbiddenError, NotFoundError, QuotaExceededError
from app.core.config import settings
from app.dependencies.owner import NoteOwner
from app.modules.notes.models import Note, NoteImage, NoteRevision
from app.modules.notes.sanitizer import image_ids, sanitize_html
from app.modules.notes.schemas import NoteCreate, NoteUpdate


def _owner_filter(owner: NoteOwner):
    return Note.user_id == owner.id if owner.kind == "user" else Note.guest_workspace_id == owner.id


def _note_limit(owner: NoteOwner) -> int:
    return settings.ACCOUNT_NOTE_LIMIT if owner.kind == "user" else min(settings.GUEST_NOTE_LIMIT, 3)


async def _next_untitled_number(db: AsyncSession, owner: NoteOwner) -> int:
    result = await db.execute(select(Note.title).where(_owner_filter(owner), Note.title.like("Untitled %"), Note.is_deleted.is_(False)))
    numbers = {int(title.split("Untitled ", 1)[1]) for title in result.scalars() if title.removeprefix("Untitled ").isdigit()}
    number = 1
    while number in numbers:
        number += 1
    return number


async def create_note(db: AsyncSession, owner: NoteOwner, data: NoteCreate) -> Note:
    count = await db.scalar(select(func.count()).select_from(Note).where(_owner_filter(owner), Note.is_deleted.is_(False)))
    if count >= _note_limit(owner):
        raise QuotaExceededError(f"{owner.kind.title()} note limit reached")
    title = data.title.strip() if data.title else ""
    if not title:
        title = f"Untitled {await _next_untitled_number(db, owner)}"
    note = Note(title=title, content=sanitize_html(data.content or ""), version=1)
    if owner.kind == "user": note.user_id = owner.id
    else: note.guest_workspace_id = owner.id
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


async def list_notes(db: AsyncSession, owner: NoteOwner) -> list[Note]:
    result = await db.execute(select(Note).where(_owner_filter(owner), Note.is_deleted.is_(False)).order_by(Note.updated_at.desc()))
    return list(result.scalars().all())


async def get_note(db: AsyncSession, owner: NoteOwner, note_id: uuid.UUID) -> Note:
    result = await db.execute(select(Note).where(Note.id == note_id, Note.is_deleted.is_(False)))
    note = result.scalar_one_or_none()
    if not note: raise NotFoundError("Note")
    if (owner.kind == "user" and note.user_id != owner.id) or (owner.kind == "guest" and note.guest_workspace_id != owner.id): raise ForbiddenError()
    return note


async def _validate_note_images(db: AsyncSession, note: Note, content: str) -> None:
    ids = image_ids(content)
    if not ids: return
    parsed = [uuid.UUID(value) for value in ids]
    images = await db.execute(select(NoteImage.id).where(NoteImage.id.in_(parsed), NoteImage.note_id == note.id))
    if {str(value) for value in images.scalars()} != ids: raise ForbiddenError("Note content references an unavailable image")


async def update_note(db: AsyncSession, owner: NoteOwner, note_id: uuid.UUID, data: NoteUpdate) -> Note:
    result = await db.execute(select(Note).where(Note.id == note_id, Note.is_deleted.is_(False)).with_for_update())
    note = result.scalar_one_or_none()
    if not note: raise NotFoundError("Note")
    if (owner.kind == "user" and note.user_id != owner.id) or (owner.kind == "guest" and note.guest_workspace_id != owner.id): raise ForbiddenError()
    if note.version != data.expected_version: raise ConflictError(current_version=note.version)
    db.add(NoteRevision(note_id=note.id, version=note.version, content=note.content))
    if data.title is not None: note.title = data.title.strip() or note.title
    if data.content is not None:
        content = sanitize_html(data.content)
        await _validate_note_images(db, note, content)
        note.content = content
    note.version += 1
    await db.commit()
    await db.refresh(note)
    return note


async def delete_note(db: AsyncSession, owner: NoteOwner, note_id: uuid.UUID) -> Note:
    note = await get_note(db, owner, note_id); note.is_deleted = True
    await db.commit(); await db.refresh(note)
    return note


async def restore_note(db: AsyncSession, owner: NoteOwner, note_id: uuid.UUID) -> Note:
    result = await db.execute(select(Note).where(Note.id == note_id, Note.is_deleted.is_(True)).with_for_update())
    note = result.scalar_one_or_none()
    if not note or ((owner.kind == "user" and note.user_id != owner.id) or (owner.kind == "guest" and note.guest_workspace_id != owner.id)): raise NotFoundError("Note")
    note.is_deleted = False
    await db.commit(); await db.refresh(note)
    return note
