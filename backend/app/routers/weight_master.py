import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import User
from app.models.weight_master import WeightMaster
from app.schemas.weight_master import (
    WeightMasterCreate,
    WeightMasterResponse,
    WeightMasterUpdate,
)
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/api/weight-master", tags=["Weight Master"])


@router.get("", response_model=list[WeightMasterResponse])
async def list_weight_master(
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    query = select(WeightMaster).order_by(WeightMaster.bean_name)
    if search:
        query = query.where(WeightMaster.bean_name.ilike(f"%{search}%"))
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{weight_id}", response_model=WeightMasterResponse)
async def get_weight_master(
    weight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    weight_id_str = str(weight_id)
    result = await db.execute(select(WeightMaster).where(WeightMaster.id == weight_id_str))
    wm = result.scalar_one_or_none()
    if wm is None:
        raise HTTPException(status_code=404, detail="Weight master not found")
    return wm


@router.get("/by-name/{bean_name}", response_model=WeightMasterResponse)
async def get_weight_by_name(
    bean_name: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WeightMaster).where(WeightMaster.bean_name == bean_name)
    )
    wm = result.scalar_one_or_none()
    if wm is None:
        raise HTTPException(status_code=404, detail="Weight not found for this bean")
    return wm


@router.post("", response_model=WeightMasterResponse, status_code=status.HTTP_201_CREATED)
async def create_weight_master(
    request: WeightMasterCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    existing = await db.execute(
        select(WeightMaster).where(WeightMaster.bean_name == request.bean_name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Weight already exists for this bean")

    wm = WeightMaster(bean_name=request.bean_name, weight=request.weight)
    db.add(wm)
    await db.flush()
    await create_audit_log(db, user.id, "CREATE", "weight_master", wm.id, {"bean_name": wm.bean_name, "weight": float(wm.weight)})
    return wm


@router.put("/{weight_id}", response_model=WeightMasterResponse)
async def update_weight_master(
    weight_id: uuid.UUID,
    request: WeightMasterUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    weight_id_str = str(weight_id)
    result = await db.execute(select(WeightMaster).where(WeightMaster.id == weight_id_str))
    wm = result.scalar_one_or_none()
    if wm is None:
        raise HTTPException(status_code=404, detail="Weight master not found")

    if request.bean_name is not None:
        existing = await db.execute(
            select(WeightMaster).where(WeightMaster.bean_name == request.bean_name, WeightMaster.id != weight_id_str)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bean name already exists")
        wm.bean_name = request.bean_name

    if request.weight is not None:
        wm.weight = request.weight

    db.add(wm)
    await db.flush()
    await create_audit_log(db, user.id, "UPDATE", "weight_master", wm.id, {"bean_name": wm.bean_name, "weight": float(wm.weight)})
    return wm


@router.delete("/{weight_id}")
async def delete_weight_master(
    weight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    weight_id_str = str(weight_id)
    result = await db.execute(select(WeightMaster).where(WeightMaster.id == weight_id_str))
    wm = result.scalar_one_or_none()
    if wm is None:
        raise HTTPException(status_code=404, detail="Weight master not found")
    await db.delete(wm)
    await create_audit_log(db, user.id, "DELETE", "weight_master", weight_id_str, {"bean_name": wm.bean_name})
    return {"message": "Weight master deleted successfully"}
