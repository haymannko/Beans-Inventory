import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_admin_user, get_current_user
from app.models.bean_type import BeanType
from app.models.stock_threshold import StockThreshold
from app.models.user import User
from app.schemas.stock_threshold import (
    LowStockAlert,
    StockAlertSummary,
    StockThresholdCreate,
    StockThresholdResponse,
    StockThresholdUpdate,
)
from app.services.audit_service import create_audit_log
from app.services.email_service import send_low_stock_alert
from app.services.inventory_service import get_current_stock, get_current_stock_bags

router = APIRouter(prefix="/api/stock-thresholds", tags=["Stock Thresholds"])


async def _enrich_threshold(
    db: AsyncSession, threshold: StockThreshold
) -> StockThresholdResponse:
    """Enrich a threshold with current stock data."""
    bt_id = uuid.UUID(threshold.bean_type_id)
    current_stock_bags = await get_current_stock_bags(db, bt_id)
    current_stock_weight = await get_current_stock(db, bt_id)

    return StockThresholdResponse(
        id=threshold.id,
        bean_type_id=threshold.bean_type_id,
        bean_type_name=threshold.bean_type.name if threshold.bean_type else None,
        min_stock_bags=threshold.min_stock_bags,
        min_stock_weight=threshold.min_stock_weight,
        email_enabled=threshold.email_enabled,
        alert_email=threshold.alert_email,
        current_stock_bags=current_stock_bags,
        current_stock_weight=current_stock_weight,
        is_low_stock=current_stock_bags < threshold.min_stock_bags or current_stock_weight < threshold.min_stock_weight,
        created_at=threshold.created_at,
        updated_at=threshold.updated_at,
    )


async def _get_threshold_or_404(
    db: AsyncSession, bean_type_id: str
) -> StockThreshold:
    """Get a threshold by bean_type_id or raise 404."""
    result = await db.execute(
        select(StockThreshold).where(StockThreshold.bean_type_id == bean_type_id)
    )
    threshold = result.scalar_one_or_none()
    if threshold is None:
        raise HTTPException(status_code=404, detail="Stock threshold not found for this bean type")
    return threshold


@router.get("", response_model=list[StockThresholdResponse])
async def list_stock_thresholds(
    search: str | None = Query(None),
    low_stock_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all stock thresholds with optional search/filter."""
    query = (
        select(StockThreshold)
        .join(BeanType, StockThreshold.bean_type_id == BeanType.id)
        .order_by(BeanType.name)
    )

    if search:
        query = query.where(BeanType.name.ilike(f"%{search}%"))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    thresholds = result.scalars().all()

    enriched = []
    for t in thresholds:
        enriched.append(await _enrich_threshold(db, t))

    if low_stock_only:
        enriched = [t for t in enriched if t.is_low_stock]

    return enriched


@router.get("/alerts", response_model=StockAlertSummary)
async def get_stock_alerts(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get low stock alerts based on configured thresholds."""
    result = await db.execute(
        select(StockThreshold)
        .join(BeanType, StockThreshold.bean_type_id == BeanType.id)
        .order_by(BeanType.name)
    )
    thresholds = result.scalars().all()

    alerts = []
    low_stock_count = 0
    critical_count = 0

    for t in thresholds:
        bt_id = uuid.UUID(t.bean_type_id)
        current_bags = await get_current_stock_bags(db, bt_id)
        current_weight = await get_current_stock(db, bt_id)

        if current_bags < t.min_stock_bags or current_weight < t.min_stock_weight:
            shortfall_bags = max(0, t.min_stock_bags - current_bags)
            shortfall_weight = max(0, t.min_stock_weight - current_weight)

            # Determine severity
            ratio = (
                current_bags / t.min_stock_bags
                if t.min_stock_bags > 0
                else 1
            )
            if ratio <= 0.25:
                severity = "critical"
                critical_count += 1
            elif ratio <= 0.75:
                severity = "warning"
            else:
                severity = "info"

            low_stock_count += 1

            alerts.append(LowStockAlert(
                bean_type_id=t.bean_type_id,
                bean_type_name=t.bean_type.name if t.bean_type else "Unknown",
                current_stock_bags=current_bags,
                current_stock_weight=current_weight,
                min_stock_bags=t.min_stock_bags,
                min_stock_weight=t.min_stock_weight,
                shortfall_bags=shortfall_bags,
                shortfall_weight=shortfall_weight,
                severity=severity,
            ))

    return StockAlertSummary(
        total_thresholds=len(thresholds),
        low_stock_count=low_stock_count,
        critical_count=critical_count,
        alerts=alerts,
    )


@router.get("/{bean_type_id}", response_model=StockThresholdResponse)
async def get_stock_threshold(
    bean_type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get threshold for a specific bean type."""
    threshold = await _get_threshold_or_404(db, str(bean_type_id))
    return await _enrich_threshold(db, threshold)


@router.put("/{bean_type_id}", response_model=StockThresholdResponse)
async def upsert_stock_threshold(
    bean_type_id: uuid.UUID,
    request: StockThresholdCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_admin_user),
):
    """Create or update a stock threshold for a bean type."""
    bean_type_id_str = str(bean_type_id)

    # Verify bean type exists
    bt_result = await db.execute(select(BeanType).where(BeanType.id == bean_type_id_str))
    bean_type = bt_result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=404, detail="Bean type not found")

    # Check for existing threshold (upsert)
    result = await db.execute(
        select(StockThreshold).where(StockThreshold.bean_type_id == bean_type_id_str)
    )
    threshold = result.scalar_one_or_none()

    if threshold:
        threshold.min_stock_bags = request.min_stock_bags
        threshold.min_stock_weight = request.min_stock_weight
        threshold.email_enabled = request.email_enabled
        threshold.alert_email = request.alert_email
        action = "UPDATE"
    else:
        threshold = StockThreshold(
            bean_type_id=bean_type_id_str,
            min_stock_bags=request.min_stock_bags,
            min_stock_weight=request.min_stock_weight,
            email_enabled=request.email_enabled,
            alert_email=request.alert_email,
        )
        db.add(threshold)
        action = "CREATE"

    await db.flush()

    await create_audit_log(
        db, user.id, action, "stock_thresholds", threshold.id,
        {
            "bean_type_id": bean_type_id_str,
            "min_stock_bags": request.min_stock_bags,
            "min_stock_weight": request.min_stock_weight,
        },
    )

    # If email enabled and stock is low, send alert
    if request.email_enabled and request.alert_email:
        bt_id = uuid.UUID(bean_type_id_str)
        current_bags = await get_current_stock_bags(db, bt_id)
        current_weight = await get_current_stock(db, bt_id)
        if current_bags < request.min_stock_bags or current_weight < request.min_stock_weight:
            await send_low_stock_alert(
                email=request.alert_email,
                bean_type_name=bean_type.name,
                current_bags=current_bags,
                min_bags=request.min_stock_bags,
                current_weight=current_weight,
                min_weight=request.min_stock_weight,
            )

    return await _enrich_threshold(db, threshold)


@router.patch("/{bean_type_id}", response_model=StockThresholdResponse)
async def update_stock_threshold(
    bean_type_id: uuid.UUID,
    request: StockThresholdUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_admin_user),
):
    """Partially update a stock threshold."""
    bean_type_id_str = str(bean_type_id)
    threshold = await _get_threshold_or_404(db, bean_type_id_str)

    if request.min_stock_bags is not None:
        threshold.min_stock_bags = request.min_stock_bags
    if request.min_stock_weight is not None:
        threshold.min_stock_weight = request.min_stock_weight
    if request.email_enabled is not None:
        threshold.email_enabled = request.email_enabled
    if request.alert_email is not None:
        threshold.alert_email = request.alert_email

    await db.flush()

    await create_audit_log(
        db, user.id, "UPDATE", "stock_thresholds", threshold.id,
        {"bean_type_id": bean_type_id_str},
    )

    return await _enrich_threshold(db, threshold)


@router.delete("/{bean_type_id}")
async def delete_stock_threshold(
    bean_type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_admin_user),
):
    """Delete a stock threshold."""
    bean_type_id_str = str(bean_type_id)
    threshold = await _get_threshold_or_404(db, bean_type_id_str)

    await db.delete(threshold)
    await create_audit_log(
        db, user.id, "DELETE", "stock_thresholds", threshold.id,
        {"bean_type_id": bean_type_id_str},
    )

    return {"message": "Stock threshold deleted successfully"}
