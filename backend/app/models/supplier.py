from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDMixin


class Supplier(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "suppliers"

    company_name: Mapped[str] = mapped_column(
        String(200), unique=True, nullable=False, index=True
    )
    contact_person: Mapped[str | None] = mapped_column(
        String(200), nullable=True
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

    # Relationships
    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(
        back_populates="supplier",
        lazy="selectin",
    )
