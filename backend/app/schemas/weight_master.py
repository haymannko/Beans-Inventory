import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class WeightMasterCreate(BaseModel):
    bean_name: str = Field(..., min_length=1, max_length=200)
    weight: float = Field(..., gt=0)


class WeightMasterUpdate(BaseModel):
    bean_name: str | None = Field(None, min_length=1, max_length=200)
    weight: float | None = Field(None, gt=0)


class WeightMasterResponse(BaseModel):
    id: uuid.UUID
    bean_name: str
    weight: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
