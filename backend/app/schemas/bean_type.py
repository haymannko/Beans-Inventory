import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class BeanTypeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None


class BeanTypeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None


class BeanTypeResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
