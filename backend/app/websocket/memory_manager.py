from collections import defaultdict

from fastapi import WebSocket


class InMemoryConnectionManager:
    def __init__(self) -> None:
        self.channels: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.channels[channel].add(websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        self.channels[channel].discard(websocket)
        if not self.channels[channel]:
            self.channels.pop(channel, None)

    async def broadcast(self, channel: str, event: dict) -> None:
        for websocket in list(self.channels.get(channel, set())):
            await websocket.send_json(event)

    def role_in_use(self, channel: str, role: str) -> bool:
        return any(getattr(websocket.state, "guest_role", None) == role for websocket in self.channels.get(channel, set()))


manager = InMemoryConnectionManager()
