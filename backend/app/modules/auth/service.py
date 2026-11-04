from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.modules.auth.models import User


async def get_or_create_user(
    db: AsyncSession,
    google_id: str,
    email: str,
    name: str | None = None,
) -> User:
    """
    Upsert a local user record keyed on the Google subject ID.
    Returns the existing or newly created User ORM object.
    """
    result = await db.execute(
        select(User).where(User.google_id == google_id)
    )
    user = result.scalar_one_or_none()
    if user:
        return user

    user = User(google_id=google_id, email=email, name=name)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

