from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded only from backend/.env or COPYSYNC_* variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        env_prefix="COPYSYNC_",
    )

    DATABASE_URL: str
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

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return one immutable settings instance per process."""
    return Settings()


# Kept for existing imports; the instance is created through the cached factory.
settings = get_settings()
