import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class StorageCreate(BaseModel):
    bean_type_id: uuid.UUID
    quantity_bags: int = Field(default=0, ge=0)
    quantity: float = Field(..., ge=0)
    warehouse_name: str | None = None
    storage_date: date
    notes: str | None = None


class StorageUpdate(BaseModel):
    bean_type_id: uuid.UUID | None = None
    quantity_bags: int | None = Field(None, ge=0)
    quantity: float | None = Field(None, ge=0)
    warehouse_name: str | None = None
    storage_date: date | None = None
    notes: str | None = None


class StorageResponse(BaseModel):
    id: uuid.UUID
    bean_type_id: uuid.UUID
    bean_type_name: str | None = None
    quantity_bags: int
    quantity: float
    warehouse_name: str | None
    storage_date: date
    notes: str | None
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
