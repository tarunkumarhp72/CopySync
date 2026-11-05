import asyncio
import math
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.core.config import settings

LUA_SLIDING_WINDOW = """
local previous = tonumber(redis.call('GET', KEYS[1]) or '0')
local current = tonumber(redis.call('GET', KEYS[2]) or '0')
local weighted = current + previous * tonumber(ARGV[1])
if weighted + 1 > tonumber(ARGV[2]) then return 0 end
redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[3]))
redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3]))
return 1
"""


class SlidingWindowCounter:
    def __init__(self) -> None:
        self._counts: dict[tuple[str, int], int] = defaultdict(int)
        self._lock = asyncio.Lock()
        self._redis = None

    async def _redis_hit(self, key: str, limit: int, seconds: int, bucket: int, weight: float) -> bool:
        if self._redis is None:
            import redis.asyncio as redis
            self._redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
        result = await self._redis.eval(LUA_SLIDING_WINDOW, 2, f"ratelimit:{key}:{bucket - 1}", f"ratelimit:{key}:{bucket}", weight, limit, seconds * 2)
        return bool(result)

    async def hit(self, key: str, limit: int, seconds: int) -> bool:
        now = time.time(); bucket = math.floor(now / seconds); elapsed = now - bucket * seconds
        if settings.RATE_LIMIT_BACKEND == "redis":
            try:
                return await self._redis_hit(key, limit, seconds, bucket, (seconds - elapsed) / seconds)
            except Exception:
                import logging
                logging.getLogger("uvicorn.error").warning("Redis rate limit check failed, falling back to memory counter")
        async with self._lock:
            current = self._counts[(key, bucket)]; previous = self._counts[(key, bucket - 1)]
            weighted = current + previous * ((seconds - elapsed) / seconds)
            if weighted + 1 > limit: return False
            self._counts[(key, bucket)] += 1
            if len(self._counts) > 10000:
                self._counts = defaultdict(int, {item: count for item, count in self._counts.items() if item[1] >= bucket - 1})
            return True


limiter = SlidingWindowCounter()


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


async def enforce_rate_limit(request: Request, scope: str, limit: int, seconds: int, subject: str | None = None) -> None:
    keys = [f"{scope}:ip:{client_ip(request)}"]
    if subject: keys.append(f"{scope}:subject:{subject}")
    for key in keys:
        if not await limiter.hit(key, limit, seconds):
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded", headers={"Retry-After": str(seconds)})
