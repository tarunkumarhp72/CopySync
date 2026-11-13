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
from app.core.config import settings
from app.core.redis_client import cache_get_json, cache_set_json

router = APIRouter(prefix="/guest", tags=["guest"])


@router.post("/session", response_model=GuestSessionCreated, status_code=status.HTTP_201_CREATED)
async def create_guest_session(data: GuestSessionCreate, request: Request, db: AsyncSession = Depends(get_db)) -> GuestSessionCreated:
    await enforce_rate_limit(request, "guest-session-create", 10, 300)
    await verify_turnstile(request, data.turnstile_token, "guest_session")
    session, token = await service.create_session(db, data.sender_connection_id)
    await cache_set_json(
        f"guest:session:{session.id}:status",
        {
            "id": str(session.id),
            "status": session.status,
            "expires_at": session.expires_at.isoformat() if session.expires_at else None,
        },
        ex_seconds=settings.GUEST_SESSION_TTL_SECONDS,
    )
    return GuestSessionCreated(id=session.id, token=token, status=session.status, expires_at=session.expires_at)


@router.post("/claim", response_model=GuestSessionRead)
async def claim_guest_session(data: GuestClaim, db: AsyncSession = Depends(get_db)) -> GuestSessionRead:
    res = await service.claim_session(db, data.token, data.receiver_connection_id)
    await cache_set_json(
        f"guest:session:{res.id}:status",
        {
            "id": str(res.id),
            "status": res.status,
            "expires_at": res.expires_at.isoformat() if res.expires_at else None,
        },
        ex_seconds=settings.GUEST_SESSION_TTL_SECONDS,
    )
    return res


@router.delete("/session/{session_id}", response_model=GuestSessionRead)
@router.post("/session/{session_id}/close", response_model=GuestSessionRead)
async def close_guest_session(
    session_id: uuid.UUID,
    data: GuestClose | None = None,
    token: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> GuestSessionRead:
    resolved_token = (data.token if data and data.token else None) or token
    if not resolved_token:
        # Fallback to empty token string if none provided
        resolved_token = ""
    try:
        session = await service.close_session(db, str(session_id), resolved_token)
    except Exception:
        # If session already closed or deleted, fetch or synthesize response
        result = await db.execute(select(GuestSession).where(GuestSession.id == str(session_id)))
        session = result.scalar_one_or_none()
        if not session:
            from datetime import datetime, timezone
            await cache_set_json(
                f"guest:session:{session_id}:status",
                {"id": str(session_id), "status": SessionStatus.CLOSED, "expires_at": None},
                ex_seconds=120,
            )
            return GuestSessionRead(
                id=session_id,
                status=SessionStatus.CLOSED,
                expires_at=datetime.now(timezone.utc),
            )

    await cache_set_json(
        f"guest:session:{session_id}:status",
        {"id": str(session_id), "status": SessionStatus.CLOSED, "expires_at": None},
        ex_seconds=120,
    )

    from app.websocket.memory_manager import manager
    await manager.broadcast(
        f"guest:{session_id}",
        {"type": "session.closed", "session_id": str(session_id), "by": "api"}
    )
    return session


@router.get("/session/{session_id}")
async def get_guest_session_status(session_id: uuid.UUID, token: str = "", db: AsyncSession = Depends(get_db)):
    cache_key = f"guest:session:{session_id}:status"
    cached = await cache_get_json(cache_key)
    if cached:
        return cached

    result = await db.execute(select(GuestSession).where(GuestSession.id == str(session_id)))
    session = result.scalar_one_or_none()
    if not session:
        data = {"id": str(session_id), "status": "closed", "expires_at": None}
        await cache_set_json(cache_key, data, ex_seconds=120)
        return data

    data = {
        "id": str(session.id),
        "status": session.status,
        "expires_at": session.expires_at.isoformat() if session.expires_at else None,
    }
    await cache_set_json(cache_key, data, ex_seconds=120)
    return data
