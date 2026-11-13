import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.guest_sessions.models import SessionStatus


class GuestSessionCreate(BaseModel):
    sender_connection_id: str | None = Field(default=None, max_length=128)
    turnstile_token: str | None = Field(default=None, max_length=4096)


class GuestSessionCreated(BaseModel):
    id: uuid.UUID
    token: str
    status: SessionStatus
    expires_at: datetime


class GuestClaim(BaseModel):
    token: str = Field(min_length=20, max_length=512)
    receiver_connection_id: str = Field(min_length=1, max_length=128)


class GuestClose(BaseModel):
    token: str | None = Field(default=None, min_length=20, max_length=512)


class GuestSessionRead(BaseModel):
    id: uuid.UUID
    status: SessionStatus
    expires_at: datetime

    model_config = {"from_attributes": True}
