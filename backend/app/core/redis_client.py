import json
import logging
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

_redis_client: Optional[aioredis.Redis] = None


def get_redis() -> Optional[aioredis.Redis]:
    """Returns singleton Redis client instance or None if not configured/failed."""
    global _redis_client
    if not settings.REDIS_URL:
        return None
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                max_connections=30,
            )
        except Exception as e:
            logger.warning(f"Could not connect to Redis: {e}")
            return None
    return _redis_client


async def cache_get(key: str) -> Optional[str]:
    """Safely get string value from Redis."""
    try:
        r = get_redis()
        if r:
            return await r.get(key)
    except Exception as e:
        logger.debug(f"Redis get failed for {key}: {e}")
    return None


async def cache_set(key: str, value: str, ex_seconds: int = 60) -> bool:
    """Safely set string value in Redis with expiration."""
    try:
        r = get_redis()
        if r:
            await r.set(key, value, ex=ex_seconds)
            return True
    except Exception as e:
        logger.debug(f"Redis set failed for {key}: {e}")
    return False


async def cache_delete(key: str) -> bool:
    """Safely delete key from Redis."""
    try:
        r = get_redis()
        if r:
            await r.delete(key)
            return True
    except Exception as e:
        logger.debug(f"Redis delete failed for {key}: {e}")
    return False


async def cache_get_json(key: str) -> Optional[dict]:
    """Safely get and parse JSON from Redis."""
    val = await cache_get(key)
    if val:
        try:
            return json.loads(val)
        except Exception:
            return None
    return None


async def cache_set_json(key: str, data: dict, ex_seconds: int = 60) -> bool:
    """Safely store dictionary as JSON in Redis."""
    try:
        payload = json.dumps(data)
        return await cache_set(key, payload, ex_seconds)
    except Exception:
        return False
