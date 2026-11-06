"""
Real-time active device presence manager.
Tracks active connections per device ID and per owner (User or Guest).

Enforces:
- Scope: Option A (Per Device - multiple tabs on the same browser profile share 1 device count)
- Limit Policy: Option A (Strict Block - 3 for guest, 5 for account)
"""
import asyncio
from collections import defaultdict
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger("uvicorn.error")

MAX_GUEST_ACTIVE_DEVICES = 3
MAX_USER_ACTIVE_DEVICES = 5


class DevicePresenceManager:
    def __init__(self) -> None:
        # Structure: _active_devices[owner_key][device_id] = set of active WebSockets
        self._active_devices: dict[str, dict[str, set[WebSocket]]] = defaultdict(lambda: defaultdict(set))
        self._lock = asyncio.Lock()

    def get_owner_key(self, owner_type: str, owner_id: str) -> str:
        return f"{owner_type}:{owner_id}"

    def get_active_device_ids(self, owner_type: str, owner_id: str) -> set[str]:
        owner_key = self.get_owner_key(owner_type, owner_id)
        if owner_key not in self._active_devices:
            return set()
        return {
            dev_id
            for dev_id, sockets in self._active_devices[owner_key].items()
            if len(sockets) > 0
        }

    def get_active_count(self, owner_type: str, owner_id: str) -> int:
        return len(self.get_active_device_ids(owner_type, owner_id))

    async def can_connect(
        self,
        owner_type: str,
        owner_id: str,
        device_id: str,
    ) -> tuple[bool, int, str]:
        """
        Validates if device is allowed to connect based on parallel active device limit.
        Returns: (allowed: bool, current_active_count: int, error_message: str)
        """
        limit = MAX_GUEST_ACTIVE_DEVICES if owner_type == "guest" else MAX_USER_ACTIVE_DEVICES
        async with self._lock:
            active_devs = self.get_active_device_ids(owner_type, owner_id)
            current_count = len(active_devs)

            # If this device is ALREADY active (e.g. 2nd tab in same browser or reconnect)
            if device_id in active_devs:
                return True, current_count, ""

            # If it's a NEW device, check quota
            if current_count >= limit:
                msg = (
                    f"Active device limit reached ({limit} max for {owner_type}). "
                    f"Please close CopySync on one of your active devices to connect."
                )
                return False, current_count, msg

            return True, current_count, ""

    async def register_socket(
        self,
        owner_type: str,
        owner_id: str,
        device_id: str,
        websocket: WebSocket,
    ) -> int:
        """Registers a websocket for a given device. Returns new active device count."""
        owner_key = self.get_owner_key(owner_type, owner_id)
        async with self._lock:
            self._active_devices[owner_key][device_id].add(websocket)
            count = len(self.get_active_device_ids(owner_type, owner_id))
            logger.info(
                "Registered socket for %s device %s. Active devices count: %d",
                owner_key,
                device_id,
                count,
            )
            return count

    async def unregister_socket(
        self,
        owner_type: str,
        owner_id: str,
        device_id: str,
        websocket: WebSocket,
    ) -> int:
        """Unregisters a websocket. If device has no open sockets left, it is marked offline."""
        owner_key = self.get_owner_key(owner_type, owner_id)
        async with self._lock:
            if owner_key in self._active_devices:
                if device_id in self._active_devices[owner_key]:
                    self._active_devices[owner_key][device_id].discard(websocket)
                    if not self._active_devices[owner_key][device_id]:
                        del self._active_devices[owner_key][device_id]
                if not self._active_devices[owner_key]:
                    del self._active_devices[owner_key]

            count = self.get_active_count(owner_type, owner_id)
            logger.info(
                "Unregistered socket for %s device %s. Active devices count: %d",
                owner_key,
                device_id,
                count,
            )
            return count


presence_manager = DevicePresenceManager()
