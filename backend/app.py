import os
import sys

print(f"Python version: {sys.version}", flush=True)
print(f"PORT: {os.environ.get('PORT', 'not set')}", flush=True)
print(f"CWD: {os.getcwd()}", flush=True)
print(f"Files: {os.listdir('.')}", flush=True)

try:
    from app.main import app
    print("FastAPI app imported OK", flush=True)
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting uvicorn on port {port}", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port)
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    import traceback
    traceback.print_exc()
    sys.exit(1)
