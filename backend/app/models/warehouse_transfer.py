import uuid
from datetime import date, datetime

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class WarehouseTransfer(Base):
    __tablename__ = "warehouse_transfers"
    __table_args__ = (
        CheckConstraint(
            "quantity_bags >= 0",
            name="ck_warehouse_transfers_quantity_bags_non_negative",
        ),
        CheckConstraint(
            "quantity >= 0",
            name="ck_warehouse_transfers_quantity_non_negative",
        ),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    from_warehouse_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("warehouses.id"), nullable=False, index=True
    )
    to_warehouse_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("warehouses.id"), nullable=False, index=True
    )
    bean_type_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bean_types.id"), nullable=False, index=True
    )
    quantity_bags: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    quantity: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False
    )
    transfer_date: Mapped[date] = mapped_column(
        Date, nullable=False, index=True
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    from_warehouse: Mapped["Warehouse"] = relationship(
        back_populates="outgoing_transfers",
        foreign_keys=[from_warehouse_id],
        lazy="selectin",
    )
    to_warehouse: Mapped["Warehouse"] = relationship(
        back_populates="incoming_transfers",
        foreign_keys=[to_warehouse_id],
        lazy="selectin",
    )
    bean_type: Mapped["BeanType"] = relationship(
        lazy="selectin",
    )
