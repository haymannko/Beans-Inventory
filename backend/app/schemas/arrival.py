import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class ArrivalCreate(BaseModel):
    bean_type_id: uuid.UUID
    quantity_bags: int = Field(..., ge=0)
    weight_kg: float = Field(..., ge=0)
    supplier_name: str | None = None
    purchase_price: float = Field(default=0, ge=0)
    transport_fee: float = Field(default=0, ge=0)
    labor_fee: float = Field(default=0, ge=0)
    arrival_date: date
    remarks: str | None = None


class ArrivalUpdate(BaseModel):
    bean_type_id: uuid.UUID | None = None
    quantity_bags: int | None = Field(None, ge=0)
    weight_kg: float | None = Field(None, ge=0)
    supplier_name: str | None = None
    purchase_price: float | None = Field(None, ge=0)
    transport_fee: float | None = Field(None, ge=0)
    labor_fee: float | None = Field(None, ge=0)
    arrival_date: date | None = None
    remarks: str | None = None


class ArrivalResponse(BaseModel):
    id: uuid.UUID
    bean_type_id: uuid.UUID
    bean_type_name: str | None = None
    quantity_bags: int
    weight_kg: float
    supplier_name: str | None
    purchase_price: float
    transport_fee: float
    labor_fee: float
    arrival_date: date
    remarks: str | None
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
