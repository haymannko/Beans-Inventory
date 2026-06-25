import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.arrival import Arrival
from app.models.bean_type import BeanType
from app.models.sale import Sale
from app.models.stock_adjustment import AdjustmentType, StockAdjustment
from app.models.storage import Storage


async def get_current_stock(db: AsyncSession, bean_type_id: uuid.UUID) -> float:
    """Calculate current stock (weight) for a bean type.

    Current Stock = Total Arrivals weight + Storage weight + Stock Adjustments (increase) - Sales weight - Stock Adjustments (decrease)
    """
    bean_type_id_str = str(bean_type_id)

    # Total arrivals weight
    arrivals_result = await db.execute(
        select(func.coalesce(func.sum(Arrival.weight_kg), 0)).where(
            Arrival.bean_type_id == bean_type_id_str
        )
    )
    total_arrivals = float(arrivals_result.scalar() or 0)

    # Total sales quantity (weight)
    sales_result = await db.execute(
        select(func.coalesce(func.sum(Sale.quantity), 0)).where(
            Sale.bean_type_id == bean_type_id_str
        )
    )
    total_sales = float(sales_result.scalar() or 0)

    # Total adjustments
    increase_result = await db.execute(
        select(func.coalesce(func.sum(StockAdjustment.quantity), 0)).where(
            StockAdjustment.bean_type_id == bean_type_id_str,
            StockAdjustment.adjustment_type == AdjustmentType.INCREASE,
        )
    )
    total_increase = float(increase_result.scalar() or 0)

    decrease_result = await db.execute(
        select(func.coalesce(func.sum(StockAdjustment.quantity), 0)).where(
            StockAdjustment.bean_type_id == bean_type_id_str,
            StockAdjustment.adjustment_type == AdjustmentType.DECREASE,
        )
    )
    total_decrease = float(decrease_result.scalar() or 0)

    # Total storage weight
    storage_result = await db.execute(
        select(func.coalesce(func.sum(Storage.quantity), 0)).where(
            Storage.bean_type_id == bean_type_id_str
        )
    )
    total_storage = float(storage_result.scalar() or 0)

    return total_arrivals + total_increase + total_storage - total_sales - total_decrease


async def get_current_stock_bags(db: AsyncSession, bean_type_id: uuid.UUID) -> int:
    """Calculate current stock (bags) for a bean type."""
    bean_type_id_str = str(bean_type_id)

    # Total arrivals bags
    arrivals_result = await db.execute(
        select(func.coalesce(func.sum(Arrival.quantity_bags), 0)).where(
            Arrival.bean_type_id == bean_type_id_str
        )
    )
    total_arrivals = int(arrivals_result.scalar() or 0)

    # Total sales bags
    sales_result = await db.execute(
        select(func.coalesce(func.sum(Sale.quantity_bags), 0)).where(
            Sale.bean_type_id == bean_type_id_str
        )
    )
    total_sales = int(sales_result.scalar() or 0)

    # Total storage bags
    storage_result = await db.execute(
        select(func.coalesce(func.sum(Storage.quantity_bags), 0)).where(
            Storage.bean_type_id == bean_type_id_str
        )
    )
    total_storage = int(storage_result.scalar() or 0)

    return total_arrivals + total_storage - total_sales


async def get_all_stocks(db: AsyncSession) -> dict[uuid.UUID, float]:
    """Get current stock for all bean types."""
    result = await db.execute(select(BeanType.id))
    bean_type_ids = [row[0] for row in result.fetchall()]

    stocks = {}
    for bt_id in bean_type_ids:
        stocks[bt_id] = await get_current_stock(db, bt_id)

    return stocks


async def get_all_stocks_bags(db: AsyncSession) -> dict[uuid.UUID, int]:
    """Get current stock (bags) for all bean types."""
    result = await db.execute(select(BeanType.id))
    bean_type_ids = [row[0] for row in result.fetchall()]

    stocks = {}
    for bt_id in bean_type_ids:
        stocks[bt_id] = await get_current_stock_bags(db, bt_id)

    return stocks


async def validate_stock_for_sale(
    db: AsyncSession, bean_type_id: uuid.UUID, quantity: float, quantity_bags: int = 0
) -> bool:
    """Check if there's enough stock for a sale.

    Checks bags stock if quantity_bags > 0, otherwise checks weight stock.
    """
    if quantity_bags > 0:
        current_bags = await get_current_stock_bags(db, bean_type_id)
        return current_bags >= quantity_bags
    current_stock = await get_current_stock(db, bean_type_id)
    return current_stock >= quantity


async def get_today_arrivals(db: AsyncSession, today: date | None = None) -> float:
    """Get total arrival weight for today."""
    if today is None:
        today = date.today()
    result = await db.execute(
        select(func.coalesce(func.sum(Arrival.weight_kg), 0)).where(
            Arrival.arrival_date == today
        )
    )
    return float(result.scalar() or 0)


async def get_today_arrivals_bags(db: AsyncSession, today: date | None = None) -> int:
    """Get total arrival bags for today."""
    if today is None:
        today = date.today()
    result = await db.execute(
        select(func.coalesce(func.sum(Arrival.quantity_bags), 0)).where(
            Arrival.arrival_date == today
        )
    )
    return int(result.scalar() or 0)


async def get_today_sales(db: AsyncSession, today: date | None = None) -> float:
    """Get total sales quantity for today."""
    if today is None:
        today = date.today()
    result = await db.execute(
        select(func.coalesce(func.sum(Sale.quantity), 0)).where(Sale.sale_date == today)
    )
    return float(result.scalar() or 0)


async def get_today_sales_bags(db: AsyncSession, today: date | None = None) -> int:
    """Get total sales bags for today."""
    if today is None:
        today = date.today()
    result = await db.execute(
        select(func.coalesce(func.sum(Sale.quantity_bags), 0)).where(Sale.sale_date == today)
    )
    return int(result.scalar() or 0)
