from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class CashBookCreate(BaseModel):
    transaction_date: date
    transaction_type: str = Field(..., pattern=r"^(receipt|payment)$")
    amount: float = Field(..., gt=0)
    description: str = Field(..., min_length=1)
    counterparty: str | None = Field(None, max_length=200)
    payment_method: str | None = Field(None, max_length=50)
    reference_type: str | None = None
    reference_id: str | None = None
    notes: str | None = None


class CashBookUpdate(BaseModel):
    transaction_date: date | None = None
    transaction_type: str | None = Field(None, pattern=r"^(receipt|payment)$")
    amount: float | None = Field(None, gt=0)
    description: str | None = Field(None, min_length=1)
    counterparty: str | None = Field(None, max_length=200)
    payment_method: str | None = Field(None, max_length=50)
    notes: str | None = None

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "CashBookUpdate":
        if not any([
            self.transaction_date, self.transaction_type,
            self.amount, self.description, self.counterparty is not None,
            self.payment_method is not None, self.notes is not None,
        ]):
            raise ValueError("At least one field must be provided for update")
        return self


class CashBookResponse(BaseModel):
    id: str
    entry_number: str
    transaction_date: date
    transaction_type: str
    amount: float
    description: str
    counterparty: str | None
    payment_method: str | None
    reference_type: str | None
    reference_id: str | None
    notes: str | None
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CashBookBalance(BaseModel):
    opening_balance: float = 0
    total_receipts: float = 0
    total_payments: float = 0
    closing_balance: float = 0
