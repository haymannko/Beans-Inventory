from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.arrival import Arrival
from app.models.bean_type import BeanType
from app.models.sale import Sale
from app.models.stock_adjustment import StockAdjustment
from app.models.storage import Storage
from app.models.user import User
from app.models.warehouse import Warehouse
from app.models.warehouse_transfer import WarehouseTransfer
from app.schemas.dashboard import DashboardResponse, StockByBeanType
from app.services.inventory_service import get_all_stocks, get_all_stocks_bags, get_today_arrivals, get_today_arrivals_bags, get_today_sales, get_today_sales_bags

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
async def get_dashboard(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get dashboard data with stock levels, alerts, and recent activity."""
    # Get all bean types
    bt_result = await db.execute(select(BeanType).order_by(BeanType.name))
    bean_types = bt_result.scalars().all()

    # Get current stocks
    stocks = await get_all_stocks(db)
    stocks_bags = await get_all_stocks_bags(db)

    # Get storage bags per bean type
    storage_result = await db.execute(
        select(
            Storage.bean_type_id,
            func.coalesce(func.sum(Storage.quantity_bags), 0).label("total_bags"),
        ).group_by(Storage.bean_type_id)
    )
    storage_by_type = {row.bean_type_id: int(row.total_bags) for row in storage_result.fetchall()}

    # Get storage bags per warehouse (from warehouse_id FK when available)
    wh_storage_result = await db.execute(
        select(
            Storage.warehouse_id,
            func.coalesce(func.sum(Storage.quantity_bags), 0).label("total_bags"),
        ).where(Storage.warehouse_id.isnot(None))
        .group_by(Storage.warehouse_id)
    )
    wh_bags = {row.warehouse_id: int(row.total_bags) for row in wh_storage_result.fetchall()}

    # Get storage from warehouse_name fallback
    wh_name_result = await db.execute(
        select(
            func.coalesce(Storage.warehouse_name, "Unknown").label("warehouse_name"),
            func.coalesce(func.sum(Storage.quantity_bags), 0).label("total_bags"),
        ).where(Storage.warehouse_id.is_(None))
        .group_by(Storage.warehouse_name)
    )
    name_bags = {row.warehouse_name: int(row.total_bags) for row in wh_name_result.fetchall()}

    # Build warehouse list — start with named warehouses from Warehouse table
    storage_by_warehouse = []
    wh_result = await db.execute(
        select(Warehouse.id, Warehouse.name).where(Warehouse.is_active == True)
    )
    for wh_id, wh_name in wh_result.fetchall():
        bags = wh_bags.get(wh_id, 0)
        # Add transfer contributions
        in_result = await db.execute(
            select(func.coalesce(func.sum(WarehouseTransfer.quantity_bags), 0)).where(
                WarehouseTransfer.to_warehouse_id == wh_id
            )
        )
        bags += int(in_result.scalar() or 0)
        out_result = await db.execute(
            select(func.coalesce(func.sum(WarehouseTransfer.quantity_bags), 0)).where(
                WarehouseTransfer.from_warehouse_id == wh_id
            )
        )
        bags -= int(out_result.scalar() or 0)
        if bags > 0 or wh_name in name_bags:
            storage_by_warehouse.append({"warehouse_name": wh_name, "quantity_bags": max(0, bags)})

    # Add any remaining free-text warehouse names not linked to a Warehouse record
    for name, bags in name_bags.items():
        if not any(w["warehouse_name"] == name for w in storage_by_warehouse):
            storage_by_warehouse.append({"warehouse_name": name, "quantity_bags": bags})

    # Total bean types
    total_bean_types = len(bean_types)

    # Total current stock
    total_current_stock = sum(stocks.values())
    total_current_stock_bags = sum(stocks_bags.values())
    total_storage_bags = sum(storage_by_type.values())

    # Today's arrivals and sales
    today = date.today()
    today_arrivals = await get_today_arrivals(db, today)
    today_arrivals_bags = await get_today_arrivals_bags(db, today)
    today_sales = await get_today_sales(db, today)
    today_sales_bags = await get_today_sales_bags(db, today)

    # Stock by bean type
    stock_by_type = []
    for bt in bean_types:
        stock = stocks.get(bt.id, 0)
        stock_bags = stocks_bags.get(bt.id, 0)
        storage_bags = storage_by_type.get(str(bt.id), 0)
        stock_by_type.append(StockByBeanType(
            bean_type_id=str(bt.id),
            bean_type_name=bt.name,
            total_stock=stock,
            total_stock_bags=stock_bags,
            storage_bags=storage_bags,
        ))

    # Low stock alerts (stock < 10 bags)
    low_stock_alerts = [s for s in stock_by_type if s.total_stock_bags < 10]

    # Recent transactions (last 10 arrivals + sales)
    recent_arrivals = await db.execute(
        select(Arrival).order_by(Arrival.created_at.desc()).limit(5)
    )
    recent_sales = await db.execute(
        select(Sale).order_by(Sale.created_at.desc()).limit(5)
    )

    recent_transactions = []
    for arrival in recent_arrivals.scalars().all():
        bt_name = next((bt.name for bt in bean_types if bt.id == arrival.bean_type_id), None)
        recent_transactions.append({
            "type": "arrival",
            "date": arrival.arrival_date.isoformat(),
            "bean_type": bt_name,
            "quantity": int(arrival.quantity_bags),
            "unit": "bags",
            "created_at": arrival.created_at.isoformat(),
        })

    for sale in recent_sales.scalars().all():
        bt_name = next((bt.name for bt in bean_types if bt.id == sale.bean_type_id), None)
        recent_transactions.append({
            "type": "sale",
            "date": sale.sale_date.isoformat(),
            "bean_type": bt_name,
            "quantity": int(sale.quantity_bags),
            "unit": "bags",
            "created_at": sale.created_at.isoformat(),
        })

    # Sort by created_at descending
    recent_transactions.sort(key=lambda x: x["created_at"], reverse=True)
    recent_transactions = recent_transactions[:10]

    # Monthly sales (last 6 months) - in bags
    monthly_sales = []
    for i in range(6):
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)

        result = await db.execute(
            select(func.coalesce(func.sum(Sale.quantity_bags), 0)).where(
                Sale.sale_date >= month_start,
                Sale.sale_date < month_end,
            )
        )
        monthly_sales.append({
            "month": month_start.strftime("%Y-%m"),
            "total": int(result.scalar() or 0),
        })

    monthly_sales.reverse()

    # Monthly arrivals (last 6 months) - in bags
    monthly_arrivals = []
    for i in range(6):
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)

        result = await db.execute(
            select(func.coalesce(func.sum(Arrival.quantity_bags), 0)).where(
                Arrival.arrival_date >= month_start,
                Arrival.arrival_date < month_end,
            )
        )
        monthly_arrivals.append({
            "month": month_start.strftime("%Y-%m"),
            "total": int(result.scalar() or 0),
        })

    monthly_arrivals.reverse()

    return DashboardResponse(
        total_bean_types=total_bean_types,
        total_current_stock=total_current_stock,
        total_current_stock_bags=total_current_stock_bags,
        total_storage_bags=total_storage_bags,
        storage_by_warehouse=storage_by_warehouse,
        today_arrivals=today_arrivals,
        today_arrivals_bags=today_arrivals_bags,
        today_sales=today_sales,
        today_sales_bags=today_sales_bags,
        low_stock_alerts=low_stock_alerts,
        recent_transactions=recent_transactions,
        stock_by_type=stock_by_type,
        monthly_sales=monthly_sales,
        monthly_arrivals=monthly_arrivals,
    )
