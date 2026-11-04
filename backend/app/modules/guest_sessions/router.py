import uuid

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

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
    return await service.close_session(db, str(session_id), data.token)
