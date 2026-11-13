from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import NotFoundError, SessionNotAvailableError
from app.core.security import generate_qr_token, guest_session_expires_at, hash_qr_token
from app.modules.guest_sessions.models import GuestSession, SessionStatus


async def create_session(db: AsyncSession, sender_connection_id: str | None = None) -> tuple[GuestSession, str]:
    token = generate_qr_token()
    session = GuestSession(token_hash=hash_qr_token(token), sender_connection_id=sender_connection_id, expires_at=guest_session_expires_at())
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session, token


async def claim_session(db: AsyncSession, token: str, receiver_connection_id: str) -> GuestSession:
    token_hash = hash_qr_token(token)
    async with db.begin():
        result = await db.execute(
            select(GuestSession).where(
                GuestSession.token_hash == token_hash,
                GuestSession.status.in_([SessionStatus.WAITING, SessionStatus.CONNECTED]),
                GuestSession.expires_at > datetime.now(timezone.utc),
            ).with_for_update()
        )
        session = result.scalar_one_or_none()
        if not session:
            raise SessionNotAvailableError()
        session.status = SessionStatus.CONNECTED
        session.receiver_connection_id = receiver_connection_id
        session.expires_at = guest_session_expires_at()
    await db.refresh(session)
    return session


async def get_valid_session(db: AsyncSession, session_id: str, token: str) -> GuestSession:
    result = await db.execute(select(GuestSession).where(GuestSession.id == session_id, GuestSession.token_hash == hash_qr_token(token)))
    session = result.scalar_one_or_none()
    if not session:
        raise NotFoundError("Guest session")
    if session.expires_at <= datetime.now(timezone.utc) or session.status in {SessionStatus.CLOSED, SessionStatus.EXPIRED}:
        raise SessionNotAvailableError("Session has expired or closed")
    return session


async def close_session(db: AsyncSession, session_id: str, token: str) -> GuestSession:
    async with db.begin():
        result = await db.execute(select(GuestSession).where(GuestSession.id == session_id, GuestSession.token_hash == hash_qr_token(token)).with_for_update())
        session = result.scalar_one_or_none()
        if not session:
            raise NotFoundError("Guest session")
        session.status = SessionStatus.CLOSED
    await db.refresh(session)
    return session


async def cleanup_stale_and_expired_data(db: AsyncSession) -> dict[str, int]:
    from datetime import timedelta
    from pathlib import Path
    from sqlalchemy import delete
    from app.core.config import settings
    from app.modules.guest_workspaces.models import GuestWorkspace
    from app.modules.notes.models import Note, NoteImage

    now = datetime.now(timezone.utc)
    stale_qr_cutoff = now - timedelta(seconds=settings.QR_TOKEN_TTL_SECONDS)

    # 1. Delete unclaimed QR sessions in WAITING status older than 5 minutes
    res_waiting = await db.execute(
        delete(GuestSession).where(
            GuestSession.status == SessionStatus.WAITING,
            GuestSession.created_at < stale_qr_cutoff,
        )
    )

    # 2. Delete expired or closed sessions
    res_expired = await db.execute(
        delete(GuestSession).where(
            (GuestSession.expires_at < now)
            | (GuestSession.status.in_([SessionStatus.CLOSED, SessionStatus.EXPIRED]))
        )
    )

    # 3. Clean up expired unclaimed guest workspaces and their images
    expired_workspaces = (
        await db.execute(
            select(GuestWorkspace.id).where(
                GuestWorkspace.claimed_by_user_id.is_(None),
                GuestWorkspace.expires_at < now,
            )
        )
    ).scalars().all()

    images_removed = 0
    workspaces_removed = 0
    if expired_workspaces:
        image_keys = (
            await db.execute(
                select(NoteImage.storage_key)
                .join(Note)
                .where(Note.guest_workspace_id.in_(expired_workspaces))
            )
        ).scalars().all()

        for key in image_keys:
            try:
                (Path(settings.UPLOAD_DIR).resolve() / key).unlink(missing_ok=True)
                images_removed += 1
            except Exception:
                pass

        res_ws = await db.execute(
            delete(GuestWorkspace).where(GuestWorkspace.id.in_(expired_workspaces))
        )
        workspaces_removed = res_ws.rowcount

    await db.commit()
    return {
        "stale_qr_waiting_sessions_purged": res_waiting.rowcount or 0,
        "expired_sessions_purged": res_expired.rowcount or 0,
        "expired_guest_workspaces_purged": workspaces_removed,
        "orphaned_images_removed": images_removed,
    }
