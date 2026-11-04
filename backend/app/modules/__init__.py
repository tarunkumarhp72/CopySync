"""Application module registry.

Importing this package registers every SQLAlchemy model with ``Base.metadata``.
Keep model imports here so migration tooling has one stable registration point.
"""

from app.modules.auth.models import User
from app.modules.guest_sessions.models import GuestSession
from app.modules.guest_workspaces.models import GuestWorkspace
from app.modules.devices.models import Device
from app.modules.notes.models import Note, NoteImage, NoteRevision

__all__ = ["User", "GuestSession", "GuestWorkspace", "Device", "Note", "NoteImage", "NoteRevision"]
