from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=200)
    address: str | None = None
    notes: str | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=200)
    address: str | None = None
    notes: str | None = None
    is_active: bool | None = None
    outstanding_balance: float | None = Field(None, ge=0)

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "CustomerUpdate":
        if not any([self.name, self.phone is not None, self.email is not None,
                     self.address is not None, self.notes is not None,
                     self.is_active is not None, self.outstanding_balance is not None]):
            raise ValueError("At least one field must be provided for update")
        return self


class RecentSale(BaseModel):
    id: str
    sale_date: str
    bean_type_name: str | None = None
    quantity: float
    quantity_bags: int
    sale_price: float
    total_amount: float

    model_config = {"from_attributes": True}


class CustomerResponse(BaseModel):
    id: str
    name: str
    phone: str | None
    email: str | None
    address: str | None
    notes: str | None
    is_active: bool
    outstanding_balance: float
    created_at: datetime
    updated_at: datetime
    sale_count: int = 0
    total_purchases: float = 0
    recent_sales: list[RecentSale] = []

    model_config = {"from_attributes": True}
