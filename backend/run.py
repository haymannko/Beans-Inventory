import sys
from pathlib import Path

# Ensure the backend directory is in the path
sys.path.insert(0, str(Path(__file__).parent))

from app.main import app  # noqa: E402

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
