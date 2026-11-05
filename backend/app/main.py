import asyncio
from contextlib import asynccontextmanager, suppress
from pathlib import Path
import sys

# Ensure backend root is always on sys.path even when uvicorn/fastapi loads app/main.py directly
_BACKEND_ROOT = Path(__file__).resolve().parent.parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.modules.auth.router import router as auth_router
from app.modules.notes.router import router as notes_router
from app.modules.guest_sessions.router import router as guest_router
from app.websocket.handlers import router as websocket_router
from app.modules.uploads.router import router as uploads_router
from app.modules.guest_workspaces.router import router as guest_workspace_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    setup_logging()
    yield


app = FastAPI(title="CopySync API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
app.include_router(auth_router)
app.include_router(notes_router)
app.include_router(guest_router)
app.include_router(websocket_router)
app.include_router(uploads_router)
app.include_router(guest_workspace_router)


@app.get("/", tags=["health"])
async def root() -> dict[str, str]:
    return {"status": "ok", "app": "CopySync API"}


@app.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
