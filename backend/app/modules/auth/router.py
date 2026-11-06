import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, RedirectResponse, Response
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import issue_app_token
from app.dependencies.auth import get_current_user
from app.dependencies.database import get_db
from app.modules.auth.models import User
from app.modules.auth.schemas import GoogleCredential, UserRead
from app.modules.auth.service import get_or_create_user
from app.modules.guest_workspaces.service import claim_workspace
from app.modules.devices.service import get_or_create_device
from app.websocket.presence_manager import presence_manager

router = APIRouter(prefix="/auth", tags=["auth"])


def _oauth_is_configured() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET and settings.APP_JWT_SECRET)


@router.get("/google/client")
async def google_client() -> dict[str, str]:
    """The OAuth client ID is public by design; the client secret is never returned."""
    if not _oauth_is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth is not configured")
    return {"client_id": settings.GOOGLE_CLIENT_ID}


async def _establish_session(request: Request, db: AsyncSession, claims: dict, response: Response) -> tuple[Response, str, User]:
    if claims.get("iss") not in {"accounts.google.com", "https://accounts.google.com"} or not claims.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google account is not eligible for sign-in")
    user = await get_or_create_user(db, google_id=claims["sub"], email=claims["email"], name=claims.get("name"))
    
    # Active parallel device limit check (Option A: Max 5 active devices for account)
    client_device_id = (
        request.headers.get("X-Device-Id")
        or request.cookies.get("copysync_device_id")
        or request.cookies.get("copysync_device")
    )
    if client_device_id:
        allowed, _, msg = await presence_manager.can_connect("user", str(user.id), client_device_id)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=msg,
            )

    _, new_device_token = await get_or_create_device(db, user, request.cookies.get("copysync_device"))
    guest_workspace_token = (
        request.headers.get("X-Guest-Workspace-Token")
        or request.cookies.get("copysync_guest_workspace")
    )
    if guest_workspace_token:
        await claim_workspace(db, guest_workspace_token, user.id)
    response.delete_cookie("copysync_guest_workspace", samesite="none", secure=True)
    
    app_token = issue_app_token(str(user.id), user.email, user.session_version)
    # Using SameSite=None; Secure=True so cross-origin fetch from frontend (vercel.app -> fastapicloud.dev) works cleanly
    response.set_cookie(
        "copysync_session",
        app_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
    )
    if new_device_token:
        response.set_cookie(
            "copysync_device",
            new_device_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=60 * 60 * 24 * 365,
        )
    return response, app_token, user


@router.get("/google/login")
async def google_login() -> RedirectResponse:
    if not _oauth_is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth is not configured")
    state = secrets.token_urlsafe(32)
    query = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "prompt": "select_account",
    })
    response = RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{query}", status_code=status.HTTP_302_FOUND)
    response.set_cookie("copysync_oauth_state", state, httponly=True, secure=True, samesite="none", max_age=600)
    return response


@router.get("/google/callback")
async def google_callback(code: str, state: str, request: Request, db: AsyncSession = Depends(get_db)) -> RedirectResponse:
    expected_state = request.cookies.get("copysync_oauth_state")
    if not expected_state or not secrets.compare_digest(expected_state, state):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    async with httpx.AsyncClient(timeout=10) as client:
        token_response = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
    if token_response.is_error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google authorization exchange failed")
    raw_id_token = token_response.json().get("id_token")
    if not raw_id_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google did not return an ID token")
    try:
        claims = id_token.verify_oauth2_token(raw_id_token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google identity verification failed") from exc
    
    # Establish session and issue token
    dummy_resp = Response()
    _, app_token, _ = await _establish_session(request, db, claims, dummy_resp)

    # Pass token in redirect URL so cross-site frontends can store it in localStorage
    response = RedirectResponse(f"{settings.FRONTEND_URL}/notes?token={app_token}", status_code=status.HTTP_302_FOUND)
    response.delete_cookie("copysync_oauth_state", samesite="none", secure=True)
    response.set_cookie(
        "copysync_session",
        app_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
    )
    return response


@router.post("/google/credential")
async def google_credential(data: GoogleCredential, request: Request, db: AsyncSession = Depends(get_db)) -> Response:
    """Exchange a Google Identity Services ID token for a CopySync HttpOnly session + JSON Bearer token."""
    if not _oauth_is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Google OAuth is not configured")
    try:
        claims = id_token.verify_oauth2_token(data.credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google identity verification failed") from exc

    dummy_resp = Response()
    _, app_token, user = await _establish_session(request, db, claims, dummy_resp)

    response = JSONResponse(
        content={
            "token": app_token,
            "user": {"id": str(user.id), "email": user.email, "name": user.name},
        }
    )
    response.set_cookie(
        "copysync_session",
        app_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 24 * 7,
    )
    return response


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Response:
    """Revoke every active CopySync JWT for this user and remove the browser cookie."""
    current_user.session_version += 1
    await db.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    response.delete_cookie("copysync_session", samesite="none", secure=True)
    return response


@router.get("/me", response_model=UserRead, summary="Current local user")
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
