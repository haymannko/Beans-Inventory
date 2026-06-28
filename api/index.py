import sys
from pathlib import Path

# Add backend to Python path
backend_dir = str(Path(__file__).resolve().parent.parent / "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Also add project root for any relative imports
project_root = str(Path(__file__).resolve().parent.parent)
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from app.main import app  # noqa: E402

# Vercel expects the app to be named 'app' at module level
handler = app
