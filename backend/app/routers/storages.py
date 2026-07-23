import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.bean_type import BeanType
from app.models.storage import Storage
from app.models.user import User
from app.models.warehouse import Warehouse
from app.schemas.storage import StorageCreate, StorageResponse, StorageUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/api/storages", tags=["Storage"])


@router.get("", response_model=list[StorageResponse])
async def list_storages(
    bean_type_id: uuid.UUID | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List storage records with optional filters."""
    query = select(Storage).order_by(Storage.storage_date.desc(), Storage.created_at.desc())

    if bean_type_id:
        query = query.where(Storage.bean_type_id == str(bean_type_id))
    if start_date:
        query = query.where(Storage.storage_date >= start_date)
    if end_date:
        query = query.where(Storage.storage_date <= end_date)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    storages = result.scalars().all()

    # Resolve warehouse names
    warehouse_cache: dict[str, str] = {}
    if any(s.warehouse_id for s in storages):
        wh_ids = [s.warehouse_id for s in storages if s.warehouse_id]
        wh_result = await db.execute(
            select(Warehouse.id, Warehouse.name).where(Warehouse.id.in_(wh_ids))
        )
        warehouse_cache = {row[0]: row[1] for row in wh_result.fetchall()}

    enriched = []
    for storage in storages:
        bt_result = await db.execute(select(BeanType.name).where(BeanType.id == storage.bean_type_id))
        bt_name = bt_result.scalar_one_or_none()
        resolved_wh = warehouse_cache.get(storage.warehouse_id) if storage.warehouse_id else None
        enriched.append(StorageResponse(
            id=storage.id,
            bean_type_id=storage.bean_type_id,
            bean_type_name=bt_name,
            quantity_bags=storage.quantity_bags,
            quantity=float(storage.quantity),
            warehouse_name=storage.warehouse_name,
            warehouse_id=storage.warehouse_id,
            warehouse_name_resolved=resolved_wh,
            storage_date=storage.storage_date,
            notes=storage.notes,
            created_by=storage.created_by,
            created_at=storage.created_at,
        ))

    return enriched


@router.post("", response_model=StorageResponse, status_code=status.HTTP_201_CREATED)
async def create_storage(
    request: StorageCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Record a new storage entry."""
    # Verify bean type exists
    bean_type_id_str = str(request.bean_type_id)
    bt_result = await db.execute(select(BeanType).where(BeanType.id == bean_type_id_str))
    bean_type = bt_result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=404, detail="Bean type not found")

    # Resolve warehouse name if warehouse_id provided
    resolved_wh_name = request.warehouse_name
    if request.warehouse_id:
        wh_result = await db.execute(
            select(Warehouse).where(Warehouse.id == request.warehouse_id)
        )
        warehouse = wh_result.scalar_one_or_none()
        if warehouse:
            resolved_wh_name = warehouse.name

    storage = Storage(
        bean_type_id=str(request.bean_type_id),
        quantity_bags=request.quantity_bags,
        quantity=request.quantity,
        warehouse_name=resolved_wh_name or request.warehouse_name,
        warehouse_id=request.warehouse_id,
        storage_date=request.storage_date,
        notes=request.notes,
        created_by=str(user.id),
    )
    db.add(storage)
    await db.flush()

    await create_audit_log(
        db, user.id, "CREATE", "storages", storage.id,
        {
            "bean_type": bean_type.name,
            "quantity": request.quantity,
            "warehouse_name": resolved_wh_name or request.warehouse_name,
        }
    )

    return StorageResponse(
        id=storage.id,
        bean_type_id=storage.bean_type_id,
        bean_type_name=bean_type.name,
        quantity_bags=storage.quantity_bags,
        quantity=float(storage.quantity),
        warehouse_name=storage.warehouse_name,
        warehouse_id=storage.warehouse_id,
        warehouse_name_resolved=resolved_wh_name,
        storage_date=storage.storage_date,
        notes=storage.notes,
        created_by=storage.created_by,
        created_at=storage.created_at,
    )


@router.put("/{storage_id}", response_model=StorageResponse)
async def update_storage(
    storage_id: uuid.UUID,
    request: StorageUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a storage record."""
    storage_id_str = str(storage_id)
    result = await db.execute(select(Storage).where(Storage.id == storage_id_str))
    storage = result.scalar_one_or_none()
    if storage is None:
        raise HTTPException(status_code=404, detail="Storage record not found")

    if request.bean_type_id is not None:
        bt_result = await db.execute(select(BeanType).where(BeanType.id == str(request.bean_type_id)))
        if bt_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Bean type not found")
        storage.bean_type_id = str(request.bean_type_id)
    if request.quantity_bags is not None:
        storage.quantity_bags = request.quantity_bags
    if request.quantity is not None:
        storage.quantity = request.quantity
    if request.warehouse_name is not None:
        storage.warehouse_name = request.warehouse_name
    if request.warehouse_id is not None:
        wh_result = await db.execute(
            select(Warehouse).where(Warehouse.id == request.warehouse_id)
        )
        warehouse = wh_result.scalar_one_or_none()
        if warehouse:
            storage.warehouse_id = request.warehouse_id
            storage.warehouse_name = warehouse.name
        else:
            raise HTTPException(status_code=404, detail="Warehouse not found")
    if request.storage_date is not None:
        storage.storage_date = request.storage_date
    if request.notes is not None:
        storage.notes = request.notes

    db.add(storage)
    await db.flush()

    bt_result = await db.execute(select(BeanType.name).where(BeanType.id == storage.bean_type_id))
    bt_name = bt_result.scalar_one_or_none()

    resolved_wh = None
    if storage.warehouse_id:
        wh_result = await db.execute(
            select(Warehouse.name).where(Warehouse.id == storage.warehouse_id)
        )
        resolved_wh = wh_result.scalar_one_or_none()

    await create_audit_log(db, str(user.id), "UPDATE", "storages", storage_id_str, None)

    return StorageResponse(
        id=storage.id,
        bean_type_id=storage.bean_type_id,
        bean_type_name=bt_name,
        quantity_bags=storage.quantity_bags,
        quantity=float(storage.quantity),
        warehouse_name=storage.warehouse_name,
        warehouse_id=storage.warehouse_id,
        warehouse_name_resolved=resolved_wh,
        storage_date=storage.storage_date,
        notes=storage.notes,
        created_by=storage.created_by,
        created_at=storage.created_at,
    )


@router.delete("/{storage_id}")
async def delete_storage(
    storage_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a storage record."""
    storage_id_str = str(storage_id)
    result = await db.execute(select(Storage).where(Storage.id == storage_id_str))
    storage = result.scalar_one_or_none()
    if storage is None:
        raise HTTPException(status_code=404, detail="Storage record not found")

    await db.delete(storage)
    await create_audit_log(db, str(user.id), "DELETE", "storages", storage_id_str, None)
    return {"message": "Storage record deleted successfully"}
