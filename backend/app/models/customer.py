from sqlalchemy import Boolean, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Customer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "customers"

    name: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True
    )
    phone: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    email: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    address: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, index=True
    )
    outstanding_balance: Mapped[float] = mapped_column(
        Numeric(14, 2), nullable=False, default=0
    )

    # Relationships
    sales: Mapped[list["Sale"]] = relationship(
        back_populates="customer",
        lazy="selectin",
    )
