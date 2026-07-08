import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.bean_type import BeanType
from app.models.stock_adjustment import AdjustmentType, StockAdjustment
from app.models.user import User
from app.schemas.adjustment import AdjustmentCreate, AdjustmentResponse, AdjustmentUpdate
from app.services.audit_service import create_audit_log
from app.services.inventory_service import get_current_stock

router = APIRouter(prefix="/api/adjustments", tags=["Stock Adjustments"])


@router.get("", response_model=list[AdjustmentResponse])
async def list_adjustments(
    bean_type_id: uuid.UUID | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List stock adjustments with optional filters."""
    query = select(StockAdjustment).order_by(
        StockAdjustment.adjustment_date.desc(), StockAdjustment.created_at.desc()
    )

    if bean_type_id:
        query = query.where(StockAdjustment.bean_type_id == str(bean_type_id))
    if start_date:
        query = query.where(StockAdjustment.adjustment_date >= start_date)
    if end_date:
        query = query.where(StockAdjustment.adjustment_date <= end_date)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    adjustments = result.scalars().all()

    # Enrich with bean type names
    enriched = []
    for adj in adjustments:
        bt_result = await db.execute(select(BeanType.name).where(BeanType.id == adj.bean_type_id))
        bt_name = bt_result.scalar_one_or_none()
        enriched.append(AdjustmentResponse(
            id=adj.id,
            bean_type_id=adj.bean_type_id,
            bean_type_name=bt_name,
            quantity=float(adj.quantity),
            adjustment_type=adj.adjustment_type,
            reason=adj.reason,
            adjustment_date=adj.adjustment_date,
            created_by=adj.created_by,
            created_at=adj.created_at,
        ))

    return enriched


@router.post("", response_model=AdjustmentResponse, status_code=status.HTTP_201_CREATED)
async def create_adjustment(
    request: AdjustmentCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a stock adjustment. Validates that decrease adjustments don't cause negative stock."""
    # Verify bean type exists
    bean_type_id_str = str(request.bean_type_id)
    bt_result = await db.execute(select(BeanType).where(BeanType.id == bean_type_id_str))
    bean_type = bt_result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=404, detail="Bean type not found")

    # Validate decrease doesn't cause negative stock
    if request.adjustment_type == "decrease":
        current_stock = await get_current_stock(db, request.bean_type_id)
        if current_stock < request.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock. Current stock: {current_stock}, requested decrease: {request.quantity}",
            )

    adjustment = StockAdjustment(
        bean_type_id=str(request.bean_type_id),
        quantity=request.quantity,
        adjustment_type=AdjustmentType(request.adjustment_type),
        reason=request.reason,
        adjustment_date=request.adjustment_date,
        created_by=str(user.id),
    )
    db.add(adjustment)
    await db.flush()

    await create_audit_log(
        db, user.id, "CREATE", "stock_adjustments", adjustment.id,
        {
            "bean_type": bean_type.name,
            "quantity": request.quantity,
            "adjustment_type": request.adjustment_type,
            "reason": request.reason,
        }
    )

    return AdjustmentResponse(
        id=adjustment.id,
        bean_type_id=adjustment.bean_type_id,
        bean_type_name=bean_type.name,
        quantity=float(adjustment.quantity),
        adjustment_type=adjustment.adjustment_type,
        reason=adjustment.reason,
        adjustment_date=adjustment.adjustment_date,
        created_by=adjustment.created_by,
        created_at=adjustment.created_at,
    )


@router.put("/{adjustment_id}", response_model=AdjustmentResponse)
async def update_adjustment(
    adjustment_id: uuid.UUID,
    request: AdjustmentUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a stock adjustment record."""
    adjustment_id_str = str(adjustment_id)
    result = await db.execute(select(StockAdjustment).where(StockAdjustment.id == adjustment_id_str))
    adjustment = result.scalar_one_or_none()
    if adjustment is None:
        raise HTTPException(status_code=404, detail="Adjustment not found")

    if request.bean_type_id is not None:
        bt_result = await db.execute(select(BeanType).where(BeanType.id == str(request.bean_type_id)))
        if bt_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Bean type not found")
        adjustment.bean_type_id = str(request.bean_type_id)
    if request.quantity is not None:
        adjustment.quantity = request.quantity
    if request.adjustment_type is not None:
        adjustment.adjustment_type = AdjustmentType(request.adjustment_type)
    if request.reason is not None:
        adjustment.reason = request.reason
    if request.adjustment_date is not None:
        adjustment.adjustment_date = request.adjustment_date

    db.add(adjustment)
    await db.flush()

    bt_result = await db.execute(select(BeanType.name).where(BeanType.id == adjustment.bean_type_id))
    bt_name = bt_result.scalar_one_or_none()

    await create_audit_log(db, str(user.id), "UPDATE", "stock_adjustments", adjustment_id_str, None)

    return AdjustmentResponse(
        id=adjustment.id,
        bean_type_id=adjustment.bean_type_id,
        bean_type_name=bt_name,
        quantity=float(adjustment.quantity),
        adjustment_type=adjustment.adjustment_type,
        reason=adjustment.reason,
        adjustment_date=adjustment.adjustment_date,
        created_by=adjustment.created_by,
        created_at=adjustment.created_at,
    )


@router.delete("/{adjustment_id}")
async def delete_adjustment(
    adjustment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a stock adjustment record."""
    adjustment_id_str = str(adjustment_id)
    result = await db.execute(select(StockAdjustment).where(StockAdjustment.id == adjustment_id_str))
    adjustment = result.scalar_one_or_none()
    if adjustment is None:
        raise HTTPException(status_code=404, detail="Adjustment not found")

    await db.delete(adjustment)
    await create_audit_log(db, str(user.id), "DELETE", "stock_adjustments", adjustment_id_str, None)
    return {"message": "Adjustment deleted successfully"}
