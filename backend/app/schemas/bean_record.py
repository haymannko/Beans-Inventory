import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BeanRecordCreate(BaseModel):
    bean_type_id: uuid.UUID
    date: date
    customer_name: str = Field(..., min_length=1, max_length=200)
    record_type: str = Field("sale", pattern="^(sale|arrival)$")  # 'sale' or 'arrival'
    bags: int = Field(..., ge=0)
    viss: float = Field(..., ge=0)
    price: float = Field(0, ge=0)
    value: float | None = None


class BeanRecordUpdate(BaseModel):
    model_config = ConfigDict(strict=False)

    bean_type_id: Optional[uuid.UUID] = None
    date: Optional[str] = None
    customer_name: Optional[str] = Field(None, min_length=1, max_length=200)
    record_type: Optional[str] = Field(None, pattern="^(sale|arrival)$")
    bags: Optional[int] = Field(None, ge=0)
    viss: Optional[float] = Field(None, ge=0)
    price: Optional[float] = Field(None, ge=0)

    @field_validator("date", mode="before")
    @classmethod
    def coerce_date(cls, v):
        if v is None:
            return None
        if isinstance(v, date):
            return v.isoformat()
        if isinstance(v, str):
            return v
        return str(v)


class BeanRecordResponse(BaseModel):
    id: uuid.UUID
    bean_type_id: str
    bean_type_name: Optional[str] = None
    date: date
    customer_name: str
    record_type: str
    bags: int
    viss: float
    price: float
    value: float
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
