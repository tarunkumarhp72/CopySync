from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.modules.guest_sessions.service import get_valid_session
from app.websocket.memory_manager import manager
from app.core.rate_limit import limiter

router = APIRouter()


@router.websocket("/ws/guest/{session_id}")
async def guest_websocket(websocket: WebSocket, session_id: str, token: str, role: str) -> None:
    if role not in {"sender", "receiver"}:
        await websocket.close(code=1008)
        return
    ip = websocket.client.host if websocket.client else "unknown"
    if not await limiter.hit(f"ws:ip:{ip}", 10, 300) or not await limiter.hit(f"ws:session:{session_id}", 10, 300):
        await websocket.close(code=1013)
        return
    async with AsyncSessionLocal() as db:
        try:
            session = await get_valid_session(db, session_id, token)
            if role == "receiver" and not session.receiver_connection_id:
                await websocket.close(code=1008)
                return
        except Exception:
            await websocket.close(code=1008)
            return
    channel = f"guest:{session_id}"
    if len(manager.channels.get(channel, set())) >= 3:
        await websocket.close(code=1013, reason="Maximum 3 guest connections reached")
        return
    if manager.role_in_use(channel, role):
        await websocket.close(code=1013)
        return
    websocket.state.guest_role = role
    await manager.connect(channel, websocket)
    await manager.broadcast(channel, {"type": "session.connected", "session_id": session_id, "role": role, "timestamp": datetime.now(timezone.utc).isoformat()})
    try:
        while True:
            event = await websocket.receive_json()
            if event.get("type") not in {"clipboard.updated", "clipboard.cleared", "ping", "session.closed"}:
                await websocket.send_json({"type": "error", "message": "Unsupported event"})
                continue
            if event["type"] == "session.closed":
                break
            if event["type"] == "clipboard.updated":
                if not await limiter.hit(f"clipboard:{session_id}", 30, 60):
                    await websocket.close(code=1013)
                    return
                content = event.get("content", "")
                if not isinstance(content, str) or len(content.encode()) > settings.CLIPBOARD_SIZE_LIMIT_BYTES:
                    await websocket.send_json({"type": "error", "message": "Clipboard payload is too large"})
                    continue
            if event["type"] == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            await manager.broadcast(channel, {**event, "timestamp": datetime.now(timezone.utc).isoformat()}, exclude=websocket)
    except Exception:
        pass
    finally:
        manager.disconnect(channel, websocket)
        await manager.broadcast(channel, {"type": "session.closed", "session_id": session_id, "by": role, "timestamp": datetime.now(timezone.utc).isoformat()})
