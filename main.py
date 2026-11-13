from pathlib import Path
import sys

# Ensure backend root is on sys.path so app modules load properly
_REPO_ROOT = Path(__file__).resolve().parent
_BACKEND_ROOT = _REPO_ROOT / "backend"
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.main import app

__all__ = ["app"]
