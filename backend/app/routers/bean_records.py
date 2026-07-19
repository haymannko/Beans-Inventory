import logging
import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.bean_record import BeanRecord
from app.models.user import User
from app.models.weight_master import WeightMaster
from app.schemas.bean_record import (
    BeanRecordCreate,
    BeanRecordResponse,
    BeanRecordUpdate,
)
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/api/bean-records", tags=["Bean Records"])
logger = logging.getLogger(__name__)

_table_ensured = False


async def _ensure_table(db: AsyncSession):
    """Auto-create bean_records table if it doesn't exist."""
    global _table_ensured
    if _table_ensured:
        return
    try:
        from sqlalchemy import text
        result = await db.execute(
            text("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'bean_records')")
        )
        if not result.scalar():
            logger.warning("bean_records table missing — creating it now")
            from app.db.engine import engine
            from app.models import Base
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("bean_records table created successfully")
        _table_ensured = True
    except Exception as e:
        logger.error(f"Failed to ensure bean_records table: {e}")


def calculate_value(bean_weight: float, bags: int, viss: float, price: float) -> float:
    """
    Calculate bean record value.

    Formula: ((bean_weight / 2) * bags + viss) * price / bean_weight

    Where:
    - bean_weight = အသားအလေးချိန် (from Weight Master)
    - bags = အိတ်
    - viss = ပိဿာ
    - price = ဈေးနှုန်း
    """
    if bean_weight <= 0:
        return 0.0
    return ((bean_weight / 2) * bags + viss) * price / bean_weight


async def _get_bean_weight(db: AsyncSession, bean_type_id: str) -> float:
    """Fetch bean weight from Weight Master."""
    result = await db.execute(
        select(WeightMaster).where(WeightMaster.id == bean_type_id)
    )
    wm = result.scalar_one_or_none()
    if wm is None:
        raise HTTPException(status_code=404, detail="Weight master not found")
    return float(wm.weight)


async def _enrich_record(db: AsyncSession, record: BeanRecord) -> BeanRecordResponse:
    """Enrich record with bean_type_name from Weight Master."""
    result = await db.execute(
        select(WeightMaster.bean_name).where(WeightMaster.id == record.bean_type_id)
    )
    bean_name = result.scalar_one_or_none()
    return BeanRecordResponse(
        id=record.id,
        bean_type_id=record.bean_type_id,
        bean_type_name=bean_name,
        date=record.date,
        customer_name=record.customer_name,
        record_type=record.record_type,
        bags=record.bags,
        viss=float(record.viss),
        price=float(record.price),
        value=float(record.value),
        created_by=record.created_by,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.get("", response_model=list[BeanRecordResponse])
async def list_bean_records(
    bean_type_id: uuid.UUID | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    customer: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List bean records with optional filters."""
    await _ensure_table(db)
    query = select(BeanRecord).order_by(BeanRecord.date.desc(), BeanRecord.created_at.desc())

    if bean_type_id:
        query = query.where(BeanRecord.bean_type_id == str(bean_type_id))
    if start_date:
        query = query.where(BeanRecord.date >= start_date)
    if end_date:
        query = query.where(BeanRecord.date <= end_date)
    if customer:
        query = query.where(BeanRecord.customer_name.ilike(f"%{customer}%"))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    records = result.scalars().all()

    enriched = []
    for record in records:
        enriched.append(await _enrich_record(db, record))

    return enriched


@router.get("/{record_id}", response_model=BeanRecordResponse)
async def get_bean_record(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single bean record by ID."""
    record_id_str = str(record_id)
    result = await db.execute(
        select(BeanRecord).where(BeanRecord.id == record_id_str)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Bean record not found")
    return await _enrich_record(db, record)


@router.post("", response_model=BeanRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_bean_record(
    request: BeanRecordCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new bean record with auto-calculated value."""
    bean_type_id_str = str(request.bean_type_id)

    # Fetch bean weight from Weight Master
    bean_weight = await _get_bean_weight(db, bean_type_id_str)

    # Auto-calculate value if price is provided, otherwise use manual value
    if request.price > 0:
        value = calculate_value(bean_weight, request.bags, request.viss, request.price)
    elif request.value is not None:
        value = request.value
    else:
        value = 0.0

    record = BeanRecord(
        bean_type_id=bean_type_id_str,
        date=request.date,
        customer_name=request.customer_name,
        record_type=request.record_type,
        bags=request.bags,
        viss=request.viss,
        price=request.price,
        value=value,
        created_by=str(user.id),
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)

    await create_audit_log(
        db, user.id, "CREATE", "bean_records", record.id,
        {
            "bean_type_id": bean_type_id_str,
            "customer_name": request.customer_name,
            "value": value,
        }
    )

    return await _enrich_record(db, record)


@router.put("/{record_id}", response_model=BeanRecordResponse)
async def update_bean_record(
    record_id: uuid.UUID,
    request: BeanRecordUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a bean record with auto-recalculated value."""
    record_id_str = str(record_id)
    result = await db.execute(
        select(BeanRecord).where(BeanRecord.id == record_id_str)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Bean record not found")

    # Update fields
    if request.bean_type_id is not None:
        # Verify new bean type exists
        new_id_str = str(request.bean_type_id)
        await _get_bean_weight(db, new_id_str)
        record.bean_type_id = new_id_str
    if request.date is not None:
        record.date = request.date
    if request.customer_name is not None:
        record.customer_name = request.customer_name
    if request.record_type is not None:
        record.record_type = request.record_type
    if request.bags is not None:
        record.bags = request.bags
    if request.viss is not None:
        record.viss = request.viss
    if request.price is not None:
        record.price = request.price

    # Recalculate value with current bean weight
    bean_weight = await _get_bean_weight(db, record.bean_type_id)
    record.value = calculate_value(bean_weight, record.bags, float(record.viss), float(record.price))

    db.add(record)
    await db.flush()
    await db.refresh(record)

    await create_audit_log(
        db, user.id, "UPDATE", "bean_records", record.id,
        {"bean_type_id": record.bean_type_id, "value": float(record.value)}
    )

    return await _enrich_record(db, record)


@router.delete("/{record_id}")
async def delete_bean_record(
    record_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a bean record."""
    record_id_str = str(record_id)
    result = await db.execute(
        select(BeanRecord).where(BeanRecord.id == record_id_str)
    )
    record = result.scalar_one_or_none()
    if record is None:
        raise HTTPException(status_code=404, detail="Bean record not found")

    await db.delete(record)
    await create_audit_log(
        db, user.id, "DELETE", "bean_records", record.id,
        {"bean_type_id": record.bean_type_id}
    )
    return {"message": "Bean record deleted successfully"}
