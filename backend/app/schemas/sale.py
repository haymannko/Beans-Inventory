import uuid
from datetime import date, datetime

from pydantic import BaseModel, Field


class SaleCreate(BaseModel):
    bean_type_id: uuid.UUID
    quantity_bags: int = Field(default=0, ge=0)
    quantity: float = Field(..., gt=0)
    customer_name: str | None = None
    sale_price: float = Field(default=0, ge=0)
    invoice_no: str | None = None
    sale_date: date
    remarks: str | None = None


class SaleUpdate(BaseModel):
    bean_type_id: uuid.UUID | None = None
    quantity_bags: int | None = Field(None, ge=0)
    quantity: float | None = Field(None, gt=0)
    customer_name: str | None = None
    sale_price: float | None = Field(None, ge=0)
    invoice_no: str | None = None
    sale_date: date | None = None
    remarks: str | None = None


class SaleResponse(BaseModel):
    id: uuid.UUID
    bean_type_id: uuid.UUID
    bean_type_name: str | None = None
    quantity_bags: int
    quantity: float
    customer_name: str | None
    sale_price: float
    invoice_no: str | None
    sale_date: date
    remarks: str | None
    created_by: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}
