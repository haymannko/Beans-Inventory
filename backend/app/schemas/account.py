from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.account import AccountType


class AccountCreate(BaseModel):
    code: str = Field(..., min_length=1, max_length=20, pattern=r"^\d{2,6}$")
    name: str = Field(..., min_length=1, max_length=200)
    type: AccountType
    description: str | None = None
    parent_code: str | None = Field(None, max_length=20)


class AccountUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    type: AccountType | None = None
    description: str | None = None
    is_active: bool | None = None
    parent_code: str | None = Field(None, max_length=20)

    @model_validator(mode="after")
    def ensure_at_least_one_field(self) -> "AccountUpdate":
        if not any([
            self.name, self.type, self.description is not None,
            self.is_active is not None, self.parent_code is not None,
        ]):
            raise ValueError("At least one field must be provided for update")
        return self


class AccountResponse(BaseModel):
    id: str
    code: str
    name: str
    type: AccountType
    description: str | None
    is_active: bool
    parent_code: str | None
    created_at: datetime
    updated_at: datetime
    balance: float = 0

    model_config = {"from_attributes": True}
