from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


# ─── Item Schemas ────────────────────────────────────────────────────────────


class PurchaseOrderItemCreate(BaseModel):
    bean_type_id: str
    quantity_bags: int = Field(..., gt=0)
    unit_price: float = Field(default=0, ge=0)
    total_price: float | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def calculate_total_price(self) -> "PurchaseOrderItemCreate":
        if self.total_price is None:
            self.total_price = round(self.quantity_bags * self.unit_price, 2)
        return self


class PurchaseOrderItemUpdate(BaseModel):
    bean_type_id: str | None = None
    quantity_bags: int | None = Field(None, gt=0)
    unit_price: float | None = Field(None, ge=0)
    total_price: float | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def calculate_total_price(self) -> "PurchaseOrderItemUpdate":
        if self.total_price is None and self.quantity_bags is not None and self.unit_price is not None:
            self.total_price = round(self.quantity_bags * self.unit_price, 2)
        elif self.total_price is None and self.quantity_bags is not None and self.unit_price is None:
            # unit_price not changing, so can't calculate — leave None (handled in router)
            pass
        return self


class PurchaseOrderItemResponse(BaseModel):
    id: str
    purchase_order_id: str
    bean_type_id: str
    bean_type_name: str | None = None
    quantity_bags: int
    unit_price: float
    total_price: float
    received_quantity_bags: int
    notes: str | None

    model_config = {"from_attributes": True}


# ─── PO Schemas ──────────────────────────────────────────────────────────────


class PurchaseOrderCreate(BaseModel):
    supplier_name: str = Field(..., min_length=1, max_length=200)
    status: str | None = "draft"
    order_date: date
    expected_delivery_date: date | None = None
    notes: str | None = None
    items: list[PurchaseOrderItemCreate] = Field(..., min_length=1)


class PurchaseOrderUpdate(BaseModel):
    supplier_name: str | None = Field(None, min_length=1, max_length=200)
    order_date: date | None = None
    expected_delivery_date: date | None = None
    notes: str | None = None
    items: list[PurchaseOrderItemUpdate] | None = None

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "PurchaseOrderUpdate":
        if not any([self.supplier_name, self.order_date, self.expected_delivery_date,
                     self.notes is not None, self.items is not None]):
            raise ValueError("At least one field must be provided for update")
        return self


class PurchaseOrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(draft|approved|ordered|received|cancelled)$")


class ReceiveItemRequest(BaseModel):
    item_id: str
    received_quantity_bags: int = Field(..., gt=0)


class ReceiveItemsRequest(BaseModel):
    items: list[ReceiveItemRequest] = Field(..., min_length=1)


class PurchaseOrderResponse(BaseModel):
    id: str
    po_number: str
    supplier_name: str
    status: str
    order_date: date
    expected_delivery_date: date | None
    notes: str | None
    created_by: str
    created_at: datetime
    updated_at: datetime
    items: list[PurchaseOrderItemResponse] = []

    model_config = {"from_attributes": True}
