import secrets

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.common.exceptions import QuotaExceededError
from app.core.security import hash_qr_token
from app.modules.auth.models import User
from app.modules.devices.models import Device

MAX_USER_DEVICES = 5


async def get_or_create_device(db: AsyncSession, user: User, raw_token: str | None) -> tuple[Device, str | None]:
    if raw_token:
        result = await db.execute(select(Device).where(Device.token_hash == hash_qr_token(raw_token), Device.user_id == user.id))
        existing = result.scalar_one_or_none()
        if existing:
            return existing, None
    count = await db.scalar(select(func.count()).select_from(Device).where(Device.user_id == user.id))
    if count >= MAX_USER_DEVICES:
        raise QuotaExceededError(f"User device connection limit reached ({MAX_USER_DEVICES} max)")
    token = secrets.token_urlsafe(32)
    device = Device(user_id=user.id, token_hash=hash_qr_token(token))
    db.add(device); await db.commit(); await db.refresh(device)
    return device, token
