"""Backup & Restore endpoints — export/import all data as JSON."""

import io
import json
import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_admin_user
from app.models.arrival import Arrival
from app.models.bean_record import BeanRecord
from app.models.bean_type import BeanType
from app.models.sale import Sale
from app.models.stock_adjustment import StockAdjustment
from app.models.storage import Storage
from app.models.user import User
from app.models.weight_master import WeightMaster

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/backup", tags=["Backup"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _row_to_dict(row) -> dict:
    """Convert a SQLAlchemy row to a plain dict, serialising dates/UUIDs."""
    return {c.name: str(getattr(row, c.name)) if getattr(row, c.name) is not None else None
            for c in row.__table__.columns}


async def _export_table(session: AsyncSession, model) -> list[dict]:
    result = await session.execute(select(model))
    return [_row_to_dict(r) for r in result.scalars().all()]


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------

@router.get("/export")
async def export_backup(
    _user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Export all data as a JSON file download (admin only)."""
    backup = {
        "exported_at": date.today().isoformat(),
        "bean_types": await _export_table(db, BeanType),
        "weight_master": await _export_table(db, WeightMaster),
        "arrivals": await _export_table(db, Arrival),
        "sales": await _export_table(db, Sale),
        "storages": await _export_table(db, Storage),
        "stock_adjustments": await _export_table(db, StockAdjustment),
        "bean_records": await _export_table(db, BeanRecord),
        "users": await _export_table(db, User),
    }

    payload = json.dumps(backup, ensure_ascii=False, indent=2).encode("utf-8")
    output = io.BytesIO(payload)
    output.seek(0)

    filename = f"backup_{date.today().isoformat()}.json"
    return StreamingResponse(
        output,
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------

_TABLE_ORDER = [
    ("bean_types", BeanType),
    ("weight_master", WeightMaster),
    ("users", User),
    ("arrivals", Arrival),
    ("sales", Sale),
    ("storages", Storage),
    ("stock_adjustments", StockAdjustment),
    ("bean_records", BeanRecord),
]


@router.post("/import")
async def import_backup(
    file: UploadFile = File(...),
    _user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Import data from a JSON backup file (admin only).

    This **replaces** all existing data (except the current admin user).
    """
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json files are supported")

    try:
        content = await file.read()
        backup = json.loads(content)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {e}")

    if not isinstance(backup, dict):
        raise HTTPException(status_code=400, detail="Backup file must be a JSON object")

    imported: dict[str, int] = {}

    try:
        # Delete existing data in reverse FK order (skip users — keep current admin)
        tables_to_clear = [
            BeanRecord, StockAdjustment, Storage, Sale, Arrival, WeightMaster, BeanType,
        ]
        for model in tables_to_clear:
            await db.execute(delete(model))

        # Also delete users that aren't the current admin
        await db.execute(
            delete(User).where(User.id != str(_user.id))
        )
        await db.flush()

        # Insert backup data in correct order
        for table_name, model in _TABLE_ORDER:
            rows = backup.get(table_name, [])
            if not rows:
                imported[table_name] = 0
                continue

            count = 0
            for row_data in rows:
                # Remove 'id' to let the DB generate fresh UUIDs,
                # but keep it if the FK references need to match.
                # Actually we keep id so FK references remain consistent.
                obj = model(**{
                    c.name: row_data[c.name]
                    for c in model.__table__.columns
                    if c.name in row_data and row_data[c.name] is not None
                })
                db.add(obj)
                count += 1

            imported[table_name] = count

        await db.commit()

        total = sum(imported.values())
        logger.info(f"Backup imported: {total} total records")
        return {"message": f"Backup restored successfully ({total} records)", "imported": imported}

    except Exception as e:
        await db.rollback()
        logger.error(f"Backup import failed: {e}")
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")


# ---------------------------------------------------------------------------
# Health / keep-alive
# ---------------------------------------------------------------------------

@router.get("/ping")
async def ping(db: AsyncSession = Depends(get_db)):
    """Simple health check — keeps Render free-tier database alive."""
    try:
        await db.execute(select(BeanType).limit(1))
        return {"status": "ok"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unreachable")


@router.post("/seed")
async def seed_database(
    _user: User = Depends(get_current_admin_user),
):
    """Manually trigger seed to add any missing data (admin only)."""
    try:
        from app.services.seed import seed_if_empty, ensure_google_users_have_passwords
        await seed_if_empty()
        await ensure_google_users_have_passwords()
        return {"status": "ok", "message": "Seed completed"}
    except Exception as e:
        logger.error(f"Seed error: {e}")
        return {"status": "error", "message": str(e)}
