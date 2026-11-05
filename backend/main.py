from pathlib import Path
import sys

# Ensure backend root is on sys.path
_BACKEND_ROOT = Path(__file__).resolve().parent
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.main import app

__all__ = ["app"]

