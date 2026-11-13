import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Literal, Optional

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_FILES = (".env", "backend/.env", str(_BACKEND_DIR / ".env"))


class Settings(BaseSettings):
    """Runtime configuration loaded directly from backend/.env or standard environment variables."""

    model_config = SettingsConfigDict(
        env_file=_ENV_FILES,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    SUPABASE_DATABASE_URL: Optional[str] = None
    DATABASE_URL: str = ""

    @model_validator(mode="before")
    @classmethod
    def _resolve_database_url(cls, data: Any) -> Any:
        supabase_url = os.getenv("SUPABASE_DATABASE_URL")
        if isinstance(data, dict):
            supabase_url = data.get("SUPABASE_DATABASE_URL") or supabase_url
            if supabase_url:
                data["DATABASE_URL"] = supabase_url
        return data

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("postgres://"):
                v_stripped = v_stripped.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v_stripped.startswith("postgresql://") and not v_stripped.startswith("postgresql+"):
                v_stripped = v_stripped.replace("postgresql://", "postgresql+asyncpg://", 1)
            if "sslmode=" in v_stripped:
                v_stripped = v_stripped.replace("sslmode=", "ssl=")
            return v_stripped
        return v

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str
    APP_JWT_SECRET: str
    FRONTEND_URL: str
    BACKEND_CORS_ORIGINS: str
    CLIPBOARD_SIZE_LIMIT_BYTES: int
    MAX_IMAGE_UPLOAD_BYTES: int
    UPLOAD_DIR: str
    STORAGE_BACKEND: Literal["supabase", "local"] = "supabase"
    SUPABASE_STORAGE_URL: str = "https://wxbiyvzyzxvipaupvfkc.supabase.co"
    SUPABASE_STORAGE_BUCKET: str = "CopySync-Bucket"
    SUPABASE_STORAGE_KEY: str = (
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4Yml5dnp5enh2aXBhdXB2ZmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM4MDkwNzIsImV4cCI6MjEwOTM4NTA3Mn0.Mq5ucgdWFJulxZqr6_uLVIiaGO3PEQAvcBtumSOvVjw"
    )
    MAX_NOTE_HTML_BYTES: int
    ACCOUNT_NOTE_LIMIT: int
    GUEST_NOTE_LIMIT: int
    IMAGES_PER_NOTE_LIMIT: int
    ACCOUNT_IMAGE_STORAGE_BYTES: int
    GUEST_IMAGE_STORAGE_BYTES: int
    TURNSTILE_ENABLED: bool
    TURNSTILE_SECRET_KEY: str
    TURNSTILE_EXPECTED_HOSTNAME: str
    RATE_LIMIT_BACKEND: Literal["memory", "redis"]
    GUEST_SESSION_TTL_SECONDS: int
    QR_TOKEN_TTL_SECONDS: int
    GUEST_RECONNECT_GRACE_SECONDS: int
    CONNECTION_MANAGER_BACKEND: Literal["memory", "redis"]
    REDIS_URL: str
    CRON_SECRET: str = "copysync_cron_secret_key_2026"
    APP_ENV: Literal["development", "production"]
    DEBUG: bool

    @field_validator("DEBUG", mode="before")
    @classmethod
    def _normalize_debug(cls, v: object) -> bool:
        if isinstance(v, str):
            return v.strip().lower() in {"true", "1", "yes", "t", "on", "dev", "development"}
        return bool(v)

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return one immutable settings instance per process."""
    return Settings()


# Kept for existing imports; the instance is created through the cached factory.
settings = get_settings()
