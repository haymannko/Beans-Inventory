import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class AdjustmentCreate(BaseModel):
    bean_type_id: uuid.UUID
    quantity: float = Field(..., gt=0)
    adjustment_type: str = Field(..., pattern="^(increase|decrease)$")
    reason: str = Field(..., min_length=1)
    adjustment_date: date


class AdjustmentUpdate(BaseModel):
    bean_type_id: uuid.UUID | None = None
    quantity: float | None = Field(None, gt=0)
    adjustment_type: str | None = Field(None, pattern="^(increase|decrease)$")
    reason: str | None = None
    adjustment_date: date | None = None


class AdjustmentResponse(BaseModel):
    id: uuid.UUID
    bean_type_id: uuid.UUID
    bean_type_name: str | None = None
    quantity: float
    adjustment_type: str
    reason: str
    adjustment_date: date
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
