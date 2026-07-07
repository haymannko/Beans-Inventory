import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.error_handler import error_handler_middleware
from app.routers import (
    adjustments,
    arrivals,
    audit_logs,
    auth,
    bean_types,
    dashboard,
    reports,
    sales,
    storages,
    users,
    weight_master,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error handler
app.middleware("http")(error_handler_middleware)

# Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(bean_types.router)
app.include_router(arrivals.router)
app.include_router(sales.router)
app.include_router(storages.router)
app.include_router(adjustments.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(audit_logs.router)
app.include_router(weight_master.router)


@app.get("/health")
async def health_check():
    from sqlalchemy import func, select
    from app.db.engine import async_session_factory
    from app.models.user import User
    try:
        async with async_session_factory() as session:
            count = await session.scalar(select(func.count()).select_from(User))
        db_status = f"ok, {count} users"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "ok", "version": settings.APP_VERSION, "db": db_status}


@app.on_event("startup")
async def startup():
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    # Auto-create tables and seed data on first run
    try:
        from app.db.engine import engine
        from app.models import Base
        from app.services.seed import seed_if_empty

        async with engine.begin() as conn:
            # Migrate: recreate weight_master if schema changed
            try:
                from sqlalchemy import text
                await conn.execute(text("DROP TABLE IF EXISTS weight_master"))
            except Exception:
                pass
            await conn.run_sync(Base.metadata.create_all)
            # Migrate: add new columns if they don't exist
            for col in ("transport_fee", "labor_fee"):
                try:
                    await conn.execute(
                        __import__("sqlalchemy").text(
                            f"ALTER TABLE arrivals ADD COLUMN {col} NUMERIC(12,2) NOT NULL DEFAULT 0"
                        )
                    )
                except Exception:
                    pass  # column already exists
        await seed_if_empty()
        logger.info("Database tables and seed data ready")
    except Exception as e:
        logger.error(f"Database init error: {e}")


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down application")
