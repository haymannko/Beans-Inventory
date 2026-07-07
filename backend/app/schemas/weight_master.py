import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class WeightMasterCreate(BaseModel):
    bean_type_id: str = Field(..., min_length=1)
    weight: float = Field(..., gt=0)


class WeightMasterUpdate(BaseModel):
    bean_type_id: str | None = Field(None, min_length=1)
    weight: float | None = Field(None, gt=0)


class WeightMasterResponse(BaseModel):
    id: uuid.UUID
    bean_type_id: str
    bean_type_name: str | None = None
    weight: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
