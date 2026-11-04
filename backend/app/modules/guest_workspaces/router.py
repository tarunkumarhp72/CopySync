import uuid

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.turnstile import verify_turnstile
from app.dependencies.database import get_db
from app.dependencies.owner import NoteOwner, get_note_owner
from app.modules.guest_workspaces import service as workspace_service
from app.modules.notes import service as notes_service
from app.modules.notes.schemas import NoteCreate, NoteListItem, NoteRead, NoteUpdate
from app.core.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/guest-workspace", tags=["guest workspace"])


class GuestWorkspaceCreate(BaseModel):
    turnstile_token: str | None = Field(default=None, max_length=4096)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_workspace(data: GuestWorkspaceCreate, request: Request, response: Response, db: AsyncSession = Depends(get_db)) -> dict:
    await enforce_rate_limit(request, "guest-workspace-create", 10, 300)
    await verify_turnstile(request, data.turnstile_token, "guest_workspace")
    workspace, token = await workspace_service.create_workspace(db)
    response.set_cookie("copysync_guest_workspace", token, httponly=True, secure=settings.APP_ENV == "production", samesite="lax", max_age=24 * 60 * 60)
    return {"id": str(workspace.id), "expires_at": workspace.expires_at}


def _guest(owner: NoteOwner) -> NoteOwner:
    if owner.kind != "guest":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Guest workspace required")
    return owner


@router.get("/notes", response_model=list[NoteListItem])
async def list_guest_notes(owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)):
    return await notes_service.list_notes(db, _guest(owner))


@router.post("/notes", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_guest_note(data: NoteCreate, request: Request, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)):
    await enforce_rate_limit(request, "note-create", 60, 60, str(owner.id))
    return await notes_service.create_note(db, _guest(owner), data)


@router.get("/notes/{note_id}", response_model=NoteRead)
async def get_guest_note(note_id: uuid.UUID, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)):
    return await notes_service.get_note(db, _guest(owner), note_id)


@router.patch("/notes/{note_id}", response_model=NoteRead)
async def update_guest_note(note_id: uuid.UUID, data: NoteUpdate, request: Request, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)):
    await enforce_rate_limit(request, "note-update", 60, 60, str(owner.id))
    return await notes_service.update_note(db, _guest(owner), note_id, data)


@router.delete("/notes/{note_id}", response_model=NoteRead)
async def delete_guest_note(note_id: uuid.UUID, owner: NoteOwner = Depends(get_note_owner), db: AsyncSession = Depends(get_db)):
    return await notes_service.delete_note(db, _guest(owner), note_id)
