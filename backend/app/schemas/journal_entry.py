from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class JournalEntryLineCreate(BaseModel):
    account_id: str
    debit: float = Field(default=0, ge=0)
    credit: float = Field(default=0, ge=0)
    description: str | None = None

    @model_validator(mode="after")
    def ensure_at_least_one_amount(self) -> "JournalEntryLineCreate":
        if self.debit <= 0 and self.credit <= 0:
            raise ValueError("Each line must have either a debit or credit amount > 0")
        if self.debit > 0 and self.credit > 0:
            raise ValueError("A line cannot have both debit and credit > 0")
        return self


class JournalEntryLineUpdate(BaseModel):
    account_id: str | None = None
    debit: float | None = Field(None, ge=0)
    credit: float | None = Field(None, ge=0)
    description: str | None = None


class JournalEntryLineResponse(BaseModel):
    id: str
    journal_entry_id: str
    account_id: str
    account_code: str | None = None
    account_name: str | None = None
    debit: float
    credit: float
    description: str | None

    model_config = {"from_attributes": True}


class JournalEntryCreate(BaseModel):
    entry_date: date
    description: str = Field(..., min_length=1)
    entry_type: str | None = "manual"
    reference_type: str | None = None
    reference_id: str | None = None
    lines: list[JournalEntryLineCreate] = Field(..., min_length=2)

    @model_validator(mode="after")
    def ensure_debits_equal_credits(self) -> "JournalEntryCreate":
        total_debit = sum(round(l.debit, 2) for l in self.lines)
        total_credit = sum(round(l.credit, 2) for l in self.lines)
        if abs(total_debit - total_credit) > 0.01:
            raise ValueError(
                f"Total debits ({total_debit}) must equal total credits ({total_credit})"
            )
        return self


class JournalEntryUpdate(BaseModel):
    entry_date: date | None = None
    description: str | None = Field(None, min_length=1)
    lines: list[JournalEntryLineUpdate] | None = None

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "JournalEntryUpdate":
        if not any([self.entry_date, self.description, self.lines is not None]):
            raise ValueError("At least one field must be provided for update")
        return self


class JournalEntryResponse(BaseModel):
    id: str
    entry_number: str
    entry_date: date
    description: str
    entry_type: str | None
    reference_type: str | None
    reference_id: str | None
    is_posted: bool
    created_by: str
    created_at: datetime
    updated_at: datetime
    lines: list[JournalEntryLineResponse] = []

    model_config = {"from_attributes": True}
