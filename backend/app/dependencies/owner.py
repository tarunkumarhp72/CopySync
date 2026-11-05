from dataclasses import dataclass
from typing import Literal
import uuid

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_app_token
from app.dependencies.database import get_db
from app.modules.auth.models import User
from app.modules.guest_workspaces.models import GuestWorkspace
from app.modules.guest_workspaces.service import get_workspace

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class NoteOwner:
    kind: Literal["user", "guest"]
    id: object
    record: User | GuestWorkspace


async def get_note_owner(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> NoteOwner:
    # 1. Try User Bearer token or session cookie
    session_token = credentials.credentials if credentials else request.cookies.get("copysync_session")
    if session_token:
        try:
            payload = verify_app_token(session_token)
            user_id = uuid.UUID(str(payload.get("sub")))
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user and payload.get("sv") == user.session_version:
                return NoteOwner("user", user.id, user)
        except Exception:
            pass

    # 2. Try Guest Workspace token from header or cookie
    guest_token = (
        request.headers.get("X-Guest-Workspace-Token")
        or request.cookies.get("copysync_guest_workspace")
    )
    if guest_token:
        workspace = await get_workspace(db, guest_token)
        if workspace:
            return NoteOwner("guest", workspace.id, workspace)

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication or an active guest workspace is required",
    )
