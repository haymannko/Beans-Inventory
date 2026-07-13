import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    STAFF = "staff"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(
        String(10), nullable=False, default=UserRole.STAFF.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    email: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    google_id: Mapped[str | None] = mapped_column(
        String(50), unique=True, nullable=True, index=True
    )
    avatar_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    auth_provider: Mapped[str] = mapped_column(
        String(20), nullable=False, default="local"
    )
    last_login: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
