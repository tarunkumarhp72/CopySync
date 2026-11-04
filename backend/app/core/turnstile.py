import httpx
from fastapi import HTTPException, Request, status

from app.core.config import settings


async def verify_turnstile(request: Request, token: str | None, action: str) -> None:
    if not settings.TURNSTILE_ENABLED:
        return
    if not token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Human verification is required")
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", data={"secret": settings.TURNSTILE_SECRET_KEY, "response": token, "remoteip": request.client.host if request.client else ""})
        data = response.json() if response.is_success else {}
    except (httpx.HTTPError, ValueError):
        data = {}
    if not data.get("success") or data.get("action") != action or (settings.TURNSTILE_EXPECTED_HOSTNAME and data.get("hostname") != settings.TURNSTILE_EXPECTED_HOSTNAME):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Human verification failed")
