import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.deps import get_current_user
from app.models.bean_type import BeanType
from app.models.customer import Customer
from app.models.sale import Sale
from app.models.user import User
from app.schemas.customer import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)
from app.services.audit_service import create_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/customers", tags=["Customers"])


async def _get_customer_or_404(db: AsyncSession, customer_id: str) -> Customer:
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    customer = result.scalar_one_or_none()
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


async def _build_customer_response(db: AsyncSession, customer: Customer) -> dict:
    # Count sales and total
    count_result = await db.execute(
        select(func.count(Sale.id), func.coalesce(func.sum(Sale.sale_price), 0))
        .where(Sale.customer_id == customer.id)
    )
    row = count_result.one()
    sale_count = row[0] or 0
    total_purchases = float(row[1] or 0)

    # Recent 5 sales
    sale_result = await db.execute(
        select(Sale)
        .options(joinedload(Sale.bean_type))
        .where(Sale.customer_id == customer.id)
        .order_by(Sale.sale_date.desc(), Sale.created_at.desc())
        .limit(5)
    )
    recent_sales = sale_result.unique().scalars().all()

    recent_list = []
    for s in recent_sales:
        bt_name = None
        if s.bean_type:
            bt_name = s.bean_type.name
        recent_list.append({
            "id": s.id,
            "sale_date": s.sale_date.isoformat() if hasattr(s.sale_date, "isoformat") else str(s.sale_date),
            "bean_type_name": bt_name,
            "quantity": float(s.quantity),
            "quantity_bags": s.quantity_bags,
            "sale_price": float(s.sale_price),
            "total_amount": float(s.sale_price),
        })

    return {
        "id": customer.id,
        "name": customer.name,
        "phone": customer.phone,
        "email": customer.email,
        "address": customer.address,
        "notes": customer.notes,
        "is_active": customer.is_active,
        "outstanding_balance": float(customer.outstanding_balance),
        "created_at": customer.created_at,
        "updated_at": customer.updated_at,
        "sale_count": sale_count,
        "total_purchases": total_purchases,
        "recent_sales": recent_list,
    }


@router.get("", response_model=list[CustomerResponse])
async def list_customers(
    search: str | None = Query(None),
    active_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(Customer).order_by(Customer.name.asc())
    if active_only:
        query = query.where(Customer.is_active == True)
    if search:
        term = f"%{search}%"
        query = query.where(
            Customer.name.ilike(term)
            | Customer.phone.ilike(term)
            | Customer.email.ilike(term)
        )
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    customers = result.scalars().all()
    return [await _build_customer_response(db, c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    customer = await _get_customer_or_404(db, customer_id)
    return await _build_customer_response(db, customer)


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    request: CustomerCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = Customer(
        name=request.name,
        phone=request.phone,
        email=request.email,
        address=request.address,
        notes=request.notes,
    )
    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    await create_audit_log(
        db, str(user.id), "CREATE", "customers", customer.id,
        {"name": request.name},
    )
    return await _build_customer_response(db, customer)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: str,
    request: CustomerUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = await _get_customer_or_404(db, customer_id)
    if request.name is not None:
        customer.name = request.name
    if request.phone is not None:
        customer.phone = request.phone
    if request.email is not None:
        customer.email = request.email
    if request.address is not None:
        customer.address = request.address
    if request.notes is not None:
        customer.notes = request.notes
    if request.is_active is not None:
        customer.is_active = request.is_active
    if request.outstanding_balance is not None:
        customer.outstanding_balance = request.outstanding_balance

    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    await create_audit_log(
        db, str(user.id), "UPDATE", "customers", customer.id,
        {"name": customer.name},
    )
    return await _build_customer_response(db, customer)


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    customer = await _get_customer_or_404(db, customer_id)
    count_result = await db.execute(
        select(func.count(Sale.id)).where(Sale.customer_id == customer.id)
    )
    sale_count = count_result.scalar() or 0

    if sale_count > 0:
        customer.is_active = False
        db.add(customer)
        await db.flush()
        await create_audit_log(
            db, str(user.id), "DEACTIVATE", "customers", customer.id,
            {"name": customer.name, "reason": f"Has {sale_count} sale(s)"},
        )
        return {
            "message": f"Customer '{customer.name}' deactivated (has {sale_count} sale(s))",
            "soft_delete": True,
        }
    else:
        name = customer.name
        await db.delete(customer)
        await create_audit_log(
            db, str(user.id), "DELETE", "customers", customer_id,
            {"name": name},
        )
        return {"message": f"Customer '{name}' deleted successfully", "soft_delete": False}
