from datetime import datetime

from pydantic import BaseModel, Field, model_validator


# ─── Request Schemas ─────────────────────────────────────────────────────────


class SupplierCreate(BaseModel):
    company_name: str = Field(..., min_length=1, max_length=200)
    contact_person: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=200)
    address: str | None = None
    notes: str | None = None


class SupplierUpdate(BaseModel):
    company_name: str | None = Field(None, min_length=1, max_length=200)
    contact_person: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=50)
    email: str | None = Field(None, max_length=200)
    address: str | None = None
    notes: str | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "SupplierUpdate":
        if not any([self.company_name, self.contact_person is not None,
                     self.phone is not None, self.email is not None,
                     self.address is not None, self.notes is not None,
                     self.is_active is not None]):
            raise ValueError("At least one field must be provided for update")
        return self


# ─── Response Schemas ────────────────────────────────────────────────────────


class RecentPurchaseOrder(BaseModel):
    id: str
    po_number: str
    status: str
    order_date: str
    total_amount: float
    item_count: int

    model_config = {"from_attributes": True}


class SupplierResponse(BaseModel):
    id: str
    company_name: str
    contact_person: str | None
    phone: str | None
    email: str | None
    address: str | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    purchase_order_count: int = 0
    recent_purchase_orders: list[RecentPurchaseOrder] = []

    model_config = {"from_attributes": True}
