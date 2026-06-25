import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_current_user
from app.models.arrival import Arrival
from app.models.bean_type import BeanType
from app.models.user import User
from app.schemas.arrival import ArrivalCreate, ArrivalResponse, ArrivalUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/api/arrivals", tags=["Arrivals"])


@router.get("", response_model=list[ArrivalResponse])
async def list_arrivals(
    bean_type_id: uuid.UUID | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """List arrivals with optional filters."""
    query = select(Arrival).order_by(Arrival.arrival_date.desc(), Arrival.created_at.desc())

    if bean_type_id:
        query = query.where(Arrival.bean_type_id == bean_type_id)
    if start_date:
        query = query.where(Arrival.arrival_date >= start_date)
    if end_date:
        query = query.where(Arrival.arrival_date <= end_date)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    arrivals = result.scalars().all()

    # Enrich with bean type names
    enriched = []
    for arrival in arrivals:
        bt_result = await db.execute(select(BeanType.name).where(BeanType.id == arrival.bean_type_id))
        bt_name = bt_result.scalar_one_or_none()
        enriched.append(ArrivalResponse(
            id=arrival.id,
            bean_type_id=arrival.bean_type_id,
            bean_type_name=bt_name,
            quantity_bags=arrival.quantity_bags,
            weight_kg=float(arrival.weight_kg),
            supplier_name=arrival.supplier_name,
            purchase_price=float(arrival.purchase_price),
            arrival_date=arrival.arrival_date,
            remarks=arrival.remarks,
            created_by=arrival.created_by,
            created_at=arrival.created_at,
        ))

    return enriched


@router.post("", response_model=ArrivalResponse, status_code=status.HTTP_201_CREATED)
async def create_arrival(
    request: ArrivalCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Record a new bean arrival (increases stock)."""
    # Verify bean type exists
    bean_type_id_str = str(request.bean_type_id)
    bt_result = await db.execute(select(BeanType).where(BeanType.id == bean_type_id_str))
    bean_type = bt_result.scalar_one_or_none()
    if bean_type is None:
        raise HTTPException(status_code=404, detail="Bean type not found")

    arrival = Arrival(
        bean_type_id=str(request.bean_type_id),
        quantity_bags=request.quantity_bags,
        weight_kg=request.weight_kg,
        supplier_name=request.supplier_name,
        purchase_price=request.purchase_price,
        arrival_date=request.arrival_date,
        remarks=request.remarks,
        created_by=str(user.id),
    )
    db.add(arrival)
    await db.flush()

    await create_audit_log(
        db, user.id, "CREATE", "arrivals", arrival.id,
        {
            "bean_type": bean_type.name,
            "quantity_bags": request.quantity_bags,
            "weight_kg": request.weight_kg,
        }
    )

    return ArrivalResponse(
        id=arrival.id,
        bean_type_id=arrival.bean_type_id,
        bean_type_name=bean_type.name,
        quantity_bags=arrival.quantity_bags,
        weight_kg=float(arrival.weight_kg),
        supplier_name=arrival.supplier_name,
        purchase_price=float(arrival.purchase_price),
        arrival_date=arrival.arrival_date,
        remarks=arrival.remarks,
        created_by=arrival.created_by,
        created_at=arrival.created_at,
    )


@router.put("/{arrival_id}", response_model=ArrivalResponse)
async def update_arrival(
    arrival_id: uuid.UUID,
    request: ArrivalUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Update an arrival record."""
    arrival_id_str = str(arrival_id)
    result = await db.execute(select(Arrival).where(Arrival.id == arrival_id_str))
    arrival = result.scalar_one_or_none()
    if arrival is None:
        raise HTTPException(status_code=404, detail="Arrival not found")

    if request.bean_type_id is not None:
        bt_result = await db.execute(select(BeanType).where(BeanType.id == str(request.bean_type_id)))
        if bt_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Bean type not found")
        arrival.bean_type_id = str(request.bean_type_id)
    if request.quantity_bags is not None:
        arrival.quantity_bags = request.quantity_bags
    if request.weight_kg is not None:
        arrival.weight_kg = request.weight_kg
    if request.supplier_name is not None:
        arrival.supplier_name = request.supplier_name
    if request.purchase_price is not None:
        arrival.purchase_price = request.purchase_price
    if request.arrival_date is not None:
        arrival.arrival_date = request.arrival_date
    if request.remarks is not None:
        arrival.remarks = request.remarks

    db.add(arrival)
    await db.flush()

    bt_result = await db.execute(select(BeanType.name).where(BeanType.id == arrival.bean_type_id))
    bt_name = bt_result.scalar_one_or_none()

    await create_audit_log(db, str(user.id), "UPDATE", "arrivals", arrival_id_str, None)

    return ArrivalResponse(
        id=arrival.id,
        bean_type_id=arrival.bean_type_id,
        bean_type_name=bt_name,
        quantity_bags=arrival.quantity_bags,
        weight_kg=float(arrival.weight_kg),
        supplier_name=arrival.supplier_name,
        purchase_price=float(arrival.purchase_price),
        arrival_date=arrival.arrival_date,
        remarks=arrival.remarks,
        created_by=arrival.created_by,
        created_at=arrival.created_at,
    )


@router.delete("/{arrival_id}")
async def delete_arrival(
    arrival_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete an arrival record."""
    arrival_id_str = str(arrival_id)
    result = await db.execute(select(Arrival).where(Arrival.id == arrival_id_str))
    arrival = result.scalar_one_or_none()
    if arrival is None:
        raise HTTPException(status_code=404, detail="Arrival not found")

    await db.delete(arrival)
    await create_audit_log(db, str(user.id), "DELETE", "arrivals", arrival_id_str, None)
    return {"message": "Arrival deleted successfully"}
