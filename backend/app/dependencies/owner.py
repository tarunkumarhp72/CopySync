from dataclasses import dataclass
from typing import Literal
import uuid

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_app_token
from app.dependencies.database import get_db
from app.modules.auth.models import User
from app.modules.guest_workspaces.models import GuestWorkspace
from app.modules.guest_workspaces.service import get_workspace


@dataclass(frozen=True)
class NoteOwner:
    kind: Literal["user", "guest"]
    id: object
    record: User | GuestWorkspace


async def get_note_owner(request: Request, db: AsyncSession = Depends(get_db)) -> NoteOwner:
    session_token = request.cookies.get("copysync_session")
    if session_token:
        try:
            payload = verify_app_token(session_token)
            user_id = uuid.UUID(str(payload.get("sub")))
        except (ValueError, TypeError):
            payload = {}
            user_id = None
        result = await db.execute(select(User).where(User.id == user_id)) if user_id else None
        user = result.scalar_one_or_none() if result else None
        if user and payload.get("sv") == user.session_version:
            return NoteOwner("user", user.id, user)
    guest_token = request.cookies.get("copysync_guest_workspace")
    if guest_token:
        workspace = await get_workspace(db, guest_token)
        if workspace:
            return NoteOwner("guest", workspace.id, workspace)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication or an active guest workspace is required")
