import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import HTTPException, status

from app.core.config import settings


# ── CopySync session token helpers ─────────────────────────────────────────

def issue_app_token(user_id: str, email: str, session_version: int) -> str:
    if not settings.APP_JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured — set COPYSYNC_APP_JWT_SECRET in .env",
        )
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    return jwt.encode({"sub": user_id, "email": email, "sv": session_version, "exp": expires_at, "iss": "copysync"}, settings.APP_JWT_SECRET, algorithm="HS256")


def verify_app_token(token: str) -> dict:
    if not settings.APP_JWT_SECRET:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Auth is not configured")
    try:
        payload = jwt.decode(
            token,
            settings.APP_JWT_SECRET,
            algorithms=["HS256"],
            issuer="copysync",
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── QR Token helpers ──────────────────────────────────────────────────────

def generate_qr_token() -> str:
    """Generate a cryptographically secure URL-safe random token (256 bits)."""
    return secrets.token_urlsafe(32)


def hash_qr_token(raw_token: str) -> str:
    """SHA-256 hash the raw token — this is what gets stored in the DB."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def qr_token_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=settings.QR_TOKEN_TTL_SECONDS)


def guest_session_expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=settings.GUEST_SESSION_TTL_SECONDS)

