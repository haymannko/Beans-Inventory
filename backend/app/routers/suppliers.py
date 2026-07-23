import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_admin_user, get_current_user
from app.models.purchase_order import PurchaseOrder
from app.models.supplier import Supplier
from app.models.user import User
from app.schemas.supplier import (
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
    RecentPurchaseOrder,
)
from app.services.audit_service import create_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/suppliers", tags=["Suppliers"])


# ─── Helpers ─────────────────────────────────────────────────────────────────


async def _get_supplier_or_404(db: AsyncSession, supplier_id: str) -> Supplier:
    """Fetch a supplier by ID or raise 404."""
    result = await db.execute(
        select(Supplier).where(Supplier.id == supplier_id)
    )
    supplier = result.scalar_one_or_none()
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


async def _build_supplier_response(
    db: AsyncSession, supplier: Supplier
) -> dict:
    """Build a full supplier response with purchase history."""
    # Count purchase orders
    count_result = await db.execute(
        select(func.count(PurchaseOrder.id)).where(
            PurchaseOrder.supplier_id == supplier.id
        )
    )
    po_count = count_result.scalar() or 0

    # Get recent 5 purchase orders
    po_result = await db.execute(
        select(PurchaseOrder)
        .where(PurchaseOrder.supplier_id == supplier.id)
        .order_by(PurchaseOrder.created_at.desc())
        .limit(5)
    )
    recent_pos = po_result.scalars().all()

    recent_po_list = []
    for po in recent_pos:
        total_amount = sum(
            float(item.total_price) for item in po.items
        ) if po.items else 0
        recent_po_list.append({
            "id": po.id,
            "po_number": po.po_number,
            "status": po.status,
            "order_date": po.order_date.isoformat() if hasattr(po.order_date, "isoformat") else str(po.order_date),
            "total_amount": total_amount,
            "item_count": len(po.items) if po.items else 0,
        })

    return {
        "id": supplier.id,
        "company_name": supplier.company_name,
        "contact_person": supplier.contact_person,
        "phone": supplier.phone,
        "email": supplier.email,
        "address": supplier.address,
        "notes": supplier.notes,
        "is_active": supplier.is_active,
        "created_at": supplier.created_at,
        "updated_at": supplier.updated_at,
        "purchase_order_count": po_count,
        "recent_purchase_orders": recent_po_list,
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[SupplierResponse])
async def list_suppliers(
    search: str | None = Query(None),
    active_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List suppliers with search and pagination."""
    query = select(Supplier).order_by(Supplier.company_name.asc())

    if active_only:
        query = query.where(Supplier.is_active == True)

    if search:
        search_term = f"%{search}%"
        query = query.where(
            Supplier.company_name.ilike(search_term)
            | (Supplier.contact_person.ilike(search_term))
            | (Supplier.phone.ilike(search_term))
            | (Supplier.email.ilike(search_term))
        )

    # Get total count for pagination metadata
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    suppliers = result.scalars().all()

    # Build responses with purchase history
    responses = []
    for supplier in suppliers:
        resp = await _build_supplier_response(db, supplier)
        responses.append(resp)

    # Attach total count as response header
    responses_with_count = responses  # FastAPI response_model handles the list

    return responses


@router.get("/{supplier_id}", response_model=SupplierResponse)
async def get_supplier(
    supplier_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single supplier with purchase history."""
    supplier = await _get_supplier_or_404(db, supplier_id)
    return await _build_supplier_response(db, supplier)


@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
async def create_supplier(
    request: SupplierCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new supplier."""
    # Check for duplicate company name
    existing = await db.execute(
        select(Supplier).where(Supplier.company_name == request.company_name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail=f"Supplier '{request.company_name}' already exists",
        )

    supplier = Supplier(
        company_name=request.company_name,
        contact_person=request.contact_person,
        phone=request.phone,
        email=request.email,
        address=request.address,
        notes=request.notes,
    )
    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)

    await create_audit_log(
        db, str(user.id), "CREATE", "suppliers", supplier.id,
        {"company_name": request.company_name},
    )

    return await _build_supplier_response(db, supplier)


@router.put("/{supplier_id}", response_model=SupplierResponse)
async def update_supplier(
    supplier_id: str,
    request: SupplierUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a supplier."""
    supplier = await _get_supplier_or_404(db, supplier_id)

    # Check for duplicate company name if changing it
    if request.company_name and request.company_name != supplier.company_name:
        existing = await db.execute(
            select(Supplier).where(Supplier.company_name == request.company_name)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail=f"Supplier '{request.company_name}' already exists",
            )
        supplier.company_name = request.company_name

    if request.contact_person is not None:
        supplier.contact_person = request.contact_person
    if request.phone is not None:
        supplier.phone = request.phone
    if request.email is not None:
        supplier.email = request.email
    if request.address is not None:
        supplier.address = request.address
    if request.notes is not None:
        supplier.notes = request.notes
    if request.is_active is not None:
        supplier.is_active = request.is_active

    db.add(supplier)
    await db.flush()
    await db.refresh(supplier)

    await create_audit_log(
        db, str(user.id), "UPDATE", "suppliers", supplier.id,
        {"company_name": supplier.company_name},
    )

    return await _build_supplier_response(db, supplier)


@router.delete("/{supplier_id}")
async def delete_supplier(
    supplier_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete or deactivate a supplier.

    If the supplier has associated purchase orders, perform a soft-delete
    (set is_active=False). Otherwise, hard-delete the record.
    """
    supplier = await _get_supplier_or_404(db, supplier_id)

    # Check for associated purchase orders
    po_count_result = await db.execute(
        select(func.count(PurchaseOrder.id)).where(
            PurchaseOrder.supplier_id == supplier.id
        )
    )
    po_count = po_count_result.scalar() or 0

    if po_count > 0:
        # Soft delete — deactivate
        supplier.is_active = False
        db.add(supplier)
        await db.flush()
        await create_audit_log(
            db, str(user.id), "DEACTIVATE", "suppliers", supplier.id,
            {"company_name": supplier.company_name, "reason": f"Has {po_count} purchase order(s)"},
        )
        return {
            "message": f"Supplier '{supplier.company_name}' deactivated (has {po_count} purchase order(s))",
            "soft_delete": True,
        }
    else:
        # Hard delete
        company_name = supplier.company_name
        await db.delete(supplier)
        await create_audit_log(
            db, str(user.id), "DELETE", "suppliers", supplier_id,
            {"company_name": company_name},
        )
        return {"message": f"Supplier '{company_name}' deleted successfully", "soft_delete": False}
