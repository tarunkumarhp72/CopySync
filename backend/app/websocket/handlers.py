from datetime import datetime, timezone
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.core.security import verify_app_token
from app.modules.guest_sessions.service import get_valid_session
from app.websocket.memory_manager import manager
from app.websocket.presence_manager import presence_manager, MAX_GUEST_ACTIVE_DEVICES, MAX_USER_ACTIVE_DEVICES
from app.core.rate_limit import limiter

logger = logging.getLogger("uvicorn.error")
router = APIRouter()


@router.websocket("/ws/guest/{session_id}")
async def guest_websocket(
    websocket: WebSocket, 
    session_id: str, 
    token: str, 
    role: str,
    device_id: str = Query(default="guest-device-default"),
) -> None:
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

    # Check parallel active device limit (Max 3 for guest)
    allowed, current_count, err_msg = await presence_manager.can_connect("guest", session_id, device_id)
    if not allowed:
        await websocket.close(code=1008, reason="Active guest device limit reached (3 max)")
        return

    channel = f"guest:{session_id}"
    websocket.state.guest_role = role
    websocket.state.device_id = device_id

    await manager.connect(channel, websocket)
    await presence_manager.register_socket("guest", session_id, device_id, websocket)

    expires_at_iso = session.expires_at.isoformat() if hasattr(session, "expires_at") and session.expires_at else None
    await manager.broadcast(
        channel,
        {
            "type": "session.connected",
            "session_id": session_id,
            "role": role,
            "device_id": device_id,
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
        await presence_manager.unregister_socket("guest", session_id, device_id, websocket)
        if role == "receiver":
            await manager.broadcast(channel, {"type": "session.receiver_left", "session_id": session_id, "timestamp": datetime.now(timezone.utc).isoformat()})


@router.websocket("/ws/presence")
async def user_presence_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    device_id: str = Query(...),
) -> None:
    """
    Real-time heartbeat websocket for logged-in users.
    Maintains active device count (Max 5).
    Instantly decrements active count when browser/tab is closed.
    """
    try:
        payload = verify_app_token(token)
        user_id = str(payload.get("sub"))
        if not user_id:
            await websocket.close(code=1008, reason="Invalid authentication token")
            return
    except Exception:
        await websocket.close(code=1008, reason="Authentication failed")
        return

    # Check parallel active device limit (Max 5 for logged-in user)
    allowed, current_count, err_msg = await presence_manager.can_connect("user", user_id, device_id)
    if not allowed:
        # Strictly reject 6th active device
        await websocket.close(code=1008, reason="Active account device limit reached (5 max)")
        return

    await websocket.accept()
    new_count = await presence_manager.register_socket("user", user_id, device_id, websocket)

    # Acknowledge presence connection
    try:
        await websocket.send_json({
            "type": "presence.connected",
            "device_id": device_id,
            "active_devices": new_count,
            "max_devices": MAX_USER_ACTIVE_DEVICES,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
    except Exception:
        pass

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        await presence_manager.unregister_socket("user", user_id, device_id, websocket)


@router.get("/ws/presence/status")
async def get_presence_status(
    token: str | None = None,
    guest_session_id: str | None = None,
) -> dict:
    """Check current active devices count for user or guest."""
    if token:
        try:
            payload = verify_app_token(token)
            user_id = str(payload.get("sub"))
            return {
                "owner_type": "user",
                "active_devices": presence_manager.get_active_count("user", user_id),
                "max_devices": MAX_USER_ACTIVE_DEVICES,
            }
        except Exception:
            pass

    if guest_session_id:
        return {
            "owner_type": "guest",
            "active_devices": presence_manager.get_active_count("guest", guest_session_id),
            "max_devices": MAX_GUEST_ACTIVE_DEVICES,
        }

    return {"detail": "Authentication or guest session required"}
