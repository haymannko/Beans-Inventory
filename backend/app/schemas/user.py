import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str | None = Field(None, max_length=255)
    password: str = Field(..., min_length=6)
    role: str = Field(default="staff", pattern="^(admin|staff)$")


class UserUpdate(BaseModel):
    username: str | None = Field(None, min_length=3, max_length=50)
    email: str | None = None
    role: str | None = Field(None, pattern="^(admin|staff)$")


class UserResponse(BaseModel):
    id: uuid.UUID
    username: str
    role: str
    email: str | None = None
    auth_provider: str | None = None
    has_password: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
