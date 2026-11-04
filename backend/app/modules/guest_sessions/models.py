import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class SessionStatus(str, enum.Enum):
    WAITING = "WAITING"
    CONNECTED = "CONNECTED"
    DISCONNECTED = "DISCONNECTED"
    CLOSED = "CLOSED"
    EXPIRED = "EXPIRED"


class GuestSession(Base):
    __tablename__ = "guest_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    sender_connection_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    receiver_connection_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus, name="guest_session_status"), default=SessionStatus.WAITING, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
