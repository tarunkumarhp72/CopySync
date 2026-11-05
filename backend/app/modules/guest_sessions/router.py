import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.guest_sessions.models import GuestSession, SessionStatus

from app.dependencies.database import get_db
from app.modules.guest_sessions import service
from app.modules.guest_sessions.schemas import GuestClaim, GuestClose, GuestSessionCreate, GuestSessionCreated, GuestSessionRead
from app.core.rate_limit import enforce_rate_limit
from app.core.turnstile import verify_turnstile

router = APIRouter(prefix="/guest", tags=["guest"])


@router.post("/session", response_model=GuestSessionCreated, status_code=status.HTTP_201_CREATED)
async def create_guest_session(data: GuestSessionCreate, request: Request, db: AsyncSession = Depends(get_db)) -> GuestSessionCreated:
    await enforce_rate_limit(request, "guest-session-create", 10, 300)
    await verify_turnstile(request, data.turnstile_token, "guest_session")
    session, token = await service.create_session(db, data.sender_connection_id)
    return GuestSessionCreated(id=session.id, token=token, status=session.status, expires_at=session.expires_at)


@router.post("/claim", response_model=GuestSessionRead)
async def claim_guest_session(data: GuestClaim, db: AsyncSession = Depends(get_db)) -> GuestSessionRead:
    return await service.claim_session(db, data.token, data.receiver_connection_id)


@router.delete("/session/{session_id}", response_model=GuestSessionRead)
async def close_guest_session(session_id: uuid.UUID, data: GuestClose, db: AsyncSession = Depends(get_db)) -> GuestSessionRead:
    session = await service.close_session(db, str(session_id), data.token)
    from app.websocket.memory_manager import manager
    await manager.broadcast(
        f"guest:{session_id}",
        {"type": "session.closed", "session_id": str(session_id), "by": "api"}
    )
    return session


@router.get("/session/{session_id}")
async def get_guest_session_status(session_id: uuid.UUID, token: str = "", db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GuestSession).where(GuestSession.id == str(session_id)))
    session = result.scalar_one_or_none()
    if not session:
        return {"id": str(session_id), "status": "closed"}
    return {
        "id": str(session.id),
        "status": session.status,
        "expires_at": session.expires_at.isoformat() if session.expires_at else None,
    }
