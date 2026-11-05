import asyncio
from contextlib import asynccontextmanager, suppress
from pathlib import Path
import sys

# Ensure backend root is always on sys.path even when uvicorn/fastapi loads app/main.py directly
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging
from app.modules.auth.router import router as auth_router
from app.modules.notes.router import router as notes_router
from app.modules.guest_sessions.router import router as guest_router
from app.websocket.handlers import router as websocket_router
from app.modules.uploads.router import router as uploads_router
from app.modules.guest_workspaces.router import router as guest_workspace_router
from app.modules.cron.router import router as cron_router


async def _periodic_db_cleanup():
    import logging
    logger = logging.getLogger("uvicorn.error")
    from app.core.database import AsyncSessionLocal
    from app.modules.guest_sessions.service import cleanup_stale_and_expired_data

    while True:
        try:
            await asyncio.sleep(3600)  # runs once every hour
            async with AsyncSessionLocal() as db:
                purged = await cleanup_stale_and_expired_data(db)
                logger.info("Automatic periodic cleanup completed: %s", purged)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning("Automatic cleanup encountered error: %s", exc)


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    cleanup_task = asyncio.create_task(_periodic_db_cleanup())
    yield
    cleanup_task.cancel()
    with suppress(asyncio.CancelledError):
        await cleanup_task


app = FastAPI(title="CopySync API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logging.getLogger("uvicorn.error").exception("Unhandled error on %s: %s", request.url.path, exc)
    response = JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
    origin = request.headers.get("origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response
app.include_router(auth_router)
app.include_router(notes_router)
app.include_router(guest_router)
app.include_router(websocket_router)
app.include_router(uploads_router)
app.include_router(guest_workspace_router)
app.include_router(cron_router)


@app.get("/", tags=["health"])
async def root() -> dict[str, str]:
    return {"status": "ok", "app": "CopySync API"}


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/redis", tags=["health"])
async def health_redis() -> dict:
    import redis.asyncio as aioredis
    try:
        client = aioredis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=3.0)
        pong = await client.ping()
        await client.aclose()
        masked_host = settings.REDIS_URL.split("@")[-1] if "@" in settings.REDIS_URL else "configured"
        return {"status": "connected", "ping": pong, "host": masked_host}
    except Exception as exc:
        masked_host = settings.REDIS_URL.split("@")[-1] if "@" in settings.REDIS_URL else "configured"
        return {"status": "error", "error": str(exc), "host": masked_host}
