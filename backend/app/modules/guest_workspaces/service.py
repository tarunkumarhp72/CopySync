import secrets
import uuid
from datetime import datetime, timedelta, timezone

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_qr_token
from app.modules.guest_workspaces.models import GuestWorkspace
from app.modules.notes.models import Note, NoteImage
from app.core.config import settings

GUEST_WORKSPACE_TTL = timedelta(hours=24)


async def create_workspace(db: AsyncSession) -> tuple[GuestWorkspace, str]:
    raw_token = secrets.token_urlsafe(32)
    workspace = GuestWorkspace(token_hash=hash_qr_token(raw_token), expires_at=datetime.now(timezone.utc) + GUEST_WORKSPACE_TTL)
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)
    return workspace, raw_token


async def get_workspace(db: AsyncSession, raw_token: str) -> GuestWorkspace | None:
    result = await db.execute(select(GuestWorkspace).where(GuestWorkspace.token_hash == hash_qr_token(raw_token), GuestWorkspace.claimed_by_user_id.is_(None), GuestWorkspace.expires_at > datetime.now(timezone.utc)))
    return result.scalar_one_or_none()


async def delete_workspace(db: AsyncSession, raw_token: str) -> bool:
    workspace = await get_workspace(db, raw_token)
    if not workspace:
        return False
    images = await db.execute(
        select(NoteImage.storage_key).join(Note).where(Note.guest_workspace_id == workspace.id)
    )
    paths = [Path(settings.UPLOAD_DIR).resolve() / key for key in images.scalars()]
    await db.delete(workspace)
    await db.commit()
    for path in paths:
        path.unlink(missing_ok=True)
    return True


async def claim_workspace(db: AsyncSession, raw_token: str, user_id: uuid.UUID) -> GuestWorkspace | None:
    result = await db.execute(select(GuestWorkspace).where(GuestWorkspace.token_hash == hash_qr_token(raw_token), GuestWorkspace.claimed_by_user_id.is_(None), GuestWorkspace.expires_at > datetime.now(timezone.utc)).with_for_update())
    workspace = result.scalar_one_or_none()
    if not workspace:
        return None
    workspace.claimed_by_user_id = user_id
    workspace.claimed_at = datetime.now(timezone.utc)
    from app.modules.notes.models import Note
    notes = await db.execute(select(Note).where(Note.guest_workspace_id == workspace.id).with_for_update())
    for note in notes.scalars():
        note.guest_workspace_id = None
        note.user_id = user_id
    await db.commit()
    return workspace


async def cleanup_expired_workspaces(db: AsyncSession) -> int:
    """Delete unclaimed expired workspaces and their filesystem image objects."""
    expired = await db.execute(
        select(GuestWorkspace).where(
            GuestWorkspace.claimed_by_user_id.is_(None),
            GuestWorkspace.expires_at <= datetime.now(timezone.utc),
        )
    )
    workspaces = list(expired.scalars())
    if not workspaces:
        return 0
    workspace_ids = [workspace.id for workspace in workspaces]
    images = await db.execute(
        select(NoteImage.storage_key).join(Note).where(Note.guest_workspace_id.in_(workspace_ids))
    )
    paths = [Path(settings.UPLOAD_DIR).resolve() / key for key in images.scalars()]
    for workspace in workspaces:
        await db.delete(workspace)
    await db.commit()
    for path in paths:
        path.unlink(missing_ok=True)
    return len(workspaces)
