from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded directly from backend/.env or standard environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    DATABASE_URL: str

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def _normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v_stripped = v.strip()
            if v_stripped.startswith("postgres://"):
                return v_stripped.replace("postgres://", "postgresql+asyncpg://", 1)
            if v_stripped.startswith("postgresql://") and not v_stripped.startswith("postgresql+"):
                return v_stripped.replace("postgresql://", "postgresql+asyncpg://", 1)
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
