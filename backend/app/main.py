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
    backup,
    bean_records,
    bean_types,
    dashboard,
    purchase_orders,
    reports,
    sales,
    storages,
    suppliers,
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
app.include_router(bean_records.router)
app.include_router(purchase_orders.router)
app.include_router(suppliers.router)
app.include_router(backup.router)


@app.get("/", include_in_schema=False)
async def root():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/docs")


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


@app.post("/migrate")
async def run_migrations():
    """Run database migrations to create missing tables."""
    try:
        from app.db.engine import engine
        from app.models import Base

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Verify weight_master table exists
        from sqlalchemy import text
        async with engine.begin() as conn:
            result = await conn.execute(
                text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weight_master')")
            )
            table_exists = result.scalar()

        return {
            "status": "ok",
            "message": "Migrations completed",
            "weight_master_table": "exists" if table_exists else "created"
        }
    except Exception as e:
        logger.error(f"Migration error: {e}")
        return {"status": "error", "message": str(e)}


@app.on_event("startup")
async def startup():
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} with auto-register")
    # Auto-create tables and seed data on first run
    try:
        from app.db.engine import engine
        from app.models import Base
        from app.services.seed import seed_if_empty, ensure_google_users_have_passwords

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Ensure all columns exist (handles schema evolution without alembic)
        await _ensure_columns()

        await seed_if_empty()
        await ensure_google_users_have_passwords()
        logger.info("Database tables and seed data ready")
    except Exception as e:
        logger.error(f"Database init error: {e}")


async def _ensure_columns():
    """Add missing columns to existing tables if needed."""
    from app.db.engine import engine
    from sqlalchemy import text, inspect

    # Map of table -> list of (column_name, column definition)
    migrations = {
        "users": [
            ("email", "VARCHAR(255)"),
            ("google_id", "VARCHAR(50)"),
            ("avatar_url", "VARCHAR(500)"),
            ("auth_provider", "VARCHAR(20) DEFAULT 'local'"),
            ("last_login", "TIMESTAMPTZ"),
        ],
        "purchase_orders": [
            ("supplier_id", "VARCHAR(36)"),
        ],
    }

    async with engine.begin() as conn:
        def migrate(connection):
            insp = inspect(connection)
            for table, columns in migrations.items():
                existing_tables = insp.get_table_names()
                if table not in existing_tables:
                    continue  # Will be created by create_all
                existing_cols = {c["name"] for c in insp.get_columns(table)}
                for col_name, col_def in columns:
                    if col_name not in existing_cols:
                        sql = f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}"
                        logger.info(f"Migration: {sql}")
                        connection.execute(text(sql))

        await conn.run_sync(migrate)


@app.post("/seed")
async def run_seed():
    """Manually trigger seed to add any missing data."""
    try:
        from app.services.seed import seed_if_empty, ensure_google_users_have_passwords
        await seed_if_empty()
        await ensure_google_users_have_passwords()
        return {"status": "ok", "message": "Seed completed"}
    except Exception as e:
        logger.error(f"Seed error: {e}")
        return {"status": "error", "message": str(e)}


@app.on_event("shutdown")
async def shutdown():
    logger.info("Shutting down application")
