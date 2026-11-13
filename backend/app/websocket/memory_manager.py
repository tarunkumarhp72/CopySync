import asyncio
from collections import defaultdict
import json
import logging
import uuid
from fastapi import WebSocket
from app.core.config import settings
from app.core.redis_client import get_redis

logger = logging.getLogger("uvicorn.error")
NODE_ID = str(uuid.uuid4())


class ConnectionManager:
    def __init__(self) -> None:
        self.channels: dict[str, set[WebSocket]] = defaultdict(set)
        self._listener_task: asyncio.Task | None = None
        self._pubsub = None

    async def _ensure_redis_listener(self) -> None:
        if settings.CONNECTION_MANAGER_BACKEND != "redis":
            return
        if self._listener_task is not None and not self._listener_task.done():
            return
        self._listener_task = asyncio.create_task(self._listen_redis())

    async def _listen_redis(self) -> None:
        while True:
            try:
                r = get_redis()
                if not r:
                    await asyncio.sleep(5)
                    continue
                self._pubsub = r.pubsub()
                await self._pubsub.subscribe("copysync:ws_broadcast")
                async for message in self._pubsub.listen():
                    if message and message.get("type") == "message":
                        try:
                            payload = json.loads(message["data"])
                            if payload.get("node_id") == NODE_ID:
                                continue  # Already broadcast locally
                            ch = payload.get("channel")
                            event = payload.get("event")
                            if ch and event:
                                await self._local_broadcast(ch, event)
                        except Exception:
                            pass
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.debug(f"Redis PubSub listener error: {e}")
                await asyncio.sleep(3)

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.channels[channel].add(websocket)
        await self._ensure_redis_listener()

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        self.channels[channel].discard(websocket)
        if not self.channels[channel]:
            self.channels.pop(channel, None)

    async def _local_broadcast(self, channel: str, event: dict, exclude: WebSocket | None = None) -> None:
        for websocket in list(self.channels.get(channel, set())):
            if exclude and websocket is exclude:
                continue
            try:
                await websocket.send_json(event)
            except Exception:
                self.channels[channel].discard(websocket)
        if channel in self.channels and not self.channels[channel]:
            self.channels.pop(channel, None)

    async def broadcast(self, channel: str, event: dict, exclude: WebSocket | None = None) -> None:
        # 1. Immediate 0ms local broadcast to sockets on this process
        await self._local_broadcast(channel, event, exclude)

        # 2. If Redis Pub/Sub backend enabled, publish to cross-worker cluster
        if settings.CONNECTION_MANAGER_BACKEND == "redis":
            try:
                r = get_redis()
                if r:
                    msg = json.dumps({"node_id": NODE_ID, "channel": channel, "event": event})
                    await r.publish("copysync:ws_broadcast", msg)
            except Exception as e:
                logger.debug(f"Redis publish error: {e}")

    def role_in_use(self, channel: str, role: str) -> bool:
        return any(getattr(websocket.state, "guest_role", None) == role for websocket in self.channels.get(channel, set()))


manager = ConnectionManager()
