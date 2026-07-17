import os
import sys
from pathlib import Path

# Set DATABASE_URL from env if available (for Vercel serverless)
_backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

_project_root = str(Path(__file__).resolve().parent.parent)
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

from app.main import app  # noqa: E402

# Vercel expects the app to be named 'app' at module level
handler = app
