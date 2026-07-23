from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


# ─── Warehouse ────────────────────────────────────────────────────────────────

class WarehouseCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    location: str | None = None
    contact_person: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=50)
    notes: str | None = None


class WarehouseUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    location: str | None = None
    contact_person: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=50)
    notes: str | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "WarehouseUpdate":
        if not any([self.name, self.location is not None,
                     self.contact_person is not None, self.phone is not None,
                     self.notes is not None, self.is_active is not None]):
            raise ValueError("At least one field must be provided for update")
        return self


class WarehouseResponse(BaseModel):
    id: str
    name: str
    location: str | None
    contact_person: str | None
    phone: str | None
    notes: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    storage_count: int = 0
    total_bags: int = 0

    model_config = {"from_attributes": True}


# ─── Transfer ─────────────────────────────────────────────────────────────────

class TransferCreate(BaseModel):
    from_warehouse_id: str
    to_warehouse_id: str
    bean_type_id: str
    quantity_bags: int = Field(default=0, ge=0)
    quantity: float = Field(default=0, ge=0)
    transfer_date: date
    notes: str | None = None

    @model_validator(mode="after")
    def ensure_different_warehouses(self) -> "TransferCreate":
        if self.from_warehouse_id == self.to_warehouse_id:
            raise ValueError("Source and destination warehouses must be different")
        if self.quantity_bags <= 0 and self.quantity <= 0:
            raise ValueError("At least one of quantity_bags or quantity must be > 0")
        return self


class TransferResponse(BaseModel):
    id: str
    from_warehouse_id: str
    from_warehouse_name: str | None = None
    to_warehouse_id: str
    to_warehouse_name: str | None = None
    bean_type_id: str
    bean_type_name: str | None = None
    quantity_bags: int
    quantity: float
    transfer_date: date
    notes: str | None
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Inventory ────────────────────────────────────────────────────────────────

class WarehouseInventoryItem(BaseModel):
    bean_type_id: str
    bean_type_name: str
    quantity_bags: int = 0
    quantity: float = 0
