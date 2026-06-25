import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.bean_type import BeanType
from app.models.user import User
from app.schemas.bean_type import BeanTypeCreate, BeanTypeResponse, BeanTypeUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/api/bean-types", tags=["Bean Types"])


@router.get("", response_model=list[BeanTypeResponse])
async def list_bean_types(
    search: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List all bean types with optional search."""
    query = select(BeanType).order_by(BeanType.name)

    if search:
        query = query.where(BeanType.name.ilike(f"%{search}%"))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{bean_type_id}", response_model=BeanTypeResponse)
async def get_bean_type(
    bean_type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get a single bean type by ID."""
    result = await db.execute(select(BeanType).where(BeanType.id == bean_type_id))
    bean_type = result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=404, detail="Bean type not found")
    return bean_type


@router.post("", response_model=BeanTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_bean_type(
    request: BeanTypeCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new bean type."""
    # Check for duplicate name
    existing = await db.execute(select(BeanType).where(BeanType.name == request.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bean type name already exists")

    bean_type = BeanType(name=request.name, description=request.description)
    db.add(bean_type)
    await db.flush()

    await create_audit_log(
        db, user.id, "CREATE", "bean_types", bean_type.id,
        {"name": bean_type.name}
    )

    return bean_type


@router.put("/{bean_type_id}", response_model=BeanTypeResponse)
async def update_bean_type(
    bean_type_id: uuid.UUID,
    request: BeanTypeUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update a bean type."""
    result = await db.execute(select(BeanType).where(BeanType.id == bean_type_id))
    bean_type = result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=404, detail="Bean type not found")

    if request.name is not None:
        existing = await db.execute(
            select(BeanType).where(BeanType.name == request.name, BeanType.id != bean_type_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bean type name already exists")
        bean_type.name = request.name

    if request.description is not None:
        bean_type.description = request.description

    db.add(bean_type)
    await db.flush()

    await create_audit_log(
        db, user.id, "UPDATE", "bean_types", bean_type.id,
        {"name": bean_type.name}
    )

    return bean_type


@router.delete("/{bean_type_id}")
async def delete_bean_type(
    bean_type_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a bean type."""
    result = await db.execute(select(BeanType).where(BeanType.id == bean_type_id))
    bean_type = result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=404, detail="Bean type not found")

    await db.delete(bean_type)
    await create_audit_log(
        db, user.id, "DELETE", "bean_types", bean_type_id,
        {"name": bean_type.name}
    )

    return {"message": "Bean type deleted successfully"}
