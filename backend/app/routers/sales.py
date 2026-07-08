import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.bean_type import BeanType
from app.models.sale import Sale
from app.models.user import User
from app.schemas.sale import SaleCreate, SaleResponse, SaleUpdate
from app.services.audit_service import create_audit_log
from app.services.inventory_service import validate_stock_for_sale

router = APIRouter(prefix="/api/sales", tags=["Sales"])


@router.get("/stock-check/{bean_type_id}")
async def check_stock(
    bean_type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Debug endpoint to check stock levels for a bean type."""
    from app.services.inventory_service import get_current_stock, get_current_stock_bags

    # Get bean type name
    bt_result = await db.execute(select(BeanType.name).where(BeanType.id == str(bean_type_id)))
    bt_name = bt_result.scalar_one_or_none()

    if bt_name is None:
        raise HTTPException(status_code=404, detail="Bean type not found")

    weight_stock = await get_current_stock(db, bean_type_id)
    bags_stock = await get_current_stock_bags(db, bean_type_id)

    return {
        "bean_type_id": str(bean_type_id),
        "bean_type_name": bt_name,
        "weight_stock_kg": weight_stock,
        "bags_stock": bags_stock,
    }


@router.get("", response_model=list[SaleResponse])
async def list_sales(
    bean_type_id: uuid.UUID | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List sales with optional filters."""
    query = select(Sale).order_by(Sale.sale_date.desc(), Sale.created_at.desc())

    if bean_type_id:
        query = query.where(Sale.bean_type_id == str(bean_type_id))
    if start_date:
        query = query.where(Sale.sale_date >= start_date)
    if end_date:
        query = query.where(Sale.sale_date <= end_date)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    sales = result.scalars().all()

    # Enrich with bean type names
    enriched = []
    for sale in sales:
        bt_result = await db.execute(select(BeanType.name).where(BeanType.id == sale.bean_type_id))
        bt_name = bt_result.scalar_one_or_none()
        enriched.append(SaleResponse(
            id=sale.id,
            bean_type_id=sale.bean_type_id,
            bean_type_name=bt_name,
            quantity_bags=sale.quantity_bags,
            quantity=float(sale.quantity),
            customer_name=sale.customer_name,
            sale_price=float(sale.sale_price),
            invoice_no=sale.invoice_no,
            sale_date=sale.sale_date,
            remarks=sale.remarks,
            created_by=sale.created_by,
            created_at=sale.created_at,
        ))

    return enriched


@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def create_sale(
    request: SaleCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Record a new sale (deducts stock). Validates that enough stock exists."""
    # Verify bean type exists
    bean_type_id_str = str(request.bean_type_id)
    bt_result = await db.execute(select(BeanType).where(BeanType.id == bean_type_id_str))
    bean_type = bt_result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=404, detail="Bean type not found")

    # Validate stock
    from app.services.inventory_service import get_current_stock, get_current_stock_bags
    has_stock = await validate_stock_for_sale(db, request.bean_type_id, request.quantity, request.quantity_bags)
    if not has_stock:
        if request.quantity_bags > 0:
            current_bags = await get_current_stock_bags(db, request.bean_type_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient bags stock. Available: {current_bags} bags, requested: {request.quantity_bags} bags",
            )
        else:
            current_stock = await get_current_stock(db, request.bean_type_id)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient weight stock. Available: {current_stock:.2f} kg, requested: {request.quantity:.2f} kg",
            )

    sale = Sale(
        bean_type_id=str(request.bean_type_id),
        quantity_bags=request.quantity_bags,
        quantity=request.quantity,
        customer_name=request.customer_name,
        sale_price=request.sale_price,
        invoice_no=request.invoice_no,
        sale_date=request.sale_date,
        remarks=request.remarks,
        created_by=str(user.id),
    )
    db.add(sale)
    await db.flush()

    await create_audit_log(
        db, user.id, "CREATE", "sales", sale.id,
        {
            "bean_type": bean_type.name,
            "quantity": request.quantity,
            "customer_name": request.customer_name,
        }
    )

    return SaleResponse(
        id=sale.id,
        bean_type_id=sale.bean_type_id,
        bean_type_name=bean_type.name,
        quantity_bags=sale.quantity_bags,
        quantity=float(sale.quantity),
        customer_name=sale.customer_name,
        sale_price=float(sale.sale_price),
        invoice_no=sale.invoice_no,
        sale_date=sale.sale_date,
        remarks=sale.remarks,
        created_by=sale.created_by,
        created_at=sale.created_at,
    )


@router.put("/{sale_id}", response_model=SaleResponse)
async def update_sale(
    sale_id: uuid.UUID,
    request: SaleUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a sale record."""
    sale_id_str = str(sale_id)
    result = await db.execute(select(Sale).where(Sale.id == sale_id_str))
    sale = result.scalar_one_or_none()
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")

    if request.bean_type_id is not None:
        bt_result = await db.execute(select(BeanType).where(BeanType.id == str(request.bean_type_id)))
        if bt_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Bean type not found")
        sale.bean_type_id = str(request.bean_type_id)
    if request.quantity_bags is not None:
        sale.quantity_bags = request.quantity_bags
    if request.quantity is not None:
        sale.quantity = request.quantity
    if request.customer_name is not None:
        sale.customer_name = request.customer_name
    if request.sale_price is not None:
        sale.sale_price = request.sale_price
    if request.invoice_no is not None:
        sale.invoice_no = request.invoice_no
    if request.sale_date is not None:
        sale.sale_date = request.sale_date
    if request.remarks is not None:
        sale.remarks = request.remarks

    db.add(sale)
    await db.flush()

    bt_result = await db.execute(select(BeanType.name).where(BeanType.id == sale.bean_type_id))
    bt_name = bt_result.scalar_one_or_none()

    await create_audit_log(db, str(user.id), "UPDATE", "sales", sale_id_str, None)

    return SaleResponse(
        id=sale.id,
        bean_type_id=sale.bean_type_id,
        bean_type_name=bt_name,
        quantity_bags=sale.quantity_bags,
        quantity=float(sale.quantity),
        customer_name=sale.customer_name,
        sale_price=float(sale.sale_price),
        invoice_no=sale.invoice_no,
        sale_date=sale.sale_date,
        remarks=sale.remarks,
        created_by=sale.created_by,
        created_at=sale.created_at,
    )


@router.delete("/{sale_id}")
async def delete_sale(
    sale_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a sale record."""
    sale_id_str = str(sale_id)
    result = await db.execute(select(Sale).where(Sale.id == sale_id_str))
    sale = result.scalar_one_or_none()
    if sale is None:
        raise HTTPException(status_code=404, detail="Sale not found")

    await db.delete(sale)
    await create_audit_log(db, str(user.id), "DELETE", "sales", sale_id_str, None)
    return {"message": "Sale deleted successfully"}
