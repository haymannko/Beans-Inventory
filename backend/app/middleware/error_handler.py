import logging
import traceback

from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)


async def error_handler_middleware(request: Request, call_next):
    """Global error handler middleware."""
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Unhandled error on {request.method} {request.url.path}: {e}")
        logger.error(traceback.format_exc())
        # Return detailed error in debug mode, generic in production
        detail = (
            {"code": "INTERNAL_SERVER_ERROR", "message": str(e)}
            if settings.DEBUG
            else {"code": "INTERNAL_SERVER_ERROR", "message": "An unexpected error occurred"}
        )
        return JSONResponse(
            status_code=500,
            content={"detail": detail},
        )
