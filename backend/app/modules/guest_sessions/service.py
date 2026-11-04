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
        result = await db.execute(select(GuestSession).where(GuestSession.token_hash == token_hash, GuestSession.status == SessionStatus.WAITING, GuestSession.expires_at > datetime.now(timezone.utc)).with_for_update())
        session = result.scalar_one_or_none()
        if not session:
            raise SessionNotAvailableError()
        session.status = SessionStatus.CONNECTED
        session.receiver_connection_id = receiver_connection_id
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
