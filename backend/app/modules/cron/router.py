from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.dependencies.database import get_db
from app.modules.guest_sessions import service as guest_session_service

router = APIRouter(prefix="/cron", tags=["maintenance & cron"])


@router.post("/cleanup", status_code=status.HTTP_200_OK)
async def trigger_cleanup(
    authorization: str | None = Header(default=None),
    secret: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Secure endpoint for periodic maintenance and garbage collection.

    Can be triggered via:
    - Header: Authorization: Bearer <CRON_SECRET>
    - Query parameter: ?secret=<CRON_SECRET>
    """
    provided_secret = None
    if authorization and authorization.lower().startswith("bearer "):
        provided_secret = authorization.split(" ", 1)[1].strip()
    elif secret:
        provided_secret = secret.strip()

    if not provided_secret or provided_secret != settings.CRON_SECRET:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing cron maintenance secret.",
        )

    results = await guest_session_service.cleanup_stale_and_expired_data(db)
    return {
        "status": "success",
        "action": "cleanup_stale_and_expired_data",
        "purged": results,
    }
