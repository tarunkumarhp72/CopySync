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
    if not await limiter.hit(f"ws:ip:{ip}", 60, 300) or not await limiter.hit(f"ws:session:{session_id}", 60, 300):
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
    # Allow graceful reconnection by replacing any stale connection with the same role
    for existing_ws in list(manager.channels.get(channel, set())):
        if getattr(existing_ws.state, "guest_role", None) == role:
            manager.disconnect(channel, existing_ws)
            try:
                await existing_ws.close(code=1000)
            except Exception:
                pass

    websocket.state.guest_role = role
    await manager.connect(channel, websocket)
    expires_at_iso = session.expires_at.isoformat() if hasattr(session, "expires_at") and session.expires_at else None
    await manager.broadcast(
        channel,
        {
            "type": "session.connected",
            "session_id": session_id,
            "role": role,
            "expires_at": expires_at_iso,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
    try:
        while True:
            event = await websocket.receive_json()
            if event.get("type") not in {"clipboard.updated", "clipboard.cleared", "ping", "session.closed"}:
                await websocket.send_json({"type": "error", "message": "Unsupported event"})
                continue
            if event["type"] == "session.closed":
                await manager.broadcast(channel, {"type": "session.closed", "session_id": session_id, "by": role, "timestamp": datetime.now(timezone.utc).isoformat()})
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
        if role == "receiver":
            await manager.broadcast(channel, {"type": "session.receiver_left", "session_id": session_id, "timestamp": datetime.now(timezone.utc).isoformat()})
