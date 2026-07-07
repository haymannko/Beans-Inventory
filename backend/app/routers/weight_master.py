import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.bean_type import BeanType
from app.models.user import User
from app.models.weight_master import WeightMaster
from app.schemas.weight_master import (
    WeightMasterCreate,
    WeightMasterResponse,
    WeightMasterUpdate,
)
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/api/weight-master", tags=["Weight Master"])


def _response(wm: WeightMaster, bean_type_name: str | None = None) -> WeightMasterResponse:
    """Build response with bean_type_name."""
    return WeightMasterResponse(
        id=wm.id,
        bean_type_id=wm.bean_type_id,
        bean_type_name=bean_type_name,
        weight=float(wm.weight),
        created_at=wm.created_at,
        updated_at=wm.updated_at,
    )


@router.get("", response_model=list[WeightMasterResponse])
async def list_weight_master(
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all weight master records with optional search by bean type name."""
    query = (
        select(WeightMaster, BeanType.name.label("bean_type_name"))
        .join(BeanType, WeightMaster.bean_type_id == BeanType.id)
        .order_by(BeanType.name)
    )

    if search:
        query = query.where(BeanType.name.ilike(f"%{search}%"))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()
    return [_response(wm, bt_name) for wm, bt_name in rows]


@router.get("/{weight_id}", response_model=WeightMasterResponse)
async def get_weight_master(
    weight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single weight master record by ID."""
    result = await db.execute(
        select(WeightMaster, BeanType.name.label("bean_type_name"))
        .join(BeanType, WeightMaster.bean_type_id == BeanType.id)
        .where(WeightMaster.id == weight_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Weight master not found")
    wm, bt_name = row
    return _response(wm, bt_name)


@router.post("", response_model=WeightMasterResponse, status_code=status.HTTP_201_CREATED)
async def create_weight_master(
    request: WeightMasterCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new weight master record."""
    # Verify bean type exists
    bt_result = await db.execute(select(BeanType).where(BeanType.id == request.bean_type_id))
    bean_type = bt_result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=400, detail="Bean type not found")

    # Check duplicate bean_type_id
    existing = await db.execute(
        select(WeightMaster).where(WeightMaster.bean_type_id == request.bean_type_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Weight already exists for this bean type")

    wm = WeightMaster(bean_type_id=request.bean_type_id, weight=request.weight)
    db.add(wm)
    await db.flush()

    await create_audit_log(
        db, user.id, "CREATE", "weight_master", wm.id,
        {"bean_type_id": wm.bean_type_id, "weight": float(wm.weight)}
    )

    return _response(wm, bean_type.name)


@router.put("/{weight_id}", response_model=WeightMasterResponse)
async def update_weight_master(
    weight_id: uuid.UUID,
    request: WeightMasterUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a weight master record."""
    result = await db.execute(
        select(WeightMaster, BeanType.name.label("bean_type_name"))
        .join(BeanType, WeightMaster.bean_type_id == BeanType.id)
        .where(WeightMaster.id == weight_id)
    )
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Weight master not found")
    wm, bean_type_name = row

    if request.bean_type_id is not None:
        # Verify new bean type exists
        bt_result = await db.execute(select(BeanType).where(BeanType.id == request.bean_type_id))
        bean_type = bt_result.scalar_one_or_none()
        if bean_type is None:
            raise HTTPException(status_code=400, detail="Bean type not found")
        wm.bean_type_id = request.bean_type_id
        bean_type_name = bean_type.name

    if request.weight is not None:
        wm.weight = request.weight

    db.add(wm)
    await db.flush()

    await create_audit_log(
        db, user.id, "UPDATE", "weight_master", wm.id,
        {"bean_type_id": wm.bean_type_id, "weight": float(wm.weight)}
    )

    return _response(wm, bean_type_name)


@router.delete("/{weight_id}")
async def delete_weight_master(
    weight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a weight master record."""
    result = await db.execute(select(WeightMaster).where(WeightMaster.id == weight_id))
    wm = result.scalar_one_or_none()
    if wm is None:
        raise HTTPException(status_code=404, detail="Weight master not found")

    await db.delete(wm)
    await create_audit_log(
        db, user.id, "DELETE", "weight_master", weight_id,
        {"bean_type_id": wm.bean_type_id, "weight": float(wm.weight)}
    )

    return {"message": "Weight master deleted successfully"}
