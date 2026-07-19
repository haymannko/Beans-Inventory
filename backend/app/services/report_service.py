import uuid
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.arrival import Arrival
from app.models.bean_type import BeanType
from app.models.sale import Sale
from app.models.stock_adjustment import StockAdjustment


async def generate_report(
    db: AsyncSession,
    report_type: str,
    start_date: date | None = None,
    end_date: date | None = None,
    bean_type_id: uuid.UUID | None = None,
) -> dict:
    """Generate a report based on type and date range."""
    today = date.today()

    if report_type == "daily":
        start_date = today
        end_date = today
    elif report_type == "weekly":
        start_date = today - timedelta(days=7)
        end_date = today
    elif report_type == "monthly":
        start_date = today.replace(day=1)
        end_date = today
    elif report_type == "yearly":
        start_date = today.replace(month=1, day=1)
        end_date = today
    elif report_type == "custom":
        if start_date is None or end_date is None:
            raise ValueError("Custom report requires start_date and end_date")
    else:
        raise ValueError(f"Unknown report type: {report_type}")

    # Arrivals summary
    arrivals_query = select(
        func.count(Arrival.id),
        func.coalesce(func.sum(Arrival.quantity_bags), 0),
        func.coalesce(func.sum(Arrival.purchase_price * Arrival.quantity_bags), 0),
    ).where(Arrival.arrival_date.between(start_date, end_date))

    if bean_type_id:
        arrivals_query = arrivals_query.where(Arrival.bean_type_id == bean_type_id)

    arrivals_result = await db.execute(arrivals_query)
    arrivals_row = arrivals_result.one()

    # Arrivals by bean type (bags per type)
    arrivals_by_type_query = (
        select(
            BeanType.name,
            BeanType.description,
            func.coalesce(func.sum(Arrival.quantity_bags), 0).label("total_bags"),
        )
        .join(BeanType, Arrival.bean_type_id == BeanType.id)
        .where(Arrival.arrival_date.between(start_date, end_date))
        .group_by(BeanType.name, BeanType.description)
        .order_by(BeanType.name)
    )

    if bean_type_id:
        arrivals_by_type_query = arrivals_by_type_query.where(Arrival.bean_type_id == bean_type_id)

    arrivals_by_type_result = await db.execute(arrivals_by_type_query)
    arrivals_by_type = [
        {"bean_type_name": row.name, "bean_type_description": row.description, "quantity_bags": int(row.total_bags)}
        for row in arrivals_by_type_result.fetchall()
    ]

    # Sales summary
    sales_query = select(
        func.count(Sale.id),
        func.coalesce(func.sum(Sale.quantity_bags), 0),
        func.coalesce(func.sum(Sale.sale_price * Sale.quantity_bags), 0),
    ).where(Sale.sale_date.between(start_date, end_date))

    if bean_type_id:
        sales_query = sales_query.where(Sale.bean_type_id == bean_type_id)

    sales_result = await db.execute(sales_query)
    sales_row = sales_result.one()

    # Sales by bean type (bags per type)
    sales_by_type_query = (
        select(
            BeanType.name,
            BeanType.description,
            func.coalesce(func.sum(Sale.quantity_bags), 0).label("total_bags"),
        )
        .join(BeanType, Sale.bean_type_id == BeanType.id)
        .where(Sale.sale_date.between(start_date, end_date))
        .group_by(BeanType.name, BeanType.description)
        .order_by(BeanType.name)
    )

    if bean_type_id:
        sales_by_type_query = sales_by_type_query.where(Sale.bean_type_id == bean_type_id)

    sales_by_type_result = await db.execute(sales_by_type_query)
    sales_by_type = [
        {"bean_type_name": row.name, "bean_type_description": row.description, "quantity_bags": int(row.total_bags)}
        for row in sales_by_type_result.fetchall()
    ]

    # Adjustments summary
    adj_query = select(
        func.count(StockAdjustment.id),
        func.coalesce(func.sum(StockAdjustment.quantity), 0),
    ).where(StockAdjustment.adjustment_date.between(start_date, end_date))

    if bean_type_id:
        adj_query = adj_query.where(StockAdjustment.bean_type_id == bean_type_id)

    adj_result = await db.execute(adj_query)
    adj_row = adj_result.one()

    # Adjustments detail list
    adj_detail_query = (
        select(
            BeanType.name,
            BeanType.description,
            StockAdjustment.adjustment_type,
            StockAdjustment.quantity,
        )
        .join(BeanType, StockAdjustment.bean_type_id == BeanType.id)
        .where(StockAdjustment.adjustment_date.between(start_date, end_date))
        .order_by(StockAdjustment.adjustment_date.desc())
    )

    if bean_type_id:
        adj_detail_query = adj_detail_query.where(StockAdjustment.bean_type_id == bean_type_id)

    adj_detail_result = await db.execute(adj_detail_query)
    adjustments_list = [
        {
            "bean_type_name": row.name,
            "bean_type_description": row.description,
            "adjustment_type": row.adjustment_type,
            "quantity_viss": float(row.quantity),
        }
        for row in adj_detail_result.fetchall()
    ]

    return {
        "report_type": report_type,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "arrivals": {
            "count": arrivals_row[0],
            "bags_by_type": arrivals_by_type,
            "total_cost": float(arrivals_row[2]),
        },
        "sales": {
            "count": sales_row[0],
            "bags_by_type": sales_by_type,
            "total_revenue": float(sales_row[2]),
        },
        "adjustments": {
            "count": adj_row[0],
            "total_quantity_viss": float(adj_row[1]),
            "details": adjustments_list,
        },
    }
