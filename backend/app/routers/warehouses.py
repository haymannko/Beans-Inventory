import logging

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
from app.schemas.warehouse import (
    WarehouseCreate,
    WarehouseInventoryItem,
    WarehouseResponse,
    WarehouseUpdate,
)
from app.services.audit_service import create_audit_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/warehouses", tags=["Warehouses"])


async def _get_warehouse_or_404(db: AsyncSession, warehouse_id: str) -> Warehouse:
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    warehouse = result.scalar_one_or_none()
    if warehouse is None:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse


async def _build_warehouse_response(db: AsyncSession, warehouse: Warehouse) -> dict:
    # Count storage records and total bags
    count_result = await db.execute(
        select(
            func.count(Storage.id),
            func.coalesce(func.sum(Storage.quantity_bags), 0),
        ).where(Storage.warehouse_id == warehouse.id)
    )
    row = count_result.one()
    storage_count = row[0] or 0
    total_bags = int(row[1] or 0)

    # Add incoming transfer bags
    in_result = await db.execute(
        select(func.coalesce(func.sum(WarehouseTransfer.quantity_bags), 0)).where(
            WarehouseTransfer.to_warehouse_id == warehouse.id
        )
    )
    total_bags += int(in_result.scalar() or 0)

    # Subtract outgoing transfer bags
    out_result = await db.execute(
        select(func.coalesce(func.sum(WarehouseTransfer.quantity_bags), 0)).where(
            WarehouseTransfer.from_warehouse_id == warehouse.id
        )
    )
    total_bags -= int(out_result.scalar() or 0)

    return {
        "id": warehouse.id,
        "name": warehouse.name,
        "location": warehouse.location,
        "contact_person": warehouse.contact_person,
        "phone": warehouse.phone,
        "notes": warehouse.notes,
        "is_active": warehouse.is_active,
        "created_at": warehouse.created_at,
        "updated_at": warehouse.updated_at,
        "storage_count": storage_count,
        "total_bags": max(0, total_bags),
    }


@router.get("", response_model=list[WarehouseResponse])
async def list_warehouses(
    search: str | None = Query(None),
    active_only: bool = Query(True),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(Warehouse).order_by(Warehouse.name.asc())
    if active_only:
        query = query.where(Warehouse.is_active == True)
    if search:
        term = f"%{search}%"
        query = query.where(
            Warehouse.name.ilike(term)
            | Warehouse.location.ilike(term)
            | Warehouse.contact_person.ilike(term)
            | Warehouse.phone.ilike(term)
        )
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    warehouses = result.scalars().all()
    return [await _build_warehouse_response(db, w) for w in warehouses]


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    warehouse = await _get_warehouse_or_404(db, warehouse_id)
    return await _build_warehouse_response(db, warehouse)


@router.post("", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    request: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(Warehouse).where(Warehouse.name == request.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Warehouse '{request.name}' already exists",
        )

    warehouse = Warehouse(
        name=request.name,
        location=request.location,
        contact_person=request.contact_person,
        phone=request.phone,
        notes=request.notes,
    )
    db.add(warehouse)
    await db.flush()
    await db.refresh(warehouse)
    await create_audit_log(
        db, str(user.id), "CREATE", "warehouses", warehouse.id,
        {"name": request.name},
    )
    return await _build_warehouse_response(db, warehouse)


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: str,
    request: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    warehouse = await _get_warehouse_or_404(db, warehouse_id)

    if request.name is not None:
        existing = await db.execute(
            select(Warehouse).where(
                Warehouse.name == request.name,
                Warehouse.id != warehouse_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Warehouse '{request.name}' already exists",
            )
        warehouse.name = request.name
    if request.location is not None:
        warehouse.location = request.location
    if request.contact_person is not None:
        warehouse.contact_person = request.contact_person
    if request.phone is not None:
        warehouse.phone = request.phone
    if request.notes is not None:
        warehouse.notes = request.notes
    if request.is_active is not None:
        warehouse.is_active = request.is_active

    db.add(warehouse)
    await db.flush()
    await db.refresh(warehouse)
    await create_audit_log(
        db, str(user.id), "UPDATE", "warehouses", warehouse.id,
        {"name": warehouse.name},
    )
    return await _build_warehouse_response(db, warehouse)


@router.delete("/{warehouse_id}")
async def delete_warehouse(
    warehouse_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    warehouse = await _get_warehouse_or_404(db, warehouse_id)

    # Check for storage records referencing this warehouse
    storage_result = await db.execute(
        select(func.count(Storage.id)).where(Storage.warehouse_id == warehouse.id)
    )
    storage_count = storage_result.scalar() or 0

    # Check for transfers
    transfer_result = await db.execute(
        select(func.count(WarehouseTransfer.id)).where(
            (WarehouseTransfer.from_warehouse_id == warehouse.id)
            | (WarehouseTransfer.to_warehouse_id == warehouse.id)
        )
    )
    transfer_count = transfer_result.scalar() or 0

    if storage_count > 0 or transfer_count > 0:
        warehouse.is_active = False
        db.add(warehouse)
        await db.flush()
        await create_audit_log(
            db, str(user.id), "DEACTIVATE", "warehouses", warehouse.id,
            {"name": warehouse.name, "reason": f"Has {storage_count} storage record(s), {transfer_count} transfer(s)"},
        )
        return {
            "message": f"Warehouse '{warehouse.name}' deactivated (has {storage_count} storage record(s))",
            "soft_delete": True,
        }
    else:
        name = warehouse.name
        await db.delete(warehouse)
        await create_audit_log(
            db, str(user.id), "DELETE", "warehouses", warehouse_id,
            {"name": name},
        )
        return {"message": f"Warehouse '{name}' deleted successfully", "soft_delete": False}


@router.get("/{warehouse_id}/inventory", response_model=list[WarehouseInventoryItem])
async def get_warehouse_inventory(
    warehouse_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get inventory per bean type for a specific warehouse."""
    await _get_warehouse_or_404(db, warehouse_id)

    # Get all bean types
    bt_result = await db.execute(select(BeanType).order_by(BeanType.name))
    bean_types = bt_result.scalars().all()

    # Get storage records grouped by bean type for this warehouse
    storage_query = await db.execute(
        select(
            Storage.bean_type_id,
            func.coalesce(func.sum(Storage.quantity_bags), 0),
            func.coalesce(func.sum(Storage.quantity), 0),
        ).where(Storage.warehouse_id == warehouse_id)
        .group_by(Storage.bean_type_id)
    )
    storage_by_type = {
        row[0]: {"bags": int(row[1] or 0), "qty": float(row[2] or 0)}
        for row in storage_query.fetchall()
    }

    # Get incoming transfers grouped by bean type
    in_query = await db.execute(
        select(
            WarehouseTransfer.bean_type_id,
            func.coalesce(func.sum(WarehouseTransfer.quantity_bags), 0),
            func.coalesce(func.sum(WarehouseTransfer.quantity), 0),
        ).where(WarehouseTransfer.to_warehouse_id == warehouse_id)
        .group_by(WarehouseTransfer.bean_type_id)
    )
    in_by_type = {
        row[0]: {"bags": int(row[1] or 0), "qty": float(row[2] or 0)}
        for row in in_query.fetchall()
    }

    # Get outgoing transfers grouped by bean type
    out_query = await db.execute(
        select(
            WarehouseTransfer.bean_type_id,
            func.coalesce(func.sum(WarehouseTransfer.quantity_bags), 0),
            func.coalesce(func.sum(WarehouseTransfer.quantity), 0),
        ).where(WarehouseTransfer.from_warehouse_id == warehouse_id)
        .group_by(WarehouseTransfer.bean_type_id)
    )
    out_by_type = {
        row[0]: {"bags": int(row[1] or 0), "qty": float(row[2] or 0)}
        for row in out_query.fetchall()
    }

    inventory = []
    for bt in bean_types:
        bt_id = bt.id
        bags = (storage_by_type.get(bt_id, {}).get("bags", 0)
                + in_by_type.get(bt_id, {}).get("bags", 0)
                - out_by_type.get(bt_id, {}).get("bags", 0))
        qty = (storage_by_type.get(bt_id, {}).get("qty", 0.0)
               + in_by_type.get(bt_id, {}).get("qty", 0.0)
               - out_by_type.get(bt_id, {}).get("qty", 0.0))
        if bags > 0 or qty > 0:
            inventory.append(WarehouseInventoryItem(
                bean_type_id=bt_id,
                bean_type_name=bt.name,
                quantity_bags=bags,
                quantity=qty,
            ))

    return inventory


@router.get("/{warehouse_id}/transfers", response_model=list[dict])
async def get_warehouse_transfers(
    warehouse_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get transfers involving this warehouse (either as source or destination)."""
    await _get_warehouse_or_404(db, warehouse_id)

    query = (
        select(WarehouseTransfer)
        .options(
            joinedload(WarehouseTransfer.from_warehouse),
            joinedload(WarehouseTransfer.to_warehouse),
            joinedload(WarehouseTransfer.bean_type),
        )
        .where(
            (WarehouseTransfer.from_warehouse_id == warehouse_id)
            | (WarehouseTransfer.to_warehouse_id == warehouse_id)
        )
        .order_by(WarehouseTransfer.transfer_date.desc(), WarehouseTransfer.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    transfers = result.unique().scalars().all()

    return [
        {
            "id": t.id,
            "from_warehouse_id": t.from_warehouse_id,
            "from_warehouse_name": t.from_warehouse.name if t.from_warehouse else None,
            "to_warehouse_id": t.to_warehouse_id,
            "to_warehouse_name": t.to_warehouse.name if t.to_warehouse else None,
            "bean_type_id": t.bean_type_id,
            "bean_type_name": t.bean_type.name if t.bean_type else None,
            "quantity_bags": t.quantity_bags,
            "quantity": float(t.quantity),
            "transfer_date": t.transfer_date.isoformat() if hasattr(t.transfer_date, "isoformat") else str(t.transfer_date),
            "notes": t.notes,
            "created_by": t.created_by,
            "created_at": t.created_at,
        }
        for t in transfers
    ]
