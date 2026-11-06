import secrets

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_qr_token
from app.modules.auth.models import User
from app.modules.devices.models import Device

MAX_USER_DEVICES = 5


async def get_or_create_device(db: AsyncSession, user: User, raw_token: str | None) -> tuple[Device, str | None]:
    if raw_token:
        result = await db.execute(
            select(Device).where(
                Device.token_hash == hash_qr_token(raw_token),
                Device.user_id == user.id,
            )
        )
        existing = result.scalar_one_or_none()
        if existing:
            return existing, None

    # Count existing devices for this user
    count = await db.scalar(select(func.count()).select_from(Device).where(Device.user_id == user.id)) or 0
    if count >= MAX_USER_DEVICES:
        # LRU Eviction: Remove the oldest least-recently-used device(s) so active count remains <= MAX_USER_DEVICES
        excess = (count - MAX_USER_DEVICES) + 1
        oldest_devices = (
            await db.scalars(
                select(Device)
                .where(Device.user_id == user.id)
                .order_by(Device.last_seen_at.asc())
                .limit(excess)
            )
        ).all()
        for old in oldest_devices:
            await db.delete(old)
        await db.flush()

    token = secrets.token_urlsafe(32)
    device = Device(user_id=user.id, token_hash=hash_qr_token(token))
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device, token
