import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.arrival import Arrival
from app.models.bean_type import BeanType
from app.models.purchase_order import (
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
)
from app.models.user import User
from app.models.weight_master import WeightMaster
from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    PurchaseOrderStatusUpdate,
    PurchaseOrderUpdate,
    ReceiveItemsRequest,
)
from app.services.audit_service import create_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/purchase-orders", tags=["Purchase Orders"])

# ─── Status transition rules ──────────────────────────────────────────────────

VALID_TRANSITIONS: dict[str, set[str]] = {
    PurchaseOrderStatus.DRAFT.value: {PurchaseOrderStatus.APPROVED.value, PurchaseOrderStatus.CANCELLED.value},
    PurchaseOrderStatus.APPROVED.value: {PurchaseOrderStatus.ORDERED.value, PurchaseOrderStatus.CANCELLED.value},
    PurchaseOrderStatus.ORDERED.value: {PurchaseOrderStatus.RECEIVED.value, PurchaseOrderStatus.CANCELLED.value},
    PurchaseOrderStatus.RECEIVED.value: set(),  # Terminal state — no further transitions
    PurchaseOrderStatus.CANCELLED.value: set(),  # Terminal state
}


# ─── Helpers ──────────────────────────────────────────────────────────────────


async def _generate_po_number(db: AsyncSession) -> str:
    """Generate the next PO number: PO-{year}-{sequential:04d}."""
    year = date.today().year
    prefix = f"PO-{year}-"
    result = await db.execute(
        select(func.max(PurchaseOrder.po_number)).where(
            PurchaseOrder.po_number.like(f"{prefix}%")
        )
    )
    max_po = result.scalar_one_or_none()
    if max_po:
        seq = int(max_po.split("-")[-1]) + 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"


async def _get_po_or_404(db: AsyncSession, po_id: str) -> PurchaseOrder:
    """Fetch a PO by ID or raise 404."""
    result = await db.execute(
        select(PurchaseOrder).where(PurchaseOrder.id == po_id)
    )
    po = result.scalar_one_or_none()
    if po is None:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


async def _enrich_items_with_bean_names(
    db: AsyncSession, items: list[PurchaseOrderItem]
) -> list[dict]:
    """Attach bean_type_name to each item."""
    enriched = []
    for item in items:
        bt_result = await db.execute(
            select(BeanType.name).where(BeanType.id == item.bean_type_id)
        )
        bt_name = bt_result.scalar_one_or_none()
        enriched.append({
            "id": item.id,
            "purchase_order_id": item.purchase_order_id,
            "bean_type_id": item.bean_type_id,
            "bean_type_name": bt_name,
            "quantity_bags": item.quantity_bags,
            "unit_price": float(item.unit_price),
            "total_price": float(item.total_price),
            "received_quantity_bags": item.received_quantity_bags,
            "notes": item.notes,
        })
    return enriched


async def _build_po_response(
    db: AsyncSession, po: PurchaseOrder
) -> dict:
    """Build a full PO response dict with enriched items."""
    enriched_items = await _enrich_items_with_bean_names(db, po.items)
    return {
        "id": po.id,
        "po_number": po.po_number,
        "supplier_name": po.supplier_name,
        "status": po.status,
        "order_date": po.order_date,
        "expected_delivery_date": po.expected_delivery_date,
        "notes": po.notes,
        "created_by": po.created_by,
        "created_at": po.created_at,
        "updated_at": po.updated_at,
        "items": enriched_items,
    }


async def _create_arrivals_from_po(
    db: AsyncSession,
    po: PurchaseOrder,
    user: User,
    received_map: dict[str, int] | None = None,
) -> None:
    """Create Arrival records for received PO items to update stock."""
    for item in po.items:
        received_qty = received_map.get(item.id, item.quantity_bags) if received_map else item.quantity_bags
        if received_qty <= 0:
            continue

        # Look up weight per bag from WeightMaster
        bt_result = await db.execute(
            select(BeanType.name).where(BeanType.id == item.bean_type_id)
        )
        bean_name = bt_result.scalar_one_or_none()
        if bean_name is None:
            continue

        wm_result = await db.execute(
            select(WeightMaster.weight).where(WeightMaster.bean_name == bean_name)
        )
        weight_per_bag = wm_result.scalar_one_or_none() or 1.0
        weight_kg = round(float(received_qty) * float(weight_per_bag), 2)

        arrival = Arrival(
            bean_type_id=item.bean_type_id,
            quantity_bags=received_qty,
            weight_kg=weight_kg,
            supplier_name=po.supplier_name,
            purchase_price=float(item.unit_price),
            transport_fee=0,
            labor_fee=0,
            arrival_date=date.today(),
            remarks=f"From PO: {po.po_number}",
            created_by=str(user.id),
        )
        db.add(arrival)


async def _apply_status_transition(
    db: AsyncSession,
    po: PurchaseOrder,
    new_status: str,
    user: User,
) -> PurchaseOrder:
    """Validate and apply a status transition."""
    allowed = VALID_TRANSITIONS.get(po.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from '{po.status}' to '{new_status}'. "
                   f"Allowed transitions from '{po.status}': {allowed or '(none)'}",
        )

    old_status = po.status
    po.status = new_status

    # If transitioning to received, create arrival records for stock update
    if new_status == PurchaseOrderStatus.RECEIVED.value:
        await _create_arrivals_from_po(db, po, user)

    db.add(po)
    await db.flush()

    await create_audit_log(
        db, str(user.id), "STATUS_CHANGE", "purchase_orders", po.id,
        {"from": old_status, "to": new_status},
    )

    return po


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.get("", response_model=list[PurchaseOrderResponse])
async def list_purchase_orders(
    status_filter: str | None = Query(None, alias="status"),
    supplier: str | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List purchase orders with optional filters."""
    query = select(PurchaseOrder).order_by(
        PurchaseOrder.created_at.desc()
    )

    if status_filter:
        query = query.where(PurchaseOrder.status == status_filter)
    if supplier:
        query = query.where(PurchaseOrder.supplier_name.ilike(f"%{supplier}%"))
    if start_date:
        query = query.where(PurchaseOrder.order_date >= start_date)
    if end_date:
        query = query.where(PurchaseOrder.order_date <= end_date)
    if search:
        query = query.where(
            PurchaseOrder.po_number.ilike(f"%{search}%")
            | PurchaseOrder.supplier_name.ilike(f"%{search}%")
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    pos = result.scalars().all()

    return [await _build_po_response(db, po) for po in pos]


@router.get("/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single purchase order with items."""
    po = await _get_po_or_404(db, po_id)
    return await _build_po_response(db, po)


@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    request: PurchaseOrderCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new purchase order with items."""
    if request.status not in ("draft", "approved"):
        raise HTTPException(
            status_code=400,
            detail="New purchase order must be 'draft' or 'approved' status",
        )

    # Validate bean types
    for item in request.items:
        bt_result = await db.execute(
            select(BeanType).where(BeanType.id == item.bean_type_id)
        )
        if bt_result.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=404,
                detail=f"Bean type '{item.bean_type_id}' not found",
            )

    # Generate PO number
    po_number = await _generate_po_number(db)

    po = PurchaseOrder(
        po_number=po_number,
        supplier_name=request.supplier_name,
        status=request.status or PurchaseOrderStatus.DRAFT.value,
        order_date=request.order_date,
        expected_delivery_date=request.expected_delivery_date,
        notes=request.notes,
        created_by=str(user.id),
    )
    db.add(po)
    await db.flush()

    # Create items
    for item_data in request.items:
        total_price = item_data.total_price or round(item_data.quantity_bags * item_data.unit_price, 2)
        item = PurchaseOrderItem(
            purchase_order_id=po.id,
            bean_type_id=item_data.bean_type_id,
            quantity_bags=item_data.quantity_bags,
            unit_price=item_data.unit_price,
            total_price=total_price,
            notes=item_data.notes,
        )
        db.add(item)

    await db.flush()

    # Refresh to get items
    await db.refresh(po)

    await create_audit_log(
        db, str(user.id), "CREATE", "purchase_orders", po.id,
        {
            "po_number": po.po_number,
            "supplier": request.supplier_name,
            "item_count": len(request.items),
        },
    )

    return await _build_po_response(db, po)


@router.put("/{po_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    po_id: str,
    request: PurchaseOrderUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a purchase order. Only draft/approved POs can be edited."""
    po = await _get_po_or_404(db, po_id)

    if po.status not in (PurchaseOrderStatus.DRAFT.value, PurchaseOrderStatus.APPROVED.value):
        raise HTTPException(
            status_code=400,
            detail="Only draft or approved purchase orders can be edited",
        )

    if request.supplier_name is not None:
        po.supplier_name = request.supplier_name
    if request.order_date is not None:
        po.order_date = request.order_date
    if request.expected_delivery_date is not None:
        po.expected_delivery_date = request.expected_delivery_date
    if request.notes is not None:
        po.notes = request.notes

    # Replace items if provided
    if request.items is not None:
        # Load and delete existing items
        existing_items = await db.execute(
            select(PurchaseOrderItem).where(
                PurchaseOrderItem.purchase_order_id == po.id
            )
        )
        for old_item in existing_items.scalars().all():
            await db.delete(old_item)

        # Flush, then expire the stale relationship cache
        await db.flush()
        await db.refresh(po)

        # Create new items (po.items is now empty after refresh)
        for item_data in request.items:
            if not item_data.bean_type_id:
                raise HTTPException(status_code=400, detail="bean_type_id is required for each item")

            bt_result = await db.execute(
                select(BeanType).where(BeanType.id == item_data.bean_type_id)
            )
            if bt_result.scalar_one_or_none() is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Bean type '{item_data.bean_type_id}' not found",
                )

            qty = item_data.quantity_bags or 1
            price = item_data.unit_price or 0
            total_price = item_data.total_price or round(qty * price, 2)

            item = PurchaseOrderItem(
                purchase_order_id=po.id,
                bean_type_id=item_data.bean_type_id,
                quantity_bags=qty,
                unit_price=price,
                total_price=total_price,
                notes=item_data.notes,
            )
            db.add(item)

    db.add(po)
    await db.flush()
    await db.refresh(po)

    await create_audit_log(
        db, str(user.id), "UPDATE", "purchase_orders", po.id,
        {"po_number": po.po_number},
    )

    return await _build_po_response(db, po)


@router.delete("/{po_id}")
async def delete_purchase_order(
    po_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a purchase order. Only draft POs can be deleted."""
    po = await _get_po_or_404(db, po_id)

    if po.status != PurchaseOrderStatus.DRAFT.value:
        raise HTTPException(
            status_code=400,
            detail="Only draft purchase orders can be deleted",
        )

    await db.delete(po)
    await create_audit_log(
        db, str(user.id), "DELETE", "purchase_orders", po_id,
        {"po_number": po.po_number},
    )
    return {"message": "Purchase order deleted successfully"}


@router.patch("/{po_id}/status", response_model=PurchaseOrderResponse)
async def update_purchase_order_status(
    po_id: str,
    request: PurchaseOrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Transition a purchase order to a new status."""
    po = await _get_po_or_404(db, po_id)
    po = await _apply_status_transition(db, po, request.status, user)
    await db.refresh(po)
    return await _build_po_response(db, po)


@router.post("/{po_id}/receive", response_model=PurchaseOrderResponse)
async def receive_purchase_order_items(
    po_id: str,
    request: ReceiveItemsRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Receive items against a purchase order. Only works for 'ordered' POs."""
    po = await _get_po_or_404(db, po_id)

    if po.status != PurchaseOrderStatus.ORDERED.value:
        raise HTTPException(
            status_code=400,
            detail="Only purchase orders in 'ordered' status can receive items",
        )

    # Build item lookup
    items_map = {item.id: item for item in po.items}
    received_map: dict[str, int] = {}

    for receive_item in request.items:
        item = items_map.get(receive_item.item_id)
        if item is None:
            raise HTTPException(
                status_code=404,
                detail=f"Item '{receive_item.item_id}' not found in this purchase order",
            )

        new_received = item.received_quantity_bags + receive_item.received_quantity_bags
        if new_received > item.quantity_bags:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot receive {new_received} bags for item '{item.id}' "
                       f"— ordered {item.quantity_bags}, already received {item.received_quantity_bags}",
            )

        item.received_quantity_bags = new_received
        db.add(item)
        received_map[item.id] = receive_item.received_quantity_bags

    # Create arrival records for stock update
    await _create_arrivals_from_po(db, po, user, received_map)

    # Auto-transition to received if all items are fully received
    all_received = all(
        item.received_quantity_bags >= item.quantity_bags for item in po.items
    )
    if all_received:
        po.status = PurchaseOrderStatus.RECEIVED.value
        logger.info(f"PO {po.po_number}: all items received, auto-transitioning to 'received'")

    db.add(po)
    await db.flush()
    await db.refresh(po)

    await create_audit_log(
        db, str(user.id), "RECEIVE", "purchase_orders", po.id,
        {
            "po_number": po.po_number,
            "received_items": len(received_map),
            "all_received": all_received,
        },
    )

    return await _build_po_response(db, po)
