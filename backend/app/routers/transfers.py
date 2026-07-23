import logging
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.deps import get_current_user
from app.models.bean_type import BeanType
from app.models.storage import Storage
from app.models.user import User
from app.models.warehouse import Warehouse
from app.models.warehouse_transfer import WarehouseTransfer
from app.schemas.warehouse import TransferCreate, TransferResponse
from app.services.audit_service import create_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/transfers", tags=["Transfers"])


def _calculate_inventory_for_bean(
    storage_bags: int,
    incoming_bags: int,
    outgoing_bags: int,
) -> int:
    return storage_bags + incoming_bags - outgoing_bags


@router.get("", response_model=list[TransferResponse])
async def list_transfers(
    from_warehouse_id: str | None = Query(None),
    to_warehouse_id: str | None = Query(None),
    bean_type_id: str | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List warehouse transfers with optional filters."""
    query = (
        select(WarehouseTransfer)
        .options(
            joinedload(WarehouseTransfer.from_warehouse),
            joinedload(WarehouseTransfer.to_warehouse),
            joinedload(WarehouseTransfer.bean_type),
        )
        .order_by(WarehouseTransfer.transfer_date.desc(), WarehouseTransfer.created_at.desc())
    )

    if from_warehouse_id:
        query = query.where(WarehouseTransfer.from_warehouse_id == from_warehouse_id)
    if to_warehouse_id:
        query = query.where(WarehouseTransfer.to_warehouse_id == to_warehouse_id)
    if bean_type_id:
        query = query.where(WarehouseTransfer.bean_type_id == bean_type_id)
    if start_date:
        query = query.where(WarehouseTransfer.transfer_date >= start_date)
    if end_date:
        query = query.where(WarehouseTransfer.transfer_date <= end_date)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    transfers = result.unique().scalars().all()

    return [
        TransferResponse(
            id=t.id,
            from_warehouse_id=t.from_warehouse_id,
            from_warehouse_name=t.from_warehouse.name if t.from_warehouse else None,
            to_warehouse_id=t.to_warehouse_id,
            to_warehouse_name=t.to_warehouse.name if t.to_warehouse else None,
            bean_type_id=t.bean_type_id,
            bean_type_name=t.bean_type.name if t.bean_type else None,
            quantity_bags=t.quantity_bags,
            quantity=float(t.quantity),
            transfer_date=t.transfer_date,
            notes=t.notes,
            created_by=t.created_by,
            created_at=t.created_at,
        )
        for t in transfers
    ]


@router.get("/{transfer_id}", response_model=TransferResponse)
async def get_transfer(
    transfer_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WarehouseTransfer)
        .options(
            joinedload(WarehouseTransfer.from_warehouse),
            joinedload(WarehouseTransfer.to_warehouse),
            joinedload(WarehouseTransfer.bean_type),
        )
        .where(WarehouseTransfer.id == transfer_id)
    )
    transfer = result.unique().scalar_one_or_none()
    if transfer is None:
        raise HTTPException(status_code=404, detail="Transfer not found")

    return TransferResponse(
        id=transfer.id,
        from_warehouse_id=transfer.from_warehouse_id,
        from_warehouse_name=transfer.from_warehouse.name if transfer.from_warehouse else None,
        to_warehouse_id=transfer.to_warehouse_id,
        to_warehouse_name=transfer.to_warehouse.name if transfer.to_warehouse else None,
        bean_type_id=transfer.bean_type_id,
        bean_type_name=transfer.bean_type.name if transfer.bean_type else None,
        quantity_bags=transfer.quantity_bags,
        quantity=float(transfer.quantity),
        transfer_date=transfer.transfer_date,
        notes=transfer.notes,
        created_by=transfer.created_by,
        created_at=transfer.created_at,
    )


@router.post("", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
async def create_transfer(
    request: TransferCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a warehouse transfer (moves inventory between warehouses)."""

    # Validate from_warehouse exists
    from_result = await db.execute(
        select(Warehouse).where(Warehouse.id == request.from_warehouse_id)
    )
    from_warehouse = from_result.scalar_one_or_none()
    if from_warehouse is None:
        raise HTTPException(status_code=404, detail="Source warehouse not found")
    if not from_warehouse.is_active:
        raise HTTPException(status_code=400, detail="Source warehouse is inactive")

    # Validate to_warehouse exists
    to_result = await db.execute(
        select(Warehouse).where(Warehouse.id == request.to_warehouse_id)
    )
    to_warehouse = to_result.scalar_one_or_none()
    if to_warehouse is None:
        raise HTTPException(status_code=404, detail="Destination warehouse not found")
    if not to_warehouse.is_active:
        raise HTTPException(status_code=400, detail="Destination warehouse is inactive")

    # Validate bean type exists
    bt_result = await db.execute(
        select(BeanType).where(BeanType.id == request.bean_type_id)
    )
    bean_type = bt_result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=404, detail="Bean type not found")

    # Validate source warehouse has enough stock
    if request.quantity_bags > 0:
        # Get storage bags for this bean type in source warehouse
        storage_result = await db.execute(
            select(func.coalesce(func.sum(Storage.quantity_bags), 0)).where(
                Storage.warehouse_id == request.from_warehouse_id,
                Storage.bean_type_id == request.bean_type_id,
            )
        )
        storage_bags = int(storage_result.scalar() or 0)

        # Get incoming transfers
        in_result = await db.execute(
            select(func.coalesce(func.sum(WarehouseTransfer.quantity_bags), 0)).where(
                WarehouseTransfer.to_warehouse_id == request.from_warehouse_id,
                WarehouseTransfer.bean_type_id == request.bean_type_id,
            )
        )
        incoming_bags = int(in_result.scalar() or 0)

        # Get outgoing transfers
        out_result = await db.execute(
            select(func.coalesce(func.sum(WarehouseTransfer.quantity_bags), 0)).where(
                WarehouseTransfer.from_warehouse_id == request.from_warehouse_id,
                WarehouseTransfer.bean_type_id == request.bean_type_id,
            )
        )
        outgoing_bags = int(out_result.scalar() or 0)

        available_bags = _calculate_inventory_for_bean(storage_bags, incoming_bags, outgoing_bags)
        if available_bags < request.quantity_bags:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock in '{from_warehouse.name}'. "
                    f"Available: {available_bags} bags, requested: {request.quantity_bags} bags"
                ),
            )

    # Create transfer
    transfer = WarehouseTransfer(
        from_warehouse_id=request.from_warehouse_id,
        to_warehouse_id=request.to_warehouse_id,
        bean_type_id=request.bean_type_id,
        quantity_bags=request.quantity_bags,
        quantity=request.quantity,
        transfer_date=request.transfer_date,
        notes=request.notes,
        created_by=str(user.id),
    )
    db.add(transfer)
    await db.flush()

    await create_audit_log(
        db, str(user.id), "CREATE", "warehouse_transfers", transfer.id,
        {
            "from_warehouse": from_warehouse.name,
            "to_warehouse": to_warehouse.name,
            "bean_type": bean_type.name,
            "quantity_bags": request.quantity_bags,
        },
    )

    return TransferResponse(
        id=transfer.id,
        from_warehouse_id=transfer.from_warehouse_id,
        from_warehouse_name=from_warehouse.name,
        to_warehouse_id=transfer.to_warehouse_id,
        to_warehouse_name=to_warehouse.name,
        bean_type_id=transfer.bean_type_id,
        bean_type_name=bean_type.name,
        quantity_bags=transfer.quantity_bags,
        quantity=float(transfer.quantity),
        transfer_date=transfer.transfer_date,
        notes=transfer.notes,
        created_by=transfer.created_by,
        created_at=transfer.created_at,
    )
