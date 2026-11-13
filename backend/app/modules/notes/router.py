import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.database import get_db
from app.modules.notes import service
from app.dependencies.owner import NoteOwner, get_note_owner
from app.modules.notes.schemas import NoteCreate, NoteListItem, NoteRead, NoteUpdate, NoteVersion
from app.core.rate_limit import enforce_rate_limit
from app.core.redis_client import cache_get_json, cache_set_json, cache_delete

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=list[NoteListItem])
async def list_user_notes(owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> list[NoteListItem]:
    return await service.list_notes(db, owner)


@router.post("", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_user_note(data: NoteCreate, request: Request, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> NoteRead:
    await enforce_rate_limit(request, "note-create", 60, 60, str(owner.id))
    return await service.create_note(db, owner, data)


@router.get("/{note_id}", response_model=NoteRead)
async def read_user_note(note_id: uuid.UUID, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> NoteRead:
    return await service.get_note(db, owner, note_id)


@router.get("/{note_id}/version", response_model=NoteVersion)
async def read_user_note_version(note_id: uuid.UUID, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> NoteVersion:
    cache_key = f"note:ver:{note_id}"
    cached = await cache_get_json(cache_key)
    if cached:
        try:
            from datetime import datetime
            return NoteVersion(
                id=uuid.UUID(cached["id"]),
                version=int(cached["version"]),
                updated_at=datetime.fromisoformat(cached["updated_at"]),
            )
        except Exception:
            pass

    note = await service.get_note(db, owner, note_id)
    ver = NoteVersion(id=note.id, version=note.version, updated_at=note.updated_at)
    await cache_set_json(
        cache_key,
        {"id": str(ver.id), "version": ver.version, "updated_at": ver.updated_at.isoformat()},
        ex_seconds=90,
    )
    return ver


@router.patch("/{note_id}", response_model=NoteRead)
async def update_user_note(note_id: uuid.UUID, data: NoteUpdate, request: Request, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> NoteRead:
    await enforce_rate_limit(request, "note-update", 60, 60, str(owner.id))
    note = await service.update_note(db, owner, note_id, data)
    # Immediately update Redis version cache so pollers get instant update
    await cache_set_json(
        f"note:ver:{note.id}",
        {"id": str(note.id), "version": note.version, "updated_at": note.updated_at.isoformat()},
        ex_seconds=90,
    )
    return note


@router.delete("/{note_id}", response_model=NoteRead)
async def delete_user_note(note_id: uuid.UUID, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> NoteRead:
    res = await service.delete_note(db, owner, note_id)
    await cache_delete(f"note:ver:{note_id}")
    return res


@router.post("/{note_id}/restore", response_model=NoteRead)
async def restore_user_note(note_id: uuid.UUID, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> NoteRead:
    return await service.restore_note(db, owner, note_id)
