import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.database import get_db
from app.modules.notes import service
from app.dependencies.owner import NoteOwner, get_note_owner
from app.modules.notes.schemas import NoteCreate, NoteListItem, NoteRead, NoteUpdate
from app.core.rate_limit import enforce_rate_limit

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


@router.patch("/{note_id}", response_model=NoteRead)
async def update_user_note(note_id: uuid.UUID, data: NoteUpdate, request: Request, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> NoteRead:
    await enforce_rate_limit(request, "note-update", 60, 60, str(owner.id))
    return await service.update_note(db, owner, note_id, data)


@router.delete("/{note_id}", response_model=NoteRead)
async def delete_user_note(note_id: uuid.UUID, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> NoteRead:
    return await service.delete_note(db, owner, note_id)


@router.post("/{note_id}/restore", response_model=NoteRead)
async def restore_user_note(note_id: uuid.UUID, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)) -> NoteRead:
    return await service.restore_note(db, owner, note_id)
